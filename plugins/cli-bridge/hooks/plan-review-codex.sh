#!/usr/bin/env bash
# plan-review-codex.sh — プランをユーザーに提示する「前」に Codex レビューを挟む PreToolUse フック
#
# Claude Code のプランモードで Claude がプランを提示しようとすると、PreToolUse(matcher: ExitPlanMode)
# としてこのフックが発火する。ここで permissionDecision:"deny" を返すと ExitPlanMode 自体が成立せず、
# プランは提示されない。Claude は理由（固定文字列）を受け取り、先に codex-ask でレビューさせてから
# プランを出し直す。
#
# 設計上のポイント:
#   - opt-in: プラグインの hooks.json には入れず、各自の .claude/settings.json から呼ぶ想定。
#     全プラン発火は課金とレイテンシを常時払うことになるため、既定を「発火しない」にしてある。
#   - additionalContext ではなく deny: PreToolUse の allow ではプランがそのまま提示されうる
#     （ExitPlanMode に対するフック実行と UI 提示の前後関係は公式ドキュメントに記載が無い）。
#     deny なら ExitPlanMode が成立しないので、仕様の穴に依存せず「レビューが先」が決まる。
#   - フック自身は codex を呼ばない: 数十秒ブロックしない／外部モデルの出力を無検証で文脈へ
#     注入する経路を作らない／jq もエスケープも要らない。実行は codex-advisor に委譲する。
#   - jq 不要: stdin から session_id だけを grep で取り出し、英数字とハイフン・アンダースコアに
#     サニタイズして状態ファイル名に使う。出力はユーザー入力を一切含まない定数 JSON リテラル。
#   - 無限ループしない: deny は 1 セッション 1 回まで（状態ファイルで機械的に固定）。
#     改訂後の再提示は必ず通るので、プロンプト上の約束に頼らずループが止まる。
#   - 異常系は素通り: session_id が取れない／状態ディレクトリに書けないときは deny しない。
#
# 有効化（プロジェクトの .claude/settings.json 例）:
#   {"hooks":{"PreToolUse":[{"matcher":"ExitPlanMode",
#     "hooks":[{"type":"command","command":"bash \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/plan-review-codex.sh"}]}]}}
#
# 単体テスト（プロジェクトルートで実行）:
#   echo '{"session_id":"t1","tool_name":"ExitPlanMode","tool_input":{"plan":"x"}}' \
#     | bash hooks/plan-review-codex.sh; echo $?   # → deny の JSON・exit 0
#   echo '{"session_id":"t1","tool_name":"ExitPlanMode","tool_input":{"plan":"x"}}' \
#     | bash hooks/plan-review-codex.sh; echo $?   # → 出力なし・exit 0（2回目は素通り）
#   rm -rf .claude/codex-bridge

set -u

# stdin が無い場合（端末直叩き等）に固まらないよう、ある時だけ読む。
INPUT=""
if [ ! -t 0 ]; then
  INPUT=$(cat 2>/dev/null) || INPUT=""
fi

# --- session_id を取り出す（jq 不要・値はサニタイズする） ----------------------
SESSION_ID=$(printf '%s' "$INPUT" \
  | grep -o '"session_id"[[:space:]]*:[[:space:]]*"[^"]*"' | head -n1 \
  | sed 's/.*:[[:space:]]*"\(.*\)"/\1/' \
  | tr -cd 'A-Za-z0-9_-')
# セッションを識別できないときは、ゲートを掛けずに素通りする（安全側）。
[ -n "$SESSION_ID" ] || exit 0

STATE_DIR="${CLAUDE_PROJECT_DIR:-$PWD}/.claude/codex-bridge"
STATE_FILE="$STATE_DIR/plan-reviewed-$SESSION_ID"

# 古い状態ファイル（7日超）を掃除する。失敗しても続行する。
find "$STATE_DIR" -type f -name 'plan-reviewed-*' -mtime +7 -delete >/dev/null 2>&1 || true

# 2回目以降は出力なしで素通り（allow は明示しない — 他フックの判断を上書きしないため）。
[ -f "$STATE_FILE" ] && exit 0

# 状態ファイルを作れないときは deny しない（deny だけ残ってプランを出せなくなるのを避ける）。
mkdir -p "$STATE_DIR" 2>/dev/null || exit 0
: > "$STATE_FILE" 2>/dev/null || exit 0

# ユーザー入力を含まない定数 JSON を1つ出力するだけ（jq 不要・エスケープ不要）。
cat <<'JSON'
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"プランをユーザーに提示する前に、まず codex-ask スキル（codex-advisor サブエージェント）で OpenAI Codex にこのプランをレビューさせてください。プラン全文と判断に必要なファイルの内容を heredoc で同梱し、read-only で実行します（codex exec resume は使わず、プランを更新したら毎回全文を渡し直すこと）。返ってきた指摘のうち P1・P2（致命的・重大）だけをプランに反映し、P3 以下は件数だけ添えて、そのうえで改めてプランを提示してください。codex が未導入・未認証の場合はレビューを飛ばし、その旨を1行添えて再提示して構いません。このゲートは1セッションにつき1回だけで、次の提示はそのまま通ります。"}}
JSON

exit 0
