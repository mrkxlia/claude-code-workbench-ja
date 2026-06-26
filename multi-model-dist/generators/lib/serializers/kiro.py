"""IR → Kiro 出力（CLI Agent Skills の SKILL.md / サブエージェント JSON / steering）。

配置パス（MAPPING.md ②）:
- スキル(CLI):    .kiro/skills/<name>/SKILL.md
- サブエージェント: .kiro/agents/<name>.json
- 指示書/ガイダンス: .kiro/steering/<name>.md（inclusion: always|auto|manual）
"""
from __future__ import annotations

import json

import yaml

from convert import (
    SENTINEL_KEY,
    SENTINEL_PREFIX,
    AgentIR,
    SkillIR,
    map_body,
    map_model,
    sentinel_line,
)

TARGET = "kiro"


def skill_to_text(skill: SkillIR, known: set[str], source_rel: str) -> str:
    meta = {"name": skill.name, "description": map_body(skill.description, TARGET, known)}
    fm = yaml.safe_dump(meta, allow_unicode=True, sort_keys=False).strip()
    body = map_body(skill.body, TARGET, known).lstrip("\n")
    return f"{sentinel_line(source_rel)}\n---\n{fm}\n---\n{body}"


def agent_to_text(agent: AgentIR, known: set[str], source_rel: str) -> str:
    # JSON はコメント不可のため、_generated キーでセンチネルを埋め込む（F1）。先頭に置く。
    d: dict = {
        SENTINEL_KEY: f"{SENTINEL_PREFIX} {source_rel}",
        "name": agent.name,
        "description": map_body(agent.description, TARGET, known),
        "prompt": map_body(agent.instructions, TARGET, known),
    }
    if agent.tools:
        d["tools"] = [t.lower() for t in agent.tools]  # Kiro は小文字ツール名
    model = map_model(agent.model, TARGET)  # 未知 tier は None（出力しない）
    if model:
        d["model"] = model
    body = json.dumps(d, ensure_ascii=False, indent=2)
    json.loads(body)  # 往復検証
    return body


def guidance_to_steering(skill: SkillIR, source_rel: str, inclusion: str = "auto") -> str:
    """frontmatter 無しの参照ドキュメント(T1g)を steering 化。"""
    meta = {"inclusion": inclusion}
    if inclusion == "auto":
        meta["name"] = skill.name
        meta["description"] = skill.description or f"{skill.name} guidance"
    fm = yaml.safe_dump(meta, allow_unicode=True, sort_keys=False).strip()
    body = skill.body.lstrip("\n")
    return f"{sentinel_line(source_rel)}\n---\n{fm}\n---\n{body}"


def steering_always_text(body: str, source_rel: str) -> str:
    """CLAUDE.md（平坦化済み）→ steering（inclusion: always＝常時読込のプロジェクト指示）。"""
    fm = yaml.safe_dump({"inclusion": "always"}, allow_unicode=True, sort_keys=False).strip()
    return f"{sentinel_line(source_rel)}\n---\n{fm}\n---\n{body.rstrip()}\n"


def skill_path(skill: SkillIR) -> str:
    return f".kiro/skills/{skill.name}/SKILL.md"


def agent_path(agent: AgentIR) -> str:
    return f".kiro/agents/{agent.name}.json"


def steering_path(skill: SkillIR) -> str:
    return f".kiro/steering/{skill.name}.md"
