#!/usr/bin/env bash
# Day 01-45：一键 smoke 入口。
#
# 本脚本学习重点：
# 1. Shell 入口只负责准备环境，不把验证逻辑写散在 bash 里。
# 2. 使用当前 PATH 中的 node，避免写死某台机器的安装路径。
# 3. 最终把参数原样转交给 scripts/run-all-examples.mjs，由 JS runner 统一输出结果表。

# set -e：任意命令失败立即退出，防止错误继续扩大。
# set -u：引用未定义变量时报错，避免拼错变量名后默默执行空值。
# set -o pipefail：管道中任意一段失败都算失败，避免只看最后一个命令退出码。
set -euo pipefail

# BASH_SOURCE[0] 是当前脚本路径；dirname 取脚本目录；/.. 回到仓库根目录。
# cd + pwd 会得到绝对路径，避免从其它目录调用脚本时 cwd 错乱。
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# 切到仓库根目录，保证 runner 里的相对路径和 npm scripts 都按项目根执行。
cd "${REPO_ROOT}"

# exec 会用 node 进程替换当前 shell 进程。
# "$@" 会把用户传给 shell 脚本的所有参数原样转交给 JS runner。
exec node scripts/run-all-examples.mjs "$@"
