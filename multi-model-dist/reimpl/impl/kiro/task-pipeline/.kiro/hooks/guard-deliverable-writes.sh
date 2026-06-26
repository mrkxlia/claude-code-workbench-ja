#!/usr/bin/env bash
# guard-deliverable-writes.sh（Kiro 版・T2h） — 出力ディレクトリ外への書き込みを確認する検査本体
#
# SPEC: multi-model-dist/reimpl/SPEC/hooks.md（H0 guard-deliverable-writes）。判定は2層:
#   1. 機密パターン（.env/*.key/*.pem/secrets.json）→ ハードブロック
#   2. 出力ディレクトリ許可リスト外 → 人間に確認を促す
# 対象パスは第1引数で受ける（[要確認] Kiro が hook へ渡す変数名はバージョン依存）。
# [要確認] block/ask を Kiro が再現できない場合は stderr 通知に degrade（SPEC H3）。
set -u

# プロジェクトに合わせて差し替え（CLAUDE.md の出力先・deliverable-builder の担当範囲と一致させる）
ALLOWED_PREFIXES="deliverables/ docs/task-pipeline/"
BLOCK_PATTERNS='(^|/)\.env(\..+)?$|\.key$|\.pem$|(^|/)secrets\.json$'
ALLOW_PATTERNS='\.env\.example$|\.env\.sample$|\.env\.template$'

FILE_PATH="${1:-}"
[ -z "$FILE_PATH" ] && exit 0
FILE_PATH=$(printf '%s' "$FILE_PATH" | tr '\\' '/')
ROOT=$(printf '%s' "${KIRO_PROJECT_DIR:-$PWD}" | tr '\\' '/')
case "$FILE_PATH" in "$ROOT"/*) REL="${FILE_PATH#"$ROOT"/}" ;; *) REL="$FILE_PATH" ;; esac

# 判定1: 機密パターンはハードブロック
if printf '%s\n' "$REL" | grep -Eq "$BLOCK_PATTERNS" && ! printf '%s\n' "$REL" | grep -Eq "$ALLOW_PATTERNS"; then
  echo "BLOCKED: 機密ファイルへの書き込みは禁止されています: $REL（機密情報は成果物に書き込まない）" >&2
  exit 2
fi

# 判定2: 許可リスト外は確認を促す
for p in $ALLOWED_PREFIXES; do case "$REL" in "$p"*) exit 0 ;; esac; done
echo "⚠️ 出力ディレクトリ外への書き込みです: $REL — ビルダーの担当範囲（$ALLOWED_PREFIXES）の外であり、意図しない変更の可能性があります。確認してください。" >&2
exit 2
