package grecli

import (
	"context"
	"strings"
	"testing"
)

// TestExecutorQueryContracts 验证 gre_cli 诊断工具箱对告警、主机项目归属、监控指标与 NOC SGS 的结构化契约输出。
func TestExecutorQueryContracts(t *testing.T) {
	ctx := context.Background()
	exec := NewExecutor("")

	snap := TelemetrySnapshot{
		Env:           "pro",
		Project:       "gpmm",
		TargetHost:    "203.0.113.45",
		TargetAssetID: "ASSET-SG-0091",
		Alerts: []AlertItem{
			{
				UID:     "670f1122aa",
				ID:      "ALT-1001",
				Name:    "PublicSNATOutboundSpike",
				Project: "gpmm",
				Host:    "203.0.113.45",
			},
		},
		HostProject: HostProjectInfo{
			Query:                "203.0.113.45",
			SharedNATEIP:         true,
			AuthorizedCount:      3,
			Projects:             []string{"gpmm", "ccu", "queenbee"},
			ActualCulpritProject: "queenbee",
		},
		HostMetrics: []HostMetricPoint{
			{MetricID: "net_out_bytes_per_sec", Name: "Outbound Traffic", Unit: "B/s", Value: 98500000},
		},
		NOCSGS: NOCSGSSnapshot{
			Dashboard:       "sgs_global",
			Panel:           "backbone_packet_loss",
			BGPASPathFlap:   true,
			PacketLossPct:   22.5,
			CDNHTTP200Ratio: 61.2,
		},
		JobAudits: []JobAuditSnapshot{
			{TaskID: "JOB-88", HistoryID: "H-901", Project: "gpmm", OperationType: "config_sync", Status: "SUCCESS"},
		},
	}

	alertOut := exec.QueryAlerts(ctx, snap)
	if !strings.Contains(alertOut.EquivalentCLI, "gre_cli alert list") {
		t.Fatalf("EquivalentCLI 未包含 gre_cli alert list: %s", alertOut.EquivalentCLI)
	}
	if !strings.Contains(alertOut.Summary, "PublicSNATOutboundSpike") {
		t.Fatalf("Summary 未包含告警名: %s", alertOut.Summary)
	}

	hostOut := exec.QueryHostAndMetrics(ctx, snap)
	if !strings.Contains(hostOut.EquivalentCLI, "gre_cli host project 203.0.113.45") {
		t.Fatalf("EquivalentCLI 未包含 host project: %s", hostOut.EquivalentCLI)
	}
	if !strings.Contains(hostOut.Summary, "shared_nat=true") {
		t.Fatalf("Summary 未反映共享 NAT EIP 状态: %s", hostOut.Summary)
	}

	nocOut := exec.QueryNOCAndJobContext(ctx, snap)
	if !strings.Contains(nocOut.EquivalentCLI, "gre_cli noc sgs query") {
		t.Fatalf("EquivalentCLI 未包含 noc sgs query: %s", nocOut.EquivalentCLI)
	}
	if !strings.Contains(nocOut.Summary, "bgp_flap=true") {
		t.Fatalf("Summary 未包含 BGP 震荡状态: %s", nocOut.Summary)
	}
}
