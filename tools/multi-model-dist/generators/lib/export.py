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
    # data-science 参照ドキュメント10種（全て frontmatter 有り＝通常スキルとして生成。MAPPING ①）
    ("data-science", "analysis-reporting"),
    ("data-science", "dataframe-polars"),
    ("data-science", "notebook-workflow"),
    ("data-science", "path-and-io"),
    ("data-science", "python-project-ops"),
    ("data-science", "python-style"),
    ("data-science", "safe-data-handling"),
    ("data-science", "sql-analysis"),
    ("data-science", "statistical-ml-review"),
    ("data-science", "visualization"),
    # model-setup の tool-agnostic なプロトコルスキル（fan-out / verify-fresh は T2p）
    ("model-setup", "task-brief"),
    ("model-setup", "backlog-loop"),
    ("model-setup", "pr-merge"),
    ("model-setup", "long-run"),
}
T2P_SKILLS = {                                # スキル＋エージェント対
    ("ai-peer", "peer"),
    ("model-setup", "fan-out"),
    ("model-setup", "verify-fresh"),
    ("agent-review-panel", "review-panel"),
}
T2P_AGENTS = {                                # 対のエージェント
    ("ai-peer", "peer-engineer"),
    ("model-setup", "task-worker"),
    ("model-setup", "fresh-verifier"),
    ("model-setup", "bulk-scanner"),
    ("agent-review-panel", "panel-reviewer"),
    ("agent-review-panel", "panel-codex"),
    ("agent-review-panel", "panel-verifier"),
    ("agent-review-panel", "panel-judge"),
}

# CLAUDE.md → AGENTS.md / steering（Track A の指示書ガイダンス。pipeline 系 CLAUDE.md は Track B なので除外）
# 値はターゲットの allowlist。model-setup は Claude モデル運用ルールのため Kiro のみ（MAPPING ①ガイダンス表）。
GUIDANCE_CLAUDE = {
    "global-claude-md-sample": ("codex", "kiro"),
    "data-science": ("codex", "kiro"),
    "model-setup": ("kiro",),
}

TEMPLATES = HERE.parent / "templates"


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


def _check_residual(texts: list[str], known: set[str], where: str):
    """写像後の本文に CC 固有トークンが残っていないか検証する（MAPPING ④ のゴールデン検証を生成時にも実施）。"""
    bad = sorted({t for text in texts for t in convert.residual_cc_tokens(text, known)})
    if bad:
        raise SystemExit(f"ERROR: 生成物に CC 固有トークンが残存: {where}: {bad}")


def _emit_sidecars(skill_dir: pathlib.Path, out_skill_dir: pathlib.Path, target: str,
                   known: set[str], skill_rel_dir: str, emit):
    """スキルディレクトリの SKILL.md 以外（personas.md・SPEC.md 等）を出力先へ複製する（MAPPING ②）。

    `.md` は prose としてセンチネル＋用語写像を適用し、その他の拡張子は verbatim 複製する。
    """
    for f in sorted(skill_dir.iterdir()):
        if not f.is_file() or f.name == "SKILL.md":
            continue
        rel = f"{skill_rel_dir}/{f.name}"
        dst = out_skill_dir / f.name
        if f.suffix == ".md":
            body = convert.map_body(f.read_text(encoding="utf-8"), target, known)
            _check_residual([body], known, rel)
            emit(_write(dst, f"{convert.sentinel_line(rel)}\n{body}", rel))
        else:
            dst.parent.mkdir(parents=True, exist_ok=True)
            dst.write_bytes(f.read_bytes())
            emit("written")


def run(repo: pathlib.Path, targets: list[str], out: pathlib.Path) -> int:
    # F2: 出力は <name> 単位なので、allowlist のスキル名が衝突すると無言で上書きになる。
    # MAPPING ② の衝突回避（正本は単体版・連携版は Track B）に従い、ここで明示チェックして fail させる。
    names = [n for _, n in (T1_SKILLS | T2P_SKILLS)]
    dups = sorted({n for n in names if names.count(n) > 1})
    if dups:
        raise SystemExit(f"ERROR: Track A allowlist にスキル名衝突: {dups}（正本を1つに絞ること）")

    skills, agents, known = convert.collect(repo)
    by_skill = {(s.section, s.name): s for s in skills}
    by_agent = {(a.section, a.name): a for a in agents}
    log = {"written": 0, "unchanged": 0, "skip(manual)": 0}

    def rel(s):
        return convert.skill_source_rel(repo, s.section, s.name)

    def emit(status):
        log[status] = log.get(status, 0) + 1

    # T1 + T2p スキル（＋サイドカー複製）
    for key in sorted(T1_SKILLS | T2P_SKILLS):
        s = by_skill.get(key)
        if not s:
            print(f"  WARN: skill not found: {key}", file=sys.stderr)
            continue
        if not s.has_frontmatter:
            # 監査誤り（旧 T1g の再発）をここで止める: allowlist のスキルは frontmatter 必須
            raise SystemExit(f"ERROR: allowlist のスキルに frontmatter がありません: {key}")
        skill_dir = convert.assets_root(repo, s.section) / "skills" / s.name
        skill_rel_dir = rel(s).rsplit("/", 1)[0]
        for target, ser in (("codex", codex), ("kiro", kiro)):
            if target not in targets:
                continue
            _check_residual(
                [convert.map_body(s.description, target, known), convert.map_body(s.body, target, known)],
                known, rel(s))
            out_path = out / f"build/{target}" / ser.skill_path(s)
            emit(_write(out_path, ser.skill_to_text(s, known, rel(s)), rel(s)))
            _emit_sidecars(skill_dir, out_path.parent, target, known, skill_rel_dir, emit)

    # T2p エージェント
    for key in sorted(T2P_AGENTS):
        a = by_agent.get(key)
        if not a:
            print(f"  WARN: agent not found: {key}", file=sys.stderr)
            continue
        arel = convert.agent_source_rel(repo, a.section, a.name)
        for target, ser in (("codex", codex), ("kiro", kiro)):
            if target not in targets:
                continue
            _check_residual(
                [convert.map_body(a.description, target, known), convert.map_body(a.instructions, target, known)],
                known, arel)
            emit(_write(out / f"build/{target}" / ser.agent_path(a),
                        ser.agent_to_text(a, known, arel), arel))

    # CLAUDE.md → AGENTS.md（Codex）/ steering inclusion:always（Kiro）。対象ターゲットは GUIDANCE_CLAUDE の値。
    for section, gtargets in GUIDANCE_CLAUDE.items():
        try:
            claude_md = convert.find_section_root(repo, section) / "CLAUDE.md"
        except FileNotFoundError:
            print(f"  WARN: section not found: {section}", file=sys.stderr)
            continue
        if not claude_md.is_file():
            print(f"  WARN: CLAUDE.md not found: {section}", file=sys.stderr)
            continue
        raw = convert.load_guidance_text(claude_md)
        grel = f"{claude_md.parent.relative_to(repo)}/CLAUDE.md"
        if "codex" in targets and "codex" in gtargets:
            body = convert.map_body(raw, "codex", known)  # .claude/ パス・/cmd を写像（CC リテラルを残さない）
            _check_residual([body], known, grel)
            emit(_write(out / "build/codex/agents-md" / f"{section}.AGENTS.md",
                        codex.agents_md_text(body, grel), grel))
        if "kiro" in targets and "kiro" in gtargets:
            body = convert.map_body(raw, "kiro", known)
            _check_residual([body], known, grel)
            emit(_write(out / "build/kiro/.kiro/steering" / f"{section}-guidance.md",
                        kiro.steering_always_text(body, grel), grel))

    for k, v in log.items():
        print(f"  {k}: {v}")

    assemble_dist(out, targets)
    return 0


def _copytree(src: pathlib.Path, dst: pathlib.Path):
    if not src.exists():
        return
    for f in src.rglob("*"):
        if f.is_file():
            rel = f.relative_to(src)
            (dst / rel).parent.mkdir(parents=True, exist_ok=True)
            (dst / rel).write_text(f.read_text(encoding="utf-8"), encoding="utf-8")


def assemble_dist(out: pathlib.Path, targets: list[str]):
    """build/ の生成物とテンプレートのマニフェストを dist/ パッケージへ組み立てる。"""
    if "codex" in targets:
        d = out / "dist/codex-plugin"
        _copytree(out / "build/codex", d)
        # Track B（reimpl）の Codex ネイティブ実装も取り込む（例: software-pipeline）
        for impl in sorted((out / "reimpl/impl/codex").glob("*")):
            for sub in (".agents", ".codex"):
                _copytree(impl / sub, d / sub)
        for t in (TEMPLATES / "codex-plugin").glob("*"):
            (d / t.name).write_text(t.read_text(encoding="utf-8"), encoding="utf-8")
        print(f"  dist: codex-plugin assembled -> {d.relative_to(out.parent)}")
    if "kiro" in targets:
        d = out / "dist/kiro-power"
        _copytree(out / "build/kiro", d)
        # Track B（reimpl）の Kiro ネイティブ実装も Power に取り込む（例: codex-bridge Kiro 版）
        for kiro_dir in sorted((out / "reimpl/impl/kiro").glob("*/.kiro")):
            _copytree(kiro_dir, d / ".kiro")
        for t in (TEMPLATES / "kiro-power").glob("*"):
            (d / t.name).write_text(t.read_text(encoding="utf-8"), encoding="utf-8")
        print(f"  dist: kiro-power assembled -> {d.relative_to(out.parent)}")


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
    out = pathlib.Path(args.out).resolve() if args.out else repo / "tools/multi-model-dist"
    return run(repo, targets, out)


if __name__ == "__main__":
    sys.exit(main())
