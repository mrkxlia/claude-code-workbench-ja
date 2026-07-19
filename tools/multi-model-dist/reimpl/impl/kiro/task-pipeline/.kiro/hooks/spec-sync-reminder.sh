#!/usr/bin/env bash
# spec-sync-reminder.sh（Kiro 版・T2h） — SPEC.md（生きた仕様）の未同期をやさしく知らせる通知
#
# SPEC: multi-model-dist/reimpl/SPEC/hooks.md（H0 spec-sync-reminder）。元から非ブロッキング通知のため完全再現可。
# SessionStart で呼ばれ、SPEC.md 最終更新コミット以降にソース/成果物が変わっていれば知らせる。常に exit 0。
# git 管理外・SPEC.md 不在なら静かに何もしない。（software-pipeline / task-pipeline 共通）
set -u

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0
SPEC=""
for c in SPEC.md SPEC-recovered.md; do [ -f "$c" ] && { SPEC="$c"; break; }; done
[ -n "$SPEC" ] || exit 0
SPEC_COMMIT=$(git log -1 --format=%H -- "$SPEC" 2>/dev/null)
[ -n "$SPEC_COMMIT" ] || exit 0

EXCLUDE='(^|/)SPEC(-recovered)?\.md$|^docs/(pipeline|task-pipeline)/|(^|/)implementation-notes(-[^/]*)?\.md$'
CHANGED=$(
  { git diff --name-only "$SPEC_COMMIT" HEAD 2>/dev/null; git status --porcelain 2>/dev/null | sed 's/^...//'; } \
  | grep -Ev "$EXCLUDE" | sort -u | grep -v '^[[:space:]]*$' || true
)
[ -n "$CHANGED" ] || exit 0
COUNT=$(printf '%s\n' "$CHANGED" | wc -l | tr -d ' ')
{
  echo "📝 SPEC.md（$SPEC）が最後に更新されてから、${COUNT} 件のソース/成果物が変更されています。"
  echo "   既存挙動を変えていれば、該当 F-NN/D-NN だけ SPEC.md を増分更新すると spec of record が陳腐化しません。例:"
  printf '%s\n' "$CHANGED" | head -n 3 | sed 's/^/     - /'
} >&2
exit 0
