# progress-pane — 計画・タスク・詰まりを1枚のペインで見る mod

Claude Code の **function hooks（mod）** で書いたプラグインです。長時間タスクの「いまどこまで進んだか」を、
Claude Code の中のペイン1枚にまとめます。**LLM を使わず**、Claude が使うツール（Write・TaskCreate など）の
入出力を数えるだけなので、トークンは0です。

[html-plan](https://github.com/anthropics/claude-plugins-community/tree/main/html-plan) と組み合わせると、
**計画（何を作るか・何を決めたか）→ 実装（どこまで済んだか）** が同じペインでつながります。

```
実装中 2/5                                         ← 段階: 計画の回答待ち → 回答済み → 実装中 → 完了
計画: Scheduling Sent Messages in PostBox
1. The user can pick a time in the composer. [2/3]  ← html-plan のレベル1の主張と、その下のタスクの進み
   ? How many scheduled messages per user? → 500（変更して回答）
   ✔ [1.1] 日時ピッカーを追加
   ▶ 送信予約の API を書いています
   ・ [1.3] 上限チェック
2. The user sees and changes scheduled messages … [0/2]
3. A message is sent only at its time. …
   ? Should a failed send retry on its own? → Yes, 3 times（⚠ 開かずに既定のまま — チャットで確認を）
共通の決定
   ? How long do sent and cancelled rows stay?（回答待ち）
その他のタスク
   ・ README を直す
詰まりの兆候（判断は人間がします）
   ツールが 3 回続けて失敗
直近の失敗
   Bash: npm test failed: 3 errors
```

ステータスラインにも同じ要約（`実装中 2/5 · ▶ … · ⚠ 未確認の決定 1 · ⚠ 連続失敗 3`）を出します。

## 何を見ているか

| 見るもの | 拾い方 | ペインでの出方 |
|---|---|---|
| html-plan の計画ページ | `Write` で `<doc-plan>` を含む HTML が書かれたとき（同じファイルの `Edit` で読み直す） | 題名・レベル1の主張・決定（`doc-ask`）。決定は置かれた主張の下に、aux の主張に置かれたものは「共通の決定」に |
| html-plan の回答 | Respond でコピーした `# Re: <題名>` の markdown をチャットに貼ったとき | 決定ごとに「変更して回答」「既定のまま（確認済み）」「⚠ 開かずに既定のまま」と答え |
| タスク | `TaskCreate`・`TaskUpdate`・`TodoWrite` | 件名の先頭が `[1.2]` のように主張番号ならその主張の下に、無ければ「その他のタスク」に |
| 詰まり | すべてのツール結果 | ①3回続けてエラー ②未完了タスクがあるのに15分完了が出ない。初回だけトーストでも知らせる |

**「開かずに既定のまま」を目立たせる理由。** html-plan の SKILL.md 自身が、この状態を「同意として読むな。重要ならチャットで聞け」と
書いています。ペインはそれを見落とさないための表示で、決定の扱いは変えません。

## タスクを主張にひも付けるには

Claude にこう頼むだけです（CLAUDE.md に書いてもよい）:

> タスクを作るときは、html-plan の主張番号を件名の先頭に `[1.2]` の形で付けて

角括弧つきの番号だけを読みます（「3 files を直す」の 3 は主張番号として拾いません）。付けなくても動き、そのタスクは「その他のタスク」に出ます。

## やらないこと（意図的に）

- **判断待ちを既定の動作で進めない。** 着想元のプロンプト（下記）は「判断が要るときは質問リストに積んで
  既定の動作で進める」としていたが、model-setup のルール2（複数解釈を勝手に選ばない）と矛盾する。
  この mod は見せる・知らせるだけで、続行・方針変更・中断は人間が決める
- **作業を止めない。** 失敗を検知してもツール呼び出しを拒否しない。フックが自分で壊れたときも
  `.catch` で素通りさせる（fail-open）
- **計画ページを作らない・回答を代わりに送らない。** 計画は html-plan、回答の貼り戻しは人間の仕事のまま

## 使い方

- ペインは、計画ページが書かれたときと最初のタスクが作られたときに**自動で開きます**（頼まれずに開くペインは、
  端末が 144 桁未満だと幅が空くまで待ちます）。いつでも `/progress` で開けます
- html-plan は別に入れます: `/plugin install html-plan@claude-plugins-community`（入れなくても、タスクと詰まりの表示は動きます）

## どれを使うか

| やりたいこと | 使うもの |
|---|---|
| 計画からタスク・詰まりまでを1枚で見たい | **progress-pane（本プラグイン）** |
| task-pipeline のフェーズと承認待ちを見る | [`tools/progress/`](../../tools/progress/)（status.md を読む statusline ＋ HTML） |
| 計画そのものを対話的に作り、決定に答える | html-plan（外部・Anthropic のコミュニティプラグイン） |

## ファイル構成

```
progress-pane/
├── README.md                     # このファイル
├── .claude-plugin/plugin.json    # マニフェスト（types で $.state の型契約を宣言）
├── hooks/
│   ├── hooks.json                # { "modules": ["./register.tsx"] }
│   ├── register.tsx              # 本体。tool.call・prompt.submit・command.run・ui.render（Pane）のフック
│   └── plan.ts                   # html-plan の計画ページと Respond の回答を読む（DOM が無いので正規表現）
├── types/index.d.ts              # $.state（progress-pane.watch）の型契約
└── tests/progress-pane.test.ts   # claude plugin test で走る7件
```

## 導入方法

```
/plugin marketplace add mrkxlia/claude-code-workbench-ja
/plugin install progress-pane@workbench-ja
```

開発中のフォルダをそのまま試すなら `claude --plugin-dir <このフォルダ>` で起動します。
閾値（3回・15分）は `hooks/register.tsx` 冒頭の `STREAK_LIMIT`・`IDLE_LIMIT_MS` で変えられます。

**動く条件。** function hooks は early access の API で、2.1.294 で確認しました。版によって変わることがあり、
動くのはローカルの端末とデスクトップです。壊れても作業は止まりませんが、ペインが空になるだけで気付きにくい点に注意してください。
html-plan のページの書き方（`doc-claim`・`doc-ask`・Respond の形式）が変わった場合も、計画の表示だけが欠けます。

## 検証

```
claude plugin validate plugins/progress-pane
claude plugin test plugins/progress-pane
```

テストは7件です。計画ページの読み取りが3件で、題名・主張・決定・番号（html-plan 同梱の例 `scheduled-send.html` と同じ番号付け）、
回答の反映（題名が違う回答は無視）、主張番号の読み取りを確かめます。ペインの流れは1件で、計画 → 回答 → タスクの順に進めて
terminal と desktop の両方で描画を確かめます。残りの3件は進捗のステータスライン、連続失敗のトースト、15分完了なしです。

## 経緯

積読インデックス（2026-10-08 時点）の進捗ダッシュボード案（[X・voxyz_ai](https://x.com/voxyz_ai/status/2103946635831050740)）と
html-plan を `/adoption-review` で評価し、ユーザーの判断でペインとして取り込んだ。判断の経緯は
[`docs/decisions/2026-10-08-tsundoku-progress-pane-mod.md`](../../docs/decisions/2026-10-08-tsundoku-progress-pane-mod.md)。
