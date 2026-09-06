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
#     "regressed_count": 0,          // 前ラウンド PASS → 今ラウンド FAIL に転じた基準の件数
#     "no_progress_streak": 0,       // 未解決 Critical/Major 件数が減らなかった連続ラウンド数
#     "protected": ["references/"],  // guard-ground-truth.sh が使う変更禁止パス
#     "updated": "2026-09-05T10:00:00Z"
#   }
#
# 判定（先に当たったものを採る）:
#   ファイルが無い / status が ACTIVE でない        → 素通り（exit 0）
#   ACTIVE かつ attempt >= max_attempts            → block（引き継ぎ書の作成と ESCALATE を促す）
#   ACTIVE かつ no_progress_streak >= 2            → block（2ラウンド進捗なし。ESCALATE を促す）
#   ACTIVE かつ regressed_count >= 1               → block（リグレッション。指摘外の変更の差し戻しを促す）
#   ACTIVE かつ attempt < max_attempts             → block（ループの続きを促す）
#
# regressed_count / no_progress_streak は**無いのが正常**（旧版の状態ファイル・ループ初回）なので、
# 未設定・非数値は 0 に倒す。attempt / max_attempts が壊れている場合の「素通り」とは扱いが違う。
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
#   echo '{}' | bash hooks/loop-stop-check.sh          # → block の JSON（1回目・続行を促す）
#   echo '{}' | bash hooks/loop-stop-check.sh; echo $? # → 0・出力なし（同じ状態は再ナッジしない）
#   printf '{"status":"ACTIVE","task":"t","attempt":1,"max_attempts":3,"verdict":"FAIL","regressed_count":1,"updated":"u2"}' \
#     > .claude/self-correct/state.json
#   echo '{}' | bash hooks/loop-stop-check.sh          # → block（差し戻しを促す）
#   printf '{"status":"ACTIVE","task":"t","attempt":1,"max_attempts":3,"verdict":"FAIL","no_progress_streak":2,"updated":"u3"}' \
#     > .claude/self-correct/state.json
#   echo '{}' | bash hooks/loop-stop-check.sh          # → block（ESCALATE を促す）
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
REGRESSED=$(json_num regressed_count)
NO_PROGRESS=$(json_num no_progress_streak)

# 数値が壊れている場合は安全側（ゲートを効かせない）に倒す
case "$ATTEMPT" in ''|*[!0-9]*) exit 0 ;; esac
case "$MAX"     in ''|*[!0-9]*) exit 0 ;; esac

# 追加の停止ルールは「無いのが正常」（旧版の状態ファイル・ループ初回）なので 0 に倒す
case "$REGRESSED"   in ''|*[!0-9]*) REGRESSED=0 ;; esac
case "$NO_PROGRESS" in ''|*[!0-9]*) NO_PROGRESS=0 ;; esac

# --- 同じ状態への再ナッジを防ぐ ------------------------------------------------
if [ -f "$NUDGE_FILE" ] && [ "$(cat "$NUDGE_FILE" 2>/dev/null)" = "$UPDATED" ]; then
  exit 0
fi
mkdir -p "$(dirname "$NUDGE_FILE")" 2>/dev/null || true
printf '%s' "$UPDATED" > "$NUDGE_FILE" 2>/dev/null || true

# --- block の理由を組み立てる --------------------------------------------------
if [ "$ATTEMPT" -ge "$MAX" ]; then
  REASON="自己修正ループが上限（${MAX}回）に達しました（タスク: ${TASK}／直近の判定: ${VERDICT}）。これ以上の自動修正はせず、人間への引き継ぎに切り替えてください: 現在の成果物・試した修正の履歴・残っている Critical / Major / UNVERIFIED・根拠・判断してほしい論点をまとめて報告し、.claude/self-correct/state.json の status を ESCALATED に更新してください。"
elif [ "$NO_PROGRESS" -ge 2 ]; then
  REASON="未解決の Critical / Major の件数が ${NO_PROGRESS} ラウンド連続で減っていません（タスク: ${TASK}／修正ラウンド ${ATTEMPT}/${MAX}）。同じやり方をもう一度試さないでください。原因は Builder の努力不足ではなく、評価基準の矛盾・根拠（Ground Truth）の不足・権限不足のいずれかであることが多いです。どれに当たるかを判断して報告し、.claude/self-correct/state.json の status を ESCALATED に更新して人間へ引き継いでください。"
elif [ "$REGRESSED" -ge 1 ]; then
  REASON="前ラウンドで PASS だった基準が ${REGRESSED} 件 FAIL に転じています（リグレッション。タスク: ${TASK}／修正ラウンド ${ATTEMPT}/${MAX}）。新しい修正を重ねる前に、直前のラウンドで「指摘されていない箇所」に入った変更を差し戻してください。そのうえで FAIL 指摘だけを直し、loop-judge で再検査します。同じ基準が2ラウンド続けて転んでいる場合は、修正を続けずに status を ESCALATED にして人間へ引き継いでください。"
else
  REASON="自己修正ループが未完了のまま停止しようとしています（タスク: ${TASK}／直近の判定: ${VERDICT}／修正ラウンド ${ATTEMPT}/${MAX}）。次のどれかを実行してから停止してください: (1) loop-judge の最新の FAIL 指摘だけを loop-builder に渡して修正する、(2) 修正済みなら loop-judge で再検査する、(3) Critical=0 かつ Major=0 になったら .claude/self-correct/state.json の status を PASS にする。修正は指摘された箇所だけに限定し、PASS 済みの箇所は変更しないでください。"
fi

# JSON 文字列に埋め込むため \ と " をエスケープする
ESCAPED_REASON=$(printf '%s' "$REASON" | sed 's/\\/\\\\/g; s/"/\\"/g')
printf '{"decision":"block","reason":"%s"}\n' "$ESCAPED_REASON"
exit 0
