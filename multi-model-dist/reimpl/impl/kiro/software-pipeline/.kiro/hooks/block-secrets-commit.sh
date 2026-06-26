#!/usr/bin/env bash
# block-secrets-commit.sh（Kiro 版・T2h） — 機密ファイルを含むコミットをブロックする検査本体
#
# SPEC: multi-model-dist/reimpl/SPEC/hooks.md（H0/H1）。原本 software-pipeline 版と同じ検査ロジック
# （ステージに .env/*.key/*.pem/secrets.json があれば中止）を、Kiro の PreToolUse hook の action から呼ぶ。
#
# [要確認] Kiro の hook がツール実行を「拒否」できるか（exit code 契約）はバージョン依存。
#   拒否できる環境では exit 2 相当でブロック、できなければ stderr 通知＋非ゼロ終了で「中止を強く促す」(SPEC H3 degrade)。
# git 管理外・該当なしなら静かに exit 0。
set -u

BLOCK_PATTERNS='(^|/)\.env(\..+)?$|\.key$|\.pem$|(^|/)secrets\.json$'
ALLOW_PATTERNS='\.env\.example$|\.env\.sample$|\.env\.template$'

STAGED=$(git diff --cached --name-only 2>/dev/null) || exit 0
HITS=$(printf '%s\n' "$STAGED" | grep -E "$BLOCK_PATTERNS" | grep -Ev "$ALLOW_PATTERNS" || true)
[ -z "$HITS" ] && exit 0

{
  echo "BLOCKED: 機密ファイルがステージされているため、このコミットを中止してください。"
  echo "該当ファイル:"
  printf '%s\n' "$HITS" | sed 's/^/  - /'
  echo "対処: git reset HEAD <file> でステージから外す／.gitignore に追加する。"
} >&2
exit 2
