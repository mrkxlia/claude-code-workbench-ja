#!/usr/bin/env bash
# si-session-start.sh（Kiro 版・self-improve） — 未処理の改善候補/未回収セッションをやさしく通知
# SPEC: K2。非ブロッキング通知。常に exit 0。[要確認] のため JSON は enabled:false。
set -u
root="$PWD"
while [ "$root" != "/" ] && [ ! -d "$root/.kiro" ] && [ ! -f "$root/CLAUDE.md" ]; do root=$(dirname "$root"); done
KEY=$(printf '%s' "$root" | cksum | cut -d' ' -f1)
DIR="$HOME/.kiro/self-improve/$KEY"
Q="$DIR/queue.tsv"; BL="$DIR/improvement-backlog.md"
N=0; [ -f "$Q" ] && N=$(grep -c . "$Q" 2>/dev/null || echo 0)
[ "$N" -gt 0 ] && echo "💡 未回収のセッションが ${N} 件あります。improve-scan で改善の種を集められます。" >&2
[ -f "$BL" ] && echo "   未適用の改善候補があります（improve-apply で1件ずつ承認・適用）。" >&2
exit 0
