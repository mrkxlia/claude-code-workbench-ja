# lsp-plugins — コードインテリジェンス（言語サーバー）の導入

`codebase-onboard` の Step 6 で使う。

一次情報: [Discover and install prebuilt plugins — Code intelligence](https://code.claude.com/docs/en/discover-plugins#code-intelligence)

## なぜ入れるか

大規模コードベースでは、`handler`・`create`・`Client` のような名前が数百箇所でヒットする。
grep は文字列一致しか見ないので、Claude は候補を1つずつ開いて確かめることになり、
そのぶんコンテキストが埋まる。

言語サーバーを繋ぐと、Claude は次の2つを得る:

- **定義・参照・実装・呼び出し階層への直接ジャンプ** — 読む前にシンボルの同一性で絞れる
- **編集直後の診断** — 型エラー・import 漏れ・構文エラーがその場で返るので、
  コンパイラやリンタを回さずに同じターンで直せる

## 言語とプラグイン

**バイナリは自分で入れる。プラグインは入れてくれない。**

| 言語 | プラグイン | 必要なバイナリ |
|---|---|---|
| C/C++ | `clangd-lsp` | `clangd` |
| C# | `csharp-lsp` | `csharp-ls` |
| Go | `gopls-lsp` | `gopls` |
| Java | `jdtls-lsp` | `jdtls` |
| Kotlin | `kotlin-lsp` | `kotlin-language-server` |
| Lua | `lua-lsp` | `lua-language-server` |
| PHP | `php-lsp` | `intelephense` |
| Python | `pyright-lsp` | `pyright-langserver` |
| Rust | `rust-analyzer-lsp` | `rust-analyzer` |
| Swift | `swift-lsp` | `sourcekit-lsp` |
| TypeScript | `typescript-lsp` | `typescript-language-server` |

表に無い言語は、プラグイン側で LSP サーバーを自作して繋ぐこともできる
（[Plugins reference — LSP servers](https://code.claude.com/docs/en/plugins-reference#lsp-servers)）。

## 導入手順

```
/plugin install typescript-lsp@claude-plugins-official
```

- マーケットプレイスが見つからないと言われたら
  `/plugin marketplace add anthropics/claude-plugins-official` を先に実行する
- **リポジトリの全員に効かせる**なら、各自にインストールさせる代わりに
  `.claude/settings.json` の `enabledPlugins` で宣言する
  （[`settings-recipes.md`](settings-recipes.md) の 5）
- 導入後、`/plugin` の **Errors** タブに `Executable not found in $PATH` が出ていないか確認する

## 選び方（入れすぎない）

1. `codebase-onboard` Step 1 の言語構成で**上位を占める言語だけ**入れる
2. 実際に触らない言語のサーバーは入れない。常駐プロセスとメモリを使う
3. `rust-analyzer`・`pyright` は大規模プロジェクトでメモリを大きく使う。問題が出たら
   `/plugin disable <プラグイン名>` で外し、組み込みの検索に戻す

## 注意点

| 事象 | 内容 |
|---|---|
| クラウドセッション | Claude Code はプラグインの言語サーバーを起動しない。LSP ツールは使えない（ローカル専用と割り切る） |
| モノレポでの誤診断 | ワークスペース設定が正しくないと、内部パッケージの import を未解決と報告することがある。編集能力自体には影響しない |
| インストール直後 | `Run /reload-plugins to activate.` と出たら実行する。プロンプトキャッシュ無効化の警告が出たら `--force` を付けて再実行 |
| プラグインが読み込まれない | `rm -rf ~/.claude/plugins/cache` して再起動し、入れ直す |

## 組み込み検索との住み分け

言語サーバーは**シンボルを辿る**のに向き、grep は**文字列や規約を横断的に探す**のに向く。
LSP を入れても grep を捨てるわけではない。「この関数はどこで使われているか」は LSP、
「このエラーメッセージはどこに書かれているか」は grep。
