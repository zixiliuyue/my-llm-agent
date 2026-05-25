# 测试环境 Ollama 部署 dry-run 说明

本目录只提供部署规划和 dry-run 命令，不自动远程执行。

## 推荐边界

- 本地默认：`OLLAMA_HOST=http://127.0.0.1:11434`。
- 测试环境切换：通过命令行显式设置 `OLLAMA_HOST`，不要写进源码。
- 模型目录建议挂载到 `/data9/ollama`，避免占用根分区。
- 远程端口必须加访问控制，不要把 Ollama API 暴露到公网。

## dry-run 示例

```bash
# 用途：生成测试环境 Docker 命令，不执行
# 执行目录：<项目根目录>
# 参数含义：--port 是宿主机端口，--model-dir 是模型目录
# 结果判断：输出 docker run 命令文本
# 风险：dry-run 只打印命令，不部署、不拉模型
npm run day07:dry-run -- --port 11434 --model-dir /data9/ollama
```

## 切换调用示例

```bash
OLLAMA_HOST=http://<test-host>:11434 OLLAMA_MODEL=qwen2.5:7b npm run day01:ask -- "什么是 agent loop"
```

Windows PowerShell：

```powershell
$env:OLLAMA_HOST="http://<test-host>:11434"; $env:OLLAMA_MODEL="qwen2.5:7b"; npm run day01:ask -- "什么是 agent loop"
```

执行真实远程部署前，需要先确认磁盘、端口、防火墙、访问控制和回滚方式。
