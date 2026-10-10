# watch-kit — 長時間タスクを見守る mod 3つを1回で入れる

中身は**依存関係だけ**のバンドルです。これを入れると、同じマーケットプレイスの3つが一緒に入り、有効になります。

```
/plugin marketplace add mrkxlia/claude-code-workbench-ja
/plugin install watch-kit@workbench-ja
```

| 一緒に入るもの | 何をするか | 呼び方 |
|---|---|---|
| [`task-band`](../task-band/) | プロンプトの上に `▰▰▰▱▱ 3/5 ▶ 実行中のタスク 4:02` の帯。ターン中15分どのタスクも完了しないと黄色にして知らせる | 自動（`/task-band on\|off\|list`） |
| [`agent-flow`](../agent-flow/)（同梱） | サブエージェントの木をペインに出す。状態・いまの作業・承認待ち・`[+]` で詳細 | `/flow` |
| [`unstuck`](../unstuck/)（同梱） | 同じエラーの繰り返し・見せかけの修正・エラーの握りつぶしなどの堂々巡りを検知して知らせ、1キーで抜け出す | 自動（`/unstuck`） |

## 入れる前に確認

- **現行モデルでは `CLAUDE_CODE_ENABLE_TODO_TOOLS=1` が要ります**（task-band の帯のため）。詳しくは [task-band の前提](../task-band/README.md#前提入れる前に確認)
- **unstuck は、詰まったときに Claude へ一文を添えます**（「止まって仮説を3つ立てて」）。抜け出す操作（`git restore` で戻す・やり直す・別の見立て）は、
  あなたが `/unstuck` のボタンを押したときだけ動きます。詳しくは [unstuck の README](../unstuck/README.md)
- どれも作業を止めません（unstuck の「握りつぶしの編集を止める」設定は既定で無効）

## 一部だけ使いたいとき

- 3つは個別にも入れられます（`/plugin install task-band@workbench-ja` など）
- watch-kit を入れたあと1つだけ止めたいときは `/plugin` で無効にします。ただし watch-kit が有効な間は、依存しているものは無効にできません
  （`claude plugin disable` が断ります）。その場合は watch-kit を外して、必要なものだけを個別に入れてください
- 外すときは `claude plugin uninstall watch-kit --prune` で、一緒に入ったもののうち他に使われていないものもまとめて外れます

## 確認したこと

空の設定ディレクトリ（`CLAUDE_CONFIG_DIR`）でこのリポジトリをマーケットプレイスとして追加し、`claude plugin install watch-kit@workbench-ja` を
実行して、`+ 3 dependencies: task-band, agent-flow, unstuck` と表示され、4つとも有効になることを確かめた（Claude Code 2.1.294、2026-10-10）。
依存関係の仕組みは公式の [Plugin dependencies](https://code.claude.com/docs/en/plugins/dependencies)「Bundle plugins for a team」に従っている。
