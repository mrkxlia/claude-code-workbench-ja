# task-band — プロンプトの上に、タスクの進捗を1行で出す mod

Claude Code の **function hooks（mod）** で書いたプラグインです。Claude がタスクリスト（TaskCreate・TaskUpdate・TodoWrite）で
進めている仕事の「いまどこまで進んだか」を、**プロンプトのすぐ上に1行の帯**で出します。
**LLM を使わず**ツールの入出力を数えるだけなのでトークンは0、**何も保存しません**。

```
▰▰▰▱▱ 3/5  ▶ API を書いています  4:02  次: README を直す
```

- 実行中のタスクと経過時間、（幅に余裕があれば）次のタスクを出します。全部終わったら `▰▰▰▰▰ ✔ 5/5 完了`、
  あなたが次のプロンプトを送ったら帯を畳みます
- **メインのターンが動いているのに15分どのタスクも完了しない**ときは、帯を黄色にして `⚠ 16分 完了なし` を足し、
  トーストで1度だけ知らせます。あなたの番で待っている間・質問中・ツールの実行中（長いビルドなど）は数えません
- `/task-band off`・`/task-band on` で表示を切り替え、`/task-band list` で全タスクを出します

## 前提（入れる前に確認）

- **現行モデルでは `CLAUDE_CODE_ENABLE_TODO_TOOLS=1` が要ります。** 本体のタスクツールは Claude 3.x・Opus 4〜4.7・Sonnet 4〜4.6・
  Haiku 4.5 でだけ既定で有効で、Opus 4.8・Sonnet 5・Fable 5 以降では無効です
  （[tools-reference](https://code.claude.com/docs/en/tools-reference)・changelog、2026-10-08 取得）。無効のままだと帯は出ません。
  例: `CLAUDE_CODE_ENABLE_TODO_TOOLS=1 claude`
- **mods（function hooks）に対応した Claude Code が要ります。** 2.1.294 で確認。API は版によって変わることがあると型定義に書かれています

## 何を任せ、何をしないか（併用を前提にしています）

2026-10-10 に公開されている mod を読み比べたところ、エージェントの地図と詰まりの検知には、これより手厚い mod がすでにありました。
それらは自作せず**このマーケットプレイスに同梱**し（agent-flow・unstuck）、task-band は**それらに無かった「タスクの進捗」だけ**を受け持ちます。
3つまとめて入れるなら `/plugin install watch-kit@workbench-ja`（[`watch-kit`](../watch-kit/)。依存関係だけのバンドル）。

| やりたいこと | 使うもの |
|---|---|
| **Claude のタスクがどこまで進んだかを、いつも目に入る場所で見る** | **task-band（本プラグイン）** |
| サブエージェントの親子・状態・いま使っているツール・承認待ちを見る | [`agent-flow`](../agent-flow/)（`/flow`。claude-agent-flow をこのマーケットプレイスに同梱）。何も入れないなら本体のサブエージェントパネル |
| 同じエラーの繰り返し・「直した」直後の同じ失敗・エラーの握りつぶしに気付き、1キーで抜け出す | [`unstuck`](../unstuck/)（`/unstuck`。このマーケットプレイスに同梱） |
| 文脈の使用率を見る | mod の [hamzafer/claude-code-mods](https://github.com/hamzafer/claude-code-mods) の context-bar（MIT） |
| task-pipeline のフェーズと承認待ちを見る | [`tools/progress/`](../../tools/progress/) |

task-band の「15分完了なし」は、unstuck の検知（エラーの中身を見る）とは別の軸です。エラーは出ていないのに何も終わらない、を拾います。

## やらないこと（意図的に）

- **判断待ちを既定の動作で進めない。** 着想元のプロンプト（[X・voxyz_ai](https://x.com/voxyz_ai/status/2103946635831050740)）は
  「判断が要るときは質問リストに積んで既定の動作で進める」としていたが、model-setup のルール2（複数解釈を勝手に選ばない）と矛盾する。
  この mod は見せる・知らせるだけ
- **作業を止めない。** ツール呼び出しを拒否しない。フックが自分で壊れたときも `.catch` で素通りさせる（fail-open）
- **モデルを呼ばない・何も保存しない・どこにも送らない。** 状態はセッションの間だけ本体が持つ（`$.state`）
- **エージェントの地図や詰まりの詳しい検知を作らない。** 上の表のとおり既存の mod に任せる

## ファイル構成

```
task-band/
├── README.md                     # このファイル
├── .claude-plugin/plugin.json    # マニフェスト（types で $.state の型契約を宣言）
├── hooks/
│   ├── hooks.json                # { "modules": ["./register.tsx"] }
│   ├── register.tsx              # フック（tool.call・turn.start/complete・prompt.submit・session.end・command.run）と帯の描画（ui.render の AbovePrompt）
│   └── model.ts                  # 状態の更新と表示用の計算。エンジンに触れない純粋な関数
├── types/index.d.ts              # $.state（task-band.band）の型契約
└── tests/task-band.test.ts       # claude plugin test で走るテスト
```

## 導入方法

```
/plugin install task-band --marketplace mrkxlia/claude-code-workbench-ja
```

または

```
/plugin marketplace add mrkxlia/claude-code-workbench-ja
/plugin install task-band@workbench-ja
```

開発中のフォルダをそのまま試すなら `CLAUDE_CODE_ENABLE_TODO_TOOLS=1 claude --plugin-dir plugins/task-band` で起動します。
15分の閾値は `hooks/model.ts` 冒頭の `IDLE_LIMIT_MS` で変えられます。

## 検証

```
claude plugin validate plugins/task-band
claude plugin test plugins/task-band
```

状態の計算は関数単位で、帯の1行・通知・コマンドはエンジン経由（帯は terminal と desktop の両方）で確かめます。何を確かめているかは
[`tests/task-band.test.ts`](tests/task-band.test.ts) のテスト名を見てください。

**実機（端末・デスクトップの画面）での描画は、まだ確かめていません。** テストはテストキット上の描画と状態遷移です。

## 経緯

積読インデックス（2026-10-08 時点）の進捗ダッシュボード案を `/adoption-review` で評価して取り込み、3タブのダッシュボード
（progress-pane）まで広げた。その後の敵対的検証・先行事例の調査・公開 mod の読み比べで、エージェントの地図と詰まりの検知は既存の mod が
上回ると分かり、空いていた「タスクの進捗」だけを帯にして残した。判断の経緯は
[`docs/decisions/2026-10-08-tsundoku-task-band-mod.md`](../../docs/decisions/2026-10-08-tsundoku-task-band-mod.md)。
