# triggers — 発火 eval のケース（同一プラグイン内の衝突組）

`claude plugin eval` で「発火すべきときに発火し、隣のスキルの依頼では発火しないか」を測るケース集。
1行が1ケースで、`gen-eval-cases.py` がこの表から `claude plugin eval` のケース（`prompt.md` と `graders/*.md`）を生成する。
表の書き方は次のとおり。

- **期待**: `should` はそのスキルが発火すべき依頼、`not` は発火すべきでない依頼
- **依頼**: ユーザーが実際に言いそうな言い換えにする（description の発火句をそのまま使わない）

測れるのは**同じプラグインの中の衝突だけ**。`claude plugin eval` は1回に1プラグインしか載せないので、
プラグインをまたぐ組（clarify と他プラグインの grill 系など）はここでは測れない。

走らせ方と結果は [`../decisions/2026-10-03-skill-description-budget.md`](../decisions/2026-10-03-skill-description-budget.md) を参照。

## model-setup

| スキル | 期待 | 依頼 |
|---|---|---|
| verify-fresh | should | 終わったと言っているけど、完了条件を本当に満たしているか、作業の経緯を知らない目でチェックして |
| verify-fresh | should | この成果物、新鮮な目でもう一度検証して |
| verify-fresh | not | この関数のユニットテストを書いて |
| verify-fresh | not | 独立した3つの調査を並列で進めて |

## pipeline

| スキル | 期待 | 依頼 |
|---|---|---|
| clarify | should | 通知機能の要件、穴がないように一問ずつ質問して詰めて |
| clarify | should | この設計案、あいまいなところを徹底的に突っ込んで質問して |
| clarify | not | ユーザー招待機能を要件から実装・テスト・レビューまで end-to-end で作って |
| clarify | not | 日付フォーマット関数を追加して、テストも一緒に書いて |
| feature-pipeline | should | ユーザー招待機能を、要件定義から実装・テスト・レビューまで end-to-end で作って |
| feature-pipeline | should | サブスク決済機能を、ストーリー承認とブリーフ承認を挟みながら開発して |
| feature-pipeline | not | README の誤字を1つ直して |
| feature-pipeline | not | システム構成図を drawio で描いて |
