#!/usr/bin/env bash
# guard-shared-writes.sh（Kiro 版・T2h） — 並列ビルド中の「共有ファイル衝突」を確認する検査本体
#
# SPEC: multi-model-dist/reimpl/SPEC/hooks.md（H0 guard-builder-writes）。発火条件は AND:
#   1. 並列中（docs/pipeline/<slug>/.parallel-active マーカーが存在）
#   2. 書き込み先が共有ファイル（schema/migration/lockfile/型バレル/ルーティング集約 index 等）
# どちらも満たすときだけ「確認を促す」。それ以外は素通り（exit 0）。
#
# 対象パスは第1引数で受ける（[要確認] Kiro が hook へ渡す変数名はバージョン依存。
#   呼び出し JSON では ${KIRO_HOOK_FILE_PATH:-$1} を渡している）。
# [要確認] Kiro が ask（人間確認）に回せない場合は、stderr 通知＝「確認を促す」に degrade（SPEC H3）。
set -u

SHARED_PATTERNS='(^|/)prisma/|\.prisma$|(^|/)migrations?/|(^|/)package\.json$|(^|/)package-lock\.json$|(^|/)yarn\.lock$|(^|/)pnpm-lock\.yaml$|(^|/)go\.(mod|sum)$|(^|/)Cargo\.(toml|lock)$|(^|/)src/types/index\.(ts|tsx)$'

FILE_PATH="${1:-}"
[ -z "$FILE_PATH" ] && exit 0
FILE_PATH=$(printf '%s' "$FILE_PATH" | tr '\\' '/')
ROOT=$(printf '%s' "${KIRO_PROJECT_DIR:-$PWD}" | tr '\\' '/')
case "$FILE_PATH" in "$ROOT"/*) REL="${FILE_PATH#"$ROOT"/}" ;; *) REL="$FILE_PATH" ;; esac

# 発火条件1: 並列フェーズ中か
ROOT_DIR="${KIRO_PROJECT_DIR:-$PWD}"
MARKER=0
if [ -d "$ROOT_DIR/docs/pipeline" ]; then
  for m in "$ROOT_DIR"/docs/pipeline/*/.parallel-active; do [ -e "$m" ] && { MARKER=1; break; }; done
fi
[ "$MARKER" -eq 0 ] && exit 0

# 発火条件2: 共有ファイルか
printf '%s\n' "$REL" | grep -Eq "$SHARED_PATTERNS" || exit 0

echo "⚠️ 並列フェーズ中の共有ファイルへの書き込みです: $REL — 複数グループが同時に触れると上書き衝突やマイグレーション履歴破壊の恐れがあります。共有変更は並列前の『共有/先行逐次ステップ』で済ませる設計です。意図した書き込みか確認してください。" >&2
exit 2
