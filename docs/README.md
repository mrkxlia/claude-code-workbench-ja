# docs/ — リポジトリ横断のドキュメント

特定のプラグインに閉じない資料を置く場所です。プラグイン固有のことは各プラグインの `README.md` に書きます。

| パス | 内容 |
|------|------|
| [`lessons.md`](lessons.md) | 過去 PR から蒸留した「繰り返さない判断」。何かを作る前に読む |
| [`skill-authoring.md`](skill-authoring.md) | スキルの書き方（公式ガイド準拠。frontmatter・分冊基準・CI の検査との対応） |
| [`evals/`](evals/) | 主要スキル5件の期待挙動シナリオと発火ケース。走らせ方は [`evals/README.md`](evals/README.md) |
| [`skills-guide/`](skills-guide/) | おすすめ Skills ガイドと私用PC・会社PCの導入プロファイル |
| [`decisions/`](decisions/) | 日付つきの決定記録（下記） |

## decisions/ — 決定記録

記録は書いたら変えない。覆すときは新しい記録を足す。中身の要約はここに写さず、各記録の冒頭を読む（要約を二重に持つとずれる）。

**残す基準**: 現行のプラグイン・ツール・CI・`lessons.md` から引かれている（＝今あるコードの理由になっている）か、
積読索引のように「評価済みかどうか」の照合に実際に使われているものだけを残す。それ以外は結論を書いたうえで削除してよい
（`git show <commit>:<path>` で引ける）。経緯は [`2026-10-06-repo-cleanup.md`](decisions/2026-10-06-repo-cleanup.md)。

| 記録 | 主題 |
|------|------|
| [2026-09-03-fable-5-1-audit](decisions/2026-09-03-fable-5-1-audit.md) | model-setup の監査 |
| [2026-09-03-long-run-constraints-and-spec-load](decisions/2026-09-03-long-run-constraints-and-spec-load.md) | pipeline の SPEC 注入フック |
| [2026-09-05-design-doc-subagents](decisions/2026-09-05-design-doc-subagents.md) | pipeline の design-docs・design-doc-checker |
| [2026-09-05-feedback-rules](decisions/2026-09-05-feedback-rules.md) | feedback-rules の設計と先行事例 |
| [2026-09-05-learning-prompt-as-skill](decisions/2026-09-05-learning-prompt-as-skill.md) | learning-coach の設計 |
| [2026-09-06-adoption-review](decisions/2026-09-06-adoption-review.md) | adoption-review の設計と先行事例 |
| [2026-09-06-plan-review-before-present](decisions/2026-09-06-plan-review-before-present.md) | cli-bridge のプラン前 Codex レビュー |
| [2026-09-07-plugin-inventory-and-official-spec-alignment](decisions/2026-09-07-plugin-inventory-and-official-spec-alignment.md) | プラグイン棚卸しと公式仕様への整合 |
| [2026-09-13-skill-duplication-check](decisions/2026-09-13-skill-duplication-check.md) | スキル単位の重複（車輪の再発明）チェック |
| [2026-09-19-retire-codex-bridge-and-cli-bridge](decisions/2026-09-19-retire-codex-bridge-and-cli-bridge.md) | codex-bridge 廃止と cli-bridge 統合 |
| [2026-10-02-sonnet-5-5-model-effort-review](decisions/2026-10-02-sonnet-5-5-model-effort-review.md) | モデル割り当てと effort の見直し |
| [2026-10-03-tsundoku-claude-code-16-items-adoption](decisions/2026-10-03-tsundoku-claude-code-16-items-adoption.md) | 積読16件の採否（積読索引の照合用） |
| [2026-10-03-skill-usability-and-mattpocock](decisions/2026-10-03-skill-usability-and-mattpocock.md) | mattpocock-skills の精読と取り込み |
| [2026-10-03-skill-description-budget](decisions/2026-10-03-skill-description-budget.md) | スキル description 予算（CI の予算検査の根拠） |
| [2026-10-06-tsundoku-agent-14-items-adoption](decisions/2026-10-06-tsundoku-agent-14-items-adoption.md) | 積読14件の採否（積読索引の照合用） |
| [2026-10-06-repo-cleanup](decisions/2026-10-06-repo-cleanup.md) | リポジトリ整理と残す基準 |
| [2026-10-07-review-panel-wan-huiyan-import](decisions/2026-10-07-review-panel-wan-huiyan-import.md) | review-panel への取り込み |
| [2026-10-08-tsundoku-task-band-mod](decisions/2026-10-08-tsundoku-task-band-mod.md) | task-band と mod の同梱判断（積読索引の照合用） |
| [2026-10-10-manual-skills](decisions/2026-10-10-manual-skills.md) | manual-write・manual-check・manual-checker |
| [2026-10-10-grilling-unanswerable-and-understanding-debt](decisions/2026-10-10-grilling-unanswerable-and-understanding-debt.md) | grilling の未回答の扱い |
| [2026-10-11-yagni-docs](decisions/2026-10-11-yagni-docs.md) | 文書の重複を削り「1つの事実は1か所」にする |
