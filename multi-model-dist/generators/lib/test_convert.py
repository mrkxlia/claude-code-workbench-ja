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
    # F3: 日本語に密着した /cmd も写像され、パス段(skills/notes)は守られる
    cjk = convert.map_body("起動は/notes。パスは skills/notes は不変。", "codex", known)
    check("$notes" in cjk and "skills/notes" in cjk, "F3: 日本語密着 /cmd を写像・パス段は不変")
    check(convert.residual_cc_tokens(cjk, known) == [], "F3: 残存検証も日本語密着を検出（写像後ゼロ）")
    check(convert.residual_cc_tokens("起動は/notes", known) == ["/notes"], "F3: 未写像の日本語密着 /cmd を検出できる")
    check(convert.residual_cc_tokens(cx, known) == [], "codex 出力に残存 /cmd なし")
    check(convert.residual_cc_tokens(kr, known) == [], "kiro 出力に残存 /cmd なし")
    # .claude/ パス写像
    check(".agents/skills/" in convert.map_body(".claude/skills/x", "codex", known), "codex path map")
    check(".kiro/skills/" in convert.map_body(".claude/skills/x", "kiro", known), "kiro path map")
    # bare .claude/（設定・図・配置先）の catch-all
    check("/.codex/CLAUDE.md" in convert.map_body("~/.claude/CLAUDE.md", "codex", known), "codex bare .claude catch-all")
    check(".kiro/" in convert.map_body("├── .claude/", "kiro", known) and ".claude/" not in convert.map_body("├── .claude/", "kiro", known), "kiro bare .claude catch-all")


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
    txt = kiro.agent_to_text(a, known, "x")
    j = json.loads(txt)
    check(j["name"] == "reviewer" and j["prompt"] and j["tools"] == ["read"], "kiro agent JSON 往復可・tools 小文字")
    # F1: JSON も _generated でセンチネルを持ち、has_sentinel が認識する
    check(convert.SENTINEL_KEY in j, "F1: kiro agent JSON に _generated センチネル")
    tmpj = pathlib.Path("/tmp/mmd_sentinel.json"); tmpj.write_text(txt, encoding="utf-8")
    check(convert.has_sentinel(tmpj) is True, "F1: has_sentinel が JSON センチネルを認識")
    tmpj.write_text('{"name":"x"}', encoding="utf-8")
    check(convert.has_sentinel(tmpj) is False, "F1: 手書き JSON（_generated 無し）は手書き扱い")
    # F4: kiro は sonnet→model id、codex は素の tier を出さない
    check(j["model"] == "claude-sonnet-4", "F4: kiro model 写像 sonnet→claude-sonnet-4")
    ctoml = codex.agent_to_text(a, known, "x")
    check("sonnet" not in ctoml.split("\n", 1)[1], "F4: codex は素の tier 'sonnet' を出力しない")

    g = convert.SkillIR("data-science", "visualization", "", "# 可視化\n素 Markdown", has_frontmatter=False)
    st = kiro.guidance_to_steering(g, "data-science/.claude/skills/visualization/SKILL.md")
    check("inclusion: auto" in st and "name: visualization" in st, "T1g→steering(auto)")


def test_guidance_claude_md(tmp=pathlib.Path("/tmp/mmd_test")):
    tmp.mkdir(parents=True, exist_ok=True)
    (tmp / "part.md").write_text("PARTIAL CONTENT", encoding="utf-8")
    (tmp / "CLAUDE.md").write_text("# Title\n@import part.md\nrest", encoding="utf-8")
    flat = convert.load_guidance_text(tmp / "CLAUDE.md")
    check("PARTIAL CONTENT" in flat and "@import" not in flat.replace("expanded @import", ""), "@import 展開（平坦化）")
    # F5: @mention や装飾子（パスらしくない @）は import 誤認しない
    (tmp / "CLAUDE2.md").write_text("# T\n@anthropic-ai mention\n@param x\nbody", encoding="utf-8")
    flat2 = convert.load_guidance_text(tmp / "CLAUDE2.md")
    check("@anthropic-ai mention" in flat2 and "@param x" in flat2, "F5: パスでない @ 行は誤展開しない")
    am = codex.agents_md_text(flat, "x/CLAUDE.md")
    check(am.startswith("<!-- " + convert.SENTINEL_PREFIX), "AGENTS.md センチネル")
    st = kiro.steering_always_text(flat, "x/CLAUDE.md")
    check("inclusion: always" in st, "steering inclusion: always")


if __name__ == "__main__":
    for fn in [test_frontmatter, test_body_mapping, test_codex_skill_and_toml, test_kiro_skill_agent_steering, test_guidance_claude_md]:
        print(f"\n[{fn.__name__}]")
        fn()
    print()
    if FAILED:
        print(f"FAILED {len(FAILED)} checks")
        sys.exit(1)
    print("ALL GREEN")
