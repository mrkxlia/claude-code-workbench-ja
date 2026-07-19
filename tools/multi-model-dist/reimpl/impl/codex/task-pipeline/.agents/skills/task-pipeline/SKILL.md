---
name: task-pipeline
description: >-
  5つの専門サブエージェント（source-researcher → requirements-writer → brief-writer →
  deliverable-builder → deliverable-reviewer）を連鎖させて、コード以外の成果物（drawio 図・ドキュメント・
  レポート）を end-to-end で作成する Codex 版オーケストレーター。3つの人間承認チェックポイント
  （要件/ブリーフ/最終レビュー）で必ず停止する。「この図を描いて」「〜のドキュメントを作って」や、
  task-pipeline <依頼の説明> で発動。共有仕様は multi-model-dist/reimpl/SPEC/task-pipeline.md を正本とする。
---

# task-pipeline（Codex 版）— タスクパイプライン

成果物の作成を5つの専門サブエージェントの流れ作業にする。あなた（オーケストレーター）は成果物を作らず、
各フェーズで担当サブエージェントを起動し、中間成果物の保存・受け渡し・人間チェックポイントでの停止だけを行う。
共有仕様は `reimpl/SPEC/task-pipeline.md` を正本とする。**コード変更が必要なときは software-pipeline を使う。**

## サブエージェント（`.codex/agents/*.toml`）

5体を Codex のサブエージェント機構で起動する。読み取り専用4体（source-researcher/requirements-writer/
brief-writer/deliverable-reviewer）は `sandbox_mode = "read-only"`、deliverable-builder は `workspace-write`
（ただし**出力ディレクトリのみ**に書く＝ルールで縛る）。

## 進行の永続化

Codex には native spec ワークフローが無いため、**原本どおり `docs/task-pipeline/<slug>/` にファイル永続化**する:
`status.md`／`research.md`／`requirements.md`／`brief.md`。**成果物本体は出力ディレクトリ**（例 `deliverables/`）に保存する。

## 全体の流れ（SPEC S1）

```
依頼
 → Phase 1: source-researcher（調査）→ research.md
 → Phase 2: requirements-writer（成果物要件）→ requirements.md → 🛑 CP1: 要件承認
 → Phase 3: brief-writer（作業ブリーフ）→ brief.md            → 🛑 CP2: ブリーフ承認
 → Phase 4: deliverable-builder（成果物作成）→ セルフチェック ❌ は差し戻し
 → Phase 5: deliverable-reviewer（レビュー）→ Critical/Important は差し戻し（上限3回）→ 🛑 CP3: 最終レビュー
 → コミットの提案（git 管理下の場合）
```

## 人間承認チェックポイント（SPEC S2）

CC の Plan モードレビューは Codex に無いため、**「成果物の要点サマリー＋全文を提示し、明示承認まで停止」**で置換する。

- **CP1（Phase 2 後）**: requirements.md の①要点＋②全文を提示し、承認まで Phase 3 に進まない。
- **CP2（Phase 3 後）**: brief.md の①要点＋②全文を提示。**この時点で成果物が1ファイルも作成されていないこと**。承認まで Phase 4 に進まない。
- **CP3（Phase 5 後）**: 最終レポート・成果物ファイル一覧を提示。承認まで**完成・コミットに進まない**。

## 差し戻しと並列（SPEC S4/S5）

- Phase 4 のセルフチェック ❌ / Phase 5 の Critical・Important は **deliverable-builder を再起動**（自分で直さない）。
  **上限3回**（並列時グループ別）。カウンタは status.md を正とする。❌ が要件側の問題ならユーザーに報告。
- brief が独立グループ（出力パスが交わらず共有ファイルを書かない）を宣言したときのみ、Phase 4 を
  ①共有/先行逐次作成 → ②独立グループ並列 → ③依存逐次 で実行。

## オーケストレーターのルール

- 各エージェントには必要な中間成果物だけを渡す。
- 越境（reviewer が成果物を直す／builder が出力ディレクトリ外に書く）を見つけたら、その変更を破棄して正しい担当へ差し戻す。

## 忠実度の差分

- Plan モードレビュー → 「要点＋全文提示で停止」に置換。
- Task ツール連鎖 → Codex サブエージェント機構。
- 出力ディレクトリ外ガード（原本の PreToolUse フック）→ 本実装には含まない（T2h・Codex はフックが貧弱）。
  builder の出力ディレクトリ限定は developer_instructions のルールで表現する。
