#!/usr/bin/env bash
# si-session-end.sh — 改善の種がありそうなセッションを回収キューに積む SessionEnd フック
#
# Claude Code のセッション終了時に呼ばれる。stdin に session_id / transcript_path / cwd を含む
# JSON を受け取る公式仕様。フックは「安全・軽量な前ふるい」だけを行う:
#   - grep ベースで訂正/繰り返し/エラーの痕跡を数えるだけ（意味的な分類は /improve-scan が担う）
#   - ヒットしたセッションを ~/.claude/self-improve/<project>/queue.tsv に参照1行積む
#
# 機密対策: トランスクリプトの中身そのものはキューへコピーしない。記録するのは
# 日時 / session_id / cwd / transcript_path / ヒット数 だけ（実体への参照のみ）。
# jq は不要。取りこぼしはあっても誤って大量に積まないことを優先。常に exit 0。

set -u

# --- プロジェクトルートに正規化してキーを作る（スキルと同一アルゴリズム）-------------
# .claude/ か CLAUDE.md を持つ最も近い上位ディレクトリを探す（無ければ cwd）。git 非依存。
find_project_root() {
  d="$1"
  while [ -n "$d" ] && [ "$d" != "/" ]; do
    if [ -e "$d/.claude" ] || [ -e "$d/CLAUDE.md" ]; then printf '%s' "$d"; return 0; fi
    d=$(dirname "$d")
  done
  printf '%s' "$1"
}

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
    SESSION_ID=$(printf '%s' "$INPUT" | grep -o '"session_id"[[:space:]]*:[[:space:]]*"[^"]*"' | head -n1 | sed 's/.*:[[:space:]]*"\(.*\)"/\1/')
    TRANSCRIPT=$(printf '%s' "$INPUT" | grep -o '"transcript_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -n1 | sed 's/.*:[[:space:]]*"\(.*\)"/\1/')
    CWD=$(printf '%s' "$INPUT" | grep -o '"cwd"[[:space:]]*:[[:space:]]*"[^"]*"' | head -n1 | sed 's/.*:[[:space:]]*"\(.*\)"/\1/')
  fi
fi

# ガード①: transcript が無い／読めない／短すぎる（10行未満）なら捨てる
[ -n "$TRANSCRIPT" ] && [ -f "$TRANSCRIPT" ] || exit 0
LINES=$(wc -l < "$TRANSCRIPT" 2>/dev/null || echo 0)
[ "$LINES" -ge 10 ] 2>/dev/null || exit 0

# プロジェクトキーとキューのパスを決める
[ -n "$CWD" ] || CWD="$PWD"
ROOT=$(find_project_root "$CWD")
KEY=$(printf '%s' "$ROOT" | cksum | cut -d' ' -f1)
SI_DIR="$HOME/.claude/self-improve/$KEY"
QUEUE="$SI_DIR/queue.tsv"

# ガード②: 同じ session_id が既にキューにあるなら捨てる（重複防止）
if [ -n "$SESSION_ID" ] && [ -f "$QUEUE" ] && grep -qF "	$SESSION_ID	" "$QUEUE" 2>/dev/null; then
  exit 0
fi

# ガード③: 改善の種（訂正/繰り返し/エラー）の痕跡が無ければ捨てる
HITS=$(grep -icE 'そうじゃな|やり直し|やりなおし|違います|間違っ|じゃなくて|not what i|revert|undo|Traceback|fatal:|npm ERR!|permission denied|command not found|Error:|Exception|panic:' "$TRANSCRIPT" 2>/dev/null || echo 0)
[ "$HITS" -gt 0 ] 2>/dev/null || exit 0

# --- キューに1行追記（TSV: 日時 / session_id / cwd / transcript_path / ヒット数） --
mkdir -p "$SI_DIR" 2>/dev/null || exit 0
NOW=$(date '+%Y-%m-%d %H:%M:%S')
printf '%s\t%s\t%s\t%s\t%s\n' "$NOW" "$SESSION_ID" "$ROOT" "$TRANSCRIPT" "$HITS" >> "$QUEUE"

# キューが肥大しないよう直近 50 件に切り詰める
if [ "$(wc -l < "$QUEUE" 2>/dev/null || echo 0)" -gt 50 ]; then
  TMP=$(mktemp 2>/dev/null) && tail -n 50 "$QUEUE" > "$TMP" && mv "$TMP" "$QUEUE"
fi

exit 0
