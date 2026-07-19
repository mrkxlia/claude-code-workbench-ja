<!-- PIPELINE-INTEGRATION: この行より上は原本（sentinel の source: 参照）と同一に保つ。
     このファイルは tools/skill-sync が原本 + tools/skill-sync/fragments/notes-pipeline-integration.md
     から生成する派生物。直接編集せず、原本または fragment を編集して
     `python3 tools/skill-sync/sync.py` を実行すること（`--check` は CI で検証のみ行う）。 -->

## パイプライン連携（software-pipeline / task-pipeline 統合連携版）

このコピーは software-pipeline（feature-pipeline）と task-pipeline の**両方で同一内容**の
統合連携版。単体利用の原本は `templates/implementation-skills/.claude/skills/notes/` にある。
パイプラインで使うとき、上記の原本ルールに以下が**優先して**加わる。

### モード判定（成果物がプログラムかそれ以外か）

次の優先順で**コードモード**か**成果物モード**かを決める:

1. オーケストレーター・エージェント定義から記録先パスやモードの指示があればそれに従う
2. `docs/pipeline/<slug>/` が進行中 → コードモード、`docs/task-pipeline/<slug>/` が進行中 → 成果物モード
3. どちらも無ければ、作っているものの種類で判定する: プログラム（ソースコード・テスト・API）なら
   コードモード、それ以外（図・ドキュメント・レポート等）なら成果物モード

パイプライン外の単体作業では、この節は適用されず原本どおりに振る舞う。

### モード別の読み替え表

| 項目 | コードモード（feature-pipeline） | 成果物モード（task-pipeline） |
|---|---|---|
| 記録先（1件=1ファイル） | `docs/pipeline/<slug>/implementation-notes.md` | `docs/task-pipeline/<slug>/implementation-notes.md` |
| 書き手 | ビルダー3種（backend-builder / frontend-builder / test-verifier）が共有 | deliverable-builder |
| 再開時に Status を読む | `/feature-pipeline 再開 <slug>` | `/task-pipeline 再開 <slug>` |
| 物証アンカー | `file:line`・テスト名 | 成果物ファイルのパス・見出し・図ノードID |
| 語彙 | 原本どおり | 「コード」→「成果物」、tests → 受け入れ基準・レビュー観点 |

### 共通ルール（両モード）

- パイプラインの `docs/.../<slug>/` が存在する作業中は、リポジトリルートに
  `implementation-notes.md` を新規作成しない（指示されたパスへ書く）
- **status.md と混ぜない**: `docs/.../<slug>/status.md` は**進行管理**（フェーズ・承認・差し戻し
  カウンタ）、`implementation-notes.md` は**実装判断の記録**（Decisions / Deviations / Tradeoffs /
  Gotchas / Deferred）。進行状況を notes に、判断を status に書かない
- 複数エージェントが同じファイルに追記する場合、セッション見出しに**必ずエージェント名
  （または main session）を含める**: `## YYYY-MM-DD — backend-builder: <作業名>`。
  Status ブロックは「最後に書いた者が上書き」でよい（最新状態が勝つ）
- **生きた SPEC.md との同期**: リポジトリに SPEC.md があり、変更がその記述する挙動・内容・構成を
  変えた場合は、逸脱記録と同時に該当要件行だけを軽量に増分更新する（要件IDはコードモード `F-NN`、
  成果物モード `D-NN`）

### 最終フェーズでの回収（コードモードのみ）

Phase 7（最終検証）後、Decisions / Deferred のうち他機能にも一般化できるものは
`docs/pipeline/LEARNINGS.md` の候補としてオーケストレーターが回収し、
チェックポイント3でユーザーに提示する。
