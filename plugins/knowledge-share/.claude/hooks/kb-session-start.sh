#!/usr/bin/env bash
# kb-session-start.sh — セッション開始時の SessionStart フック（matcher: startup|resume）
#
# 役割（導入形態は問わない・同じスクリプトで両対応）:
#   1. プラグイン導入の初回だけ ~/.claude/knowledge/ の足場を作り、テンプレート index と
#      採掘スクリプトを配置する（プラグインは導入時にスクリプトを実行できないため）。
#   2. @import を使っていない導入形態（プラグインのみ等）では、index.md の内容を
#      stdout に出してコンテキストへ注入する。install.sh で ~/.claude/CLAUDE.md に
#      @import を入れている場合はメモリ機能が読み込むので、二重注入を避けてスキップする。
#   3. 回収キューに未処理セッションがあれば「未回収 N 件」を通知する。
#
# SessionStart フックの stdout はそのままコンテキストへ注入される公式仕様。
# jq は不要。常に exit 0（セッションを止めない）。

set -u

KB_DIR="$HOME/.claude/knowledge"
QUEUE="$KB_DIR/queue/pending-sessions.tsv"
USER_MD="$HOME/.claude/CLAUDE.md"
IMPORT_LINE='@~/.claude/knowledge/index.md'

# --- 1. プラグイン経由なら初回ブートストラップ -------------------------------
# $CLAUDE_PLUGIN_ROOT はプラグインのフックにだけ渡される（手動導入時は未設定）。
# 既存のナレッジ・採掘スクリプトは上書きしない（無いときだけ用意する）。
if [ -n "${CLAUDE_PLUGIN_ROOT:-}" ]; then
  mkdir -p "$KB_DIR/topics" "$KB_DIR/queue" "$KB_DIR/bin" 2>/dev/null || true
  [ -f "$KB_DIR/index.md" ] || \
    cp "$CLAUDE_PLUGIN_ROOT/templates/index.md" "$KB_DIR/index.md" 2>/dev/null || true
  if [ ! -f "$KB_DIR/bin/kb-extract-candidates.sh" ]; then
    cp "$CLAUDE_PLUGIN_ROOT/bin/kb-extract-candidates.sh" "$KB_DIR/bin/" 2>/dev/null || true
    chmod +x "$KB_DIR/bin/kb-extract-candidates.sh" 2>/dev/null || true
  fi
fi

# --- 2. index の注入（@import を使っていない導入形態のときだけ）---------------
if [ -f "$KB_DIR/index.md" ] && \
   ! { [ -f "$USER_MD" ] && grep -qF "$IMPORT_LINE" "$USER_MD"; }; then
  echo "# リポジトリ横断ナレッジ（knowledge-share）"
  cat "$KB_DIR/index.md"
  echo ""
fi

# --- 3. 回収キューの通知 ------------------------------------------------------
if [ -s "$QUEUE" ]; then
  COUNT=$(grep -cve '^[[:space:]]*$' "$QUEUE" 2>/dev/null || echo 0)
  if [ "$COUNT" -gt 0 ] 2>/dev/null; then
    echo "📥 未回収のセッションが ${COUNT} 件あります（エラー痕跡を検出済み）。"
    echo "   /kb-harvest --queue で過去会話からナレッジ化できます。"
  fi
fi

exit 0
