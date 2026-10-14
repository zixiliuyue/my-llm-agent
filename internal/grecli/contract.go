// Package grecli 严格对齐 /Users/hongsen.ren/code/gre/gpmm/gre_cli 的真实子命令数据契约，
// 为 SRE 根因定位 Agent 提供标准化的告警（alert）、事件（event）、主机监控与项目反查（host）、
// 骨干网拨测（noc sgs）、DDoS（ddos）、作业历史（job）与 Collie 库存（inventory）诊断工具箱。
package grecli

import (
	"context"
	"encoding/json"
	"fmt"
	"os/exec"
	"strings"
	"time"
)

// AlertItem 严格对应 gre_cli internal/app/alert_output.go 中的 alertListItem 结构。
type AlertItem struct {
	UID     string         `json:"_id"`
	ID      string         `json:"id"`
	Name    string         `json:"name"`
	Project string         `json:"project"`
	Host    string         `json:"host"`
	Labels  map[string]any `json:"labels"`
}

// HostProjectInfo 严格对应 gre_cli `host project <IP>` (/api/cli/hosts/projects) 的跨业务归属反查结果。
type HostProjectInfo struct {
	Query                string   `json:"query"`
	SharedNATEIP         bool     `json:"shared_nat_eip"`
	AuthorizedCount      int      `json:"authorized_count"`
	UnauthorizedCount    int      `json:"unauthorized_count"`
	Projects             []string `json:"projects"`
	ActualCulpritProject string   `json:"actual_culprit_project,omitempty"`
	HasHostRunPermission bool     `json:"has_host_run_permission"`
}

// HostMetricPoint 表示 `gre_cli host monitoring query` 返回的单条指标采样值。
type HostMetricPoint struct {
	MetricID  string            `json:"id"`
	Name      string            `json:"name"`
	Unit      string            `json:"unit"`
	Value     float64           `json:"value"`
	Labels    map[string]string `json:"labels,omitempty"`
	Timestamp string            `json:"timestamp"`
}

// NOCSGSSnapshot 对应 `gre_cli noc sgs query --panel <PANEL>` 与 `chart ff-mtr` 的骨干网/CDN 观测数据。
type NOCSGSSnapshot struct {
	Dashboard        string  `json:"dashboard"`
	Panel            string  `json:"panel"`
	PromQL           string  `json:"promql"`
	RegionPair       string  `json:"region_pair"`
	BGPASPathFlap    bool    `json:"bgp_as_path_flap"`
	PacketLossPct    float64 `json:"packet_loss_pct"`
	RTTJitterMs      float64 `json:"rtt_jitter_ms"`
	CDNHTTP200Ratio  float64 `json:"cdn_http200_ratio"`
	DDoSActiveAttack bool    `json:"ddos_active_attack"`
}

// JobAuditSnapshot 对应 `gre_cli job history` 与 `gre_cli job audit` 的作业与配置变更记录。
type JobAuditSnapshot struct {
	TaskID        string `json:"task_id"`
	HistoryID     string `json:"history_id"`
	Project       string `json:"project"`
	OperationType string `json:"operation_type"`
	Status        string `json:"status"`
	ErrorSummary  string `json:"error_summary"`
}

// TelemetrySnapshot 聚合单张历史故障工单对应的 gre_cli 多维观测数据与宿主机/容器原始诊断日志。
type TelemetrySnapshot struct {
	Env              string            `json:"env"` // dev | sit | pro (遵循 gre_cli 固定环境枚举)
	Project          string            `json:"project"`
	TargetHost       string            `json:"target_host"`
	TargetAssetID    string            `json:"target_asset_id"`
	Alerts           []AlertItem       `json:"alerts"`
	HostProject      HostProjectInfo   `json:"host_project"`
	HostMetrics      []HostMetricPoint `json:"host_metrics"`
	NOCSGS           NOCSGSSnapshot    `json:"noc_sgs"`
	JobAudits        []JobAuditSnapshot `json:"job_audits"`
	RawDiagnosticLog string            `json:"raw_diagnostic_log"` // 供 Docker 沙箱容器探针消费的原始日志/指标快照
}

// ToolCallOutput 表示单次调用 gre_cli 诊断工具的结构化返回与执行的等效 CLI 命令。
type ToolCallOutput struct {
	ToolName       string `json:"tool_name"`
	EquivalentCLI  string `json:"equivalent_cli"`
	OutputJSON     string `json:"output_json"`
	Summary        string `json:"summary"`
	ExecutionDurMs float64 `json:"execution_dur_ms"`
}

// Executor 定义 gre_cli 诊断命令执行器，支持“离线工单快照确定性回放”与“本机真实 gre_cli 二进制调用”双模式。
type Executor struct {
	BinaryPath string
}

// NewExecutor 创建 gre_cli 诊断执行器。
func NewExecutor(binaryPath string) *Executor {
	return &Executor{BinaryPath: binaryPath}
}

// QueryAlerts 执行等价于 `gre_cli --env <env> alert list` 的告警聚合查询。
func (e *Executor) QueryAlerts(_ context.Context, snap TelemetrySnapshot) ToolCallOutput {
	start := time.Now()
	cliCmd := fmt.Sprintf("gre_cli --env %s set-project %s && gre_cli alert list", nonEmpty(snap.Env, "pro"), snap.Project)
	raw, _ := json.Marshal(map[string]any{
		"project": snap.Project,
		"host":    snap.TargetHost,
		"data":    snap.Alerts,
	})
	var names []string
	for _, a := range snap.Alerts {
		names = append(names, a.Name)
	}
	return ToolCallOutput{
		ToolName:       "gre_alert_query",
		EquivalentCLI:  cliCmd,
		OutputJSON:     string(raw),
		Summary:        fmt.Sprintf("project=%s host=%s alerts=%v", snap.Project, snap.TargetHost, names),
		ExecutionDurMs: float64(time.Since(start).Microseconds()) / 1000.0,
	}
}

// QueryHostAndMetrics 执行等价于 `gre_cli host project <IP>` 与 `gre_cli host monitoring query --asset-id <ID>` 的查询。
func (e *Executor) QueryHostAndMetrics(_ context.Context, snap TelemetrySnapshot) ToolCallOutput {
	start := time.Now()
	cliCmd := fmt.Sprintf(
		"gre_cli host project %s && gre_cli host monitoring query --asset-id %s --step 1m",
		snap.TargetHost, snap.TargetAssetID,
	)
	raw, _ := json.Marshal(map[string]any{
		"host_project": snap.HostProject,
		"asset_id":     snap.TargetAssetID,
		"metrics":      snap.HostMetrics,
	})
	var metricKv []string
	for _, m := range snap.HostMetrics {
		metricKv = append(metricKv, fmt.Sprintf("%s=%.2f%s", m.MetricID, m.Value, m.Unit))
	}
	return ToolCallOutput{
		ToolName:      "gre_host_metrics",
		EquivalentCLI: cliCmd,
		OutputJSON:    string(raw),
		Summary: fmt.Sprintf(
			"shared_nat=%t projects=%v metrics=[%s]",
			snap.HostProject.SharedNATEIP, snap.HostProject.Projects, strings.Join(metricKv, ", "),
		),
		ExecutionDurMs: float64(time.Since(start).Microseconds()) / 1000.0,
	}
}

// QueryNOCAndJobContext 执行等价于 `gre_cli noc sgs query`、`gre_cli ddos summary` 与 `gre_cli job audit` 的链路及变更上下文查询。
func (e *Executor) QueryNOCAndJobContext(_ context.Context, snap TelemetrySnapshot) ToolCallOutput {
	start := time.Now()
	cliCmd := fmt.Sprintf(
		"gre_cli noc sgs query --panel %s && gre_cli ddos summary && gre_cli job audit --project %s",
		nonEmpty(snap.NOCSGS.Panel, "backbone_overview"), snap.Project,
	)
	raw, _ := json.Marshal(map[string]any{
		"noc_sgs":    snap.NOCSGS,
		"job_audits": snap.JobAudits,
	})
	return ToolCallOutput{
		ToolName:      "gre_noc_and_job_audit",
		EquivalentCLI: cliCmd,
		OutputJSON:    string(raw),
		Summary: fmt.Sprintf(
			"bgp_flap=%t loss=%.1f%% cdn_200=%.1f%% jobs=%d",
			snap.NOCSGS.BGPASPathFlap, snap.NOCSGS.PacketLossPct, snap.NOCSGS.CDNHTTP200Ratio, len(snap.JobAudits),
		),
		ExecutionDurMs: float64(time.Since(start).Microseconds()) / 1000.0,
	}
}

// RunLiveVersionCheck 当配置了本机 gre_cli 二进制路径时，调用真实 `gre_cli --version` 验证二进制契约连通性。
func (e *Executor) RunLiveVersionCheck(ctx context.Context) (string, error) {
	if strings.TrimSpace(e.BinaryPath) == "" {
		return "", fmt.Errorf("未指定 gre_cli 二进制路径")
	}
	cmd := exec.CommandContext(ctx, e.BinaryPath, "--version")
	out, err := cmd.CombinedOutput()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(out)), nil
}

func nonEmpty(v, fallback string) string {
	if strings.TrimSpace(v) != "" {
		return v
	}
	return fallback
}
