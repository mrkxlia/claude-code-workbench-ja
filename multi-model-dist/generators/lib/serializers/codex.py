"""IR → Codex 出力（Agent Skills の SKILL.md / サブエージェント TOML）。

配置パス（MAPPING.md ②）:
- スキル:        .agents/skills/<name>/SKILL.md
- サブエージェント: .codex/agents/<name>.toml
- 指示書:        AGENTS.md（repo 直下）
"""
from __future__ import annotations

import tomllib

import yaml

try:
    import tomli_w
    _HAVE_TOMLI_W = True
except ImportError:  # フォールバック（最小シリアライザ＋tomllib 往復検証）
    _HAVE_TOMLI_W = False

from convert import AgentIR, SkillIR, map_body, sentinel_line

TARGET = "codex"


def skill_to_text(skill: SkillIR, known: set[str], source_rel: str) -> str:
    # description も prose なので用語写像を適用（/cmd・.claude/ を残さない）
    meta = {"name": skill.name, "description": map_body(skill.description, TARGET, known)}
    # disable-model-invocation: true → allow_implicit_invocation: false（真理値反転・MAPPING ③）
    if skill.manual_only:
        meta["allow_implicit_invocation"] = False
    fm = yaml.safe_dump(meta, allow_unicode=True, sort_keys=False).strip()
    body = map_body(skill.body, TARGET, known).lstrip("\n")
    return f"{sentinel_line(source_rel)}\n---\n{fm}\n---\n{body}"


def _toml_dump(d: dict) -> str:
    if _HAVE_TOMLI_W:
        return tomli_w.dumps(d)
    # 最小フォールバック（複数行は基本文字列で・最後に tomllib で往復検証する）
    lines = []
    for k, v in d.items():
        if isinstance(v, bool):
            lines.append(f"{k} = {str(v).lower()}")
        elif isinstance(v, list):
            inner = ", ".join('"' + str(x).replace('"', '\\"') + '"' for x in v)
            lines.append(f"{k} = [{inner}]")
        elif "\n" in str(v):
            esc = str(v).replace("\\", "\\\\").replace('"""', '\\"\\"\\"')
            lines.append(f'{k} = """\n{esc}"""')
        else:
            esc = str(v).replace("\\", "\\\\").replace('"', '\\"')
            lines.append(f'{k} = "{esc}"')
    return "\n".join(lines) + "\n"


def agent_to_text(agent: AgentIR, known: set[str], source_rel: str) -> str:
    d: dict = {
        "name": agent.name,
        "description": map_body(agent.description, TARGET, known),
        "developer_instructions": map_body(agent.instructions, TARGET, known),
    }
    if agent.model:
        d["model"] = agent.model  # ※ provider model id への最終写像は MAPPING ③ に従い実機で確認
    body = _toml_dump(d)
    tomllib.loads(body)  # 往復検証：壊れた TOML を生成したら即例外
    return f"# {sentinel_line(source_rel, comment='', close='').strip()}\n{body}"


def skill_path(skill: SkillIR) -> str:
    return f".agents/skills/{skill.name}/SKILL.md"


def agent_path(agent: AgentIR) -> str:
    return f".codex/agents/{agent.name}.toml"
