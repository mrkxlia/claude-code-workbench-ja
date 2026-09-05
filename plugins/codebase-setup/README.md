# codebase-setup — 大規模リポジトリを Claude Code から読みやすくする

Claude Code は RAG のようにコードベースを事前インデックス化せず、**人間のエンジニアと同じように
ファイルを辿って読む**。そのため出力の質は、モデルの強さより「関連する文脈にたどり着けるか
（legibility）」に効く。小規模リポジトリ向けの既定のまま巨大なリポジトリで使うと、
コンテキストが**無関係な指示と無関係なファイル読み込み**で埋まる。

このプラグインは、その足場を「実測 → 設計 → 適用 → 定期棚卸し」の型で入れるためのもの。

## 収録物

### スキル3種

| スキル | 起動 | 何をするか |
|---|---|---|
| **codebase-onboard** | `/codebase-onboard`（明示専用） | リポジトリを実測し、CLAUDE.md の階層化・生成物の遮断・LSP プラグイン・ディレクトリ別スキルなど**効くものだけ**を、2つの承認チェックポイントを挟んで導入する |
| **codebase-map** | 自然文 / `/codebase-map` | トップレベルが多い・命名が独特なリポジトリの「1行説明つき目次」を `docs/codebase-map.md` に作る |
| **context-audit** | 自然文 / `/context-audit` | 常時ロードされる指示（CLAUDE.md 階層・rules）を5分類で棚卸しし、陳腐化・矛盾・導出可能・過剰ロードを削除／移設する |

### サブエージェント2種（読み取り専用）

| エージェント | モデル | 役割 |
|---|---|---|
| `subtree-surveyor` | sonnet | 1サブツリーだけを調べ、要約・コマンド・規約候補・生成物パスを決まった書式で返す。多数のパッケージを**並列**に測量してもメインの文脈が汚れない |
| `instruction-auditor` | inherit | 指示ファイル1組を A〜E の5分類に、行番号と確信度つきで仕分けて返す |

いずれも `tools: Read, Grep, Glob` のみ。ファイルを変更しない。

## 導入方法

```
/plugin marketplace add mrkxlia/claude-code-workbench-ja
/plugin install codebase-setup@workbench-ja
```

スキル・エージェントはプラグイン導入で自動配信される（フックは持たない）。

### 単体で使う（個別利用）

```bash
git clone --depth 1 https://github.com/mrkxlia/claude-code-workbench-ja /tmp/workbench
mkdir -p ~/.claude/skills ~/.claude/agents
cp -r /tmp/workbench/plugins/codebase-setup/skills/* ~/.claude/skills/
cp -r /tmp/workbench/plugins/codebase-setup/agents/* ~/.claude/agents/
```

`codebase-onboard` は**導入したいリポジトリの中で**実行する（このリポジトリ自身では実行しない）。

## 典型的な流れ

```
1. /codebase-onboard        …… 実測 → 診断の承認 → 階層化・遮断・LSP の導入 → 検証
2. /codebase-map            …… トップレベルが多いなら地図を作る（onboard から呼ばれることもある）
3. （3〜6か月後・モデル更新後）
   /context-audit           …… 積み上がった指示を棚卸しして削る
```

`codebase-onboard` の Step 8 で、所有者（この設定を誰が見るか）と次回の棚卸し時期を決める。
**設定を誰も持たないと規約は各自の手元に散り、リポジトリの設定は静かに古びる。**

## なぜこの構成か（本体機能との住み分け）

このリポジトリの[教訓1](../../docs/lessons.md)（作る前に本体・公式プラグイン・著名 OSS を確認する）に従い、
Claude Code 本体が既にやることは**呼ぶだけ**にして再実装していない。

| やりたいこと | 担当 |
|---|---|
| ルート CLAUDE.md を1枚生成する | **本体の `/init`**（`codebase-onboard` Step 4 が呼ぶ） |
| 1つの CLAUDE.md を機械的に短くする | **本体の `/doctor`**（`context-audit` Step 2 が材料にする） |
| 定義ジャンプ・参照検索・編集直後の診断 | **公式の LSP プラグイン**（`typescript-lsp` 等。`codebase-onboard` Step 6 が案内） |
| 生成物を読ませない | **本体の `permissions.deny`**（設定を書くのがこのプラグインの仕事） |
| 複数パッケージを実測して**何を入れるか決める** | このプラグイン |
| 常時ロードされる指示を**モデルの進化に合わせて捨てる** | このプラグイン |

フックは持たない。「セッション終了時に CLAUDE.md の更新案を出す」型の自己改善は
公式プラグイン（`claude-md-management` 等）と重複するため、このプラグインでは実装していない。

## 出典

| 項目 | 値 |
|---|---|
| 資料 | How Claude Code works in large codebases: best practices and where to start（Anthropic 公式ブログ） |
| URL | https://claude.com/blog/how-claude-code-works-in-large-codebases-best-practices-and-where-to-start |
| 取得日 | 2026-09-05 |
| 使い方 | 記事の設計原則（harness の7拡張点・3つの設定パターン・9段階のロードマップ・所有と棚卸し）を参考にした独自実装。文章のコピーではない |

設定キー・プラグイン名・言語サーバー名などの事実は、記事ではなく公式ドキュメントを一次情報とした:

| ドキュメント | 使った箇所 |
|---|---|
| [Monorepos and large repos](https://code.claude.com/docs/en/large-codebases) | 階層化・`claudeMdExcludes`・`permissions.deny`・`worktree.sparsePaths`・ディレクトリ別スキル |
| [How Claude remembers your project](https://code.claude.com/docs/en/memory) | CLAUDE.md のロード順・200行の目安・`.claude/rules/` の `paths:` |
| [Configure permissions](https://code.claude.com/docs/en/permissions) | `Read(...)` のパターン構文とアンカー |
| [Discover and install prebuilt plugins](https://code.claude.com/docs/en/discover-plugins) | LSP プラグイン名と必要バイナリの対応表 |

記事は `.claudeignore` というファイルでの除外に言及しているが、現行の Claude Code に
そのファイルは無い。バージョン管理して共有できる同等の手段は `.claude/settings.json` の
`permissions.deny` であり、本プラグインはそちらで実装している
（経緯は [`docs/decisions/2026-09-05-large-codebase-harness.md`](../../docs/decisions/2026-09-05-large-codebase-harness.md)）。
