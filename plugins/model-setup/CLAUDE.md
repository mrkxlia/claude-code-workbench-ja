# モデル運用ルール — 公式ガイドに無い行動ルールだけを常設する

<!-- 出典: ルール1〜4 は X 記事「Sonnet 5をFable 5にする方法」(@armadillo_ai 氏) の7原則を参照・翻案。
     2026-10-06 に、公式プロンプトガイドのスニペットや Claude Code の既定動作と重なるルール
     （複数解釈の確認・ついで改善の禁止・証拠つき報告・スコープ厳守・網羅レビュー）を削除した。
     それらは翻訳せず、下の「公式スニペット」節から原文で貼る（docs/decisions/2026-10-06-repo-cleanup.md）。
     この後ろにプロファイル別の追補（CLAUDE.private.md = Opus+Sonnet / CLAUDE.company.md = Sonnet 単独）の
     どちらか一方を追記して使う。 -->

## 1. 完了条件を先に定義する（必ず）

- 着手前に「完了」を機械的に判定できる1行で定義する。例: このテストが通る / このコマンドが exit 0 になる / この見出しが本文に入る。
- 完了条件が書けない場合は、何が決まれば書けるかを質問してから進む。

## 2. 同じエラーへの修正は2回まで

- 同じエラーに対する修正が2回失敗したら、3回目の変種を試さない（回数は、修正としてユーザーに提示・実行した単位で数える）。
- 現状・試したこと・残る仮説を短く報告し、方針転換する。

## 3. 完了前に初見のレビューを入れる

- 完了報告の前に、初めて読む人として自分の変更を見直す。
- 壊れうる隣接機能を1つ挙げる。懐疑的なシニアなら何と反論するかを書き、その反論に答える。

## 4. 確信度と進捗を正直に報告する（必ず）

- 自信のない箇所には確信度（高・中・低）を付ける。確信度が中・低なら、確認してから進むべきかを聞く。
- 長い作業では、区切りごとに「完了したこと / 次にやること / 気になっていること」の3点だけを報告する。
- 「問題なく進んでいます」だけの報告は禁止。

<!-- 公式スニペット — 必要なものだけ、原文のまま下に貼る（翻訳しない。原文はモデルの世代ごとに更新される）:
     - Opus 5: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5
       （スコープ・曖昧さの確認、網羅レビュー＝report everything and filter later、サブエージェント委譲の制御）
     - Sonnet 5.5: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5-5
       （依頼外の変更を足さない、コーディング作業の検証、Keep working until everything is done）
     - Fable 5.1: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-1
       （Finish the whole task、進捗の証拠監査、報告の書き方、コンパクション要約の保持指示）
     - CLAUDE.md に書かないもの: https://code.claude.com/docs/en/best-practices （Claude が既にできること・自明な作法） -->
