"""ゴールデン/往復テスト（pytest 不要・直接実行可）。

  python3 multi-model-dist/generators/lib/test_convert.py

検証: frontmatter 分離 / 本文用語写像（自己参照・相互参照）/ 残存 CC 語検出 /
      Codex skill・TOML / Kiro skill・JSON / T1g steering / 真理値反転。
"""
import json
import pathlib
import sys
import tomllib

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import convert  # noqa: E402
from serializers import codex, kiro  # noqa: E402

FAILED = []


def check(cond, msg):
    if cond:
        print(f"  ok: {msg}")
    else:
        print(f"  FAIL: {msg}")
        FAILED.append(msg)


def test_frontmatter():
    meta, body = convert.split_frontmatter("---\nname: x\ndescription: y\n---\nhello")
    check(meta == {"name": "x", "description": "y"}, "frontmatter parsed")
    check(body.strip() == "hello", "body extracted")
    meta2, body2 = convert.split_frontmatter("# no frontmatter\n")
    check(meta2 is None, "no-frontmatter detected (T1g)")


def test_body_mapping():
    known = {"notes", "spec-extract"}
    # 自己参照（/notes 内で /notes）と相互参照（/spec-extract）と無関係 /tmp/foo
    body = "起動は /notes。詳細は /spec-extract を参照。パスは /tmp/foo は触らない。"
    cx = convert.map_body(body, "codex", known)
    kr = convert.map_body(body, "kiro", known)
    check("$notes" in cx and "$spec-extract" in cx, "codex: /cmd→$mention (self+cross)")
    check("#notes" in kr and "#spec-extract" in kr, "kiro: /cmd→#name")
    check("/tmp/foo" in cx, "無関係な /path は過剰置換しない")
    check(convert.residual_cc_tokens(cx, known) == [], "codex 出力に残存 /cmd なし")
    check(convert.residual_cc_tokens(kr, known) == [], "kiro 出力に残存 /cmd なし")
    # .claude/ パス写像
    check(".agents/skills/" in convert.map_body(".claude/skills/x", "codex", known), "codex path map")
    check(".kiro/skills/" in convert.map_body(".claude/skills/x", "kiro", known), "kiro path map")


def test_codex_skill_and_toml():
    known = {"notes"}
    s = convert.SkillIR("implementation-skills", "notes", "manually as /notes 記録スキル", "本文 /notes 起動", manual_only=True)
    txt = codex.skill_to_text(s, known, "implementation-skills/.claude/skills/notes/SKILL.md")
    fm_region = txt.split("\n---\n")[1]  # frontmatter
    check("$notes" in fm_region and convert.residual_cc_tokens(fm_region, known) == [], "description も用語写像（残存なし）")
    check(txt.startswith("<!-- " + convert.SENTINEL_PREFIX), "codex skill にセンチネル")
    check("name: notes" in txt and "allow_implicit_invocation: false" in txt, "真理値反転 true→false")
    skill_body = txt.split("\n---\n", 2)[-1]  # センチネル・frontmatter を除いた本文
    check("$notes" in skill_body and convert.residual_cc_tokens(skill_body, known) == [], "codex skill 本文写像（残存なし）")

    a = convert.AgentIR("software-pipeline", "reviewer", "PR レビュア", "Review like an owner.\n複数行\"引用\"込み", model="sonnet", tools=["Read", "Grep"])
    toml_txt = codex.agent_to_text(a, known, "software-pipeline/.claude/agents/reviewer.md")
    parsed = tomllib.loads(toml_txt.split("\n", 1)[1])  # センチネル行を除いて検証
    check(parsed["name"] == "reviewer" and parsed["developer_instructions"], "codex agent TOML 往復可")
    check("description" in parsed, "codex agent 必須キー description")


def test_kiro_skill_agent_steering():
    known = {"notes"}
    s = convert.SkillIR("implementation-skills", "notes", "記録スキル", "本文 /notes")
    check("name: notes" in kiro.skill_to_text(s, known, "x"), "kiro skill frontmatter")

    a = convert.AgentIR("software-pipeline", "reviewer", "レビュア", "本文", model="sonnet", tools=["Read"])
    j = json.loads(kiro.agent_to_text(a, known, "x"))
    check(j["name"] == "reviewer" and j["prompt"] and j["tools"] == ["read"], "kiro agent JSON 往復可・tools 小文字")

    g = convert.SkillIR("data-science", "visualization", "", "# 可視化\n素 Markdown", has_frontmatter=False)
    st = kiro.guidance_to_steering(g, "data-science/.claude/skills/visualization/SKILL.md")
    check("inclusion: auto" in st and "name: visualization" in st, "T1g→steering(auto)")


if __name__ == "__main__":
    for fn in [test_frontmatter, test_body_mapping, test_codex_skill_and_toml, test_kiro_skill_agent_steering]:
        print(f"\n[{fn.__name__}]")
        fn()
    print()
    if FAILED:
        print(f"FAILED {len(FAILED)} checks")
        sys.exit(1)
    print("ALL GREEN")
