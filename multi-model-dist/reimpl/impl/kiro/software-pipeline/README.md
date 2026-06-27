# software-pipeline（Kiro 版） — 7エージェントで機能を end-to-end 実装する

`software-pipeline`（feature-pipeline）の **Kiro 向け再実装**（Track B）。CC の Task ツール連鎖を
**Kiro CLI サブエージェント＋ native spec ワークフロー**に写像する。原本（Claude Code 版）とは別実装で、
**共有仕様 `multi-model-dist/reimpl/SPEC/software-pipeline.md` に追従**する。

## 構成

```
.kiro/
├── agents/                          # Kiro CLI サブエージェント（JSON）×7
│   ├── codebase-researcher.json     #   read-only：調査
│   ├── story-writer.json            #   read-only：ストーリー
│   ├── spec-writer.json             #   read-only：技術ブリーフ
│   ├── backend-builder.json         #   write：BE 実装＋API契約
│   ├── frontend-builder.json        #   write：FE 実装
│   ├── test-verifier.json           #   write(テストのみ)：受け入れテスト
│   └── implementation-validator.json#   read-only：最終検証
├── skills/feature-pipeline/SKILL.md # オーケストレーター（spec ワークフローへ写像）
└── steering/pipeline-rules.md       # ハードルール（inclusion: always）
```

## spec ワークフローへの写像

| CC | Kiro |
|---|---|
| story.md | `.kiro/specs/<slug>/requirements.md` |
| brief.md | `.kiro/specs/<slug>/design.md` |
| status.md（進行・差し戻し） | `.kiro/specs/<slug>/tasks.md` |

## 導入

この `.kiro/` 一式をワークスペース（または `~/.kiro/`）へ配置するか、**Kiro Power** に同梱して配布する。
親エージェント設定でサブエージェントを使えるようにする:

```json
{ "toolsSettings": { "subagent": { "availableAgents": [
  "codebase-researcher","story-writer","spec-writer","backend-builder",
  "frontend-builder","test-verifier","implementation-validator" ] } } }
```

## 忠実度の差分（SPEC S7 に準拠）

- **人間承認 CP**: CC の Plan モードレビュー → Kiro では「成果物の要点＋全文を提示し明示承認まで停止」に置換（意味論は同一）。
- **連鎖の起動**: Task ツール → Kiro subagent 機構。
- **ガード/通知フック（T2h）**: `.kiro/hooks/` に同梱済み — `block-secrets-commit`（機密コミット中止）・
  `guard-shared-writes`（並列時の共有ファイル衝突確認）・`spec-sync-reminder`（SessionStart 通知）。
  ただし Kiro の hook **入力契約・ブロック/ask 手段はバージョン依存（[要確認]）**で、再現できない場合は通知へ degrade する
  （SPEC `reimpl/SPEC/hooks.md` H1/H3）。並列時はオーケストレーターの「①共有先行逐次」でも衝突を避ける。
- 担当範囲（BE/FE/テスト）の越境禁止は各エージェントの prompt と steering で表現する（パスの自動強制ではなくルール）。

## 検証

`python3 multi-model-dist/reimpl/test_reimpl.py`（JSON 妥当・7体・read-only 制約・SPEC 必須節トレース）。
