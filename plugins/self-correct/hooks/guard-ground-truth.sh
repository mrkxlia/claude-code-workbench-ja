#!/usr/bin/env bash
# guard-ground-truth.sh — 判定の根拠（Ground Truth）への書き込みを止める PreToolUse フック
#
# 自己修正ループでは、Judge は元資料・仕様書・テスト期待値といった「根拠」と成果物を
# 突き合わせて合否を出す。その根拠を Builder が書き換えられると、成果物を直す代わりに
# **根拠のほうを成果物に合わせる**という抜け道が生まれ、ループは無傷のまま無意味になる。
# このフックはその1点だけを機械的に塞ぐ（「references/ は変更しない」というプロンプト上の
# 約束を、実際に守れる形にする）。
#
# 変更禁止パスは .claude/self-correct/state.json の protected 配列から読む。
# self-correct スキルがループ開始時に書き込むため、settings.json 側の設定は要らない。
#   {"status":"ACTIVE", ..., "protected": ["references/", "tests/fixtures/"]}
#
# 発火条件は AND の2つ（どちらも満たすときだけ exit 2 でハードブロック）:
#   1. ループが稼働中である（state.json が存在し status が ACTIVE）
#   2. 書き込み先が protected のいずれかのプレフィックス配下、または完全一致
# ループを回していないときは素通りするので、常時配線しても通常の作業を妨げない。
#
# jq が無い環境（Windows の Git Bash 等）でも動くよう grep/sed のフォールバックを持ち、
# バックスラッシュ区切りのパス（C:\Users\... 等）はスラッシュ区切りに正規化して判定する。
#
# 単体テスト（プロジェクトルートで実行）:
#   mkdir -p .claude/self-correct
#   printf '{"status":"ACTIVE","protected":["references/"],"updated":"u1"}' \
#     > .claude/self-correct/state.json
#   echo '{"tool_name":"Write","tool_input":{"file_path":"references/a.md"}}' \
#     | bash hooks/guard-ground-truth.sh; echo $?   # → exit 2
#   echo '{"tool_name":"Write","tool_input":{"file_path":"drafts/article.md"}}' \
#     | bash hooks/guard-ground-truth.sh; echo $?   # → 0・出力なし
#   rm -rf .claude/self-correct

set -u

ROOT_RAW="${CLAUDE_PROJECT_DIR:-$PWD}"
STATE_FILE="$ROOT_RAW/.claude/self-correct/state.json"

# ループが稼働していなければ判定しない
[ -f "$STATE_FILE" ] || exit 0
STATE=$(cat "$STATE_FILE" 2>/dev/null) || exit 0
printf '%s' "$STATE" | grep -Eq '"status"[[:space:]]*:[[:space:]]*"ACTIVE"' || exit 0

# --- protected 配列を空白区切りの一覧に変換する --------------------------------
if command -v jq >/dev/null 2>&1; then
  PROTECTED=$(printf '%s' "$STATE" | jq -r '.protected[]? // empty' 2>/dev/null | tr '\n' ' ')
else
  # ["a/","b/"] の中身から "…" を拾う
  PROTECTED=$(printf '%s' "$STATE" \
    | tr -d '\n' \
    | sed -n 's/.*"protected"[[:space:]]*:[[:space:]]*\[\([^]]*\)\].*/\1/p' \
    | grep -Eo '"[^"]+"' | tr -d '"' | tr '\n' ' ')
fi
[ -n "${PROTECTED// /}" ] || exit 0

# --- stdin から書き込み先パスを取り出す ---------------------------------------
[ -t 0 ] && exit 0
INPUT=$(cat)
FILE_PATH=""
if command -v jq >/dev/null 2>&1; then
  FILE_PATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
else
  FILE_PATH=$(printf '%s' "$INPUT" \
    | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -n1 \
    | sed 's/.*:[[:space:]]*"\(.*\)"/\1/; s/\\\\/\\/g')
fi
[ -z "$FILE_PATH" ] && exit 0

# Windows のバックスラッシュ区切りパスをスラッシュ区切りに正規化して判定を揃える
FILE_PATH=$(printf '%s' "$FILE_PATH" | tr '\\' '/')
ROOT=$(printf '%s' "$ROOT_RAW" | tr '\\' '/')
case "$FILE_PATH" in
  "$ROOT"/*) REL_PATH="${FILE_PATH#"$ROOT"/}" ;;
  *)         REL_PATH="$FILE_PATH" ;;
esac
# 先頭の ./ を落として比較を揃える
REL_PATH="${REL_PATH#./}"

# --- 判定: protected 配下ならハードブロック ------------------------------------
for prefix in $PROTECTED; do
  case "$REL_PATH" in
    "$prefix"*|"$prefix")
      {
        echo "BLOCKED: 判定の根拠（Ground Truth）への書き込みは自己修正ループ稼働中は禁止です: $REL_PATH"
        echo ""
        echo "理由: 根拠を成果物に合わせて書き換えると、Judge の合否判定が意味を失います。"
        echo ""
        echo "対処方法:"
        echo "  1. 直すのは成果物のほう。根拠と食い違うなら成果物を根拠に合わせる"
        echo "  2. 根拠そのものが古い・誤っていると判断したなら、自動で直さずユーザーに報告して指示を仰ぐ"
        echo "  3. 変更禁止範囲の設定が誤っている場合のみ、ユーザー確認のうえ"
        echo "     .claude/self-correct/state.json の protected を修正する"
      } >&2
      exit 2
      ;;
  esac
done

exit 0
