# task-pipeline（Codex 版） — 5エージェントでコード以外の成果物を作る

`task-pipeline` の **Codex 向け再実装**（Track B）。CC の Task ツール連鎖を **Codex サブエージェント（TOML）＋ Agent Skill**
に写像する。共有仕様 `reimpl/SPEC/task-pipeline.md` に追従する（Kiro 版と同じ SPEC）。
**コード変更が必要なときは software-pipeline（Codex 版）を使う。**

## 構成

```
.codex/agents/                       # Codex サブエージェント（TOML）×5
├── source-researcher.toml           #   sandbox: read-only
├── requirements-writer.toml         #   sandbox: read-only
├── brief-writer.toml                #   sandbox: read-only
├── deliverable-builder.toml         #   sandbox: workspace-write（出力ディレクトリのみ）
└── deliverable-reviewer.toml        #   sandbox: read-only
.agents/skills/task-pipeline/SKILL.md  # オーケストレーター
```

## 導入

`.codex/agents/` をプロジェクト（または `~/.codex/agents/`）へ、`.agents/skills/task-pipeline/` を
`.agents/skills/`（または `$HOME/.agents/skills/`）へ配置する。Codex plugin に同梱して repo marketplace 配布もできる。

## 忠実度の差分（SPEC S7）

- 人間承認 CP: Plan モードレビュー → 「成果物の要点＋全文を提示し明示承認まで停止」に置換。
- 連鎖の起動: Task ツール → Codex サブエージェント機構。
- 進行の永続化: native spec ワークフローが無いため**原本どおり `docs/task-pipeline/<slug>/status.md`** にファイル永続化。
  成果物本体は出力ディレクトリ（例 `deliverables/`）に保存。
- read-only / workspace-write: 各エージェントの `sandbox_mode` で表現。builder の出力ディレクトリ限定は
  developer_instructions のルールで表現（Codex は PreToolUse フック非対応＝T2h）。

## 検証

`python3 multi-model-dist/reimpl/test_reimpl.py`（TOML 往復・必須3キー・5体・sandbox_mode 区別・skill frontmatter）。
