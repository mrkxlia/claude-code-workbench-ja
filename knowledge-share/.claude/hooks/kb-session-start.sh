#!/usr/bin/env bash
# kb-session-start.sh — 未回収セッションがあれば通知する SessionStart フック
#
# Claude Code のセッション開始時（matcher: startup|resume）に呼ばれる。
# 回収キュー（pending-sessions.tsv）に行が残っているときだけ、
# 「未回収 N 件。/kb-harvest --queue で回収できます」を stdout に出す。
# SessionStart フックの stdout はそのままコンテキストへ注入される公式仕様。
#
# ナレッジ・インデックス自体の読み込みはこのフックではなく @import が担当する
# （~/.claude/CLAUDE.md の @~/.claude/knowledge/index.md）。二重注入を避けるため
# ここでは index に触れない。フックが無効でも知見は @import で届く。
#
# jq は不要。キューが空・未導入なら無音で exit 0。常に exit 0（セッションを止めない）。

set -u

QUEUE="$HOME/.claude/knowledge/queue/pending-sessions.tsv"

# キューが無い／空なら何も言わない
[ -s "$QUEUE" ] || exit 0

# 空行を除いた実エントリ数を数える
COUNT=$(grep -cve '^[[:space:]]*$' "$QUEUE" 2>/dev/null || echo 0)
[ "$COUNT" -gt 0 ] 2>/dev/null || exit 0

echo "📥 未回収のセッションが ${COUNT} 件あります（エラー痕跡を検出済み）。"
echo "   /kb-harvest --queue で過去会話からナレッジ化できます。"

exit 0
