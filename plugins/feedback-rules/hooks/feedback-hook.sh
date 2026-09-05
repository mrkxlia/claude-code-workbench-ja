#!/usr/bin/env bash
# feedback-hook.sh — feedback_rules.py を呼ぶだけの薄いシム
#
# python3 が無い環境では **黙って素通り**する（exit 0）。フックが毎ターン失敗し続けて
# 作業の邪魔をするより、検知できないほうがマシ、という設計方針。
#
#   使い方: bash feedback-hook.sh {inject|guard|stop-check|stats|sync-rules|doctor}
#   標準入力にフックの JSON をそのまま渡す（inject / guard / stop-check）。
set -u

MODE="${1:-}"
[ -n "$MODE" ] || exit 0

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENGINE="$DIR/feedback_rules.py"
[ -f "$ENGINE" ] || exit 0

PY=""
for candidate in python3 python; do
  if command -v "$candidate" >/dev/null 2>&1; then
    PY="$candidate"
    break
  fi
done
[ -n "$PY" ] || exit 0

exec "$PY" "$ENGINE" "$MODE"
