package sandbox

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

// DefaultSandboxImage 定义默认使用的轻量级只读诊断 Linux 容器镜像。
const DefaultSandboxImage = "alpine:3.20"

// globalDockerSem 限制单个进程内同时向本机 Docker Daemon 发起的容器创建/执行并发数，
// 防止高并发评测或多测试并发时 containerd 排队时间计入单容器执行超时。
var globalDockerSem = make(chan struct{}, 3)

// DockerSandboxConfig 定义真实 Docker 容器隔离执行器的资源与安全约束配置。
type DockerSandboxConfig struct {
	Image          string        `json:"image"`
	MemoryLimit    string        `json:"memory_limit"`     // 默认 128m
	CPULimit       string        `json:"cpu_limit"`        // 默认 0.5
	PidsLimit      int           `json:"pids_limit"`       // 默认 64
	TmpfsSpec      string        `json:"tmpfs_spec"`       // 默认 /tmp:rw,noexec,nosuid,size=16m
	DefaultTimeout time.Duration `json:"default_timeout"`  // 默认 25s
}

// DefaultDockerSandboxConfig 返回符合生产安全基线的默认 Docker 沙箱参数。
func DefaultDockerSandboxConfig() DockerSandboxConfig {
	return DockerSandboxConfig{
		Image:          DefaultSandboxImage,
		MemoryLimit:    "128m",
		CPULimit:       "0.5",
		PidsLimit:      64,
		TmpfsSpec:      "/tmp:rw,noexec,nosuid,size=16m",
		DefaultTimeout: 25 * time.Second,
	}
}

// ExecutionRequest 表示一次沙箱探针执行请求。
type ExecutionRequest struct {
	TicketID       string        `json:"ticket_id"`
	ProbeScript    string        `json:"probe_script"`
	TelemetryInput string        `json:"telemetry_input"` // 通过 stdin 注入容器内存 tmpfs 的遥测快照文本
	Timeout        time.Duration `json:"timeout,omitempty"`
}

// ExecutionResult 保存真实 Docker 容器执行或安全策略门禁拦截后的完整结果。
type ExecutionResult struct {
	TicketID       string         `json:"ticket_id"`
	ContainerName  string         `json:"container_name,omitempty"`
	DockerArgs     []string       `json:"docker_args,omitempty"`
	PolicyDecision PolicyDecision `json:"policy_decision"`
	ExecutedInPod  bool           `json:"executed_in_container"`
	TimedOut       bool           `json:"timed_out"`
	ExitCode       int            `json:"exit_code"`
	Stdout         string         `json:"stdout"`
	Stderr         string         `json:"stderr"`
	DurationMs     float64        `json:"duration_ms"`
	AuditHash      string         `json:"audit_hash"`
}

// AuditRecord 表示沙箱不可篡改哈希链中的单条审计日志记录。
// 每条记录的 RecordHash 由前一条记录的 PrevHash 与当前执行要素共同计算 SHA-256 得到。
type AuditRecord struct {
	Sequence      int64          `json:"sequence"`
	Timestamp     string         `json:"timestamp"`
	TicketID      string         `json:"ticket_id"`
	ContainerName string         `json:"container_name"`
	ProbeScript   string         `json:"probe_script"`
	Allowed       bool           `json:"allowed"`
	ViolationCode string         `json:"violation_code,omitempty"`
	Executed      bool           `json:"executed"`
	TimedOut      bool           `json:"timed_out"`
	ExitCode      int            `json:"exit_code"`
	StdoutDigest  string         `json:"stdout_digest"`
	DurationMs    float64        `json:"duration_ms"`
	PrevHash      string         `json:"prev_hash"`
	RecordHash    string         `json:"record_hash"`
}

// DockerSandboxExecutor 实现基于本机 Docker Engine 的真实受限容器安全沙箱执行器。
type DockerSandboxExecutor struct {
	cfg        DockerSandboxConfig
	guard      *CommandPolicyGuard
	seqCounter atomic.Int64

	auditMu      sync.RWMutex
	auditRecords []AuditRecord
	lastHash     string
}

// NewDockerSandboxExecutor 创建真实 Docker 容器安全沙箱执行器。
func NewDockerSandboxExecutor(cfg DockerSandboxConfig) *DockerSandboxExecutor {
	if cfg.Image == "" {
		cfg = DefaultDockerSandboxConfig()
	}
	if cfg.MemoryLimit == "" {
		cfg.MemoryLimit = "128m"
	}
	if cfg.CPULimit == "" {
		cfg.CPULimit = "0.5"
	}
	if cfg.PidsLimit <= 0 {
		cfg.PidsLimit = 64
	}
	if cfg.TmpfsSpec == "" {
		cfg.TmpfsSpec = "/tmp:rw,noexec,nosuid,size=16m"
	}
	if cfg.DefaultTimeout <= 0 {
		cfg.DefaultTimeout = 25 * time.Second
	}
	return &DockerSandboxExecutor{
		cfg:          cfg,
		guard:        NewCommandPolicyGuard(),
		auditRecords: make([]AuditRecord, 0, 128),
		lastHash:     strings.Repeat("0", 64), // 创世哈希（Genesis Hash）
	}
}

// Execute 先通过 CommandPolicyGuard 静态审查命令，若放行则启动真实受限 Docker 容器执行探针脚本。
// 为什么采用 stdin -> /tmp/telemetry.log 方式传递遥测数据：
// 1. 完全不挂载宿主机任何目录（零 `-v` bind mount），从物理上杜绝容器穿透篡改宿主机文件系统的可能。
// 2. 容器根文件系统设为 `--read-only`，仅 `/tmp` 为 16MB `noexec,nosuid` 内存 tmpfs，诊断脚本只能读取 `/tmp/telemetry.log` 并将分析结论打印到 stdout。
func (e *DockerSandboxExecutor) Execute(ctx context.Context, req ExecutionRequest) ExecutionResult {
	start := time.Now()
	seq := e.seqCounter.Add(1)

	// 第一道防线：AST / 词法级安全策略门禁静态拦截
	decision := e.guard.Evaluate(req.ProbeScript)
	if !decision.Allowed {
		durMs := float64(time.Since(start).Microseconds()) / 1000.0
		res := ExecutionResult{
			TicketID:       req.TicketID,
			PolicyDecision: decision,
			ExecutedInPod:  false,
			TimedOut:       false,
			ExitCode:       126, // POSIX Permission/Policy Denied
			Stdout:         "",
			Stderr:         fmt.Sprintf("BLOCKED_BY_SANDBOX_POLICY [%s]: %s", decision.ViolationCode, decision.Reason),
			DurationMs:     durMs,
		}
		res.AuditHash = e.appendAuditRecord(req, "", decision, false, false, res.ExitCode, res.Stdout, durMs)
		return res
	}

	// 获取并发信号量后再开始计算单容器执行超时，避免排队耗时导致正常探针误超时
	select {
	case globalDockerSem <- struct{}{}:
		defer func() { <-globalDockerSem }()
	case <-ctx.Done():
		durMs := float64(time.Since(start).Microseconds()) / 1000.0
		res := ExecutionResult{
			TicketID:       req.TicketID,
			PolicyDecision: decision,
			ExecutedInPod:  false,
			TimedOut:       true,
			ExitCode:       124,
			Stderr:         "SANDBOX_QUEUE_CANCELLED: parent context expired while waiting for docker slot",
			DurationMs:     durMs,
		}
		res.AuditHash = e.appendAuditRecord(req, "", decision, false, true, res.ExitCode, "", durMs)
		return res
	}

	// 第二道防线：构造真实受限 Docker 容器启动参数
	timeout := req.Timeout
	if timeout <= 0 {
		timeout = e.cfg.DefaultTimeout
	}
	execStart := time.Now()
	execCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	containerName := fmt.Sprintf("sre-sbx-%d-%d", time.Now().UnixNano(), seq)

	// 在容器内先将 stdin 写入内存 tmpfs `/tmp/telemetry.log`，再执行经安全审查的只读探针脚本
	wrappedScript := "cat > /tmp/telemetry.log && TELEMETRY_FILE=/tmp/telemetry.log; " + req.ProbeScript

	dockerArgs := []string{
		"run",
		"--rm",
		"-i",
		"--name", containerName,
		"--network=none",
		"--read-only",
		"--tmpfs", e.cfg.TmpfsSpec,
		"--memory=" + e.cfg.MemoryLimit,
		"--cpus=" + e.cfg.CPULimit,
		fmt.Sprintf("--pids-limit=%d", e.cfg.PidsLimit),
		"--security-opt=no-new-privileges",
		e.cfg.Image,
		"/bin/sh", "-c", wrappedScript,
	}

	cmd := exec.CommandContext(execCtx, "docker", dockerArgs...)
	cmd.Stdin = strings.NewReader(req.TelemetryInput)

	var stdoutBuf, stderrBuf bytes.Buffer
	cmd.Stdout = &stdoutBuf
	cmd.Stderr = &stderrBuf

	runErr := cmd.Run()
	durMs := float64(time.Since(execStart).Microseconds()) / 1000.0

	timedOut := false
	exitCode := 0
	if runErr != nil {
		if errors.Is(execCtx.Err(), context.DeadlineExceeded) {
			timedOut = true
			exitCode = 124 // POSIX timeout 退出码
			// 超时后显式强制清理容器，确保宿主机不残留孤儿容器进程
			killCtx, killCancel := context.WithTimeout(context.Background(), 3*time.Second)
			_ = exec.CommandContext(killCtx, "docker", "rm", "-f", containerName).Run()
			killCancel()
		} else {
			var exitErr *exec.ExitError
			if errors.As(runErr, &exitErr) {
				exitCode = exitErr.ExitCode()
			} else {
				exitCode = 1
			}
		}
	}

	stdoutStr := strings.TrimSpace(stdoutBuf.String())
	stderrStr := strings.TrimSpace(stderrBuf.String())
	if timedOut && stderrStr == "" {
		stderrStr = fmt.Sprintf("SANDBOX_TIMEOUT: container %s killed after %v", containerName, timeout)
	}

	res := ExecutionResult{
		TicketID:       req.TicketID,
		ContainerName:  containerName,
		DockerArgs:     dockerArgs,
		PolicyDecision: decision,
		ExecutedInPod:  true,
		TimedOut:       timedOut,
		ExitCode:       exitCode,
		Stdout:         stdoutStr,
		Stderr:         stderrStr,
		DurationMs:     durMs,
	}
	res.AuditHash = e.appendAuditRecord(req, containerName, decision, true, timedOut, exitCode, stdoutStr, durMs)
	return res
}

// appendAuditRecord 将本次沙箱动作追加到不可篡改的 SHA-256 哈希链审计账本中。
func (e *DockerSandboxExecutor) appendAuditRecord(
	req ExecutionRequest,
	containerName string,
	decision PolicyDecision,
	executed bool,
	timedOut bool,
	exitCode int,
	stdout string,
	durationMs float64,
) string {
	e.auditMu.Lock()
	defer e.auditMu.Unlock()

	ts := time.Now().UTC().Format(time.RFC3339Nano)
	outSum := sha256.Sum256([]byte(stdout))
	stdoutDigest := hex.EncodeToString(outSum[:])

	seq := int64(len(e.auditRecords) + 1)
	prevHash := e.lastHash

	payload := fmt.Sprintf(
		"%d|%s|%s|%s|%s|%t|%s|%t|%t|%d|%s|%.3f|%s",
		seq, ts, req.TicketID, containerName, req.ProbeScript,
		decision.Allowed, decision.ViolationCode, executed, timedOut,
		exitCode, stdoutDigest, durationMs, prevHash,
	)
	recSum := sha256.Sum256([]byte(payload))
	recordHash := hex.EncodeToString(recSum[:])

	rec := AuditRecord{
		Sequence:      seq,
		Timestamp:     ts,
		TicketID:      req.TicketID,
		ContainerName: containerName,
		ProbeScript:   req.ProbeScript,
		Allowed:       decision.Allowed,
		ViolationCode: decision.ViolationCode,
		Executed:      executed,
		TimedOut:      timedOut,
		ExitCode:      exitCode,
		StdoutDigest:  stdoutDigest,
		DurationMs:    durationMs,
		PrevHash:      prevHash,
		RecordHash:    recordHash,
	}
	e.auditRecords = append(e.auditRecords, rec)
	e.lastHash = recordHash
	return recordHash
}

// AuditRecords 返回当前沙箱已记录的所有不可篡改审计条目副本。
func (e *DockerSandboxExecutor) AuditRecords() []AuditRecord {
	e.auditMu.RLock()
	defer e.auditMu.RUnlock()
	out := make([]AuditRecord, len(e.auditRecords))
	copy(out, e.auditRecords)
	return out
}

// AuditChainSnapshot 返回当前沙箱审计哈希链快照（与 AuditRecords 等价）。
func (e *DockerSandboxExecutor) AuditChainSnapshot() []AuditRecord {
	return e.AuditRecords()
}

// CheckDockerAvailable 验证本机 Docker Engine 与目标沙箱镜像是否就绪。
func (e *DockerSandboxExecutor) CheckDockerAvailable(ctx context.Context) error {
	cmd := exec.CommandContext(ctx, "docker", "image", "inspect", e.cfg.Image)
	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("docker image inspect %s 失败: %v (%s)", e.cfg.Image, err, strings.TrimSpace(string(out)))
	}
	return nil
}

// ExportAuditChainJSONL 将全部 SHA-256 哈希链审计记录以 JSONL 格式持久化写入磁盘。
func (e *DockerSandboxExecutor) ExportAuditChainJSONL(path string) error {
	records := e.AuditRecords()
	var buf bytes.Buffer
	for _, r := range records {
		line := fmt.Sprintf(
			`{"sequence":%d,"timestamp":%q,"ticket_id":%q,"container_name":%q,"allowed":%t,"violation_code":%q,"executed":%t,"timed_out":%t,"exit_code":%d,"stdout_digest":%q,"duration_ms":%.3f,"prev_hash":%q,"record_hash":%q}`+"\n",
			r.Sequence, r.Timestamp, r.TicketID, r.ContainerName, r.Allowed, r.ViolationCode,
			r.Executed, r.TimedOut, r.ExitCode, r.StdoutDigest, r.DurationMs, r.PrevHash, r.RecordHash,
		)
		buf.WriteString(line)
	}
	return writeFileAtomically(path, buf.Bytes())
}

// VerifyAuditChain 校验全部沙箱审计记录的 SHA-256 前后哈希链是否完整、未被篡改。
func (e *DockerSandboxExecutor) VerifyAuditChain() (bool, error) {
	e.auditMu.RLock()
	defer e.auditMu.RUnlock()

	expectedPrev := strings.Repeat("0", 64)
	for i, rec := range e.auditRecords {
		if rec.PrevHash != expectedPrev {
			return false, fmt.Errorf("审计链在第 %d 条断裂: PrevHash=%s, 期望=%s", i+1, rec.PrevHash, expectedPrev)
		}
		payload := fmt.Sprintf(
			"%d|%s|%s|%s|%s|%t|%s|%t|%t|%d|%s|%.3f|%s",
			rec.Sequence, rec.Timestamp, rec.TicketID, rec.ContainerName, rec.ProbeScript,
			rec.Allowed, rec.ViolationCode, rec.Executed, rec.TimedOut,
			rec.ExitCode, rec.StdoutDigest, rec.DurationMs, rec.PrevHash,
		)
		sum := sha256.Sum256([]byte(payload))
		computed := hex.EncodeToString(sum[:])
		if computed != rec.RecordHash {
			return false, fmt.Errorf("审计记录第 %d 条哈希校验失败: 实际=%s, 重算=%s", i+1, rec.RecordHash, computed)
		}
		expectedPrev = rec.RecordHash
	}
	return true, nil
}

// writeFileAtomically 先创建父目录并写入同目录临时文件，再通过 os.Rename 原子替换，防止并发或中断导致半截文件。
func writeFileAtomically(path string, data []byte) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	tmpPath := fmt.Sprintf("%s.tmp.%d", path, time.Now().UnixNano())
	if err := os.WriteFile(tmpPath, data, 0o644); err != nil {
		return err
	}
	return os.Rename(tmpPath, path)
}

