#!/usr/bin/env bash
# guard-builder-writes.sh — 並列ビルド中の「共有ファイル衝突」を確認する PreToolUse フック
#
# feature-factory が独立グループを並列実装するとき、複数ビルダーが同時に動く。
# このとき schema / マイグレーション / package.json / lockfile / 型バレル / ルーティング集約 index
# のような「複数グループが触れうる共有ファイル」へ同時に書き込むと、後勝ち上書きや
# マイグレーション履歴の破壊が起き、しかも工場長は検出できない。
# このフックは、その共有ファイル衝突だけを人間確認（permissionDecision "ask"）に回す。
#
# 発火条件は AND の2つ:
#   1. 並列フェーズ中である（docs/factory/<slug>/.parallel-active マーカーが存在する）
#   2. 書き込み先が共有ファイル禁止リストに該当する
# どちらも満たすときだけ "ask"。それ以外（共有先行ステップ・依存逐次ステップ・通常実装）は素通り。
# これにより「危険コマンド以外は自走」を保ちつつ、並列中の共有衝突だけを表面化させる。
#
# 【限界】このフックが守るのは *共有ファイル衝突* であって *グループ間越境*
#   （グループAのビルダーがグループBのサブツリーに書く）ではない。越境は brief の所有パス宣言と
#   工場長の越境チェックで守る。フックは brief の宣言を受け取れないため、所有境界は判定できない。
# 【過検出】マーカーは slug 配下にあるが、フックは書き込みパスから slug を特定できないため、
#   「いずれかの .parallel-active が存在し、かつ共有ファイル宛なら ask」という安全側の過検出になる。
#   複数 feature を同時に並列運用する場合、無関係な feature の共有ファイル書き込みも ask されうるが、
#   これは誤動作ではなく安全側の挙動である。
#
# .claude/settings.json の hooks.PreToolUse（matcher: Edit|Write）から呼び出される想定。
# jq が無い環境（Windows の Git Bash 等）でも動くよう grep/sed のフォールバックを持つ。
#
# 単体テスト（プロジェクトルートで実行）:
#   # マーカー無し → 素通り（exit 0・出力なし）
#   echo '{"tool_name":"Write","tool_input":{"file_path":"prisma/schema.prisma"}}' \
#     | bash .claude/hooks/guard-builder-writes.sh; echo $?            # → 0
#   # マーカー有り + 共有ファイル → ask の JSON
#   mkdir -p docs/factory/demo && touch docs/factory/demo/.parallel-active
#   echo '{"tool_name":"Write","tool_input":{"file_path":"prisma/schema.prisma"}}' \
#     | bash .claude/hooks/guard-builder-writes.sh                     # → ask の JSON
#   # マーカー有り + 通常ファイル → 素通り
#   echo '{"tool_name":"Write","tool_input":{"file_path":"src/server/billing/service.ts"}}' \
#     | bash .claude/hooks/guard-builder-writes.sh; echo $?            # → 0
#   rm docs/factory/demo/.parallel-active

set -u

# --- 設定（プロジェクトに合わせて差し替えてください）-------------------------
# 並列グループ間で衝突しうる「共有ファイル」のパターン。CLAUDE.md のアーキテクチャ・
# spec-writer の「並列実行プラン（共有/先行逐次変更）」と一致させること。
SHARED_PATTERNS='(^|/)prisma/|\.prisma$|(^|/)migrations?/|(^|/)package\.json$|(^|/)package-lock\.json$|(^|/)yarn\.lock$|(^|/)pnpm-lock\.yaml$|(^|/)go\.(mod|sum)$|(^|/)Cargo\.(toml|lock)$|(^|/)src/types/index\.(ts|tsx)$|(^|/)src/app/api/route\.(ts|tsx)$'

# --- stdin から書き込み先パスを取り出す ---------------------------------------
# stdin が空/非JSON の場合は判定材料がないので何もしない（素通り）。
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

# Windows のバックスラッシュ区切りパスをスラッシュ区切りに正規化
FILE_PATH=$(printf '%s' "$FILE_PATH" | tr '\\' '/')
ROOT=$(printf '%s' "${CLAUDE_PROJECT_DIR:-$PWD}" | tr '\\' '/')
case "$FILE_PATH" in
  "$ROOT"/*) REL_PATH="${FILE_PATH#"$ROOT"/}" ;;
  *)         REL_PATH="$FILE_PATH" ;;
esac

# --- 発火条件1: 並列フェーズ中か（.parallel-active マーカーの存在）-------------
# git 非依存。マーカーが1つも無ければ並列中でないので素通り。
ROOT_DIR="${CLAUDE_PROJECT_DIR:-$PWD}"
MARKER_FOUND=0
if [ -d "$ROOT_DIR/docs/factory" ]; then
  # docs/factory/<slug>/.parallel-active のいずれかがあれば並列中とみなす
  for marker in "$ROOT_DIR"/docs/factory/*/.parallel-active; do
    [ -e "$marker" ] && { MARKER_FOUND=1; break; }
  done
fi
[ "$MARKER_FOUND" -eq 0 ] && exit 0

# --- 発火条件2: 共有ファイルか ------------------------------------------------
if ! printf '%s\n' "$REL_PATH" | grep -Eq "$SHARED_PATTERNS"; then
  exit 0
fi

# --- 両方満たす: 人間に確認を求める -------------------------------------------
ESCAPED_PATH=$(printf '%s' "$REL_PATH" | sed 's/\\/\\\\/g; s/"/\\"/g')
printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"並列フェーズ中の共有ファイルへの書き込みです: %s — 複数グループが同時に触れると上書き衝突やマイグレーション履歴破壊の恐れがあります。共有変更は並列前の「共有/先行逐次ステップ」で済ませる設計です。意図した書き込みか確認してください"}}\n' \
  "$ESCAPED_PATH"
exit 0
