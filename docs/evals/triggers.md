# triggers — 発火 eval のケース（同一プラグイン内の衝突組）

`claude plugin eval` で「発火すべきときに発火し、隣のスキルの依頼では発火しないか」を測るケース集。
1行が1ケースで、`gen-trigger-cases.py` がこの表から `claude plugin eval` のケース（`prompt.md` と `graders/*.md`）を生成する。
表の書き方は次のとおり。

- **期待**: `should` はそのスキルが発火すべき依頼、`not` は発火すべきでない依頼
- **依頼**: ユーザーが実際に言いそうな言い換えにする（description の発火句をそのまま使わない）

測れるのは**同じプラグインの中の衝突だけ**。`claude plugin eval` は1回に1プラグインしか載せないので、
プラグインをまたぐ組（clarify と task-brief など）はここでは測れない。

走らせ方と結果は [`../decisions/2026-10-03-skill-description-budget.md`](../decisions/2026-10-03-skill-description-budget.md) を参照。

## model-setup

| スキル | 期待 | 依頼 |
|---|---|---|
| task-brief | should | ログイン画面のバリデーションを直したい。手をつける前に、何ができたら終わりなのかと触ってよい範囲を一度ちゃんと整理してから始めて |
| task-brief | should | CSV エクスポートに日付フィルタを足す件、着手前に完了条件と検証方法を決めておきたい |
| task-brief | not | 関数名を fetchUser から getUser に変えて |
| task-brief | not | README の誤字を1つ直して |
| long-run | should | このリファクタ、放置するので途中で確認せずに最後までやり切っておいて |
| long-run | should | 夜のあいだ回しっぱなしにするから、テストの移行を全部終わるまで自律で進めて |
| long-run | not | 今の変更、経緯を知らない目で本当に完了しているか検証して |
| long-run | not | src/utils.ts の型エラーを1つ直して |
| fan-out | should | 独立した10個の API エンドポイントのドキュメントを、手分けして同時に書いて |
| fan-out | should | 3つのパッケージの依存更新を、サブエージェントに分担させて並行で進めて |
| fan-out | not | このバグの原因を調べて |
| fan-out | not | docs/backlog.md の次のタスクをやって |
| backlog-loop | should | docs/backlog.md の次のタスクをやって |
| backlog-loop | should | バックログから次の項目を拾って、計画を立ててから進めて |
| backlog-loop | not | ソース中の TODO コメントを全部リストアップして |
| backlog-loop | not | このタスクを放置で最後まで自律で完走させて |
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
| build-with-tests | should | 日付フォーマット関数を追加して、テストも一緒に書いて |
| build-with-tests | should | 既存のパターンに合わせて小さいユーティリティを実装して、テストもつけて |
| build-with-tests | not | 通知機能の要件を一問ずつ質問して詰めて |
| build-with-tests | not | ユーザー招待機能を、ストーリー承認とブリーフ承認を挟みながら end-to-end で開発して |
| feature-pipeline | should | ユーザー招待機能を、要件定義から実装・テスト・レビューまで end-to-end で作って |
| feature-pipeline | should | サブスク決済機能を、ストーリー承認とブリーフ承認を挟みながら開発して |
| feature-pipeline | not | README の誤字を1つ直して |
| feature-pipeline | not | システム構成図を drawio で描いて |
