#!/usr/bin/env bash
# loop-stop-check.sh — 自己修正ループの「決定的な停止ゲート」（Stop フック）
#
# 本体の /goal も prompt 型の Stop フックも、判定するのは「会話に出た内容」であって
# 実ファイルではない（/goal の評価器はツールを持たない）。そのため
# 「Judge が FAIL を返したのに、その修正をせずにターンを終える」を確実には止められない。
# このフックは会話ではなく **状態ファイル** を読んで機械的に判定する。
#
#   .claude/self-correct/state.json（self-correct スキルがラウンドごとに更新する）
#   {
#     "status": "ACTIVE",            // ACTIVE / PASS / ESCALATED（ACTIVE 以外は素通り）
#     "task": "drafts/article.md の校閲",
#     "attempt": 1,                  // 実施済みの修正ラウンド数
#     "max_attempts": 3,             // 上限（超えたら人間へ引き継ぐ）
#     "verdict": "FAIL",             // 直近の Judge 判定 PASS / FAIL / UNVERIFIED
#     "protected": ["references/"],  // guard-ground-truth.sh が使う変更禁止パス
#     "updated": "2026-09-05T10:00:00Z"
#   }
#
# 判定:
#   ファイルが無い / status が ACTIVE でない        → 素通り（exit 0）
#   ACTIVE かつ attempt < max_attempts             → block（ループの続きを促す）
#   ACTIVE かつ attempt >= max_attempts            → block（引き継ぎ書の作成と ESCALATE を促す）
#
# 【無限ループ防止】同じ状態（updated の値）に対する block は1回だけ。ナッジ済みの
# updated は .claude/self-correct/.stop-nudge に記録し、状態が更新されない限り2度目は
# 素通りする。ループが前進すれば state.json の updated が変わり、再びゲートが効く。
#
# jq が無い環境（Windows の Git Bash 等）でも動くよう grep/sed のフォールバックを持つ。
#
# 単体テスト（プロジェクトルートで実行）:
#   mkdir -p .claude/self-correct
#   printf '{"status":"ACTIVE","task":"t","attempt":1,"max_attempts":3,"verdict":"FAIL","updated":"u1"}' \
#     > .claude/self-correct/state.json
#   echo '{}' | bash hooks/loop-stop-check.sh          # → block の JSON（1回目）
#   echo '{}' | bash hooks/loop-stop-check.sh; echo $? # → 0・出力なし（同じ状態は再ナッジしない）
#   rm -rf .claude/self-correct

set -u

ROOT="${CLAUDE_PROJECT_DIR:-$PWD}"
STATE_FILE="$ROOT/.claude/self-correct/state.json"
NUDGE_FILE="$ROOT/.claude/self-correct/.stop-nudge"

# 状態ファイルが無い＝ループを回していない。何もしない
[ -f "$STATE_FILE" ] || exit 0

STATE=$(cat "$STATE_FILE" 2>/dev/null) || exit 0
[ -n "$STATE" ] || exit 0

# --- state.json から値を取り出す ----------------------------------------------
json_str() {  # $1=キー名。文字列値を返す
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$STATE" | jq -r --arg k "$1" '.[$k] // empty' 2>/dev/null
  else
    printf '%s' "$STATE" \
      | grep -Eo "\"$1\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" | head -n1 \
      | sed 's/.*:[[:space:]]*"\(.*\)"/\1/'
  fi
}
json_num() {  # $1=キー名。数値を返す（取れなければ空）
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$STATE" | jq -r --arg k "$1" '.[$k] // empty' 2>/dev/null
  else
    printf '%s' "$STATE" \
      | grep -Eo "\"$1\"[[:space:]]*:[[:space:]]*[0-9]+" | head -n1 \
      | sed 's/.*:[[:space:]]*//'
  fi
}

STATUS=$(json_str status)
# ACTIVE 以外（PASS / ESCALATED / 未設定）は停止してよい
[ "$STATUS" = "ACTIVE" ] || exit 0

UPDATED=$(json_str updated)
TASK=$(json_str task)
VERDICT=$(json_str verdict)
ATTEMPT=$(json_num attempt)
MAX=$(json_num max_attempts)

# 数値が壊れている場合は安全側（ゲートを効かせない）に倒す
case "$ATTEMPT" in ''|*[!0-9]*) exit 0 ;; esac
case "$MAX"     in ''|*[!0-9]*) exit 0 ;; esac

# --- 同じ状態への再ナッジを防ぐ ------------------------------------------------
if [ -f "$NUDGE_FILE" ] && [ "$(cat "$NUDGE_FILE" 2>/dev/null)" = "$UPDATED" ]; then
  exit 0
fi
mkdir -p "$(dirname "$NUDGE_FILE")" 2>/dev/null || true
printf '%s' "$UPDATED" > "$NUDGE_FILE" 2>/dev/null || true

# --- block の理由を組み立てる --------------------------------------------------
if [ "$ATTEMPT" -lt "$MAX" ]; then
  REASON="自己修正ループが未完了のまま停止しようとしています（タスク: ${TASK}／直近の判定: ${VERDICT}／修正ラウンド ${ATTEMPT}/${MAX}）。次のどれかを実行してから停止してください: (1) loop-judge の最新の FAIL 指摘だけを loop-builder に渡して修正する、(2) 修正済みなら loop-judge で再検査する、(3) Critical=0 かつ Major=0 になったら .claude/self-correct/state.json の status を PASS にする。修正は指摘された箇所だけに限定し、PASS 済みの箇所は変更しないでください。"
else
  REASON="自己修正ループが上限（${MAX}回）に達しました（タスク: ${TASK}／直近の判定: ${VERDICT}）。これ以上の自動修正はせず、人間への引き継ぎに切り替えてください: 現在の成果物・試した修正の履歴・残っている Critical / Major / UNVERIFIED・根拠・判断してほしい論点をまとめて報告し、.claude/self-correct/state.json の status を ESCALATED に更新してください。"
fi

# JSON 文字列に埋め込むため \ と " をエスケープする
ESCAPED_REASON=$(printf '%s' "$REASON" | sed 's/\\/\\\\/g; s/"/\\"/g')
printf '{"decision":"block","reason":"%s"}\n' "$ESCAPED_REASON"
exit 0
