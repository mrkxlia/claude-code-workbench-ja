#!/usr/bin/env bash
# kb-session-end.sh（Kiro 版・T2h／knowledge-share） — エラー痕跡のあるセッションを採掘キューに積む
#
# SPEC: multi-model-dist/reimpl/SPEC/self-improve-and-knowledge-share.md（K2/K3）。
# SessionEnd でセッションログを軽く検査し、エラー痕跡があれば session_id と transcript パスを
# ~/.kiro/knowledge/queue/pending-sessions.tsv に積む。kb-harvest が後で回収する。常に exit 0。
#
# [要確認] Kiro が hook へ渡すセッションログのパス/session_id の変数はバージョン依存。
#   ここでは環境変数 KIRO_SESSION_LOG / KIRO_SESSION_ID を仮定し、無ければ静かに終了する。
#   形式が確認できるまで JSON 側は enabled:false（手動 kb-harvest --days/パス指定で代替）。
set -u

LOG="${KIRO_SESSION_LOG:-}"
SID="${KIRO_SESSION_ID:-}"
[ -n "$LOG" ] && [ -f "$LOG" ] || exit 0

# エラー痕跡の簡易検査（大文字小文字無視で error/failed/exception 等）
grep -qiE 'error|failed|exception|traceback|fatal' "$LOG" 2>/dev/null || exit 0

Q="$HOME/.kiro/knowledge/queue/pending-sessions.tsv"
mkdir -p "$(dirname "$Q")"
# 形式: epoch \t session_id \t project \t transcript_path（self-improve とスキーマ整合）
printf '%s\t%s\t%s\t%s\n' "$(date +%s)" "${SID:-unknown}" "$(basename "$PWD")" "$LOG" >> "$Q"
exit 0
