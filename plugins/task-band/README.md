# task-band — プロンプトの上に、作業の進み具合を1行で出す mod

Claude Code の **function hooks（mod）** で書いたプラグインです。**LLM を使わず**ツールの入出力とファイルを読むだけなのでトークンは0、
**何も保存しません**。出すものは2つで、どちらも無ければ帯は出ません。

```
◆ auth-diagram Phase3  🛑 ブリーフ承認待ち  │  ▰▰▰▱▱ 3/5  ▶ API を書いています  4:02
```

| 左: パイプライン | 右: タスク |
|---|---|
| [pipeline](../pipeline/) の `/task-pipeline` を使っていれば、`docs/task-pipeline/*/status.md` から現在のフェーズと関門を出す | Claude のタスクリスト（TaskCreate・TaskUpdate・TodoWrite）から、進捗・実行中のタスクと経過時間・（幅に余裕があれば）次のタスクを出す |
| 成果物（`brief.md` など）が保存済みの関門は `🛑 〜待ち`（あなたの承認待ち）、まだなら `→ 〜` で予告。差し戻し回数・ほかの進行中パイプラインの数（`+1`）も出す | 全部終わったら `✔ 5/5 完了`、あなたが次のプロンプトを送ったら畳む |
| status.md や成果物が書かれたとき・ターンの始めと終わりに読み直す（読むだけで書かない） | **メインのターンが動いているのに15分どのタスクも完了しない**と帯を黄色にし、トーストで1度だけ知らせる（人の番・質問中・ツールの実行中は数えない） |

`/task-band off`・`/task-band on` で表示を切り替え、`/task-band list` で全タスクを出します。

## 前提

- **mods（function hooks）に対応した Claude Code**（2.1.296 で確認。API は版によって変わることがあると型定義に書かれています）
- **タスクの表示には、現行モデルでは `CLAUDE_CODE_ENABLE_TODO_TOOLS=1` が要ります。** 本体のタスクツールは Opus 4.8・Sonnet 5・Fable 5 以降で
  既定で無効です（[tools-reference](https://code.claude.com/docs/en/tools-reference)、2026-10-08 取得）。パイプラインの表示はこれが無くても出ます。

## 何をしないか

- **作業を止めない・判断待ちを勝手に進めない。** 見せる・知らせるだけ。フックが壊れても素通りする（fail-open）
- **モデルを呼ばない・何も保存しない・どこにも送らない。** 状態はセッションの間だけ本体が持つ（`$.state`）
- **エージェントの地図や詰まりの詳しい検知は作らない。** それぞれ [agent-flow](../agent-flow/)・[unstuck](../unstuck/) に任せる。
  3つまとめて入れるなら [watch-kit](../watch-kit/)

## 導入

```
/plugin marketplace add mrkxlia/claude-code-workbench-ja
/plugin install task-band@workbench-ja
```

開発中のフォルダを試すなら `CLAUDE_CODE_ENABLE_TODO_TOOLS=1 claude --plugin-dir plugins/task-band`。15分の閾値は `hooks/model.ts` の `IDLE_LIMIT_MS`。

## ファイル構成と検証

```
task-band/
├── .claude-plugin/plugin.json    # マニフェスト（types で $.state の型契約を宣言）
├── hooks/hooks.json              # { "modules": ["./register.tsx"] }
├── hooks/register.tsx            # フックと帯の描画（ui.render の AbovePrompt）、status.md の読み込み
├── hooks/model.ts                # 状態の更新・status.md の解析・表示用の計算（エンジンに触れない純粋な関数）
├── types/index.d.ts              # $.state（band・activity・pipeline）の型契約
└── tests/task-band.test.ts       # claude plugin test のテスト
```

```
claude plugin validate plugins/task-band
claude plugin test plugins/task-band
```

テストはテストキット上の描画（terminal と desktop）と状態遷移です。**実機の画面での描画は、まだ確かめていません。**

経緯: [`docs/decisions/2026-10-08-tsundoku-task-band-mod.md`](../../docs/decisions/2026-10-08-tsundoku-task-band-mod.md)（帯に絞った理由）・
[`docs/decisions/2026-10-11-yagni-docs.md`](../../docs/decisions/2026-10-11-yagni-docs.md)（Python で書いていた進み具合のツールを取り込んだ理由）。
