#!/usr/bin/env bash
# feedback-hook.sh — feedback_rules.py を呼ぶだけの薄いシム
#
# python3 が無い環境では **黙って素通り**する（exit 0）。フックが毎ターン失敗し続けて
# 作業の邪魔をするより、検知できないほうがマシ、という設計方針。
#
#   使い方: bash feedback-hook.sh {inject|guard|stop-check|stats|sync-rules|doctor}
#   標準入力にフックの JSON をそのまま渡す（inject / guard / stop-check）。
#
# 終了コードの規約（公式: https://code.claude.com/docs/en/hooks、2026-09-07 取得）
#   exit 2 : ブロックする唯一の終了コード
#   exit 1 : 非ブロックのエラー。Claude Code は警告を出して処理を続行する
#   exit 0 : 正常。stdout の JSON（permissionDecision 等）で判断を返す場合もここ
# したがって「止めたい」ときに exit 1 を返してはいけない（黙って通る）。
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
