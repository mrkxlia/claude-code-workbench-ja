# stuck-watch — 長時間タスクの詰まりをトークン0で知らせる mod

Claude Code の **function hooks（mod）** で書いたプラグインです。長時間タスクの途中で
「同じところで失敗を繰り返している」「タスクが一向に完了しない」状態を、**LLM を使わず**
タスクリストとツール結果だけから検知し、ステータスラインとトーストで知らせます。

| 項目 | 内容 |
|---|---|
| 表示 | ステータスライン: `進捗 2/5 · ▶ テストを書いています · ⚠ 連続失敗 3 · ⚠ 16分 完了なし`（該当するものだけ） |
| 通知 | 詰まりを検知したとき**初回だけ**トースト（同じ詰まりで繰り返し鳴らさない） |
| コマンド | `/stuck` — 進捗・直近の失敗5件・詰まりの兆候を表示 |
| 判定 | ①ツールが**3回続けて**エラーを返した ②未完了タスクがあるのに**15分**どのタスクも完了していない |
| 費用 | トークン0（モデルを呼ばない。会話にも何も足さない） |
| 依存 | function hooks に対応した Claude Code（2.1.294 で動作確認。**early access の API で、版によって変わりうる**） |

## やらないこと（意図的に）

- **判断待ちを既定の動作で進めない。** 着想元のプロンプト（下記）は「判断が要るときは質問リストに積んで
  既定の動作で進める」としていたが、model-setup のルール2（複数解釈を勝手に選ばない）と矛盾する。
  この mod は知らせるだけで、続行・方針変更・中断は人間が決める
- **作業を止めない。** 失敗を検知してもツール呼び出しを拒否しない。フックが自分で壊れたときも
  `.catch` で素通りさせる（fail-open）
- **本体がすでに出しているものを出し直さない。** タスクリスト本体や AskUserQuestion のダイアログは
  本体の UI に出ているので、ペインやダッシュボードは作らない。足すのは本体に無い「詰まり」の信号だけ

## どれを使うか

| やりたいこと | 使うもの |
|---|---|
| 今どのタスクをやっているかを見る | 本体のタスクリスト表示（何もしない） |
| **どのセッションでも、詰まっていたら気付きたい** | **stuck-watch（本プラグイン）** |
| task-pipeline のフェーズと承認待ちを見る | [`tools/progress/`](../../tools/progress/)（status.md を読む statusline ＋ HTML） |
| 詰まったときに自分で原因を切り分けさせたい | 指示で解決する種類の話。詰まりを知らせた後に人間が指示する |

## ファイル構成

```
stuck-watch/
├── README.md                     # このファイル
├── .claude-plugin/plugin.json    # マニフェスト（types で $.state の型契約を宣言）
├── hooks/
│   ├── hooks.json                # { "modules": ["./register.ts"] }
│   └── register.ts               # 本体。tool.call・prompt.submit・command.run のフック
├── types/index.d.ts              # $.state（stuck-watch.watch）の型契約
└── tests/stuck-watch.test.ts     # claude plugin test で走る3ケース
```

## 導入方法

```
/plugin marketplace add mrkxlia/claude-code-workbench-ja
/plugin install stuck-watch@workbench-ja
```

開発中のフォルダをそのまま試すなら `claude --plugin-dir <このフォルダ>` で起動します。

閾値（3回・15分）は `hooks/register.ts` 冒頭の `STREAK_LIMIT`・`IDLE_LIMIT_MS` で変えられます。

## 検証

```
claude plugin validate plugins/stuck-watch
claude plugin test plugins/stuck-watch
```

テストは「タスクの進捗をステータスラインに出す」「3回連続失敗で1度だけトースト・成功で解除・`/stuck` に失敗が出る」
「未完了タスクのまま15分で知らせる」の3件です。

## 経緯

積読インデックス（2026-10-08 時点）の進捗ダッシュボード案（[X・voxyz_ai](https://x.com/voxyz_ai/status/2103946635831050740)）を
`/adoption-review` で評価し直し、本体に無い信号（詰まり）だけを mod にした。判断の経緯は
[`docs/decisions/2026-10-08-tsundoku-stuck-watch-mod.md`](../../docs/decisions/2026-10-08-tsundoku-stuck-watch-mod.md)。
