#!/usr/bin/env python3
"""tools/skill-sync/sync.py — このリポジトリ内で重複管理しているスキル/フックを、
単一の原本から派生ファイルへ機械的に同期する。

対象は CLAUDE.md 規約6 に列挙された「原本1つ→派生N個」の組（notes・spec-extract・
clarify・create-plan・create-plan-calibrate・spec-sync-reminder）。
これまでは HTML コメントで「手動 diff で一致を確認せよ」と書くだけの運用だったが、
派生を手で編集して原本と乖離する事故を防ぐため、生成 + --check の機械チェックに置き換える。

使い方:
  python3 tools/skill-sync/sync.py            # 原本から派生を再生成（変更が無ければ書き込まない）
  python3 tools/skill-sync/sync.py --check     # 派生が原本から生成した内容と一致するかだけ検証する（CI用）

原本のみを編集し、このスクリプトを実行すること。派生ファイルを直接編集しても、
次回 sync 実行で上書きされる（センチネル行がその旨を明記する）。
"""
from __future__ import annotations

import argparse
import dataclasses
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parent.parent
FRAGMENTS = HERE / "fragments"

SENTINEL_PREFIX = "SYNCED by tools/skill-sync — DO NOT EDIT. source:"
BOM = b"\xef\xbb\xbf"
_FM_RE = re.compile(r"^(---\n.*?\n---\n)", re.DOTALL)


@dataclasses.dataclass
class Rule:
    source: pathlib.Path
    dest: pathlib.Path
    fragment: pathlib.Path | None = None  # 指定時は source(本文) + fragment を合成する
    style: str = "md"  # "md": frontmatter直後にコメント挿入 / "hash": 1行目の直後に # コメント挿入

    def render(self) -> bytes:
        source_rel = self.source.relative_to(REPO).as_posix()
        raw = self.source.read_bytes()
        bom = raw.startswith(BOM)
        text = raw[len(BOM):].decode("utf-8") if bom else raw.decode("utf-8")

        if self.style == "md":
            m = _FM_RE.match(text)
            head, body = (text[: m.end()], text[m.end() :]) if m else ("", text)
            sentinel = f"<!-- {SENTINEL_PREFIX} {source_rel} -->\n"
            out = head + sentinel + body
        elif self.style == "hash":
            lines = text.splitlines(keepends=True)
            sentinel = f"# {SENTINEL_PREFIX} {source_rel}\n"
            out = "".join(lines[:1]) + sentinel + "".join(lines[1:])
        else:
            raise ValueError(f"unknown style: {self.style}")

        if self.fragment is not None:
            frag = self.fragment.read_text(encoding="utf-8")
            out = out.rstrip("\n") + "\n" + frag

        if not out.endswith("\n"):
            out += "\n"

        encoded = out.encode("utf-8")
        return (BOM + encoded) if bom else encoded


def build_rules() -> list[Rule]:
    P = REPO / "plugins"
    T = REPO / "templates"
    rules: list[Rule] = []

    # notes / spec-extract: templates/implementation-skills 原本 + 統合連携 fragment → 両パイプライン
    for skill, frag_name in (
        ("notes", "notes-pipeline-integration.md"),
        ("spec-extract", "spec-extract-pipeline-integration.md"),
    ):
        src = T / "implementation-skills/.claude/skills" / skill / "SKILL.md"
        for plugin in ("software-pipeline", "task-pipeline"):
            rules.append(
                Rule(
                    source=src,
                    dest=P / plugin / "skills" / skill / "SKILL.md",
                    fragment=FRAGMENTS / frag_name,
                )
            )

    # clarify: software-pipeline を正本として task-pipeline へ複製
    rules.append(
        Rule(
            source=P / "software-pipeline/skills/clarify/SKILL.md",
            dest=P / "task-pipeline/skills/clarify/SKILL.md",
        )
    )

    # create-plan / create-plan-calibrate: templates/plan-mode 原本 → ルート .claude/skills/ へ一方向コピー
    for name, files in (
        ("create-plan", ("SKILL.md", "SPEC.md")),
        ("create-plan-calibrate", ("SKILL.md",)),
    ):
        for fname in files:
            rules.append(
                Rule(
                    source=T / "plan-mode/.claude/skills" / name / fname,
                    dest=REPO / ".claude/skills" / name / fname,
                )
            )

    # spec-sync-reminder: software-pipeline を正本として task-pipeline へ複製（.sh / .ps1）
    for ext in (".sh", ".ps1"):
        rules.append(
            Rule(
                source=P / "software-pipeline/hooks" / f"spec-sync-reminder{ext}",
                dest=P / "task-pipeline/hooks" / f"spec-sync-reminder{ext}",
                style="hash",
            )
        )

    return rules


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="生成せず、派生が最新かのみ検証する（CI用）")
    args = ap.parse_args()

    rules = build_rules()
    mismatches: list[str] = []
    written = 0

    for rule in rules:
        rendered = rule.render()
        current = rule.dest.read_bytes() if rule.dest.exists() else None
        if args.check:
            if current != rendered:
                mismatches.append(rule.dest.relative_to(REPO).as_posix())
            continue
        if current == rendered:
            continue
        rule.dest.parent.mkdir(parents=True, exist_ok=True)
        rule.dest.write_bytes(rendered)
        if rule.style == "hash":
            rule.dest.chmod(rule.source.stat().st_mode)
        written += 1

    if args.check:
        if mismatches:
            print(f"stale（要 `python3 tools/skill-sync/sync.py` 実行）: {len(mismatches)} 件")
            for m in mismatches:
                print(f"  {m}")
            return 1
        print(f"OK: 全 {len(rules)} 件が原本と同期済み")
        return 0

    print(f"sync: {written} 件を更新（対象 {len(rules)} 件）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
