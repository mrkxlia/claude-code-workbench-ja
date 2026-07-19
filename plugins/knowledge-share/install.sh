#!/usr/bin/env bash
# install.sh — knowledge-share を ~/.claude/ に冪等インストールする
#
# このセクションは「ユーザーレベル」（全リポジトリ・全セッションで有効）に入れる。
# 何度実行しても安全（冪等）: 既存のナレッジ・設定・他フックは壊さない。
#
# やること:
#   1. skills / hooks / bin / templates を ~/.claude/ にコピーし、スクリプトに実行権限を付与
#   2. knowledge/ の骨格を作り、index.md が無ければテンプレートから作成（あれば触らない）
#   3. ~/.claude/CLAUDE.md に @~/.claude/knowledge/index.md を1行追記（既にあればスキップ）
#   4. ~/.claude/settings.json に SessionStart / SessionEnd フックを追記マージ（jq 必須）
#
# Windows では Git Bash または WSL の bash で実行してください
# （~/.claude は %USERPROFILE%\.claude に解決されます）。

set -eu

# このスクリプトが置かれているディレクトリ（= knowledge-share/）
SRC_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_DIR="$HOME/.claude"
KB_DIR="$CLAUDE_DIR/knowledge"

echo "==> knowledge-share をインストールします: $CLAUDE_DIR"

# --- 1. ディレクトリ作成 ------------------------------------------------------
mkdir -p "$CLAUDE_DIR/skills" "$CLAUDE_DIR/hooks"
mkdir -p "$KB_DIR/topics" "$KB_DIR/queue" "$KB_DIR/bin"

# --- 2. スキル / フック / 採掘スクリプトをコピー ------------------------------
# cp -R src dest/ はコピー先に同名ディレクトリがあると dest/kb/kb と入れ子を作るため、
# コピー先を作ってから「中身」をコピーする（再実行しても入れ子にならない＝冪等）
mkdir -p "$CLAUDE_DIR/skills/kb" "$CLAUDE_DIR/skills/kb-harvest"
cp -R "$SRC_DIR/.claude/skills/kb/."         "$CLAUDE_DIR/skills/kb/"
cp -R "$SRC_DIR/.claude/skills/kb-harvest/." "$CLAUDE_DIR/skills/kb-harvest/"
cp "$SRC_DIR/.claude/hooks/kb-session-start.sh" "$CLAUDE_DIR/hooks/"
cp "$SRC_DIR/.claude/hooks/kb-session-end.sh"   "$CLAUDE_DIR/hooks/"
cp "$SRC_DIR/bin/kb-extract-candidates.sh"      "$KB_DIR/bin/"

chmod +x "$CLAUDE_DIR/hooks/kb-session-start.sh" \
         "$CLAUDE_DIR/hooks/kb-session-end.sh" \
         "$KB_DIR/bin/kb-extract-candidates.sh"
echo "  - skills (kb / kb-harvest)・hooks・bin を配置しました"

# --- 3. index.md は無いときだけ作成（既存ナレッジを上書きしない） -------------
if [ -f "$KB_DIR/index.md" ]; then
  echo "  - index.md は既に存在するため触れません"
else
  cp "$SRC_DIR/templates/index.md" "$KB_DIR/index.md"
  echo "  - index.md をテンプレートから作成しました"
fi
# queue ファイルの実体（無ければ空で用意）
[ -f "$KB_DIR/queue/pending-sessions.tsv" ] || : > "$KB_DIR/queue/pending-sessions.tsv"

# --- 4. ~/.claude/CLAUDE.md に @import を1行追記（冪等） ----------------------
USER_MD="$CLAUDE_DIR/CLAUDE.md"
IMPORT_LINE='@~/.claude/knowledge/index.md'
if [ -f "$USER_MD" ] && grep -qF "$IMPORT_LINE" "$USER_MD"; then
  echo "  - CLAUDE.md には既に @import 行があります（スキップ）"
else
  {
    [ -f "$USER_MD" ] && echo ""
    echo "# リポジトリ横断ナレッジ（knowledge-share）"
    echo "$IMPORT_LINE"
  } >> "$USER_MD"
  echo "  - CLAUDE.md に @import 行を追記しました"
fi

# --- 5. settings.json に hooks を追記マージ（jq 必須） ------------------------
SETTINGS="$CLAUDE_DIR/settings.json"
START_CMD='bash "$HOME"/.claude/hooks/kb-session-start.sh'
END_CMD='bash "$HOME"/.claude/hooks/kb-session-end.sh'

if ! command -v jq >/dev/null 2>&1; then
  echo ""
  echo "  ! jq が見つからないため settings.json の自動マージはスキップしました。"
  echo "    以下を ~/.claude/settings.json の hooks に手動で追記してください"
  echo "    （既存の SessionStart / SessionEnd 配列があれば、上書きせず要素を足す）:"
  echo ""
  cat "$SRC_DIR/.claude/settings.json"
  echo ""
  echo "==> 完了（settings.json は手動マージが必要）"
  exit 0
fi

# 既存が無ければ空 JSON から始める
[ -f "$SETTINGS" ] || echo '{}' > "$SETTINGS"

# 既に配線済みかをチェック（コマンド文字列の存在で判定）
if jq -e --arg c "$START_CMD" \
      '[.hooks.SessionStart[]?.hooks[]?.command] | any(. == $c)' \
      "$SETTINGS" >/dev/null 2>&1; then
  echo "  - settings.json には既に knowledge-share のフックが配線済みです（スキップ）"
else
  # バックアップを取る
  cp "$SETTINGS" "$SETTINGS.bak"
  TMP="$(mktemp)"
  # 配列を「上書き」せず「追記」する。
  # 注意: jq -s '.[0] * .[1]' は配列を上書きして既存フックを消すため使わない。
  #       .hooks.X = ((.hooks.X // []) + [$new]) で要素を足す。
  jq \
    --arg start "$START_CMD" \
    --arg end "$END_CMD" \
    '
    .hooks = (.hooks // {})
    | .hooks.SessionStart = ((.hooks.SessionStart // []) + [
        { "matcher": "startup|resume",
          "hooks": [ { "type": "command", "command": $start } ] }
      ])
    | .hooks.SessionEnd = ((.hooks.SessionEnd // []) + [
        { "hooks": [ { "type": "command", "command": $end } ] }
      ])
    ' "$SETTINGS.bak" > "$TMP"

  # パース検証してから差し替え（壊れた JSON を書き込まない）
  if jq empty "$TMP" >/dev/null 2>&1; then
    mv "$TMP" "$SETTINGS"
    echo "  - settings.json にフックを追記マージしました（バックアップ: settings.json.bak）"
  else
    rm -f "$TMP"
    echo "  ! マージ結果が不正な JSON だったため settings.json は変更していません"
    exit 1
  fi
fi

echo "==> 完了。新しいセッションから知見の自動読み込み・記録・回収が有効になります。"
echo "    記録: /kb    検索: /kb search <語>    採掘: /kb-harvest"
