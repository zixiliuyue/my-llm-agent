/**
 * Day 51：自包含学习源码。
 *
 * 这个文件属于 day51-config-hot-reload-diagnosis-agent，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：把配置文件版本、运行时版本、reload 日志和进程启动时间放在一起判断热更新是否真实发生。
export function createMockConfigReloadSnapshot(overrides = {}) {
  return {
    service: overrides.service ?? "owl-health-api",
    configPath: overrides.configPath ?? "server.yaml",
    fileVersion: overrides.fileVersion ?? "cfg-2026-05-25-2",
    runtimeVersion: overrides.runtimeVersion ?? "cfg-2026-05-25-2",
    configMtime: overrides.configMtime ?? "2026-05-25T10:04:00Z",
    processStartedAt: overrides.processStartedAt ?? "2026-05-25T09:00:00Z",
    reloadEvents: overrides.reloadEvents ?? [
      { time: "2026-05-25T10:04:03Z", ok: true, message: "reload config done:true,true" },
    ],
    health: {
      statusCode: overrides.health?.statusCode ?? 200,
      configVersion: overrides.health?.configVersion ?? "cfg-2026-05-25-2",
    },
    restartCount: overrides.restartCount ?? 0,
    backupRestored: overrides.backupRestored ?? false,
  };
}

function time(value) {
  return Date.parse(value);
}

export function collectConfigReloadEvidence(snapshot = createMockConfigReloadSnapshot()) {
  return [
    `service=${snapshot.service}`,
    `config_path=${snapshot.configPath}`,
    `file_version=${snapshot.fileVersion}`,
    `runtime_version=${snapshot.runtimeVersion}`,
    `health_config_version=${snapshot.health.configVersion}`,
    `config_mtime=${snapshot.configMtime}`,
    `process_started_at=${snapshot.processStartedAt}`,
    `restart_count=${snapshot.restartCount}`,
    `backup_restored=${snapshot.backupRestored}`,
    ...snapshot.reloadEvents.map((event) => `reload:${event.time}:${event.ok}:${event.message}`),
  ];
}

// 热更新成立需要运行时版本跟文件版本一致，并且 reload 事件发生在配置修改之后。
export function diagnoseConfigReload(snapshot = createMockConfigReloadSnapshot()) {
  const changedAt = time(snapshot.configMtime);
  const restartedAfterChange = time(snapshot.processStartedAt) >= changedAt || snapshot.restartCount > 0;
  const successfulReloadAfterChange = snapshot.reloadEvents.some((event) => event.ok && time(event.time) >= changedAt);
  const runtimeMatches = snapshot.runtimeVersion === snapshot.fileVersion && snapshot.health.configVersion === snapshot.fileVersion;
  const failedReload = snapshot.reloadEvents.some((event) => !event.ok) || snapshot.backupRestored;

  let status = "unknown";
  const nextActions = [];
  if (runtimeMatches && successfulReloadAfterChange && !restartedAfterChange) {
    // 更新状态：这里会改变前面定义的变量或对象字段。
    status = "hot-reload-confirmed";
    nextActions.push("记录 reload 日志和 health configVersion 作为验收证据。");
  } else if (runtimeMatches && restartedAfterChange) {
    // 更新状态：这里会改变前面定义的变量或对象字段。
    status = "restart-masked-reload";
    nextActions.push("不能把重启后的版本一致当成热更新成功，需要补 reload 前后证据。");
  } else if (failedReload) {
    // 更新状态：这里会改变前面定义的变量或对象字段。
    status = "reload-failed-rollback";
    nextActions.push("查看 reload 失败原因和 backup restore 记录，不要继续依赖旧运行时配置。");
  } else if (!runtimeMatches) {
    // 更新状态：这里会改变前面定义的变量或对象字段。
    status = "reload-missing";
    nextActions.push("检查配置监听、reload endpoint 和运行时版本暴露。");
  } else {
    nextActions.push("补充 config mtime、process start 和 reload log 后再判断。");
  }

  return {
    day: 51,
    title: "配置热更新诊断 Agent",
    localOnly: true,
    service: snapshot.service,
    status,
    evidence: collectConfigReloadEvidence(snapshot),
    nextActions,
  };
}

export function runDemo() {
  return diagnoseConfigReload(createMockConfigReloadSnapshot());
}
