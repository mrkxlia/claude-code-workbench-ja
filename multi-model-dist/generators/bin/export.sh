#!/usr/bin/env bash
# Track A 生成のエントリポイント（薄いラッパ）。構造化変換は lib/export.py に委譲する。
#
#   export.sh --target codex,kiro,all   既定: codex,kiro
#
# 走査はセクション配下の <section>/.claude/** のみ（ルート .claude / .claude-plugin は除外）。
# 原本は読むだけ。生成物は <repo>/multi-model-dist/build/ 以下へ（センチネル付き・冪等）。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="$(cd "$SCRIPT_DIR/../lib" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

TARGET="codex,kiro"
while [ $# -gt 0 ]; do
  case "$1" in
    --target) TARGET="$2"; shift 2 ;;
    --target=*) TARGET="${1#*=}"; shift ;;
    -h|--help) grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 が必要です（PyYAML / tomli_w も。README 参照）。" >&2
  exit 1
fi

echo "multi-model-dist: generating (target=$TARGET) ..."
python3 "$LIB_DIR/export.py" --repo "$REPO_ROOT" --target "$TARGET"
echo "done. 出力: multi-model-dist/build/  （原本は不変）"
