#!/usr/bin/env bash
# guard-builder-paths.sh — ビルダーが担当外フォルダへ書き込むのを止める PreToolUse フック
#
# 「backend-builder はバックエンドのフォルダだけ」という担当範囲は、これまでエージェント定義の
# プロンプトによる約束でしかなかった（README の「発展課題」）。このフックはそれを機械的に強制する。
# 各ビルダーの frontmatter に宣言され、**そのサブエージェントが動いている間だけ**有効になる。
#
# 既存の guard-builder-writes.sh との違い:
#   guard-builder-writes … 並列実行中の「共有ファイル衝突」を ask で確認する（全員に適用）
#   guard-builder-paths  … 「担当グループの外」への書き込みを exit 2 で拒否する（ビルダー個別）
# 前者はメインセッションの正当な書き込みも通す必要があるので ask、後者はサブエージェント内でしか
# 動かないため確実に止めてよい。
#
# 第1引数に許可プレフィックスをスペース区切りで渡す（pipeline-setup が Step 5 で差し替える）。
# `!` で始まるものは除外指定で、許可より優先する。担当範囲が入れ子になるとき使う
#   例: "src/app/ !src/app/api/ src/components/" → src/app/ は書けるが src/app/api/ は書けない
# 引数が空なら何もしない（未設定のテンプレートで全書き込みを止めてしまわないため）。
#
# 単体テスト（プロジェクトルートで実行）:
#   echo '{"tool_name":"Write","tool_input":{"file_path":"src/server/a.ts"}}' \
#     | bash .claude/hooks/guard-builder-paths.sh "src/server/ src/jobs/"; echo $?   # → 0・出力なし
#   echo '{"tool_name":"Write","tool_input":{"file_path":"src/components/B.tsx"}}' \
#     | bash .claude/hooks/guard-builder-paths.sh "src/server/ src/jobs/"; echo $?   # → exit 2
#   echo '{"tool_name":"Write","tool_input":{"file_path":"src/x.ts"}}' \
#     | bash .claude/hooks/guard-builder-paths.sh; echo $?                            # → 0（未設定は素通り）
#   echo '{"tool_name":"Write","tool_input":{"file_path":"src/app/api/r.ts"}}' \
#     | bash .claude/hooks/guard-builder-paths.sh "src/app/ !src/app/api/"; echo $?    # → exit 2（除外が優先）

set -u

ALLOWED_PREFIXES="${1:-}"

# 許可プレフィックスが未設定なら判定材料が無いので素通りする
[ -n "$ALLOWED_PREFIXES" ] || exit 0

# 実装ノートは担当に関係なく全ビルダーが書く（パイプラインの記録先）
ALWAYS_ALLOWED='^docs/(pipeline|task-pipeline)/[^/]+/implementation-notes(-[^/]*)?\.md$'

# --- stdin から書き込み先パスを取り出す ---------------------------------------
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

# 絶対パスはプロジェクトルート相対に正規化する
ROOT=$(printf '%s' "${CLAUDE_PROJECT_DIR:-$PWD}" | tr '\\' '/')
case "$FILE_PATH" in
  "$ROOT"/*) REL_PATH="${FILE_PATH#"$ROOT"/}" ;;
  *)         REL_PATH="$FILE_PATH" ;;
esac

# --- 判定 ----------------------------------------------------------------------
# 実装ノートは常に許可
printf '%s\n' "$REL_PATH" | grep -Eq "$ALWAYS_ALLOWED" && exit 0

# 除外指定（`!` 始まり）は許可より優先して拒否する
# shellcheck disable=SC2086  # スペース区切りのリストを意図的に単語分割する
for prefix in $ALLOWED_PREFIXES; do
  case "$prefix" in
    '!'*)
      deny="${prefix#!}"
      [ -n "$deny" ] || continue
      case "$REL_PATH" in "$deny"*) DENIED=1; break ;; esac
      ;;
  esac
done

# 担当範囲の中なら許可（除外に当たっていない場合のみ）
if [ "${DENIED:-0}" -eq 0 ]; then
  # shellcheck disable=SC2086  # スペース区切りの許可リストを意図的に単語分割する
  for prefix in $ALLOWED_PREFIXES; do
    case "$prefix" in '!'*) continue ;; esac
    case "$REL_PATH" in "$prefix"*) exit 0 ;; esac
  done
fi

{
  echo "BLOCKED: 担当範囲の外への書き込みです: $REL_PATH"
  echo ""
  echo "このエージェントが書き込めるのは次の範囲だけです: $ALLOWED_PREFIXES"
  echo "（\`!\` 始まりは除外指定です）"
  echo "（実装ノート docs/pipeline/<slug>/implementation-notes.md は常に書けます）"
  echo ""
  echo "対処方法:"
  echo "  1. 担当外のファイルが必要なら、実装せずに実装ノートへ「必要な変更」として記録し、"
  echo "     オーケストレーター（メインセッション）に差し戻す"
  echo "  2. ブリーフの所有パス宣言が実態と違う場合は、ブリーフを更新してから再実行する"
} >&2
exit 2
