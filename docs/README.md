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
| `decisions/2026-09-05-feedback-rules.md` | 人間の指摘を1指摘1ファイルで永続化し、指摘回数（count）で強制力を warn → ask → deny と段階的に上げる仕組みを `plugins/feedback-rules/` として実装した決定記録。公式 `hookify`・claude-reflect・agentmemory・本体の `.claude/rules/` 等の先行事例調査（何が上回っていて何が無かったか）、取り込んだ4点（訂正の自動捕捉・失効管理・`.claude/rules/` 書き出し・agent 型フックの opt-in）、実装しなかった4点（count の自動更新・ルールの自動生成・AGENTS.md 同期・セキュリティ用途）、`self-correct` と統合しない理由 |
| `decisions/2026-09-05-learning-prompt-as-skill.md` | 2026-08-11 の Anthropic メンバーの「仕事の学習用プロンプト」を `plugins/learning-coach/`（スキル `deep-understand`）として実装した決定記録。既存8プラグインがすべて「Claude に良い仕事をさせる」ためのもので「人間の側の理解を作る」主題を持たないため独立させた線引き、`/goal` を再実装しない判断、エージェント・フックを持たせない理由、「全問を出すまで答えを明かさない」を `AskUserQuestion` の構造で担保した設計 |
| `decisions/2026-09-06-adoption-review.md` | 外部の技術（OSS・AI ツール・SaaS・論文・スライド・X ポスト）を Web の一次情報から敵対的にレビューし採用可否を判定する仕組みを `plugins/adoption-review/` として実装した決定記録。先行事例調査（本体 `/code-review`・`review-panel`・ThoughtWorks Technology Radar・tech-radar / Tech Stack Evaluator スキル・claude-code-radar）で「無かった3点」＝敵対の順序・Web 一次情報・確認できなかったことの明示、に絞った線引き、サブエージェント2種（証拠収集は並列・敵対役は肯定寄りのときだけ起動）の理由、`agent-review-panel` に同居させない判断、実装しなかったもの（パネル討論・TCO 計算・技術レーダー生成・フック） |
| `decisions/2026-09-06-self-correct-article-adoption.md` | 自己修正ループ（Builder / Judge / Ground Truth / `/goal`）の解説記事を `/adoption-review` の手順で評価し、**中核は 2026-09-05 に実装済みのため新規実装なし**と判定した記録。一次情報で検証した記事の事実主張7件（`/goal` の評価器がツールを持たない・4,000 文字上限・権限は広がらない＝確認できた／v2.1.139 と「Goal Evaluator」の呼称＝確認できなかった）、取り込んだ差分3点（agent 型フックを採らない理由の明記・出典 URL の追加・段階への Level 1.5 追加）、取り込まなかった7件、外部評価（自己修正の研究・先行 OSS `loop_eng`）、積み残し2件（リグレッション検出・進捗なし検出） |
| `decisions/2026-09-06-self-correct-stop-rules.md` | `self-correct` の Phase 3 に停止ルール2件 — **リグレッション**（前ラウンド PASS の基準が FAIL に転じた）と**進捗なし**（未解決 Critical/Major が2ラウンド連続で減らない）— を追加した決定記録。先行 OSS `loop_eng` の6ルールとの差分、判断はスキル・ゲートはフックの数値2つに分けた理由（jq 無し環境で配列比較ができない）、リグレッションを即 ESCALATE にせず差し戻し1回を挟んだ理由、採らなかった4案（「能力の限界」・フック側での配列比較・差し戻しを attempt に数えない・Judge に前ラウンドを渡す）、jq あり/無し10ケースの検証 |
| `decisions/2026-09-06-prompt-techniques-7-adoption.md` | 「まだ世にほとんど出回っていない新手法」として5つのプロンプト手法（Multi-Facet Echo / Blind Intersection Prompting / Keyhole Inversion / Fractal Narrative Chaining / Reflection-by-Proxy）を提示した記事を `/adoption-review` の手順で評価し、**取り込みなし（差分0件）**と判定した記録。5手法 × 既存実装の対応表（4件は `review-panel`・`self-correct`・`design-docs` に上位互換が実装済み、Keyhole Inversion は model-setup ルール1「完了条件を先に定義する」を緩めるため矛盾）、命名だけが新規であることの検証（Du et al. 2023 / Self-Refine / Re3）、相互参照そのものに害があるという実証（Wynn et al. 2025・Wang et al. 2024）、積み残し（review-panel の設計根拠への出典追記） |
| `decisions/2026-09-06-for-file-claude-md-adoption.md` | CLAUDE.md に1行（`For every project, write a detailed FOR[yourname].md ...`）を足して解説ドキュメントを自動生成させる X ポストを `/adoption-review` の手順で評価し、**手法は不採用・差分1点だけ反映**と判定した記録。公式ドキュメントで検証した事実（CLAUDE.md は毎セッション読まれる／「消して間違えないなら消す」という採否基準／肥大した CLAUDE.md は他の指示の遵守率を下げる／`/init` は設計理由を生成しない）、否定側の3根拠（判断の理由は `interview.md` が「聞くしかない項目」に分類済み・DeepWiki の誤記実証と CIAO 研究・`context-audit` の「手順はスキルへ」分類）、取り込んだ1点（`project-catchup` に出典必須の「設計判断の理由」章を追加）、取り込まなかった6件 |
| `skill-authoring.md` | 公式ガイド「The Complete Guide to Building Skills for Claude」（2026-09-05 取得）に沿ってスキルを書くための指針。3段階の開示・frontmatter のキー採否・山括弧禁止・別冊に切る基準・CI が守っている項目。末尾に全20スキルの監査結果（変更しなかったものも全件）と積み残し。**どのスキルを入れるか**は `skills-guide/` |
| `lessons.md` | 過去の PR から蒸留した「このリポジトリで繰り返さない判断」。作る前の3点確認（本体・公式プラグイン・著名 OSS）、重複を自動化する前に統合する、既定探索パスに従う、など8件。根拠の PR 番号つき |
| `evals/` | 主要スキル（task-brief / verify-fresh / long-run / review-panel / adoption-review）の「期待挙動」シナリオ22件。Sonnet 5 と Opus 5 のパリティを実測する物差し。`claude plugin eval` が early access のため Markdown 形式（ゲートが開いたら `case.yaml` へ機械化する）。追補ルール14 の分岐が実効を持つかを verify-fresh S-3/S-4 で検出する |
| `backlog-2026-09.md` | 2026-09-03 の Fable 5.1 セッションで着手できなかった項目を、Sonnet/Opus が単独で実行できるブリーフ（完了条件・スコープ・検証方法つき）にしたもの |
| `pipeline-spec-alignment-proposal.html` | 旧 `software-pipeline` / `task-pipeline`（現 `pipeline` に統合）と、当時存在した仕様抽出スキル（`spec-extract`）に、既存リポジトリの仕様の「吸い出し（extraction）」と以降要件の「合致性（conformance）」を強制化するための設計提案・判断材料（案A 軽量強化 / 案B steering 層新設の比較、2026-06 時点）。**2026-08 のレビューで `spec-extract` は cc-rsg 等の外部ツールへの委譲に変更**（歴史的決定記録として残置）。ブラウザで開いて読む単一ファイル HTML。 |
