# codex-bridge（Kiro 版） — Kiro から Codex を駆動する

`codex-bridge` の **Kiro 向け再実装**（Track B）。Kiro から OpenAI Codex CLI を非対話で駆動し、
レビュー・実装・相談を代行させ、要約だけを返す。原本（Claude Code 版 `codex-bridge/`）とは別実装で、
**共有仕様 `multi-model-dist/reimpl/SPEC/codex-bridge.md` に追従**する（同じ仕様を Kiro でネイティブ実現）。

## 構成

```
.kiro/
├── agents/                       # Kiro CLI サブエージェント（JSON）
│   ├── codex-reviewer.json       #   read-only・P1–P4 要約
│   ├── codex-implementer.json    #   workspace-write・差分/テスト検証
│   └── codex-advisor.json        #   read-only・相談（コード不変）
└── skills/                       # Kiro スキル（SKILL.md）→ 対応エージェントへ委譲
    ├── codex-review/SKILL.md
    ├── codex-implement/SKILL.md
    └── codex-ask/SKILL.md
```

## 導入

この `.kiro/` 一式をワークスペース（または `~/.kiro/`）へ配置するか、**Kiro Power** に同梱して配布する。
親エージェントの設定でサブエージェントを使えるようにする（例）:

```json
{ "toolsSettings": { "subagent": { "availableAgents": ["codex-reviewer", "codex-implementer", "codex-advisor"] } } }
```

## 前提（二重前提）

**Kiro 導入 ∧ Codex CLI 導入・認証済み**。各サブエージェントは SPEC S2 の**前段ガード**を持ち、
`codex` 未導入・未認証なら raw エラーを出さず日本語で案内して終了する。

## 安全方針（SPEC S1）

- 既定サンドボックス: review/ask = `read-only`、implement = `workspace-write`。
- 危険フラグ（`--yolo` / `--dangerously-bypass-approvals-and-sandbox` / `danger-full-access`）は使わない。
- Codex の生出力はサブエージェント内に隔離し、要約のみ返す。

## 検証

`python3 multi-model-dist/reimpl/test_reimpl.py`（JSON 妥当・必須フィールド・前段ガードのトレース）。
