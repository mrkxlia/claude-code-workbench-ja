# settings-recipes — 書き込む JSON の実物

`codebase-onboard` の Step 5・Step 7 で使う。**必要なキーだけを既存の
`.claude/settings.json` に足す**（ファイルごと置き換えない）。

一次情報: [Monorepos and large repos](https://code.claude.com/docs/en/large-codebases) ／
[Configure permissions](https://code.claude.com/docs/en/permissions) ／
[Settings](https://code.claude.com/docs/en/settings)

---

## どのファイルに書くか

| 効かせたい範囲 | ファイル | git |
|---|---|---|
| リポジトリで作業する全員 | `.claude/settings.json` | コミットする |
| 自分だけ | `.claude/settings.local.json` | gitignore する（手で作った場合は自分で追記） |
| 組織全体（ユーザー設定で上書き不可） | managed settings | 管理者が配布 |

**`.claude/settings.json` は CLAUDE.md と違い親ディレクトリから継承されない。**
サブディレクトリから Claude を起動する運用なら、そのサブディレクトリの設定ファイルを
自己完結させる。worktree の中では**リポジトリルートの** `.claude/settings.json` が読まれる
（worktree のワーキングディレクトリが worktree ルートになるため）。deny ルールを worktree
セッションにも効かせたいなら、ルート側にも同じ内容を置く。

---

## 1. チェックインされた生成物・vendor を読ませない

`.gitignore` に載っているものには**書かない**（検索は既定で `.gitignore` を尊重する）。
対象は「リポジトリにコミットされている生成コード・ベンダーコード・ビルド成果物」だけ。

```json
{
  "permissions": {
    "deny": [
      "Read(./**/dist/**)",
      "Read(./**/build/**)",
      "Read(./**/*.generated.*)",
      "Read(./vendor/**)",
      "Read(./third_party/**)"
    ]
  }
}
```

パターンの要点:

| 書き方 | 基準 | 使いどころ |
|---|---|---|
| `Read(./vendor/**)` | セッションの**起動ディレクトリ** | ルートから起動する運用 |
| `Read(//abs/path/repo/vendor/**)` | ファイルシステムのルート | サブディレクトリからも起動する運用・ユーザー設定に書く場合 |
| `Read(vendor/**)`（deny の場合） | 起動ディレクトリ以下の**任意の深さ**の `vendor` | 各パッケージに同名ディレクトリがある |

注意:

- `Read` の deny は **Edit / Write も同じパスで塞ぐ**（新規作成も含む）。NotebookEdit は
  別なので、どのツールでも変更させたくないパスには `Edit(...)` の deny も足す
- deny は Claude の組み込みファイルツールと、Bash 中の `cat`・`head`・`grep`・`find` 等の
  引数・リダイレクト先に効く。Grep / Glob の結果からも可能な限り除外される。
  一方、`grep -r` がディレクトリ全体を走査した出力や、スクリプトが自前で開くファイルには効かない
- 効かせすぎに注意。塞いだ直後に「読みたいコードが読めるか」を1つ確かめる

## 2. 他チームの CLAUDE.md を読み込まない

ルートから起動していると、サブディレクトリの CLAUDE.md はそのディレクトリのファイルを
読んだ時点で載る。触らないパッケージがあるなら除外する。

```json
{
  "claudeMdExcludes": [
    "**/packages/web/**",
    "**/packages/legacy-*/**"
  ]
}
```

- パターンは**絶対パスに対する glob**。相対形で書くなら `**/` から始める
- `"**/packages/*/CLAUDE.md"` は各パッケージのファイルだけを除外し、ルートは残す
- 静的な除外リストなので、**日替わりの切り替えには使わない**。作業対象が日によって変わるなら、
  そのパッケージのディレクトリから Claude を起動する
- 個人の都合なら `.claude/settings.local.json`、チーム共通なら `.claude/settings.json`。
  配列は各スコープでマージされる
- managed policy の CLAUDE.md は除外できない

## 3. worktree のスパースチェックアウト

`--worktree` を日常的に使い、かつ全体チェックアウトが重いときだけ。

```json
{
  "worktree": {
    "sparsePaths": [
      ".claude",
      "packages/api",
      "packages/shared"
    ],
    "symlinkDirectories": [
      "node_modules"
    ]
  }
}
```

- パスは**リポジトリルート基準**（起動ディレクトリ基準ではない）
- ディレクトリを列挙する。ルート直下のファイル（`package.json`・lock ファイル等）は常に入る。
  ルート直下の**ディレクトリ**は入らないので、`.claude` を明示的に含める
- サブエージェントを worktree で分離する場合、全 worktree が同じ `sparsePaths` を共有する。
  サブエージェントごとに違うパッケージが要るなら両方を列挙する
- `symlinkDirectories` は `node_modules` 等の重いディレクトリを worktree ごとに複製しないため

## 4. 兄弟パッケージへのアクセス

サブディレクトリから起動していて、共有型の変更などで兄弟パッケージも触る場合だけ。

```json
{
  "permissions": {
    "additionalDirectories": ["../shared", "../web"]
  }
}
```

- 相対パスは**起動ディレクトリ**基準
- この設定で入れたディレクトリの CLAUDE.md・rules・スキルは**読み込まれない**（ファイル
  アクセスのみ）。スキルも読ませたいなら起動時に `--add-dir` を使う
- 一時的な用途なら設定に書かず `claude --add-dir ../shared`

## 5. プラグインをリポジトリ全員に効かせる

各自に `/plugin install` させる代わりに、プロジェクト設定で宣言する。

```json
{
  "enabledPlugins": {
    "typescript-lsp@claude-plugins-official": true
  }
}
```

外部ソースのプラグインは、各自が信頼したうえでインストールするまで読み込まれない場合がある
（その旨が Claude Code から案内される）。

---

## 適用後の確認

```bash
python3 -m json.tool .claude/settings.json > /dev/null && echo "JSON OK"
```

そのうえで**新しいセッション**で `/context` を実行し、Memory files に意図したファイルだけが
載っていることを確かめる。設定は起動時に読まれるため、既存セッションには反映されない。
