# Day 02：多 Agent 协作预告

第二天会在第一天单体 agent 的基础上，把一个 agent loop 拆成多个职责明确的 agent。当前目录先作为学习路线和设计入口，暂不放未实现命令。

## 目标

把第一天的单体流程：

```text
用户问题 -> 一个模型决定工具和最终答案
```

扩展成多 agent 协作：

```text
用户问题
  -> planner agent 拆任务
  -> tool agent 执行工具
  -> critic agent 检查结果
  -> writer agent 生成最终回答
```

## 计划实现的能力

- 多 agent 角色定义：每个 agent 有自己的 system prompt。
- 明确交接协议：上一个 agent 的输出必须是下一个 agent 的输入。
- 共享工具层：复用第一天的 `current_time`、`calculator`、`search_notes`。
- 共享 observation：工具结果和检查结果进入统一上下文。
- 可切换模型接口：继续使用 `OLLAMA_HOST` 和 `OLLAMA_MODEL`，支持本地 Ollama 和测试环境 Ollama。

## 为什么第二天再做

多 agent 的难点不是多调用几次模型，而是控制边界：

- planner 不能直接编造工具结果。
- tool agent 只负责执行和整理 observation。
- critic 只检查问题，不重新发明答案。
- writer 只基于已有上下文写最终回答。

第一天先把单体 agent loop 跑通，再拆职责会更清楚。

## 后续建议目录

```text
day02-multi-agent-preview/
├── README.md
├── prompts/
│   ├── planner.md
│   ├── tool-runner.md
│   ├── critic.md
│   └── writer.md
├── src/
│   ├── multi-agent.js
│   ├── roles.js
│   └── handoff-protocol.js
└── test/
    └── multi-agent.test.js
```

等 day01 的本地模型调用稳定后，再按这个结构实现第二天。
