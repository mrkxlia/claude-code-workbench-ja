#!/usr/bin/env bash
# si-session-start.sh — 改善候補の未処理件数と経過日数を通知する SessionStart フック
#                       （matcher: startup|resume）
#
# 役割（安全・軽量な通知のみ。実際の発見/適用はスキルが担う）:
#   1. 回収キューに未処理セッションがあれば「/improve-scan で改善の種を拾えます」と促す。
#   2. backlog に未処理候補があり、かつ前回適用から閾値日数（既定7日・SELF_IMPROVE_NUDGE_DAYS で調整）
#      以上経っていれば「/improve-apply で確認を」と促す（＝外部スケジューラ不要の擬似定期実行）。
#
# SessionStart フックの stdout はそのままコンテキストへ注入される公式仕様。
# jq は不要。常に exit 0（セッションを止めない）。

set -u

# --- プロジェクトルートに正規化してキーを作る（スキル・SessionEnd と同一アルゴリズム）---
find_project_root() {
  d="$1"
  while [ -n "$d" ] && [ "$d" != "/" ]; do
    if [ -e "$d/.claude" ] || [ -e "$d/CLAUDE.md" ]; then printf '%s' "$d"; return 0; fi
    d=$(dirname "$d")
  done
  printf '%s' "$1"
}

CWD="${CLAUDE_PROJECT_DIR:-$PWD}"
ROOT=$(find_project_root "$CWD")
KEY=$(printf '%s' "$ROOT" | cksum | cut -d' ' -f1)
SI_DIR="$HOME/.claude/self-improve/$KEY"
QUEUE="$SI_DIR/queue.tsv"
BACKLOG="$SI_DIR/improvement-backlog.md"
LAST_APPLY="$SI_DIR/last-apply"
THRESHOLD_DAYS="${SELF_IMPROVE_NUDGE_DAYS:-7}"

NOTIFIED=0

# --- 1. 回収キューの通知（発見の促し）----------------------------------------
if [ -s "$QUEUE" ]; then
  QCOUNT=$(grep -cve '^[[:space:]]*$' "$QUEUE" 2>/dev/null || echo 0)
  if [ "$QCOUNT" -gt 0 ] 2>/dev/null; then
    echo "🔧 改善の種がありそうなセッションが ${QCOUNT} 件あります。"
    echo "   /improve-scan で backlog に改善候補を貯められます。"
    NOTIFIED=1
  fi
fi

# --- 2. backlog の未処理候補＋経過日数の通知（擬似定期実行）-------------------
# backlog の候補は "- [ ] ..." 形式（improve-scan が書く）。未チェック分を数える。
if [ -f "$BACKLOG" ]; then
  PENDING=$(grep -cE '^- \[ \]' "$BACKLOG" 2>/dev/null || echo 0)
  if [ "$PENDING" -gt 0 ] 2>/dev/null; then
    # 経過日数を算出（last-apply が無ければ「未適用」とみなして必ず促す）
    DUE=1
    if [ -f "$LAST_APPLY" ]; then
      LAST=$(cat "$LAST_APPLY" 2>/dev/null || echo 0)
      NOW=$(date +%s 2>/dev/null || echo 0)
      if [ "$LAST" -gt 0 ] 2>/dev/null && [ "$NOW" -gt 0 ] 2>/dev/null; then
        ELAPSED_DAYS=$(( (NOW - LAST) / 86400 ))
        if [ "$ELAPSED_DAYS" -lt "$THRESHOLD_DAYS" ] 2>/dev/null; then DUE=0; fi
      fi
    fi
    if [ "$DUE" -eq 1 ]; then
      echo "🔧 未処理の改善候補が ${PENDING} 件あります（前回適用から ${THRESHOLD_DAYS} 日以上）。"
      echo "   /improve-apply で1件ずつ確認・適用できます。"
      NOTIFIED=1
    fi
  fi
fi

exit 0
