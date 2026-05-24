#!/usr/bin/env bash
# 用途：不依赖 shell 默认 npm/node，直接使用本机已验证的 Node 22 跑 30 天 smoke。
set -euo pipefail

NODE22_BIN="/Users/hongsen.ren/.nvm/versions/node/v22.21.1/bin"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export PATH="${NODE22_BIN}:${PATH:-}"
cd "${REPO_ROOT}"

exec "${NODE22_BIN}/node" scripts/run-all-examples.mjs "$@"
