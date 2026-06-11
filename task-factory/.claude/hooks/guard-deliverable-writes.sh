#!/usr/bin/env bash
# guard-deliverable-writes.sh — 出力ディレクトリ外への書き込みを確認する PreToolUse フック
#
# Claude Code が Edit / Write ツールでファイルに書き込もうとしたとき、対象パスを検査する。
# 判定は2層:
#   1. 機密パターン（.env / *.key / *.pem / secrets.json）→ exit 2 でハードブロック
#      （exit 2 はフックの公式仕様で「ツール実行を拒否し、stderr を Claude に伝える」）
#   2. 許可リスト（ALLOWED_PREFIXES / ALLOWED_FILES）の外 → JSON の permissionDecision "ask" で
#      人間に確認を求める。即ブロックにしないのは、工場長（メインセッション）の正当な書き込み
#      （CLAUDE.md のチューニング等）までフックが止めてしまうのを防ぐため
#
# .claude/settings.json の hooks.PreToolUse（matcher: Edit|Write）から呼び出される想定。
# jq が無い環境（Windows の Git Bash 等）でも動くよう、grep/sed のフォールバックを持ち、
# バックスラッシュ区切りのパス（C:\Users\... 等）はスラッシュ区切りに正規化して判定する。
#
# 単体テスト（プロジェクトルートで実行）:
#   echo '{"tool_name":"Write","tool_input":{"file_path":"deliverables/docs/a.md"}}' \
#     | bash .claude/hooks/guard-deliverable-writes.sh; echo $?   # → 0・出力なし
#   echo '{"tool_name":"Write","tool_input":{"file_path":"src/main.py"}}' \
#     | bash .claude/hooks/guard-deliverable-writes.sh            # → ask の JSON
#   echo '{"tool_name":"Write","tool_input":{"file_path":".env"}}' \
#     | bash .claude/hooks/guard-deliverable-writes.sh; echo $?   # → exit 2

set -u

# --- 設定（プロジェクトに合わせて差し替えてください）-------------------------
# task-factory-setup スキルは、承認済みの出力ディレクトリでここを自動的に書き換える。
# CLAUDE.md の「成果物の種類と出力先」・deliverable-builder の「担当範囲」と一致させること。
ALLOWED_PREFIXES="deliverables/ docs/taskfactory/ .claude/"  # 書き込みを許可するディレクトリ（スペース区切り）
ALLOWED_FILES="CLAUDE.md"                                     # 書き込みを許可する個別ファイル（スペース区切り）

BLOCK_PATTERNS='(^|/)\.env(\..+)?$|\.key$|\.pem$|(^|/)secrets\.json$'
ALLOW_PATTERNS='\.env\.example$|\.env\.sample$|\.env\.template$'

# --- stdin から書き込み先パスを取り出す ---------------------------------------
# PreToolUse フックは stdin に JSON（tool_input.file_path など）を受け取る。
# stdin が空/非JSON の場合は判定材料がないので何もしない（素通り）。
[ -t 0 ] && exit 0
INPUT=$(cat)
FILE_PATH=""
if command -v jq >/dev/null 2>&1; then
  FILE_PATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
else
  # jq がない環境向けの簡易フォールバック（JSON エスケープされた \\ は \ に戻す）
  FILE_PATH=$(printf '%s' "$INPUT" \
    | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -n1 \
    | sed 's/.*:[[:space:]]*"\(.*\)"/\1/; s/\\\\/\\/g')
fi
[ -z "$FILE_PATH" ] && exit 0

# Windows のバックスラッシュ区切りパスをスラッシュ区切りに正規化して判定を揃える
FILE_PATH=$(printf '%s' "$FILE_PATH" | tr '\\' '/')

# 絶対パスはプロジェクトルート相対に正規化する（ルート外への絶対パスはそのまま許可リスト判定に落ちる）
ROOT=$(printf '%s' "${CLAUDE_PROJECT_DIR:-$PWD}" | tr '\\' '/')
case "$FILE_PATH" in
  "$ROOT"/*) REL_PATH="${FILE_PATH#"$ROOT"/}" ;;
  *)         REL_PATH="$FILE_PATH" ;;
esac

# --- 判定1: 機密パターンはハードブロック ---------------------------------------
if printf '%s\n' "$REL_PATH" | grep -Eq "$BLOCK_PATTERNS" \
   && ! printf '%s\n' "$REL_PATH" | grep -Eq "$ALLOW_PATTERNS"; then
  {
    echo "BLOCKED: 機密ファイルへの書き込みは禁止されています: $REL_PATH"
    echo ""
    echo "対処方法:"
    echo "  1. 機密情報は成果物・ドキュメントに書き込まない（CLAUDE.md ハードルール）"
    echo "  2. 誤検知の場合のみ、ユーザーに確認のうえフックのパターンを調整する"
  } >&2
  exit 2
fi

# --- 判定2: 許可リスト外への書き込みは人間に確認を求める -----------------------
for prefix in $ALLOWED_PREFIXES; do
  case "$REL_PATH" in "$prefix"*) exit 0 ;; esac
done
for file in $ALLOWED_FILES; do
  [ "$REL_PATH" = "$file" ] && exit 0
done

# JSON に埋め込むため \ と " を最小限エスケープする
ESCAPED_PATH=$(printf '%s' "$REL_PATH" | sed 's/\\/\\\\/g; s/"/\\"/g')
printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"出力ディレクトリ外への書き込みです: %s — ビルダーの担当範囲（%s）の外であり、意図しない変更の可能性があります"}}\n' \
  "$ESCAPED_PATH" "$ALLOWED_PREFIXES"
exit 0
