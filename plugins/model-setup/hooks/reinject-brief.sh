#!/usr/bin/env bash
# reinject-brief.sh — コンパクション直後に long-run のブリーフを文脈へ戻す SessionStart フック
#
# 長時間作業の途中でコンテキストが自動圧縮されると、CLAUDE.md（恒久ルール）は再ロードされるが、
# そのタスク固有のブリーフ（完了条件・スコープ・制約）は要約に溶けて薄れる。このフックは
# long-run スキルが固定したブリーフファイルを、圧縮直後の文脈に丸ごと戻す。
# ブリーフファイルが無ければ何も出力せず終了する（long-run を使っていないセッションでは無害）。
#
# 配線は long-run スキルの frontmatter（hooks.SessionStart / matcher: "compact"）。
# スキルを起動したときだけ登録されるため、settings.json を編集する必要はない。
# 純 PowerShell 環境向けに同等の reinject-brief.ps1 を同梱（README の手順で settings.json に配線）。
#
# SessionStart はプレーン stdout をそのまま文脈に入れる仕様なので、JSON は組み立てない。
#
# 単体テスト（プロジェクトルートで実行）:
#   mkdir -p docs/long-run && echo '完了条件: テストが通る' > docs/long-run/brief.md
#   echo '{"hook_event_name":"SessionStart","source":"compact"}' | bash plugins/model-setup/hooks/reinject-brief.sh
#     # → ブリーフの内容が見出しつきで出力される
#   rm -rf docs/long-run
#   echo '{}' | bash plugins/model-setup/hooks/reinject-brief.sh; echo $?   # → 出力なし・0

set -u

# stdin の JSON は使わないが、ブロッキングを避けるため読み捨てる
if [ ! -t 0 ]; then cat >/dev/null 2>&1 || true; fi

ROOT=$(printf '%s' "${CLAUDE_PROJECT_DIR:-$PWD}" | tr '\\' '/')

# ブリーフファイルを探す。long-run スキルの既定は docs/long-run/brief.md
BRIEF=""
for c in "docs/long-run/brief.md" ".claude/long-run-brief.md"; do
  if [ -f "$ROOT/$c" ]; then BRIEF="$ROOT/$c"; REL="$c"; break; fi
done
[ -n "$BRIEF" ] || exit 0

# 空ファイルなら何もしない
[ -s "$BRIEF" ] || exit 0

# フック出力は 10,000 字で切られる（超過分はファイルに退避される）。
# 長いブリーフは中途半端に切るより、場所を伝えて読ませたほうが確実。
SIZE=$(wc -c < "$BRIEF" | tr -d ' ')
if [ "$SIZE" -gt 8000 ]; then
  echo "【long-run ブリーフ】コンテキストが圧縮されました。このタスクの完了条件・スコープ・制約は"
  echo "$REL に固定してあります（${SIZE} バイトと長いため全文は載せません）。"
  echo "作業を続ける前に $REL を読み直し、そこに書かれた範囲だけを進めてください。"
  exit 0
fi

echo "【long-run ブリーフ（圧縮後の再注入）】"
echo "このセッションは long-run プロトコルで進行中です。以下は $REL に固定した"
echo "承認済みブリーフの全文です。圧縮でこれらの制約が薄れていないか確認し、この範囲だけを進めてください。"
echo "作業中に制約が増えたら $REL を更新してください（更新しないと次の圧縮で失われます）。"
echo "---"
cat "$BRIEF"
echo "---"

exit 0
