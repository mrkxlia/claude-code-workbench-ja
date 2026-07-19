# SPEC: software-pipeline（7エージェントで機能を end-to-end 実装するパイプライン）

Track B の共有仕様。**原本 `plugins/software-pipeline/{skills/feature-pipeline,agents,CLAUDE.md}` を一次根拠**に起こした
派生ドキュメント（複製ではない）。原本が変わったらこの SPEC を手動追従し、各ツール実装（`../impl/<tool>/software-pipeline`）を更新する。
確度ラベル: `[確定]`＝原本に明記 / `[推定]`＝合理的補完 / `[要確認]`＝ツール/バージョン依存。

## S0. 目的 `[確定]`

機能開発を **7つの専門エージェントの連鎖**に流し、**3つの人間承認チェックポイント**で必ず停止する。
オーケストレーター（メインセッション）はコードを書かず、各フェーズで担当エージェントを起動し、成果物の保存・受け渡し・停止だけを行う。

## S1. エージェント連鎖（7体）と書き込み範囲 `[確定]`

| # | エージェント | 役割 | 書き込み |
|---|---|---|---|
| 1 | codebase-researcher | 実装前にコードベースを調査（関連ファイル・パターン・リスク・既存仕様整合） | なし（read-only） |
| 2 | story-writer | 受け入れ基準つきユーザーストーリーに変換（何を作るか） | なし（read-only） |
| 3 | spec-writer | 承認済みストーリー→技術ブリーフ（データ/API/FE/テスト/並列プラン） | なし（read-only） |
| 4 | backend-builder | API・サービス・ジョブ・マイグレーション＋ユニットテスト | バックエンド領域＋notes |
| 5 | frontend-builder | コンポーネント・ページ・フック＋UIテスト（API契約に忠実） | フロントエンド領域＋notes |
| 6 | test-verifier | 受け入れテスト＋テストギャップ分析（プロダクトコードは触らない） | テストファイル＋notes |
| 7 | implementation-validator | 実装をストーリー/ブリーフに突合し Critical/Important/Minor 報告 | なし（read-only） |

**越境禁止** `[確定]`: BE は FE を触らない／FE は BE・API ルート・マイグレーションを触らない／test-verifier はプロダクトコードを触らない。

## S2. 3つの人間承認チェックポイント `[確定]`

- **CP1 ストーリー承認**（Phase 2 後）／**CP2 ブリーフ承認**（Phase 3 後）／**CP3 最終レビュー**（Phase 7 後・コミット/PR 前）。
- 承認まで次フェーズへ進まない。CP1/CP2 は原本では Plan モードレビュー、CP3 はテキスト承認。
- `[ツール依存]` **Plan モードレビューは CC 固有** → 他ツールでは「成果物の要点サマリー＋全文を提示し、明示承認まで停止」に置換（"停止して承認"の意味論は同一）。

## S3. 進行の永続化（status）と成果物 `[確定]`

- 進行状況をコンテキストのメモでなく **`docs/pipeline/<slug>/status.md`**（または各ツールの spec/tasks）に永続化。フェーズ完了・承認・差し戻しのたびに更新。
- 成果物: `research.md` / `story.md` / `brief.md` / `api-contract.md` / `implementation-notes.md`。read-only エージェントの出力テキストの保存はオーケストレーターの仕事。
- **notes と status は役割が違う** `[確定]`: 判断・逸脱・トレードオフ・ハマりどころ・積み残しは notes（ビルダーが直接追記）、進行状況は status。

## S4. 差し戻しループ `[確定]`

- Phase 6（Verify）/ Phase 7（Validate）で失敗・Critical があれば、レポートが指定する**差し戻し先ビルダー**を再起動（自分で直さない・test-verifier にも直させない）。
- **上限3回**（並列時はグループ別カウンタ）。超えたら停止してユーザーに報告。カウンタは status を正とする。
- テストギャップ: 🟢 追加済みは受容、🔧 要コード修正は差し戻し（上限に計上）。

## S5. 並列実行プラン `[確定]`

brief が独立グループ（所有パスが交わらず共有ファイルを書かない）を宣言したときのみ、Phase 4/5 を
**①共有/先行逐次変更 → ②独立グループ並列 → ③依存グループ逐次**で実行。宣言が無ければ Backend→Frontend 逐次。
グループ越境はオーケストレーターが守り、共有ファイル衝突はガード（原本は PreToolUse フック＝T2h）が確認する。

## S6. 生きた仕様の更新 `[確定]`

`SPEC.md`（spec of record）があり承認実装が既存挙動を追加/変更/廃止したら、Phase 7 で **増分更新**（新規=新 `F-NN`、変更=同 ID 書換＋改訂履歴、廃止=`[廃止]` 印）。原則「1 Todo = 1 Commit = 1 Spec Update」。

## S7. ツール非依存／依存の分離

- **非依存（SPEC＝共有）**: S0–S6 の連鎖・CP・status 永続化・差し戻し・並列・越境禁止・生きた仕様。
- **依存（実装ごと）**: 起動機構（CC=Task ツール ／ Kiro=CLI サブエージェント `toolsSettings.subagent` ／ Codex=subagents）、
  CP の停止表現（CC=Plan モードレビュー ／ 他=要点＋全文提示で停止）、進行の器（CC=status.md ／ **Kiro=native spec ワークフロー
  `.kiro/specs/` の requirements/design/tasks**）、共有ファイルガード（CC=PreToolUse フック＝T2h・別途）。

## S8. 各ツール実装

- **Claude Code（原本）**: `plugins/software-pipeline/{skills,agents}`（参照元）。
- **Kiro**: `../impl/kiro/software-pipeline/`。本 SPEC からの再実装。`.kiro/agents/*.json`×7＋`.kiro/skills/feature-pipeline`＋
  steering（ハードルール）。**写像**（本リポジトリ README の SDD 対応表より）: story↔`requirements.md`・brief↔`design.md`・
  status/差し戻し↔`tasks.md`・SPEC.md↔living spec。Kiro Power に同梱。
- **Codex**: 後続増分（`.codex/agents/*.toml`×7＋orchestrator skill）。
