# ルールファイルの完全仕様

置き場所（両方読まれる。同名は**プロジェクトが個人設定を上書き**する）:

- `~/.claude/feedback/[topic].md` — 個人ルール（全プロジェクトで効く）
- `[プロジェクト]/.claude/feedback/[topic].md` — プロジェクトルール（チームで共有できる）
- 環境変数 `CLAUDE_FEEDBACK_DIR` で差し替え可（テスト用。`os.pathsep` 区切りで複数指定可）

`README.md` と `.` で始まるファイルはルールとして読まれません（`.violations.jsonl`・
`.candidates.jsonl`・`.stop-attempts.*` は同じディレクトリに置かれる状態ファイル）。

## frontmatter

| キー | 必須 | 意味 |
|---|---|---|
| `name` | 推奨 | ルール名。省略時はファイル名（拡張子なし）。ログ・注入文に出る |
| `description` | 必須 | 一行で「何をすべきか」。注入文とフックの警告文に使われる |
| `type` | 任意 | 慣習として `feedback` |
| `count` | 必須 | **人間が同じ指摘をした回数**。強制力そのもの。既定 1 |
| `enabled` | 任意 | `false` で完全に無効化（緊急停止用）。既定 `true` |
| `expires` | 任意 | `YYYY-MM-DD`。この日を過ぎたら自動的に効かなくなる |
| `paths` | 任意 | `sync-rules` が `.claude/rules/` へ書き出すときの適用範囲（glob。文字列かリスト） |
| `enforce` | 任意 | 機械的な検知条件のリスト。空なら「注入のみ」のルール |

本文（frontmatter の後ろ）は Claude が読む説明。**Why / How to apply / 言い訳** の3節と、
`[[別のルール名]]` 形式の相互リンクを書く慣習です。

> **注意**: PyYAML が無い環境では自前の mini パーサが使われます。折りたたみ記法
> （`>-`・`|`）や複数行スカラーは解釈できません。**frontmatter の値は1行で書くこと。**
> `doctor` サブコマンドが実際の解析結果を表示するので、書いたら必ず確認してください。

## severity（強制力）

`enforce` の各エントリに `severity` を明示しなければ、`count` から自動決定されます。

| count | `pre_bash` / `pre_edit` | `stop_check` |
|---|---|---|
| 5 以上 | `deny`（ツール実行を拒否） | `deny`（ターンを終わらせない） |
| 3〜4 | `ask`（人間に確認を求める） | `block`（ターンを終わらせない） |
| 1〜2 | `warn`（警告のみ・続行） | `warn`（警告のみ・続行） |

`severity:` を明示すると自動昇格を止められます（誤検知が多いルールを count 6 のまま
`warn` に固定する、など）。

## enforce の書き方

### `event: pre_bash` — Bash 実行前

| キー | 意味 |
|---|---|
| `when` | **必須**。コマンド文字列にマッチしたら違反とみなす正規表現 |
| `unless` | マッチしたら見逃す正規表現（例外） |
| `message` | 表示する文言。省略時は `description` |

```yaml
enforce:
  - event: pre_bash
    when: '(^|&&|\|\||;)\s*(go +(test|vet)\b|pytest\b|rspec\b|git +stash\b)'
    unless: 'CI=1'
    message: 'テスト/lintはhookに任せ、Bashで手動実行しない。'
```

`git stash` のような「もっともらしい検証手順」も、実際に繰り返し指摘されたなら塞ぐ対象です。
なお**モデルは塞がれたコマンドを別の書き方で迂回することがある**ので、`when` は
コマンド単体ではなくツール族（`go test` だけでなく `gotestsum` も）を意識して書きます。

### `event: pre_edit` — ファイル編集前

| キー | 意味 |
|---|---|
| `path` | 対象ファイルの glob（`**/*.go`・`src/**/*.{ts,tsx}`）。パス末尾に対して一致 |
| `absent_sibling` | 隣にあるべきファイル名のテンプレート。無ければ違反。`{stem}`・`{name}`・`{ext}` を展開 |
| `when` | 書き込む内容（`content` / `new_string` / `new_source`）に対する正規表現 |
| `unless` | パスまたは内容にマッチしたら見逃す |
| `message` | 表示する文言 |

```yaml
enforce:
  - event: pre_edit
    path: '**/*.go'
    absent_sibling: '{stem}_test.go'
    message: 'TDD: 実装ファイルを書く前にテストファイル(Red)を先に書くこと。'
    severity: ask
```

`absent_sibling` は**テストファイル自身には適用されません**（`foo_test.go` を書くときに
`foo_test_test.go` が無いと言われて詰むのを防ぐため、`_test.go`・`.test.ts`・`_spec.rb`・
`test_*.py`・`tests/` 配下は自動的に対象外）。

### `event: stop_check` — ターンを終える前

| キー | 意味 |
|---|---|
| `changed` | 検査対象の変更ファイルを絞る glob。省略時は全変更ファイル |
| `check` | シェルコマンド。**非0終了なら違反**。`$FILE` に変更ファイルの絶対パスが入る |
| `when` | `check` の代わりにファイル内容へ正規表現をかける（シェルが使えない環境向け） |
| `unless` | 内容にマッチしたら見逃す |

```yaml
enforce:
  - event: stop_check
    changed: '.github/workflows/**'
    check: '! grep -qE "uses:[[:space:]]*[^[:space:]]+@(v[0-9]|main|master|latest)" "$FILE"'
    message: 'uses: にタグ/ブランチ参照が残っています。コミット SHA でピン留めすること。'
```

変更ファイルの一覧は `changed_files.[session].txt`（他のフックが書いていれば）を優先し、
無ければ `git diff --name-only HEAD` と `git ls-files --others --exclude-standard` から取ります。
1ルールあたり50ファイル・1コマンドあたり20秒の上限があります。

**無限ループ防止**: 同一セッションで連続3回ブロックしたら打ち切り、人間の確認に委ねます。

## 状態ファイル

| ファイル | 内容 |
|---|---|
| `.violations.jsonl` | フックが検知した違反の追記ログ。**count は書き換えない** |
| `.candidates.jsonl` | ユーザーの訂正らしき発言の捕捉ログ（未確定の指摘候補） |
| `.stop-attempts.[session]` | Stop フックの連続ブロック回数 |
