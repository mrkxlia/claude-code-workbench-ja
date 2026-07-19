# SPEC: task-pipeline（5エージェントでコード以外の成果物を作るパイプライン）

Track B の共有仕様。**原本 `plugins/task-pipeline/{skills/task-pipeline,agents,CLAUDE.md}` を一次根拠**に起こした
派生ドキュメント（複製ではない）。原本が変わったらこの SPEC を手動追従し、各ツール実装を更新する。
確度ラベル: `[確定]` / `[推定]` / `[要確認]`。software-pipeline SPEC と対をなす（コード→成果物への汎用化）。

## S0. 目的 `[確定]`

コード以外の成果物（drawio 図・ドキュメント・レポート等）の作成を **5つの専門エージェントの連鎖**に流し、
**3つの人間承認チェックポイント**で必ず停止する。オーケストレーターは成果物を作らず、起動・保存・受け渡し・停止だけを行う。
**コード変更が必要なときは software-pipeline を使う**（本パイプラインは成果物専用）。

## S1. エージェント連鎖（5体）と書き込み範囲 `[確定]`

| # | エージェント | 役割 | 書き込み |
|---|---|---|---|
| 1 | source-researcher | 素材・規約・流用元・根拠・リスクを調査（既存仕様 SPEC.md 整合） | なし（read-only） |
| 2 | requirements-writer | 依頼→受け入れ基準つき成果物要件（目的・読者・形式） | なし（read-only） |
| 3 | brief-writer | 承認済み要件→作業ブリーフ（構成案・手順・使うスキル・並列プラン） | なし（read-only） |
| 4 | deliverable-builder | 成果物の作成（drawio 等のスキル利用可） | **出力ディレクトリのみ** |
| 5 | deliverable-reviewer | 成果物を要件/ブリーフに突合し Critical/Important/Minor 報告 | なし（read-only） |

**越境禁止** `[確定]`: builder は出力ディレクトリ外（コード・既存資料・設定）に書かない／reviewer は成果物を直さない／builder は要件・ブリーフを書き換えない。

## S2. 3つの人間承認チェックポイント `[確定]`

- **CP1 要件承認**（Phase 2 後）／**CP2 ブリーフ承認**（Phase 3 後）／**CP3 最終レビュー**（Phase 5 後・完成/コミット前）。
- 承認まで次フェーズへ進まない。CP1/CP2 は原本では Plan モードレビュー、CP3 はテキスト承認。
- `[ツール依存]` **Plan モードレビューは CC 固有** → 他ツールでは「成果物の要点＋全文を提示し明示承認まで停止」に置換（意味論は同一）。

## S3. 進行の永続化と中間成果物 `[確定]`

- 進行状況を **`docs/task-pipeline/<slug>/status.md`**（または各ツールの spec/tasks）に永続化。フェーズ完了・承認・差し戻しのたびに更新。
- 中間成果物: `research.md` / `requirements.md` / `brief.md`。read-only エージェントの出力保存はオーケストレーターの仕事。
- **成果物本体の保存先は出力ディレクトリ**（CLAUDE.md で定義。例: `deliverables/{diagrams,docs,reports}/`）であり、中間成果物ディレクトリとは別。

## S4. 差し戻しループ `[確定]`

- Phase 4 のセルフチェックに ❌、または Phase 5（Review）で Critical/Important があれば、**deliverable-builder を再起動**（自分で直さない・reviewer にも直させない）。
- **上限3回**（並列時グループ別）。カウンタは status を正とする。超えたら停止して報告。❌ が要件側の問題ならユーザーに報告して指示を仰ぐ。

## S5. 並列実行プラン `[確定]`

brief が独立グループ（出力パスが交わらず共有ファイルを書かない）を宣言したときのみ、Phase 4 を
**①共有/先行逐次作成（目次・用語集・索引・共通テンプレート）→ ②独立グループ並列 → ③依存グループ逐次**で実行。
グループ越境はオーケストレーターが守る（原本の出力ディレクトリガード＝PreToolUse フックは「出力ディレクトリ外」のみ守る＝T2h・別途）。

## S6. 生きた成果物仕様の更新 `[確定]`

`SPEC.md`（成果物仕様）があり承認成果物が既存の内容・構成・規約を追加/変更/廃止したら、最終承認後に **増分更新**
（新規=新 `D-NN`、変更=同 ID 書換＋改訂履歴、廃止=`[廃止]` 印）。原則「1 Todo = 1 Commit = 1 Spec Update」。

## S7. ツール非依存／依存の分離

- **非依存（SPEC＝共有）**: S0–S6 の連鎖・CP・status・差し戻し・並列・越境禁止・出力ディレクトリ境界・生きた成果物仕様。
- **依存（実装ごと）**: 起動機構（CC=Task ツール ／ Kiro=CLI サブエージェント ／ Codex=subagents）、CP の停止表現、
  進行の器（CC=status.md ／ **Kiro=`.kiro/specs/` の requirements/design/tasks**）、成果物作成スキル（drawio 等）の利用形、出力ディレクトリガード（T2h・別途）。

## S8. 各ツール実装

- **Claude Code（原本）**: `plugins/task-pipeline/{skills,agents}`（参照元）。
- **Kiro**: `../impl/kiro/task-pipeline/`。`.kiro/agents/*.json`×5＋skill＋steering。**写像**: requirements↔`requirements.md`・brief↔`design.md`・status/差し戻し↔`tasks.md`。Kiro Power 同梱。
- **Codex**: `../impl/codex/task-pipeline/`。`.codex/agents/*.toml`×5＋orchestrator skill。status.md ファイル永続化は原本どおり。Codex plugin 同梱。
