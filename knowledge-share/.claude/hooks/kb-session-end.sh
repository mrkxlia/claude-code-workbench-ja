#!/usr/bin/env bash
# kb-session-end.sh — エラー痕跡のあるセッションを回収キューに積む SessionEnd フック
#
# Claude Code のセッション終了時に呼ばれる。stdin に session_id / transcript_path /
# cwd を含む JSON を受け取る公式仕様。トランスクリプトにエラーの痕跡があれば、
# 「後で /kb-harvest で振り返る候補」として queue/pending-sessions.tsv に1行積む。
#
# 機密対策: トランスクリプトの中身そのものはキューへコピーしない。記録するのは
# 日時 / session_id / cwd / transcript_path / ヒット数 だけ（実体への参照のみ）。
#
# .claude/settings.json の hooks.SessionEnd から呼び出される想定。
# 取りこぼし（採掘漏れ）はあっても、誤って大量に積まないことを優先する。常に exit 0。

set -u

KB_DIR="$HOME/.claude/knowledge"
QUEUE="$KB_DIR/queue/pending-sessions.tsv"

# --- stdin の JSON から必要な値を取り出す（jq → grep フォールバック） ----------
SESSION_ID=""
TRANSCRIPT=""
CWD=""
if [ ! -t 0 ]; then
  INPUT=$(cat)
  if command -v jq >/dev/null 2>&1; then
    SESSION_ID=$(printf '%s' "$INPUT" | jq -r '.session_id // empty' 2>/dev/null)
    TRANSCRIPT=$(printf '%s' "$INPUT" | jq -r '.transcript_path // empty' 2>/dev/null)
    CWD=$(printf '%s' "$INPUT" | jq -r '.cwd // empty' 2>/dev/null)
  else
    # jq がない環境向けの簡易フォールバック
    SESSION_ID=$(printf '%s' "$INPUT" | grep -o '"session_id"[[:space:]]*:[[:space:]]*"[^"]*"' | head -n1 | sed 's/.*:[[:space:]]*"\(.*\)"/\1/')
    TRANSCRIPT=$(printf '%s' "$INPUT" | grep -o '"transcript_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -n1 | sed 's/.*:[[:space:]]*"\(.*\)"/\1/')
    CWD=$(printf '%s' "$INPUT" | grep -o '"cwd"[[:space:]]*:[[:space:]]*"[^"]*"' | head -n1 | sed 's/.*:[[:space:]]*"\(.*\)"/\1/')
  fi
fi

# ガード①: transcript が無い／読めない／短すぎる（10行未満）なら捨てる
[ -n "$TRANSCRIPT" ] && [ -f "$TRANSCRIPT" ] || exit 0
LINES=$(wc -l < "$TRANSCRIPT" 2>/dev/null || echo 0)
[ "$LINES" -ge 10 ] 2>/dev/null || exit 0

# ガード②: 同じ session_id が既にキューにあるなら捨てる（重複防止）
if [ -n "$SESSION_ID" ] && [ -f "$QUEUE" ] && grep -qF "	$SESSION_ID	" "$QUEUE" 2>/dev/null; then
  exit 0
fi

# ガード③: エラー痕跡が無ければ捨てる（採掘する価値のあるセッションだけ積む）
HITS=$(grep -cE 'Traceback|fatal:|npm ERR!|permission denied|command not found|Error:|Exception|panic:|segmentation fault' "$TRANSCRIPT" 2>/dev/null || echo 0)
[ "$HITS" -gt 0 ] 2>/dev/null || exit 0

# --- キューに1行追記（TSV: 日時 / session_id / cwd / transcript_path / ヒット数） --
mkdir -p "$KB_DIR/queue" 2>/dev/null || exit 0
NOW=$(date '+%Y-%m-%d %H:%M:%S')
printf '%s\t%s\t%s\t%s\t%s\n' "$NOW" "$SESSION_ID" "$CWD" "$TRANSCRIPT" "$HITS" >> "$QUEUE"

# キューが肥大しないよう直近 50 件に切り詰める
if [ "$(wc -l < "$QUEUE" 2>/dev/null || echo 0)" -gt 50 ]; then
  TMP=$(mktemp 2>/dev/null) && tail -n 50 "$QUEUE" > "$TMP" && mv "$TMP" "$QUEUE"
fi

exit 0
