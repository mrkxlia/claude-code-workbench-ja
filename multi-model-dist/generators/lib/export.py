"""Track A の生成ドライバ。MAPPING.md のティアに従い、原本→build/→dist/ を生成する。

使い方:
  python3 export.py --repo <repo_root> --target codex,kiro [--out <build_dir>]

方針:
- 生成は MAPPING の allowlist（Track A 対象のみ）に限定。Track B（パイプライン/フック依存等）は生成しない。
- 出力にはセンチネル。手書き（センチネル無し）の既存ファイルは上書きしない（安全）。
- 走査範囲はセクション配下のみ（convert.iter_section_claude_dirs が root .claude を除外）。
"""
from __future__ import annotations

import argparse
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import convert  # noqa: E402
from serializers import codex, kiro  # noqa: E402

# --- MAPPING の Track A allowlist（section/name で明示。Track B/対象外は載せない）---------
T1_SKILLS = {
    ("implementation-skills", "notes"),
    ("implementation-skills", "spec-extract"),
    ("plan-mode", "create-plan"),
    ("plan-mode", "create-plan-calibrate"),
}
T2P_SKILLS = {("ai-peer", "peer")}          # スキル＋エージェント対
T2P_AGENTS = {("ai-peer", "peer-engineer")}  # 対のエージェント


def _write(path: pathlib.Path, text: str, source_rel: str):
    """センチネル付きで書き出す。手書き（センチネル無し）の既存物は上書きしない。"""
    if path.exists() and not convert.has_sentinel(path):
        return "skip(manual)"
    path.parent.mkdir(parents=True, exist_ok=True)
    new = text if text.endswith("\n") else text + "\n"
    if path.exists() and path.read_text(encoding="utf-8") == new:
        return "unchanged"
    path.write_text(new, encoding="utf-8")
    return "written"


def run(repo: pathlib.Path, targets: list[str], out: pathlib.Path) -> int:
    skills, agents, known = convert.collect(repo)
    by_skill = {(s.section, s.name): s for s in skills}
    by_agent = {(a.section, a.name): a for a in agents}
    log = {"written": 0, "unchanged": 0, "skip(manual)": 0}

    def rel(s):
        return f"{s.section}/.claude/skills/{s.name}/SKILL.md"

    def emit(status):
        log[status] = log.get(status, 0) + 1

    # T1 + T2p スキル
    for key in sorted(T1_SKILLS | T2P_SKILLS):
        s = by_skill.get(key)
        if not s:
            print(f"  WARN: skill not found: {key}", file=sys.stderr)
            continue
        if "codex" in targets:
            emit(_write(out / "build/codex" / codex.skill_path(s),
                        codex.skill_to_text(s, known, rel(s)), rel(s)))
        if "kiro" in targets:
            emit(_write(out / "build/kiro" / kiro.skill_path(s),
                        kiro.skill_to_text(s, known, rel(s)), rel(s)))

    # T2p エージェント
    for key in sorted(T2P_AGENTS):
        a = by_agent.get(key)
        if not a:
            print(f"  WARN: agent not found: {key}", file=sys.stderr)
            continue
        arel = f"{a.section}/.claude/agents/{a.name}.md"
        if "codex" in targets:
            emit(_write(out / "build/codex" / codex.agent_path(a),
                        codex.agent_to_text(a, known, arel), arel))
        if "kiro" in targets:
            emit(_write(out / "build/kiro" / kiro.agent_path(a),
                        kiro.agent_to_text(a, known, arel), arel))

    # T1g: data-science（frontmatter 無し）→ steering / AGENTS 素材
    for s in skills:
        if s.section == "data-science" and not s.has_frontmatter:
            if "kiro" in targets:
                emit(_write(out / "build/kiro" / kiro.steering_path(s),
                            kiro.guidance_to_steering(s, rel(s)), rel(s)))

    for k, v in log.items():
        print(f"  {k}: {v}")
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True)
    ap.add_argument("--target", default="codex,kiro")
    ap.add_argument("--out", default=None)
    args = ap.parse_args()
    repo = pathlib.Path(args.repo).resolve()
    targets = [t.strip() for t in args.target.split(",") if t.strip()]
    if "all" in targets:
        targets = ["codex", "kiro"]
    out = pathlib.Path(args.out).resolve() if args.out else repo / "multi-model-dist"
    return run(repo, targets, out)


if __name__ == "__main__":
    sys.exit(main())
