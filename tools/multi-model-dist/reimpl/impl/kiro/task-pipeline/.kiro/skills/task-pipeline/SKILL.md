---
name: task-pipeline
description: >-
  5つの専門サブエージェント（source-researcher → requirements-writer → brief-writer →
  deliverable-builder → deliverable-reviewer）を連鎖させて、コード以外の成果物（drawio 図・ドキュメント・
  レポート）を end-to-end で作成する Kiro 版オーケストレーター。3つの人間承認チェックポイント
  （要件/ブリーフ/最終レビュー）で必ず停止する。「この図を描いて」「〜のドキュメントを作って」や、
  task-pipeline <依頼の説明> で発動。共有仕様は multi-model-dist/reimpl/SPEC/task-pipeline.md を正本とする。
---

# task-pipeline（Kiro 版）— タスクパイプライン

成果物の作成を5つの専門サブエージェントの流れ作業にする。あなた（オーケストレーター）は成果物を作らず、
各フェーズで担当サブエージェントを起動し、中間成果物の保存・受け渡し・人間チェックポイントでの停止だけを行う。
共有仕様（連鎖・CP・差し戻し・並列・越境禁止・出力ディレクトリ境界）は `reimpl/SPEC/task-pipeline.md` を正本とする。
**コード変更が必要なときは software-pipeline を使う**（本パイプラインは成果物専用）。

## Kiro spec ワークフローへの写像

| CC 原本 | Kiro |
|---|---|
| `requirements.md`（成果物要件） | `.kiro/specs/<slug>/requirements.md` |
| `brief.md`（作業ブリーフ・並列プラン） | `.kiro/specs/<slug>/design.md` |
| `status.md`（進行・承認・差し戻し） | `.kiro/specs/<slug>/tasks.md` |
| `research.md` | `.kiro/specs/<slug>/` 配下に保存 |

**成果物本体**は spec ディレクトリではなく、ルールで定めた**出力ディレクトリ**（例: `deliverables/{diagrams,docs,reports}/`）に保存する。

## サブエージェントの起動

```json
{ "toolsSettings": { "subagent": { "availableAgents": [
  "source-researcher","requirements-writer","brief-writer",
  "deliverable-builder","deliverable-reviewer" ] } } }
```

## 全体の流れ（SPEC S1）

```
依頼
 → Phase 1: source-researcher（調査）→ research.md
 → Phase 2: requirements-writer（成果物要件）→ requirements.md → 🛑 CP1: 要件承認
 → Phase 3: brief-writer（作業ブリーフ）→ design.md          → 🛑 CP2: ブリーフ承認
 → Phase 4: deliverable-builder（成果物作成）→ セルフチェック ❌ は差し戻し
 → Phase 5: deliverable-reviewer（レビュー）→ Critical/Important は差し戻し（上限3回）→ 🛑 CP3: 最終レビュー
 → コミットの提案（git 管理下の場合）
```

## 人間承認チェックポイント（SPEC S2）

CC の Plan モードレビューは Kiro に無いため、**「成果物の要点サマリー＋全文を提示し、明示承認まで停止」**で置換する。

- **CP1（Phase 2 後）**: requirements.md の①要点（依頼の一文要約＋受け入れ基準）と②全文を提示し、承認まで Phase 3 に進まない。
- **CP2（Phase 3 後）**: brief.md（design.md）の①要点（主要な作業判断・対象成果物・並列プラン要旨）と②全文を提示。
  **この時点で成果物が1ファイルも作成されていないこと**。承認まで Phase 4 に進まない。
- **CP3（Phase 5 後）**: 最終レポート・成果物ファイル一覧を提示。承認まで**完成・コミットに進まない**。

## 差し戻しと並列（SPEC S4/S5）

- Phase 4 のセルフチェック ❌ / Phase 5 の Critical・Important は **deliverable-builder を再起動**（自分で直さない）。
  **上限3回**（並列時グループ別）。カウンタは tasks.md を正とする。❌ が要件側の問題ならユーザーに報告。
- brief が独立グループ（出力パスが交わらず共有ファイルを書かない）を宣言したときのみ、Phase 4 を
  ①共有/先行逐次作成（目次・用語集・索引・共通テンプレート）→ ②独立グループ並列 → ③依存逐次 で実行。

## オーケストレーターのルール

- 各エージェントには必要な中間成果物だけを渡す。
- 越境（reviewer が成果物を直す／builder が出力ディレクトリ外に書く）を見つけたら、その変更を破棄して正しい担当へ差し戻す。
- read-only エージェント（researcher/requirements-writer/brief-writer/reviewer）の出力保存はオーケストレーターの仕事。

## 忠実度の差分

- Plan モードレビュー → 「要点＋全文提示で停止」に置換。
- Task ツール連鎖 → Kiro subagent 機構（`availableAgents`）。
- 出力ディレクトリ外ガード（原本の PreToolUse フック）→ 本実装には含まない（T2h・フック増分で別途 Kiro hooks 化）。
  builder の出力ディレクトリ限定は prompt と steering のルールで表現する。
