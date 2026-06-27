#!/usr/bin/env bash
# si-session-end.sh（Kiro 版・self-improve） — セッション終了時に transcript を改善スキャンのキューに積む
# SPEC: multi-model-dist/reimpl/SPEC/self-improve-and-knowledge-share.md（K2）。常に exit 0。
# [要確認] Kiro のセッションログのパス/session_id 変数はバージョン依存。確認できるまで JSON は enabled:false。
# project キーは improve-scan と同一アルゴリズム（cwd を .kiro/ か CLAUDE.md を持つ最近接上位へ正規化 → cksum）。
set -u
LOG="${KIRO_SESSION_LOG:-}"; SID="${KIRO_SESSION_ID:-}"
[ -n "$LOG" ] && [ -f "$LOG" ] || exit 0
root="$PWD"
while [ "$root" != "/" ] && [ ! -d "$root/.kiro" ] && [ ! -f "$root/CLAUDE.md" ]; do root=$(dirname "$root"); done
KEY=$(printf '%s' "$root" | cksum | cut -d' ' -f1)
Q="$HOME/.kiro/self-improve/$KEY/queue.tsv"; mkdir -p "$(dirname "$Q")"
printf '%s\t%s\t%s\t%s\n' "$(date +%s)" "${SID:-unknown}" "$KEY" "$LOG" >> "$Q"
exit 0
