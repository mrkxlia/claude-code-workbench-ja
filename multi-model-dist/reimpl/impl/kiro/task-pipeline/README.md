# task-pipeline（Kiro 版） — 5エージェントでコード以外の成果物を作る

`task-pipeline`（software-pipeline の成果物版）の **Kiro 向け再実装**（Track B）。CC の Task ツール連鎖を
**Kiro CLI サブエージェント＋ native spec ワークフロー**に写像する。共有仕様 `reimpl/SPEC/task-pipeline.md` に追従する。
**コード変更が必要なときは software-pipeline（Kiro 版）を使う**。

## 構成

```
.kiro/
├── agents/                          # Kiro CLI サブエージェント（JSON）×5
│   ├── source-researcher.json       #   read-only：素材・規約・根拠・リスク調査
│   ├── requirements-writer.json     #   read-only：成果物要件
│   ├── brief-writer.json            #   read-only：作業ブリーフ
│   ├── deliverable-builder.json     #   write(出力ディレクトリのみ)：成果物作成
│   └── deliverable-reviewer.json    #   read-only：レビュー
├── skills/task-pipeline/SKILL.md    # オーケストレーター（spec ワークフローへ写像）
└── steering/task-pipeline-rules.md  # ハードルール・表記規約・出力先（inclusion: always）
```

## spec ワークフローへの写像

| CC | Kiro |
|---|---|
| requirements.md | `.kiro/specs/<slug>/requirements.md` |
| brief.md | `.kiro/specs/<slug>/design.md` |
| status.md（進行・差し戻し） | `.kiro/specs/<slug>/tasks.md` |

成果物本体は spec ディレクトリでなく**出力ディレクトリ**（例 `deliverables/`）に保存する。

## 導入

`.kiro/` 一式をワークスペース（または `~/.kiro/`）へ配置するか **Kiro Power** に同梱。親エージェント設定で
`availableAgents` に5体を含める。

## 忠実度の差分（SPEC S7）

- 人間承認 CP: Plan モードレビュー → 「要点＋全文提示で停止」に置換。
- 連鎖の起動: Task ツール → Kiro subagent 機構。
- 出力ディレクトリ外ガード: 原本の PreToolUse フックは T2h のため本実装に含めない（フック増分で別途 `.kiro/hooks/*.json` 化）。
  builder の出力ディレクトリ限定は prompt と steering のルールで表現する。

## 検証

`python3 multi-model-dist/reimpl/test_reimpl.py`（JSON 妥当・5体・read-only 制約・spec ワークフロー写像・SPEC 必須節）。
