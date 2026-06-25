# examples — 生成結果のゴールデン（参照・検証用）

`generators/bin/export.sh` が原本から生成する代表的な出力を、追跡可能なゴールデンとして固定しています
（`build/`・`dist/` 自体は再生成物なので `.gitignore` 済み）。

- `codex/.agents/skills/notes/SKILL.md` — Codex Agent Skill（`/notes`→`$notes` 写像・センチネル）
- `codex/.codex/agents/peer-engineer.toml` — Codex サブエージェント（TOML・`tomllib` で往復検証可）
- `kiro/.kiro/agents/peer-engineer.json` — Kiro CLI サブエージェント（JSON）
- `kiro/.kiro/steering/visualization.md` — T1g（frontmatter 無しの data-science）→ steering(`inclusion: auto`)

検証は `python3 generators/lib/test_convert.py`（ゴールデン/往復テスト）。

## Track A 仕上げ分

- `codex/agents-md/GlobalClaudeMD-sample.AGENTS.md` — CLAUDE.md→AGENTS.md（@import 平坦化・センチネル）
- `kiro/.kiro/steering/GlobalClaudeMD-sample-guidance.md` — CLAUDE.md→steering（`inclusion: always`）

配布パッケージのマニフェスト雛形は `generators/templates/{codex-plugin,kiro-power}/` にあり、
`export.sh` が `dist/codex-plugin/`・`dist/kiro-power/` を組み立てる（`dist/` 自体は `.gitignore`）。
