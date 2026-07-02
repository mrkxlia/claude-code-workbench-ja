#!/usr/bin/env bash
# plan-to-codex.sh — プラン承認時に「Codex に実装させる」よう Claude を誘導する PostToolUse フック
#
# Claude Code のプランモードでユーザーがプランを承認すると、PostToolUse(matcher: ExitPlanMode)
# としてこのフックが発火する。ここでは hookSpecificOutput.additionalContext に「固定の指示文字列」
# だけを出力し、Claude に codex-implement スキルでの実装委譲を促す。
#
# 設計上のポイント:
#   - opt-in: プラグインの hooks.json には入れず、各自の .claude/settings.json から呼ぶ想定。
#   - jq 不要: プラン本文を埋め込まない（Claude は承認済みプランを文脈に持っている）。出力は
#     ユーザー入力を一切含まない定数 JSON リテラルなので、エスケープもインジェクションも起きない。
#   - 委譲はこの承認済みプラン1件のみ・一度きり。
#
# 有効化（プロジェクトの .claude/settings.json 例）:
#   {"hooks":{"PostToolUse":[{"matcher":"ExitPlanMode",
#     "hooks":[{"type":"command","command":"bash \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/plan-to-codex.sh"}]}]}}

set -u

# stdin は読み捨ててよい（matcher=ExitPlanMode で承認時のみ発火する）。
# 端末直叩きなど stdin が無い場合に固まらないよう、ある時だけ読む。
if [ ! -t 0 ]; then
  cat >/dev/null 2>&1 || true
fi

# ユーザー入力を含まない定数 JSON を1つ出力するだけ（jq 不要・エスケープ不要）。
cat <<'JSON'
{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"直前に承認されたプランを、いま codex-implement スキル（codex-implementer サブエージェント）で OpenAI Codex に実装させてください。承認済みプラン本文は会話中のものをそのまま使い、codex-implement の通常フロー（関連ファイルの特定・同梱 → workspace-write で Codex に実装 → 差分とテストを検証 → 要約）に従ってください。生のプランを codex exec に直接流さず、必ずスキルのファイル選別を通すこと。委譲はこの承認済みプラン1件のみ・一度きりにしてください。"}}
JSON

exit 0
