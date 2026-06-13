#!/usr/bin/env bash
# kb-extract-candidates.sh — トランスクリプト(jsonl)からナレッジ候補を機械抽出する
#
# /kb-harvest スキルから呼ばれる。jsonl を「機械的に」grep して、ナレッジ化の
# 候補になりそうな行を行番号つきで抜き出すだけ。要約・採否判定・記録はしない
# （それは Claude＝スキル側の仕事）。jsonl 全文を Claude に読ませず、ここで
# 候補を絞ることでコンテキストを節約するのが目的。
#
# 使い方:
#   kb-extract-candidates.sh                 # --queue と同じ（既定）
#   kb-extract-candidates.sh --queue         # キューに積まれた transcript_path を順に処理
#   kb-extract-candidates.sh --days N        # ~/.claude/projects/ を mtime N 日以内で探索
#                                            #   （SessionEnd を取りこぼした分の補完経路。
#                                            #    cleanupPeriodDays=30 で消える前に回収する）
#   kb-extract-candidates.sh <path.jsonl>    # 指定した jsonl 1本だけを処理
#
# 抽出する3種（各ファイルにつき合計40件でキャップ）:
#   [ERROR] エラーの痕跡（Traceback / fatal: / npm ERR! / Error: など）
#   [FIX]   assistant 側の解決言及（原因は / 解決 / 回避策 / fixed / root cause など）
#   [USER]  ユーザーの修正指示（違う / ではなく / actually / instead など）

set -u

KB_DIR="$HOME/.claude/knowledge"
QUEUE="$KB_DIR/queue/pending-sessions.tsv"
PROJECTS_DIR="$HOME/.claude/projects"

ERROR_RE='Traceback|fatal:|npm ERR!|permission denied|command not found|Error:|Exception|panic:|segmentation fault'
FIX_RE='原因は|原因です|解決|回避策|対処|直りました|修正しました|root cause|fixed|resolved|the fix|turned out|because the'
USER_RE='違う|ちがう|ではなく|じゃなくて|そうではなく|actually|instead|no,|not that|that.?s wrong|should be'

MAX_PER_FILE=40
SIZE_LIMIT=$((50 * 1024 * 1024))   # 50MB 超は tail で末尾だけ見る

# --- jsonl 1本から候補を抜き出す ----------------------------------------------
extract_one() {
  file="$1"
  [ -f "$file" ] || { echo "  (見つかりません: $file)"; return; }

  echo "=== $file ==="

  # 巨大ファイルは末尾 20000 行だけを対象にする（行番号は元ファイル基準に補正）
  size=$(wc -c < "$file" 2>/dev/null || echo 0)
  if [ "$size" -gt "$SIZE_LIMIT" ]; then
    total=$(wc -l < "$file" 2>/dev/null || echo 0)
    start=$((total - 20000 + 1)); [ "$start" -lt 1 ] && start=1
    echo "  (50MB 超のため末尾 20000 行のみ・行番号は ${start} 以降)"
    body=$(tail -n 20000 "$file" | nl -ba -v "$start" -w1 -s':')
  else
    body=$(nl -ba -w1 -s':' "$file")
  fi

  # 各カテゴリ（ERROR→FIX→USER の順）を行番号つき・本文 500 文字までで抽出し、
  # ラベルを付ける。同一行の重複だけ除き、合計 40 件でキャップする。
  {
    printf '%s\n' "$body" | grep -E "$ERROR_RE" | sed 's/^\([0-9]*\):/[ERROR] \1: /'
    printf '%s\n' "$body" | grep -E "$FIX_RE"   | sed 's/^\([0-9]*\):/[FIX]   \1: /'
    printf '%s\n' "$body" | grep -E "$USER_RE"  | sed 's/^\([0-9]*\):/[USER]  \1: /'
  } | cut -c1-500 | awk '!seen[$0]++' | head -n "$MAX_PER_FILE"

  echo ""
}

# --- 引数の解釈 ---------------------------------------------------------------
MODE="${1:---queue}"

case "$MODE" in
  --queue)
    if [ ! -s "$QUEUE" ]; then
      echo "キューは空です（queue/pending-sessions.tsv に未回収はありません）。"
      exit 0
    fi
    # TSV の4列目が transcript_path
    while IFS=$'\t' read -r _dt _sid _cwd path _hits; do
      [ -n "${path:-}" ] && extract_one "$path"
    done < "$QUEUE"
    ;;
  --days)
    N="${2:-7}"
    if [ ! -d "$PROJECTS_DIR" ]; then
      echo "$PROJECTS_DIR が見つかりません。"
      exit 0
    fi
    find "$PROJECTS_DIR" -name '*.jsonl' -type f -mtime "-${N}" 2>/dev/null \
      | while read -r path; do extract_one "$path"; done
    ;;
  *)
    extract_one "$MODE"
    ;;
esac

exit 0
