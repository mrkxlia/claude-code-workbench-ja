#!/usr/bin/env bash
# inject-spec-summary.sh — SPEC.md の確定要件の目次を文脈へ注入する SessionStart / SubagentStart フック
#
# researcher / brief-writer / final-reviewer 等には「SPEC.md を一次参照せよ」とプロンプトで
# 書いてあるが、読む義務を保証する仕組みが無かった（設計提案資料の穴②）。このフックは、
# 仕様の所在・最終更新日・[確定] 要件の目次を、セッション先頭と各サブエージェントの先頭に
# 機械的に届ける。SPEC.md が無ければ「外部ツールでの作成を推奨」の1行だけを返す。
#
# 抽出規則の定義は skills/pipeline-setup/references/spec-summary.md（.ps1 と共通の元）。
# .claude/settings.json の hooks.SessionStart / hooks.SubagentStart から呼び出される想定。
# 純 PowerShell 環境向けに同等の inject-spec-summary.ps1 を同梱（setup が振り分ける）。
#
# 出力先はイベントで変える: SessionStart はプレーン stdout がそのまま文脈に入るので JSON にしない。
# SubagentStart は additionalContext の JSON が必要。判別は stdin の hook_event_name。
#
# 単体テスト（プロジェクトルートで実行）:
#   echo '{"hook_event_name":"SessionStart","source":"startup"}' \
#     | bash .claude/hooks/inject-spec-summary.sh          # → プレーンテキスト（SPEC 無しなら1行）
#   echo '{"hook_event_name":"SubagentStart","agent_type":"researcher"}' \
#     | bash .claude/hooks/inject-spec-summary.sh          # → additionalContext の JSON 1行
#   echo '{}' | bash .claude/hooks/inject-spec-summary.sh; echo $?   # → プレーン扱い・0

set -u

MAX_ROWS=60      # 目次に載せる最大行数
MAX_BYTES=6000   # 目次全体のバイト上限（フック出力は 10,000 字で切られるため余裕を持たせる）
MAX_CELLS=3      # 1行から拾う表セル数（ID / 要件 / 確度）

# --- stdin からイベント名を取り出す（判別できなければプレーン扱い）-------------
EVENT=""
if [ ! -t 0 ]; then
  INPUT=$(cat 2>/dev/null || true)
  if command -v jq >/dev/null 2>&1; then
    EVENT=$(printf '%s' "$INPUT" | jq -r '.hook_event_name // empty' 2>/dev/null)
  else
    # jq がない環境向けの簡易フォールバック（他フックと同じく値だけを抽出する）
    EVENT=$(printf '%s' "$INPUT" \
      | grep -o '"hook_event_name"[[:space:]]*:[[:space:]]*"[^"]*"' | head -n1 \
      | sed 's/.*:[[:space:]]*"\(.*\)"/\1/')
  fi
fi

ROOT=$(printf '%s' "${CLAUDE_PROJECT_DIR:-$PWD}" | tr '\\' '/')

# --- SPEC ファイルを探す -------------------------------------------------------
SPEC=""; REL=""
for c in SPEC.md SPEC-recovered.md; do
  if [ -f "$ROOT/$c" ]; then SPEC="$ROOT/$c"; REL="$c"; break; fi
done

# --- 本文を組み立てる ----------------------------------------------------------
if [ -z "$SPEC" ]; then
  BODY="【仕様】このリポジトリに SPEC.md はありません。既存の挙動・規約が文書化されていないため、
既存仕様との整合は保証できません。レガシーコードからの逆引きは cc-rsg 等の外部ツールで
SPEC.md を作ってから進めることを推奨します。"
else
  # 最終更新日: git 管理下ならコミット日、そうでなければファイルの mtime
  UPDATED=$(git -C "$ROOT" log -1 --format=%ad --date=short -- "$REL" 2>/dev/null || true)
  if [ -z "$UPDATED" ]; then
    UPDATED=$(date -r "$SPEC" +%Y-%m-%d 2>/dev/null || echo "不明")
  fi

  # [確定] 要件の行を拾って整形する（規則は references/spec-summary.md）。
  # 切り詰めは必ず表セル区切り `|`（ASCII）の位置で行う。文字の途中で切ると
  # マルチバイト文字が壊れ、SubagentStart の JSON が不正な UTF-8 になるため。
  ROWS=$(grep -E '(^|[^A-Za-z0-9])[FD]-[0-9]+([^0-9]|$)' "$SPEC" 2>/dev/null \
    | grep -F '[確定]' \
    | sed -e 's/^[[:space:]]*|*[[:space:]]*//' -e 's/[[:space:]]*|*[[:space:]]*$//' \
    | awk -F'[[:space:]]*\\|[[:space:]]*' -v n="$MAX_CELLS" '{
        out = $1
        for (i = 2; i <= NF && i <= n; i++) out = out " / " $i
        if (NF > n) out = out " …"
        print out
      }' \
    || true)
  ROWS=$(printf '%s\n' "$ROWS" | grep -v '^[[:space:]]*$' || true)

  if [ -z "$ROWS" ]; then
    LIST="（[確定] とラベルされた要件はまだありません）"
  else
    TOTAL=$(printf '%s\n' "$ROWS" | wc -l | tr -d ' ')
    # 行数とバイト数の両方で頭打ちにする。落とすのは常に行単位（文字は割らない）
    LIST=$(printf '%s\n' "$ROWS" | awk -v mr="$MAX_ROWS" -v mb="$MAX_BYTES" '
      { if (NR > mr) exit; acc += length($0) + 1; if (acc > mb) exit; print }')
    SHOWN=$(printf '%s\n' "$LIST" | grep -c '' || echo 0)
    if [ "$TOTAL" -gt "$SHOWN" ]; then
      LIST="$LIST
（ほか $((TOTAL - SHOWN)) 件。全件は $REL を参照）"
    fi
  fi

  BODY="【仕様（spec of record）】$REL（最終更新 $UPDATED）
このリポジトリの確定要件は次のとおりです。実装・レビュー・要件定義は、この既存仕様と
矛盾しないことを確認してから進めてください。矛盾する変更が必要なら、黙って変えずに
ブリーフの「既存仕様への影響」で明示して承認を得てください。

$LIST

これは目次であり本文ではありません。判断の前に $REL の本文を読んでください。"
fi

# --- イベントに応じて出力する --------------------------------------------------
if [ "$EVENT" = "SubagentStart" ]; then
  # JSON に埋め込むためエスケープする（\ と " と改行。jq には依存しない）
  ESCAPED=$(printf '%s' "$BODY" \
    | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e 's/\t/\\t/g' \
    | awk 'BEGIN{ORS=""} {print (NR>1 ? "\\n" : "") $0}')
  printf '{"hookSpecificOutput":{"hookEventName":"SubagentStart","additionalContext":"%s"}}\n' "$ESCAPED"
else
  printf '%s\n' "$BODY"
fi

exit 0
