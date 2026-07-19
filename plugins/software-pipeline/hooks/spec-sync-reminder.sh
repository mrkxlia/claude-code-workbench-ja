#!/usr/bin/env bash
# spec-sync-reminder.sh — SPEC.md（生きた仕様）の未同期をやさしく知らせる通知フック
#
# SessionStart / Stop イベントで呼ばれ、SPEC.md が最後に更新されたコミット以降に
# ソース/成果物が変更されていれば「SPEC.md も更新が要るかも」と非ブロッキングで知らせる。
# 作業は一切止めない（常に exit 0）。git 管理外・SPEC.md 不在なら静かに何もしない。
#
# .claude/settings.json の hooks.SessionStart / hooks.Stop から呼び出される想定。
# 純 PowerShell 環境向けに同等の spec-sync-reminder.ps1 を同梱（setup が振り分ける）。

set -u

# stdin の JSON は使わないが、ブロッキングを避けるため読み捨てる
if [ ! -t 0 ]; then cat >/dev/null 2>&1 || true; fi

# git 管理外なら何もしない
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

# SPEC ファイルを探す（リポジトリ直下）。無ければ何もしない
SPEC=""
for c in SPEC.md SPEC-recovered.md; do
  if [ -f "$c" ]; then SPEC="$c"; break; fi
done
[ -n "$SPEC" ] || exit 0

# SPEC を最後に変更したコミット。未コミット（追跡されていない）なら静かに終了
SPEC_COMMIT=$(git log -1 --format=%H -- "$SPEC" 2>/dev/null)
[ -n "$SPEC_COMMIT" ] || exit 0

# SPEC 最終更新以降に変わったファイル（コミット済み＋作業ツリー）を集める。
# SPEC 自身・パイプラインの中間成果物（docs/pipeline, docs/task-pipeline）・
# 実装ノートは除外する（これらは仕様の正ではないため）。
EXCLUDE='(^|/)SPEC(-recovered)?\.md$|^docs/(pipeline|task-pipeline)/|(^|/)implementation-notes(-[^/]*)?\.md$'
CHANGED=$(
  {
    git diff --name-only "$SPEC_COMMIT" HEAD 2>/dev/null
    git status --porcelain 2>/dev/null | sed 's/^...//'
  } | grep -Ev "$EXCLUDE" | sort -u
)
CHANGED=$(printf '%s\n' "$CHANGED" | grep -v '^[[:space:]]*$' || true)
[ -n "$CHANGED" ] || exit 0

COUNT=$(printf '%s\n' "$CHANGED" | wc -l | tr -d ' ')
{
  echo "📝 SPEC.md（$SPEC）が最後に更新されてから、${COUNT} 件のソース/成果物が変更されています。"
  echo "   既存挙動を変えていれば、該当 F-NN/D-NN だけ SPEC.md を増分更新すると spec of record が陳腐化しません"
  echo "   （/spec-extract の「変更管理」を参照。不要なら無視して構いません）。例:"
  printf '%s\n' "$CHANGED" | head -n 3 | sed 's/^/     - /'
} >&2

exit 0
