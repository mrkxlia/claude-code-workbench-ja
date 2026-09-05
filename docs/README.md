# docs/ — リポジトリ横断の設計ノート

このディレクトリは、特定のセクション（`pipeline/` など）単体に閉じない、
**複数セクションをまたぐ設計提案・検討資料**を置く場所です。

セクション固有のドキュメントは各セクションの `README.md` に置き、ここには
「どのセクションに実装するかを含めて検討する段階」の資料を置きます。

## ファイル一覧

`decisions/` には日付つきの決定記録・監査記録（変更しない。覆すときは新しい記録を足す）、
直下には提案資料・バックログ・執筆ガイドを置く。

| ファイル | 内容 |
|---------|------|
| `decisions/2026-09-03-fable-5-1-audit.md` | Fable 5.1 自身による model-setup（ルール・追補・スキル・エージェント・パリティマップ）の監査記録。各項目を (a)再現済み／(b)過剰処方（Opus 5 で逆効果）／(c)欠落 に分類し、反映した差分と意図的に変えなかったものを記録（model-setup 3.2.0） |
| `decisions/2026-09-03-long-run-constraints-and-spec-load.md` | 「完全には埋まらない」とされてきた2件 — 長時間作業での序盤制約の保持・SPEC.md の必須ロード保証 — を Claude Code のフック仕様（SessionStart `compact`・SubagentStart の `additionalContext`）で構造化する決定記録。敵対的レビュー3名の指摘と対応つき。実装は `backlog-2026-09.md` |
| `decisions/2026-09-05-large-codebase-harness.md` | 公式ブログ「How Claude Code works in large codebases」を `plugins/codebase-setup/` として実装した決定記録。記事の harness 7拡張点の採否（フックと MCP は不採用）、記事の `.claudeignore` 記述が現行仕様に無く `permissions.deny` で実装した差分、教訓1（本体・公式プラグイン・OSS の3点確認）との照合、意図的にやらなかったこと |
| `decisions/2026-09-05-self-correction-loop.md` | 自己修正ループ（Evaluator-Optimizer）を `plugins/self-correct/` として実装した決定記録。本体の `/goal`・Stop フック・Task サブエージェントを再実装せず、本体が構造的にできない3点（評価器がツールを持たない／生成と評価の分離が約束にすぎない／停止条件が機械可読でない）だけを実装した線引き、却下した5案、`verify-fresh`・`review-panel`・`pipeline` との住み分け、Judge 自体を検定する `judge-eval` を置いた理由 |
| `decisions/2026-09-05-design-doc-subagents.md` | 外部記事の「設計書フェーズ別サブエージェント5体」を、既存流用（requirements-writer / brief-writer / deliverable-builder / final-reviewer）＋2点追加（`design-docs` スキル・`design-doc-checker` エージェント）に絞った決定記録。フェーズ別ビルダー4体を作らなかった理由と教訓1・2・4 との照合、見送った案（haiku 図表エージェント等） |
| `decisions/2026-09-05-learning-prompt-as-skill.md` | 2026-08-11 の Anthropic メンバーの「仕事の学習用プロンプト」を `plugins/learning-coach/`（スキル `deep-understand`）として実装した決定記録。既存7プラグインがすべて「Claude に良い仕事をさせる」ためのもので「人間の側の理解を作る」主題を持たないため独立させた線引き、`/goal` を再実装しない判断、エージェント・フックを持たせない理由、「全問を出すまで答えを明かさない」を `AskUserQuestion` の構造で担保した設計 |
| `skill-authoring.md` | 公式ガイド「The Complete Guide to Building Skills for Claude」（2026-09-05 取得）に沿ってスキルを書くための指針。3段階の開示・frontmatter のキー採否・山括弧禁止・別冊に切る基準・CI が守っている項目。末尾に全20スキルの監査結果（変更しなかったものも全件）と積み残し。**どのスキルを入れるか**は `skills-guide/` |
| `lessons.md` | 過去の PR から蒸留した「このリポジトリで繰り返さない判断」。作る前の3点確認（本体・公式プラグイン・著名 OSS）、重複を自動化する前に統合する、既定探索パスに従う、など8件。根拠の PR 番号つき |
| `evals/` | 主要スキル（task-brief / verify-fresh / long-run / review-panel）の「期待挙動」シナリオ15件。Sonnet 5 と Opus 5 のパリティを実測する物差し。`claude plugin eval` が early access のため Markdown 形式（ゲートが開いたら `case.yaml` へ機械化する）。追補ルール14 の分岐が実効を持つかを verify-fresh S-3/S-4 で検出する |
| `backlog-2026-09.md` | 2026-09-03 の Fable 5.1 セッションで着手できなかった項目を、Sonnet/Opus が単独で実行できるブリーフ（完了条件・スコープ・検証方法つき）にしたもの |
| `pipeline-spec-alignment-proposal.html` | 旧 `software-pipeline` / `task-pipeline`（現 `pipeline` に統合）と、当時存在した仕様抽出スキル（`spec-extract`）に、既存リポジトリの仕様の「吸い出し（extraction）」と以降要件の「合致性（conformance）」を強制化するための設計提案・判断材料（案A 軽量強化 / 案B steering 層新設の比較、2026-06 時点）。**2026-08 のレビューで `spec-extract` は cc-rsg 等の外部ツールへの委譲に変更**（歴史的決定記録として残置）。ブラウザで開いて読む単一ファイル HTML。 |
