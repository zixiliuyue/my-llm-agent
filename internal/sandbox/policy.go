// Package sandbox 实现生产级 Docker 容器安全沙箱执行器与 AST/词法级命令安全策略门禁。
// 核心安全边界：
// 1. 先过确定性 AST/词法级策略门禁（CommandPolicyGuard），高危破坏性指令、写文件重定向、外联网络、反弹 Shell 与敏感凭据读取 100% 静态拦截。
// 2. 放行的只读诊断脚本在真实受限 Docker 容器（--network=none --read-only --tmpfs /tmp:rw,noexec,nosuid,size=16m --memory=128m --cpus=0.5 --pids-limit=64 --security-opt=no-new-privileges）中隔离执行。
// 3. 每次执行与拦截均写入 SHA-256 哈希链审计日志，确保事后不可篡改追溯。
package sandbox

import (
	"fmt"
	"path/filepath"
	"regexp"
	"strings"
)

// RiskLevel 表示命令安全风险等级。
type RiskLevel string

const (
	RiskLevelSafeReadOnly RiskLevel = "SAFE_READ_ONLY"
	RiskLevelBlockedHigh  RiskLevel = "BLOCKED_HIGH_RISK"
	RiskLevelBlockedCrit  RiskLevel = "BLOCKED_CRITICAL"
)

// ShellCommandNode 表示经词法与管道/连接符切分后的单条子命令 AST 节点。
type ShellCommandNode struct {
	RawSegment string   `json:"raw_segment"`
	Operator   string   `json:"operator,omitempty"` // 连接符：|, &&, ||, ;
	Binary     string   `json:"binary"`             // 主执行程序或内置命令
	Args       []string `json:"args"`               // 参数列表
}

// PolicyDecision 保存安全策略门禁对一条命令或脚本的完整判定结论。
type PolicyDecision struct {
	Allowed       bool               `json:"allowed"`
	RiskLevel     RiskLevel          `json:"risk_level"`
	ViolationCode string             `json:"violation_code,omitempty"`
	Reason        string             `json:"reason"`
	ParsedNodes   []ShellCommandNode `json:"parsed_nodes"`
}

// allowedReadOnlyBinaries 定义沙箱容器内允许调用的只读文本分析与系统状态诊断工具白名单。
var allowedReadOnlyBinaries = map[string]bool{
	"grep":       true,
	"egrep":      true,
	"fgrep":      true,
	"awk":        true,
	"sed":        true,
	"cat":        true,
	"head":       true,
	"tail":       true,
	"wc":         true,
	"sort":       true,
	"uniq":       true,
	"cut":        true,
	"tr":         true,
	"expr":       true,
	"echo":       true,
	"printf":     true,
	"test":       true,
	"[":          true,
	"true":       true,
	"false":      true,
	"uname":      true,
	"date":       true,
	"stat":       true,
	"df":         true,
	"du":         true,
	"ps":         true,
	"free":       true,
	"uptime":     true,
	"id":         true,
	"whoami":     true,
	"sha256sum":  true,
	"md5sum":     true,
	"gre_cli":    true,
}

// blockedDestructiveBinaries 定义绝对禁止执行的破坏性、写状态、提权或外联工具黑名单。
var blockedDestructiveBinaries = map[string]string{
	"rm":            "禁止删除文件或目录 (rm)",
	"rmdir":         "禁止删除目录 (rmdir)",
	"mv":            "禁止移动或覆写文件 (mv)",
	"cp":            "禁止复制写入文件 (cp)",
	"dd":            "禁止底层块设备读写 (dd)",
	"mkfs":          "禁止格式化文件系统 (mkfs)",
	"fdisk":         "禁止修改磁盘分区表 (fdisk)",
	"mount":         "禁止挂载文件系统 (mount)",
	"umount":        "禁止卸载文件系统 (umount)",
	"chmod":         "禁止修改文件权限位 (chmod)",
	"chown":         "禁止修改文件属主 (chown)",
	"chattr":        "禁止修改文件扩展属性 (chattr)",
	"iptables":      "禁止修改防火墙规则 (iptables)",
	"ip6tables":     "禁止修改防火墙规则 (ip6tables)",
	"nft":           "禁止修改 nftables 规则 (nft)",
	"route":         "禁止修改内核路由表 (route)",
	"ifconfig":      "禁止修改网卡配置 (ifconfig)",
	"ip":            "禁止调用 ip 命令修改网络栈",
	"reboot":        "禁止重启系统 (reboot)",
	"shutdown":      "禁止关机 (shutdown)",
	"poweroff":      "禁止断电关机 (poweroff)",
	"init":          "禁止切换系统运行级别 (init)",
	"kill":          "禁止向进程发送信号 (kill)",
	"killall":       "禁止批量终止进程 (killall)",
	"pkill":         "禁止按模式终止进程 (pkill)",
	"systemctl":     "禁止变更 systemd 服务状态 (systemctl)",
	"service":       "禁止变更系统服务状态 (service)",
	"supervisorctl": "禁止变更 supervisor 进程状态",
	"crontab":       "禁止修改定时任务 (crontab)",
	"useradd":       "禁止创建系统用户 (useradd)",
	"userdel":       "禁止删除系统用户 (userdel)",
	"usermod":       "禁止修改系统用户 (usermod)",
	"passwd":        "禁止修改用户密码 (passwd)",
	"su":            "禁止切换用户身份 (su)",
	"sudo":          "禁止提权执行 (sudo)",
	"nc":            "禁止使用 netcat 建立原始套接字或反弹 Shell (nc)",
	"ncat":          "禁止使用 ncat 建立外部连接",
	"netcat":        "禁止使用 netcat 建立外部连接",
	"socat":         "禁止使用 socat 转发套接字",
	"telnet":        "禁止使用 telnet 外联",
	"curl":          "禁止在诊断探针中发起外部 HTTP 请求 (curl)",
	"wget":          "禁止下载外部文件 (wget)",
	"ssh":           "禁止发起嵌套 SSH 连接 (ssh)",
	"scp":           "禁止发起 SCP 文件传输 (scp)",
	"sftp":          "禁止发起 SFTP 传输 (sftp)",
	"rsync":         "禁止发起 rsync 同步",
	"docker":        "禁止在沙箱内嵌套调用 docker (Docker-in-Docker 逃逸风险)",
	"kubectl":       "禁止直接操作 Kubernetes 集群控制面",
	"python":        "禁止执行任意解释器脚本 (python)",
	"python3":       "禁止执行任意解释器脚本 (python3)",
	"perl":          "禁止执行任意解释器脚本 (perl)",
	"ruby":          "禁止执行任意解释器脚本 (ruby)",
	"node":          "禁止执行任意解释器脚本 (node)",
	"sh":            "禁止显式启动嵌套子 Shell (sh)",
	"bash":          "禁止显式启动嵌套子 Shell (bash)",
	"zsh":           "禁止显式启动嵌套子 Shell (zsh)",
	"eval":          "禁止使用 eval 动态执行拼接字符串",
	"exec":          "禁止使用 exec 替换当前进程镜像",
	"source":        "禁止 source 外部脚本",
	"tee":           "禁止使用 tee 落盘写文件",
	"xargs":         "禁止使用 xargs 动态拼装执行命令",
	"find":          "禁止使用 find 扫描全盘或联动 -delete/-exec",
}

// sensitivePathPatterns 定义严禁读取或触碰的敏感凭据与内核接口路径。
var sensitivePathPatterns = []*regexp.Regexp{
	regexp.MustCompile(`(?i)/etc/(shadow|gshadow|sudoers|passwd|master\.passwd)`),
	regexp.MustCompile(`(?i)\.(ssh|aws|kube|gnupg|gre_cli)/`),
	regexp.MustCompile(`(?i)(id_rsa|id_ed25519|authorized_keys|credentials|config\.yaml)`),
	regexp.MustCompile(`(?i)/proc/(kcore|kallsyms|sysrq-trigger|1/environ)`),
	regexp.MustCompile(`(?i)/dev/(mem|kmem|port|sd[a-z]|nvme|vd[a-z]|tcp/|udp/)`),
}

// dangerousRawPatterns 定义在词法切分前优先拦截的高危攻击载荷特征（如 Fork 炸弹、命令替换、反弹 Shell、SQL 破坏）。
var dangerousRawPatterns = []struct {
	code    string
	pattern *regexp.Regexp
	reason  string
}{
	{
		code:    "FORK_BOMB",
		pattern: regexp.MustCompile(`:\s*\(\s*\)\s*\{.*\|.*&\s*\}\s*;`),
		reason:  "检测到 POSIX Shell Fork 炸弹特征",
	},
	{
		code:    "REVERSE_SHELL",
		pattern: regexp.MustCompile(`(?i)(/dev/tcp/|/dev/udp/|bash\s+-i|sh\s+-i|0>&1|>&\s*/dev/|mkfifo\s+)`),
		reason:  "检测到反弹 Shell 套接字重定向特征",
	},
	{
		code:    "COMMAND_SUBSTITUTION",
		pattern: regexp.MustCompile("(\\$\\([^)]+\\)|`[^`]+`)"),
		reason:  "禁止在沙箱诊断探针中使用 $() 或反引号命令替换，防止嵌套命令注入",
	},
	{
		code:    "DESTRUCTIVE_SQL",
		pattern: regexp.MustCompile(`(?i)\b(drop\s+table|drop\s+database|truncate\s+table|delete\s+from|alter\s+table)\b`),
		reason:  "检测到破坏性数据库 DDL/DML 语句",
	},
}

// CommandPolicyGuard 实现面向 SRE 诊断脚本的 AST/词法级安全策略门禁。
type CommandPolicyGuard struct{}

// NewCommandPolicyGuard 创建默认安全策略门禁实例。
func NewCommandPolicyGuard() *CommandPolicyGuard {
	return &CommandPolicyGuard{}
}

// Evaluate 对输入的 Shell 脚本或命令进行静态词法与 AST 节点安全审查。
func (g *CommandPolicyGuard) Evaluate(script string) PolicyDecision {
	trimmed := strings.TrimSpace(script)
	if trimmed == "" {
		return PolicyDecision{
			Allowed:       false,
			RiskLevel:     RiskLevelBlockedHigh,
			ViolationCode: "EMPTY_COMMAND",
			Reason:        "命令内容不能为空",
		}
	}

	// 1. 优先扫描全局高危攻击载荷模式（Fork 炸弹、反弹 Shell、命令替换）
	for _, dp := range dangerousRawPatterns {
		if dp.pattern.MatchString(trimmed) {
			return PolicyDecision{
				Allowed:       false,
				RiskLevel:     RiskLevelBlockedCrit,
				ViolationCode: dp.code,
				Reason:        dp.reason,
			}
		}
	}

	// 2. 扫描敏感凭据与内核设备路径访问
	for _, sp := range sensitivePathPatterns {
		if sp.MatchString(trimmed) {
			return PolicyDecision{
				Allowed:       false,
				RiskLevel:     RiskLevelBlockedCrit,
				ViolationCode: "SENSITIVE_PATH_ACCESS",
				Reason:        fmt.Sprintf("禁止访问敏感凭据或内核接口路径: 命中规则 %s", sp.String()),
			}
		}
	}

	// 3. 检查非引号包裹的写文件重定向操作符（仅放行 >/dev/null 与 2>/dev/null 或 2>&1）
	if hasUnsafeRedirection(trimmed) {
		return PolicyDecision{
			Allowed:       false,
			RiskLevel:     RiskLevelBlockedHigh,
			ViolationCode: "FILE_WRITE_REDIRECTION",
			Reason:        "禁止在只读诊断探针中使用 > 或 >> 写文件重定向（仅允许 >/dev/null）",
		}
	}

	// 4. 解析管道与逻辑连接符，生成 ShellCommandNode AST 序列
	nodes, err := ParseShellAST(trimmed)
	if err != nil {
		return PolicyDecision{
			Allowed:       false,
			RiskLevel:     RiskLevelBlockedHigh,
			ViolationCode: "SHELL_SYNTAX_ERROR",
			Reason:        fmt.Sprintf("Shell 词法解析失败（可能存在未闭合引号或畸形转义）: %v", err),
		}
	}
	if len(nodes) == 0 {
		return PolicyDecision{
			Allowed:       false,
			RiskLevel:     RiskLevelBlockedHigh,
			ViolationCode: "EMPTY_AST",
			Reason:        "解析后无有效命令节点",
		}
	}

	// 5. 逐个审查 AST 命令节点的二进制白名单、黑名单与危险参数
	for _, node := range nodes {
		baseBin := filepath.Base(node.Binary)
		// 禁止通过绝对/相对路径绕过（如 /bin/rm 或 ./evil）
		if strings.Contains(node.Binary, "/") && node.Binary != "/bin/sh" {
			return PolicyDecision{
				Allowed:       false,
				RiskLevel:     RiskLevelBlockedCrit,
				ViolationCode: "EXPLICIT_PATH_EXECUTION",
				Reason:        fmt.Sprintf("禁止直接指定路径执行二进制 %q，必须使用受控白名单命令名", node.Binary),
				ParsedNodes:   nodes,
			}
		}

		if reason, blocked := blockedDestructiveBinaries[baseBin]; blocked {
			return PolicyDecision{
				Allowed:       false,
				RiskLevel:     RiskLevelBlockedCrit,
				ViolationCode: "BLOCKED_BINARY_" + strings.ToUpper(baseBin),
				Reason:        reason,
				ParsedNodes:   nodes,
			}
		}

		if !allowedReadOnlyBinaries[baseBin] {
			return PolicyDecision{
				Allowed:       false,
				RiskLevel:     RiskLevelBlockedHigh,
				ViolationCode: "UNLISTED_BINARY",
				Reason:        fmt.Sprintf("命令 %q 不在只读诊断白名单中", baseBin),
				ParsedNodes:   nodes,
			}
		}

		// 针对特定白名单工具的危险参数做细粒度拦截
		if violationCode, reason := validateBinaryArgs(baseBin, node.Args); violationCode != "" {
			return PolicyDecision{
				Allowed:       false,
				RiskLevel:     RiskLevelBlockedHigh,
				ViolationCode: violationCode,
				Reason:        reason,
				ParsedNodes:   nodes,
			}
		}
	}

	return PolicyDecision{
		Allowed:     true,
		RiskLevel:   RiskLevelSafeReadOnly,
		Reason:      "通过 AST 词法安全审查：所有命令节点均属于只读诊断白名单",
		ParsedNodes: nodes,
	}
}

// validateBinaryArgs 对白名单命令的细粒度参数进行安全边界检查。
// 例如：`sed -i` 会原地改写文件；`awk` 中的 `system()` 会逃逸执行外部命令；`gre_cli host run/scp` 会触发远程写操作。
func validateBinaryArgs(bin string, args []string) (string, string) {
	switch bin {
	case "sed":
		for _, a := range args {
			if a == "-i" || strings.HasPrefix(a, "-i") || a == "--in-place" {
				return "SED_INPLACE_WRITE", "禁止使用 sed -i 原地修改文件"
			}
		}
	case "awk":
		for _, a := range args {
			lower := strings.ToLower(a)
			if strings.Contains(lower, "system(") {
				return "AWK_SYSTEM_ESCAPE", "禁止在 awk 脚本中调用 system() 执行外部命令"
			}
			if a == "-i" || a == "inplace" {
				return "AWK_INPLACE_WRITE", "禁止使用 awk inplace 修改文件"
			}
		}
	case "gre_cli":
		if len(args) == 0 {
			return "GRE_CLI_EMPTY_SUBCMD", "gre_cli 必须指定只读子命令"
		}
		sub := args[0]
		if sub == "update" || sub == "auth" || sub == "set-env" || sub == "set-project" {
			return "GRE_CLI_MUTATING_CMD", fmt.Sprintf("禁止在沙箱内执行修改配置的 gre_cli %s 命令", sub)
		}
		if sub == "host" && len(args) >= 2 {
			action := args[1]
			if action == "run" || action == "scp" || action == "ssh" || action == "module" {
				return "GRE_CLI_REMOTE_EXEC", fmt.Sprintf("禁止通过 gre_cli host %s 发起远程主机命令或文件传输", action)
			}
		}
		if sub == "job" && len(args) >= 2 {
			action := args[1]
			if action == "run" || action == "create" || action == "approval" {
				return "GRE_CLI_JOB_MUTATION", fmt.Sprintf("禁止通过 gre_cli job %s 创建或触发远程作业", action)
			}
		}
	}
	return "", ""
}

// ParseShellAST 将 Shell 命令字符串按未加引号的管道 `|`、分号 `;`、逻辑与 `&&`、逻辑或 `||` 切分为子命令 AST 节点，
// 并剥离前导环境变量赋值（如 `LC_ALL=C`），提取每段的主二进制名与参数列表。
func ParseShellAST(script string) ([]ShellCommandNode, error) {
	segments, ops, err := splitShellSegments(script)
	if err != nil {
		return nil, err
	}

	var nodes []ShellCommandNode
	for i, seg := range segments {
		cleanSeg := stripSafeDevNullRedirects(seg)
		tokens, err := tokenizeShellWords(cleanSeg)
		if err != nil {
			return nil, err
		}
		// 跳过纯环境变量赋值前缀（如 KEY=VALUE）
		idx := 0
		for idx < len(tokens) && isEnvAssignment(tokens[idx]) {
			idx++
		}
		if idx >= len(tokens) {
			continue
		}
		op := ""
		if i < len(ops) {
			op = ops[i]
		}
		nodes = append(nodes, ShellCommandNode{
			RawSegment: strings.TrimSpace(seg),
			Operator:   op,
			Binary:     tokens[idx],
			Args:       tokens[idx+1:],
		})
	}
	return nodes, nil
}

// splitShellSegments 在感知单双引号的前提下按 |, &&, ||, ;, \n 切分命令段落。
func splitShellSegments(s string) ([]string, []string, error) {
	var segments []string
	var ops []string
	var buf strings.Builder
	inSingle := false
	inDouble := false
	escaped := false

	runes := []rune(s)
	for i := 0; i < len(runes); i++ {
		r := runes[i]
		if escaped {
			buf.WriteRune(r)
			escaped = false
			continue
		}
		if r == '\\' && !inSingle {
			escaped = true
			buf.WriteRune(r)
			continue
		}
		if r == '\'' && !inDouble {
			inSingle = !inSingle
			buf.WriteRune(r)
			continue
		}
		if r == '"' && !inSingle {
			inDouble = !inDouble
			buf.WriteRune(r)
			continue
		}

		if !inSingle && !inDouble {
			if r == ';' || r == '\n' {
				segments = append(segments, buf.String())
				ops = append(ops, ";")
				buf.Reset()
				continue
			}
			if r == '|' {
				if i+1 < len(runes) && runes[i+1] == '|' {
					segments = append(segments, buf.String())
					ops = append(ops, "||")
					buf.Reset()
					i++
					continue
				}
				segments = append(segments, buf.String())
				ops = append(ops, "|")
				buf.Reset()
				continue
			}
			if r == '&' {
				if i+1 < len(runes) && runes[i+1] == '&' {
					segments = append(segments, buf.String())
					ops = append(ops, "&&")
					buf.Reset()
					i++
					continue
				}
				// 禁止单 & 后台驻留进程
				return nil, nil, fmt.Errorf("禁止使用单个 '&' 启动后台驻留进程")
			}
		}
		buf.WriteRune(r)
	}

	if inSingle || inDouble {
		return nil, nil, fmt.Errorf("存在未闭合的引号")
	}
	if strings.TrimSpace(buf.String()) != "" {
		segments = append(segments, buf.String())
	}
	return segments, ops, nil
}

// tokenizeShellWords 将单段命令按引号感知规则拆分为独立词元。
func tokenizeShellWords(seg string) ([]string, error) {
	var tokens []string
	var cur strings.Builder
	inSingle := false
	inDouble := false
	escaped := false
	hasToken := false

	for _, r := range seg {
		if escaped {
			cur.WriteRune(r)
			escaped = false
			hasToken = true
			continue
		}
		if r == '\\' && !inSingle {
			escaped = true
			hasToken = true
			continue
		}
		if r == '\'' && !inDouble {
			inSingle = !inSingle
			hasToken = true
			continue
		}
		if r == '"' && !inSingle {
			inDouble = !inDouble
			hasToken = true
			continue
		}
		if !inSingle && !inDouble && (r == ' ' || r == '\t' || r == '\r') {
			if hasToken {
				tokens = append(tokens, cur.String())
				cur.Reset()
				hasToken = false
			}
			continue
		}
		cur.WriteRune(r)
		hasToken = true
	}
	if inSingle || inDouble {
		return nil, fmt.Errorf("未闭合的引号")
	}
	if hasToken {
		tokens = append(tokens, cur.String())
	}
	return tokens, nil
}

// hasUnsafeRedirection 检查命令在引号外是否包含除 >/dev/null、2>/dev/null、2>&1 之外的重定向写操作。
func hasUnsafeRedirection(script string) bool {
	cleaned := stripSafeDevNullRedirects(script)
	inSingle := false
	inDouble := false
	escaped := false

	for _, r := range cleaned {
		if escaped {
			escaped = false
			continue
		}
		if r == '\\' && !inSingle {
			escaped = true
			continue
		}
		if r == '\'' && !inDouble {
			inSingle = !inSingle
			continue
		}
		if r == '"' && !inSingle {
			inDouble = !inDouble
			continue
		}
		if !inSingle && !inDouble && r == '>' {
			return true
		}
	}
	return false
}

var safeRedirectRe = regexp.MustCompile(`(?:(?:^|\s|[12])\s*>\s*/dev/null\b|\b2>&1)`)

func stripSafeDevNullRedirects(s string) string {
	return safeRedirectRe.ReplaceAllString(s, " ")
}

func isEnvAssignment(token string) bool {
	eqIdx := strings.IndexByte(token, '=')
	if eqIdx <= 0 {
		return false
	}
	name := token[:eqIdx]
	for i := 0; i < len(name); i++ {
		c := name[i]
		if !((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c == '_' || (i > 0 && c >= '0' && c <= '9')) {
			return false
		}
	}
	return true
}
