# software-pipeline（Codex 版） — 7エージェントで機能を end-to-end 実装する

`software-pipeline`（feature-pipeline）の **Codex 向け再実装**（Track B）。CC の Task ツール連鎖を
**Codex サブエージェント（TOML）＋ Agent Skill** に写像する。原本（Claude Code 版）とは別実装で、
**共有仕様 `multi-model-dist/reimpl/SPEC/software-pipeline.md` に追従**する（Kiro 版と同じ SPEC）。

## 構成

```
.codex/agents/                       # Codex サブエージェント（TOML）×7
├── codebase-researcher.toml         #   sandbox: read-only
├── story-writer.toml                #   sandbox: read-only
├── spec-writer.toml                 #   sandbox: read-only
├── backend-builder.toml             #   sandbox: workspace-write
├── frontend-builder.toml            #   sandbox: workspace-write
├── test-verifier.toml               #   sandbox: workspace-write（テストのみ）
└── implementation-validator.toml    #   sandbox: read-only
.agents/skills/feature-pipeline/SKILL.md  # オーケストレーター
```

## 導入

`.codex/agents/` をプロジェクト（または `~/.codex/agents/`）へ、`.agents/skills/feature-pipeline/` を
`.agents/skills/`（または `$HOME/.agents/skills/`）へ配置する。Codex plugin に同梱して repo marketplace 配布もできる。

## 忠実度の差分（SPEC S7 に準拠）

- **人間承認 CP**: CC の Plan モードレビュー → 「成果物の要点＋全文を提示し明示承認まで停止」に置換（意味論は同一）。
- **連鎖の起動**: Task ツール → Codex サブエージェント機構。
- **進行の永続化**: Codex に native spec ワークフローが無いため、**原本どおり `docs/pipeline/<slug>/status.md`** にファイル永続化
  （Kiro 版は `.kiro/specs/` の requirements/design/tasks に写像したが、Codex は原本どおり）。
- **read-only / workspace-write**: 各エージェントの `sandbox_mode` で表現（read-only エージェントはファイルを書けない）。
- **共有ファイル衝突ガード**: 原本の PreToolUse フックは Codex では非対応（T2h）。並列時は「①共有先行逐次」で共有IFを先に固定して避ける。
- 担当範囲（BE/FE/テスト）の越境禁止は developer_instructions のルールで表現する。

## 検証

`python3 multi-model-dist/reimpl/test_reimpl.py`（TOML 往復・必須3キー・7体・sandbox_mode 区別・skill frontmatter）。
