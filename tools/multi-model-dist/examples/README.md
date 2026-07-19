# examples — 生成結果のゴールデン（参照・検証用）

`generators/bin/export.sh` が原本から生成する代表的な出力を、追跡可能なゴールデンとして固定しています
（`build/`・`dist/` 自体は再生成物なので `.gitignore` 済み）。

- `codex/.agents/skills/notes/SKILL.md` — Codex Agent Skill（`/notes`→`$notes` 写像・センチネル）
- `codex/.agents/skills/review-panel/personas.md` — サイドカー複製（SKILL.md 以外の同梱ファイル・用語写像＋センチネル）
- `codex/.codex/agents/peer-engineer.toml` — Codex サブエージェント（TOML・`tomllib` で往復検証可）
- `kiro/.kiro/agents/peer-engineer.json` — Kiro CLI サブエージェント（JSON）
- `kiro/.kiro/skills/visualization/SKILL.md` — data-science スキル（T1・frontmatter 有り→通常スキル生成）
- `kiro/.kiro/skills/create-plan-calibrate/SKILL.md` — manual_only（`disable-model-invocation: true` を標準フィールドのまま保持）

検証は `python3 generators/lib/test_convert.py`（ゴールデン/往復テスト）。
`test_goldens_match_build` が **examples/ 配下の全ファイルを最新の生成物とバイト比較**するため、
原本やジェネレータを変えたら export を再実行してゴールデンも更新すること（stale なゴールデンはテストで落ちる）。

## Track A 仕上げ分

- `codex/agents-md/GlobalClaudeMD-sample.AGENTS.md` — CLAUDE.md→AGENTS.md（@import 平坦化・センチネル）
- `kiro/.kiro/steering/GlobalClaudeMD-sample-guidance.md` — CLAUDE.md→steering（`inclusion: always`）

配布パッケージのマニフェスト雛形は `generators/templates/{codex-plugin,kiro-power}/` にあり、
`export.sh` が `dist/codex-plugin/`・`dist/kiro-power/` を組み立てる（`dist/` 自体は `.gitignore`）。
