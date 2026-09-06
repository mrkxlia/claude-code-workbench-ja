# feedback-rules — 指摘を永続化し、指摘回数で強制力を上げる

Claude Code を使っていて消耗するのは、実装の質そのものより **「先週も言ったことを今日も言っている」**
ことです。CLAUDE.md に書いてもセッションが長くなると効き目が薄れ、そもそも「何回言ったか」が
どこにも残らないので、人間の側も「これ前に言ったっけ？」と分からなくなります。

このプラグインは、**指摘そのものをファイルとして永続化し、指摘回数（`count`）に応じて
フックの強制力を段階的に上げます。**

```
指摘1〜2回目  warn   記録するが縛らない（暫定ルール）
指摘3〜4回目  ask    実行前に人間の確認を求める／ターンを終わらせない（確定ルール）
指摘5回目〜   deny   問答無用で止める
```

`count` を上げられるのは**人間だけ**です。フックが検知した違反は `.violations.jsonl` に記録
されますが、count は自動で増えません（「Claude がルールを破ろうとした」ことと「人間がもう一度
指摘した」ことは別だからです）。ルールの重みを決める権限は人間側に残します。

## 何ができるか

| フック | イベント | 役割 |
|---|---|---|
| `inject` | UserPromptSubmit | 確定ルール（count 3 以上）を count 降順で文脈に注入する（**読ませる**）。同時にユーザーの訂正発言を候補として捕捉する |
| `guard` | PreToolUse | Bash・ファイル編集を実行前に止める（**やらせない**） |
| `stop-check` | Stop | 変更ファイルを検査し、直すまでターンを終わらせない（**直させる**） |

注入には**3000字の予算**があり、超えたら count の低いルールから本文を落として description
だけにします（重いルールほど詳しく残る、優先度つきの切り捨て）。

## ルールの書き方

1指摘 = 1ファイル。`~/.claude/feedback/[topic].md` に置きます。

```markdown
---
name: tdd
description: 実装前にテストを書くTDDアプローチを必ず取ること
type: feedback
count: 6
enforce:
  - event: pre_edit
    path: '**/*.go'
    absent_sibling: '{stem}_test.go'
    message: 'TDD: 実装ファイルを書く前にテストファイル(Red)を先に書くこと。'
---

実装を始める前に必ずテストを先に書くこと。

**Why:** ユーザーはTDDを要求しており、テストなしの実装は受け入れられない。

**How to apply:** 新規機能はもちろん、リファクタリング時もテストファイルを先に書く。

**言い訳:** 「大量のファイルを一括変更したから壊れていないか自分の目で確認したい」というのは
正当な理由に思えるが、それこそがこのルールが繰り返し指摘されている理由そのもの。

関連: [[dont_run_tests_manually]]
```

**「言い訳」の節が地味に効きます。** ルールを破りたくなる場面では、たいてい「今回は特別だから」
という理屈が先に立ちます。その理屈をあらかじめ潰した文章が同じファイルにあると、逃げ道が塞がれます。

完全な仕様（`enforce` の全キー・severity の決まり方・状態ファイル）は
[`skills/feedback-rule/references/rule-format.md`](skills/feedback-rule/references/rule-format.md) を参照。

## スキルとエージェント

| 名前 | 種別 | 役割 |
|---|---|---|
| `feedback-rule` | スキル | 指摘をルール化する。既存ルールなら count を +1 し、機械検知できる形（`enforce`）に翻訳する |
| `feedback-audit` | スキル | 違反ログを集計し、形骸化ルール・誤検知・昇格候補を棚卸しする（人間の承認つき） |
| `feedback-setup` | スキル（明示専用） | 導入。置き場所の決定・配線・最初のルール作成・限界の説明 |
| `feedback-auditor` | エージェント | 棚卸しの仕分け役（読み取り専用・提案のみ） |

## 導入

```
/plugin marketplace add mrkxlia/claude-code-workbench-ja
/plugin install feedback-rules@workbench-ja
```

プラグイン導入なら3つのフックは自動配線されます。**ルール置き場が無いか、ルールが1件も無い
間は、フックは何もしません**（黙って素通りします）。次に `/feedback-setup` で置き場所を決め、
`/feedback-rule` で最初のルールを作ります。

コピーして使う場合は `hooks/feedback-hook.sh` と `hooks/feedback_rules.py` を
`.claude/hooks/` へ置き、[`setup/settings.json`](setup/settings.json) の内容を
`.claude/settings.json` にマージしてください。

## 手で使うコマンド

```bash
E="${CLAUDE_PLUGIN_ROOT}/hooks/feedback_rules.py"
python3 "$E" doctor              # ルール一覧・有効 severity・正規表現の妥当性
python3 "$E" stats               # 発火状況の集計・棚卸しの提案
python3 "$E" sync-rules          # count 3 以上かつ paths つきのルールを .claude/rules/ へ書き出す
```

`sync-rules` は本体ネイティブの `.claude/rules/*.md`（frontmatter の `paths` で
**対象ファイルに触るときだけ**読まれる）に寄せる機能です。毎ターンの注入予算を使わずに済みます。

## 依存と環境

- **python3**（標準ライブラリのみ）。PyYAML があれば使い、無ければ `yq`、それも無ければ
  自前の mini パーサにフォールバックします（frontmatter の値は1行で書いてください）。
- **python3 が無い環境では、フックは黙って素通りします**（exit 0）。
- 環境変数 `CLAUDE_FEEDBACK_DIR`（ルール置き場の差し替え・テスト用）、
  `CLAUDE_FEEDBACK_BUDGET`（注入の文字数予算。既定 3000）。

## 誤検知の逃がし方

正規表現ベースなので必ず誤爆します。逃がし方を4つ用意しています。

1. `unless:` に例外パターンを書く
2. `severity:` を明示して count による自動昇格を止める
3. `enabled: false` で緊急停止する
4. `expires: YYYY-MM-DD` で期限を切る

テストファイル自身が `absent_sibling` に引っかかる問題は、コード側で除外済みです
（`_test.go`・`.test.ts`・`_spec.rb`・`test_*.py`・`tests/` 配下）。

## 限界（過信しないこと）

- **フックが発火しない／判定が無視される経路があります。** サブエージェント内の操作、MCP
  ツール呼び出し、`-p` のパイプ実行などが該当します。
- **モデルは塞がれたコマンドを別の書き方で迂回することがあります。** `when` はコマンド単体
  ではなくツール族（`go test` だけでなく `gotestsum` も）を意識して書いてください。
- **セキュリティ境界としては使えません。** 危険操作の遮断は `permissions.deny`・OS 権限・CI
  で行い、このプラグインは「同じ指摘を繰り返させない」ための開発体験の矯正に使います。
- **正規表現で書けない指摘があります。** 「実装を先に書いてから呼び出し元を書く」のような
  *順序* のルールは、ファイル単体では判定できません。その場合は `enforce` を空のままにして
  注入に頼るか、`type: "agent"` のフック（モデルに判定させる・追加コストあり）を opt-in で
  足します（`/feedback-setup` の Step 6 に設定例）。
- **hook 自身は絶対に事故らせない設計です。** 例外はすべて握り潰して exit 0 で返します。
  検知できないことより、hook のバグで作業が止まるほうが害が大きいからです。

## 他の仕組みとの違い

| 仕組み | 位置づけ |
|---|---|
| 本体の `.claude/rules/` ・CLAUDE.md | **お願い**（読ませるだけ）。このプラグインは確定ルールをそこへ書き出して併用できる |
| 公式 `hookify` プラグイン | 自然文からフックルールを生成する。`warn` / `block` の2値で、**指摘回数による段階的な強制と `ask` が無い** |
| 訂正の自動記録系（claude-reflect 等） | 訂正を捕捉して CLAUDE.md へ反映する。**強制力は持たない**。本プラグインは捕捉（候補キュー）と強制の両方を持つ |
| `self-correct` プラグイン | 1つのタスクを合格まで回す**ループの停止ゲート**。こちらは**セッションを跨いだ恒久ルール** |
| `pipeline` プラグイン | 役割ごとの担当範囲を守らせるガード。こちらは**役割に依らない個人・チームの作法** |

設計判断の記録は [`../../docs/decisions/2026-09-05-feedback-rules.md`](../../docs/decisions/2026-09-05-feedback-rules.md)。
