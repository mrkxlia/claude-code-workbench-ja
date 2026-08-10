#!/usr/bin/env bash
# block-secrets-commit.sh — 機密ファイルを含むコミットをブロックする PreToolUse フック
#
# Claude Code が Bash ツールで `git commit` を実行しようとしたとき、ステージに
# .env / *.key / *.pem / secrets.json が含まれていれば exit 2 でブロックする。
# （exit 2 はフックの公式仕様で「ツール実行を拒否し、stderr を Claude に伝える」）
#
# .claude/settings.json の hooks.PreToolUse から呼び出される想定。
# 人間の手コミットも守りたい場合は、このファイルを .git/hooks/pre-commit に
# コピー/リンクしてもよい（stdin が JSON でない場合は自動でスキップする）。
# git 管理されていないリポジトリでは何もしない（git diff が失敗した時点で exit 0）。

set -u

BLOCK_PATTERNS='(^|/)\.env(\..+)?$|\.key$|\.pem$|(^|/)secrets\.json$'
ALLOW_PATTERNS='\.env\.example$|\.env\.sample$|\.env\.template$'

# --- stdin から Bash ツールのコマンドを取り出す -------------------------------
# PreToolUse フックは stdin に JSON（tool_input.command など）を受け取る。
# git pre-commit として直接呼ばれた場合は stdin が空/非JSONなので、コマンド判定を飛ばす。
COMMAND=""
if [ ! -t 0 ]; then
  INPUT=$(cat)
  if command -v jq >/dev/null 2>&1; then
    COMMAND=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
  else
    # jq がない環境向けの簡易フォールバック（他フックと同じく値だけを抽出する）
    COMMAND=$(printf '%s' "$INPUT" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -n1 | sed 's/.*:[[:space:]]*"\(.*\)"/\1/')
  fi
fi

# PreToolUse 経由で、コマンドが git commit を含まないなら何もしない
if [ -n "$COMMAND" ] && ! printf '%s' "$COMMAND" | grep -Eq 'git[[:space:]]+([^&|;]*[[:space:]])?commit'; then
  exit 0
fi

# --- ステージされたファイルを検査 ---------------------------------------------
STAGED=$(git diff --cached --name-only 2>/dev/null) || exit 0

HITS=$(printf '%s\n' "$STAGED" | grep -E "$BLOCK_PATTERNS" | grep -Ev "$ALLOW_PATTERNS" || true)

if [ -n "$HITS" ]; then
  {
    echo "BLOCKED: 機密ファイルがステージされているため、このコミットを中止しました。"
    echo ""
    echo "該当ファイル:"
    printf '%s\n' "$HITS" | sed 's/^/  - /'
    echo ""
    echo "対処方法:"
    echo "  1. ステージから外す:        git reset HEAD <file>"
    echo "  2. 追跡対象から除外する:    .gitignore に追加する"
    echo "  3. 誤検知の場合のみ、ユーザーに確認のうえパターンを調整する"
  } >&2
  exit 2
fi

exit 0
