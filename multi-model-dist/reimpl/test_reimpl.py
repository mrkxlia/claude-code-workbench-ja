"""Track B 再実装の検証（SPEC トレース）。

  python3 multi-model-dist/reimpl/test_reimpl.py

検証: Kiro codex-bridge の agents JSON が妥当で必須フィールドを持ち、
      SPEC S2 の前段ガード（command -v codex／未導入・未認証案内）が prompt に含まれること。
      skills の SKILL.md が frontmatter(name/description)を持つこと。
"""
import json
import pathlib
import re
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
KB = HERE / "impl/kiro/codex-bridge/.kiro"
FAILED = []


def check(cond, msg):
    print(("  ok: " if cond else "  FAIL: ") + msg)
    if not cond:
        FAILED.append(msg)


def test_agents():
    agents = sorted((KB / "agents").glob("*.json"))
    check(len(agents) == 3, "Kiro codex-bridge agents が3つ")
    for f in agents:
        d = json.loads(f.read_text(encoding="utf-8"))  # JSON 妥当
        for key in ("name", "description", "prompt", "tools"):
            check(key in d, f"{f.name}: 必須キー {key}")
        # SPEC S2 前段ガードのトレース
        check("command -v codex" in d["prompt"], f"{f.name}: 前段ガード command -v codex")
        check("未認証" in d["prompt"], f"{f.name}: 未認証フォールバック")
        # SPEC S1 危険フラグ不使用
        check("danger-full-access" in d["prompt"], f"{f.name}: 危険フラグ不使用の明記")


def test_skills():
    skills = sorted((KB / "skills").glob("*/SKILL.md"))
    check(len(skills) == 3, "Kiro codex-bridge skills が3つ")
    for f in skills:
        head = f.read_text(encoding="utf-8")
        check(head.startswith("---"), f"{f.parent.name}: frontmatter あり")
        check(re.search(r"^name:\s*\S+", head, re.M) is not None, f"{f.parent.name}: name")
        check("description:" in head, f"{f.parent.name}: description")


SP = HERE / "impl/kiro/software-pipeline/.kiro"
SPEC = HERE / "SPEC"
READONLY = {"codebase-researcher", "story-writer", "spec-writer", "implementation-validator"}
BUILDERS = {"backend-builder", "frontend-builder", "test-verifier"}
WRITE_TOOLS = {"write", "edit", "execute_bash", "fswrite"}


def test_software_pipeline_agents():
    agents = {f.stem: json.loads(f.read_text(encoding="utf-8")) for f in (SP / "agents").glob("*.json")}
    check(set(agents) == READONLY | BUILDERS, "software-pipeline agents が7体（全役割）")
    for name, d in agents.items():
        for key in ("name", "description", "prompt", "tools"):
            check(key in d, f"{name}: 必須キー {key}")
        tools = {t.lower() for t in d.get("tools", [])}
        if name in READONLY:
            # read-only エージェントは書き込み系ツールを持たない
            check(tools.isdisjoint(WRITE_TOOLS), f"{name}: read-only（書き込みツール無し）")
        else:
            check("write" in tools or "edit" in tools, f"{name}: builder は書き込みツールあり")
        # 越境禁止の意図が prompt に表れている（builder/verifier）
    check("触れ" in agents["backend-builder"]["prompt"] or "だけ" in agents["backend-builder"]["prompt"],
          "backend-builder: 越境禁止の明記")
    check("プロダクトコード" in agents["test-verifier"]["prompt"], "test-verifier: プロダクトコード不変の明記")


def test_software_pipeline_skill_steering_spec():
    sk = (SP / "skills/feature-pipeline/SKILL.md").read_text(encoding="utf-8")
    check(sk.startswith("---") and "name: feature-pipeline" in sk, "feature-pipeline skill frontmatter")
    for kw in ("requirements.md", "design.md", "tasks.md"):
        check(kw in sk, f"skill: spec ワークフロー写像 {kw}")
    st = (SP / "steering/pipeline-rules.md").read_text(encoding="utf-8")
    check("inclusion: always" in st, "steering inclusion: always")
    spec = (SPEC / "software-pipeline.md").read_text(encoding="utf-8")
    for sec in ("CP1", "CP2", "CP3", "上限3回", "並列", "越境禁止"):
        check(sec in spec, f"SPEC 必須節: {sec}")


SP_CODEX = HERE / "impl/codex/software-pipeline"


def test_codex_software_pipeline():
    import tomllib
    agents = {}
    for f in (SP_CODEX / ".codex/agents").glob("*.toml"):
        agents[f.stem] = tomllib.loads(f.read_text(encoding="utf-8"))  # TOML 往復
    check(set(agents) == READONLY | BUILDERS, "Codex software-pipeline agents が7体")
    for name, d in agents.items():
        for key in ("name", "description", "developer_instructions", "sandbox_mode"):
            check(key in d, f"{name}: 必須キー {key}")
        expected = "read-only" if name in READONLY else "workspace-write"
        check(d.get("sandbox_mode") == expected, f"{name}: sandbox_mode={expected}")
        check("model" not in d, f"{name}: 素の tier model を出力しない（omit）")
    sk = (SP_CODEX / ".agents/skills/feature-pipeline/SKILL.md").read_text(encoding="utf-8")
    check(sk.startswith("---") and "name: feature-pipeline" in sk, "Codex feature-pipeline skill frontmatter")
    check("docs/pipeline/<slug>/status.md" in sk, "Codex: status.md ファイル永続化（spec ワークフロー無し）")


TP_READONLY = {"source-researcher", "requirements-writer", "brief-writer", "deliverable-reviewer"}
TP_BUILDERS = {"deliverable-builder"}
TP_KIRO = HERE / "impl/kiro/task-pipeline/.kiro"
TP_CODEX = HERE / "impl/codex/task-pipeline"


def test_task_pipeline_kiro():
    agents = {f.stem: json.loads(f.read_text(encoding="utf-8")) for f in (TP_KIRO / "agents").glob("*.json")}
    check(set(agents) == TP_READONLY | TP_BUILDERS, "Kiro task-pipeline agents が5体")
    for name, d in agents.items():
        for key in ("name", "description", "prompt", "tools"):
            check(key in d, f"{name}: 必須キー {key}")
        tools = {t.lower() for t in d.get("tools", [])}
        if name in TP_READONLY:
            check(tools.isdisjoint(WRITE_TOOLS), f"{name}: read-only（書き込みツール無し）")
        else:
            check("write" in tools, f"{name}: builder は書き込みツールあり")
    check("出力ディレクトリ" in agents["deliverable-builder"]["prompt"], "deliverable-builder: 出力ディレクトリ限定の明記")
    sk = (TP_KIRO / "skills/task-pipeline/SKILL.md").read_text(encoding="utf-8")
    for kw in ("requirements.md", "design.md", "tasks.md"):
        check(kw in sk, f"Kiro task skill: spec ワークフロー写像 {kw}")
    st = (TP_KIRO / "steering/task-pipeline-rules.md").read_text(encoding="utf-8")
    check("inclusion: always" in st, "task-pipeline steering inclusion: always")
    spec = (SPEC / "task-pipeline.md").read_text(encoding="utf-8")
    for sec in ("CP1", "CP2", "CP3", "上限3回", "並列", "越境禁止", "出力ディレクトリ"):
        check(sec in spec, f"task-pipeline SPEC 必須節: {sec}")


def test_task_pipeline_codex():
    import tomllib
    agents = {f.stem: tomllib.loads(f.read_text(encoding="utf-8")) for f in (TP_CODEX / ".codex/agents").glob("*.toml")}
    check(set(agents) == TP_READONLY | TP_BUILDERS, "Codex task-pipeline agents が5体")
    for name, d in agents.items():
        for key in ("name", "description", "developer_instructions", "sandbox_mode"):
            check(key in d, f"{name}: 必須キー {key}")
        expected = "read-only" if name in TP_READONLY else "workspace-write"
        check(d.get("sandbox_mode") == expected, f"{name}: sandbox_mode={expected}")
        check("model" not in d, f"{name}: 素の tier model を出力しない")
    sk = (TP_CODEX / ".agents/skills/task-pipeline/SKILL.md").read_text(encoding="utf-8")
    check(sk.startswith("---") and "name: task-pipeline" in sk, "Codex task-pipeline skill frontmatter")


def test_hooks_t2h():
    spec = (SPEC / "hooks.md").read_text(encoding="utf-8")
    for kw in ("block-secrets-commit", "guard-builder-writes", "guard-deliverable-writes",
               "spec-sync-reminder", "要確認", "Codex"):
        check(kw in spec, f"hooks SPEC: {kw}")
    hook_files = sorted((HERE / "impl/kiro").glob("*/.kiro/hooks/*.json"))
    check(len(hook_files) >= 4, "Kiro hooks JSON が複数（software＋task）")
    for f in hook_files:
        d = json.loads(f.read_text(encoding="utf-8"))  # JSON 妥当
        check("version" in d and isinstance(d.get("hooks"), list) and d["hooks"], f"{f.name}: version＋hooks[]")
        for h in d["hooks"]:
            for key in ("name", "trigger", "action"):
                check(key in h, f"{f.name}:{h.get('name','?')}: 必須キー {key}")
            check(h["action"].get("type") == "command" and "command" in h["action"], f"{f.name}: action command")
    # 検査本体スクリプトの bash 構文が通る
    for sh in sorted((HERE / "impl/kiro").glob("*/.kiro/hooks/*.sh")):
        rc = subprocess.run(["bash", "-n", str(sh)]).returncode
        check(rc == 0, f"{sh.name}: bash 構文 OK")


def test_knowledge_self_improve():
    spec = (SPEC / "self-improve-and-knowledge-share.md").read_text(encoding="utf-8")
    for kw in ("kb", "kb-harvest", "improve-scan", "improve-apply", "要確認", "degrade", "inclusion: always"):
        check(kw in spec, f"ks/si SPEC: {kw}")
    # Kiro: kb + kb-harvest + steering(always) + improve-scan + improve-apply + hooks
    ks = HERE / "impl/kiro/knowledge-share/.kiro"
    si = HERE / "impl/kiro/self-improve/.kiro"
    for p in (ks / "skills/kb/SKILL.md", ks / "skills/kb-harvest/SKILL.md",
              si / "skills/improve-scan/SKILL.md", si / "skills/improve-apply/SKILL.md"):
        t = p.read_text(encoding="utf-8")
        check(t.startswith("---") and re.search(r"^name:\s*\S+", t, re.M) is not None, f"{p.parent.name}: skill frontmatter")
    st = (ks / "steering/kb-index.md").read_text(encoding="utf-8")
    check("inclusion: always" in st, "kb-index steering: auto-load(inclusion: always)")
    for hk in list((ks / "hooks").glob("*.json")) + list((si / "hooks").glob("*.json")):
        d = json.loads(hk.read_text(encoding="utf-8"))
        check("version" in d and d.get("hooks"), f"{hk.name}: hooks JSON 妥当")
    # improve-apply は手動のみ
    ia = (si / "skills/improve-apply/SKILL.md").read_text(encoding="utf-8")
    check("disable-model-invocation: true" in ia, "improve-apply: 手動のみ(disable-model-invocation)")
    # Codex: kb のみ（degrade 明記）
    ckb = (HERE / "impl/codex/knowledge-share/.agents/skills/kb/SKILL.md").read_text(encoding="utf-8")
    check("name: kb" in ckb and "非対応" in ckb, "Codex kb: degrade(harvest/scan/apply 非対応)明記")


if __name__ == "__main__":
    for fn in (test_agents, test_skills, test_software_pipeline_agents,
               test_software_pipeline_skill_steering_spec, test_codex_software_pipeline,
               test_task_pipeline_kiro, test_task_pipeline_codex, test_hooks_t2h,
               test_knowledge_self_improve):
        print(f"\n[{fn.__name__}]")
        fn()
    print()
    if FAILED:
        print(f"FAILED {len(FAILED)}")
        sys.exit(1)
    print("ALL GREEN")
