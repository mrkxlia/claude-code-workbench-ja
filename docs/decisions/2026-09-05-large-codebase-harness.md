# 決定記録: 大規模コードベース向けの足場を codebase-setup プラグインとして実装する（2026-09-05）

- 状態: **採用・実装済み**（`plugins/codebase-setup/` 0.1.0。スキル3種・サブエージェント2種・フック無し）
- きっかけ: 公式ブログ記事「How Claude Code works in large codebases」を本リポジトリに取り込む依頼
- 関連: [`lessons.md`](../lessons.md) 教訓1（作る前に本体・公式プラグイン・著名 OSS を確認する）、
  [`skill-authoring.md`](../skill-authoring.md)（frontmatter 規約・分冊基準）、ルート `CLAUDE.md` 規約1・5・6

## 出典

| 項目 | 値 |
|---|---|
| 資料 | How Claude Code works in large codebases: best practices and where to start（Anthropic 公式ブログ） |
| URL | https://claude.com/blog/how-claude-code-works-in-large-codebases-best-practices-and-where-to-start |
| 取得日 | 2026-09-05 |
| 分量 | harness の7拡張点／3つの設定パターン／9段階の導入ロードマップ／組織的所有 |

事実（設定キー名・プラグイン名・言語サーバー名）の一次情報は記事ではなく公式ドキュメントを使った:

- [Monorepos and large repos](https://code.claude.com/docs/en/large-codebases)
- [How Claude remembers your project](https://code.claude.com/docs/en/memory)
- [Configure permissions](https://code.claude.com/docs/en/permissions)
- [Discover and install prebuilt plugins](https://code.claude.com/docs/en/discover-plugins)

なお、この公式ドキュメント（`large-codebases`）自身が末尾で当該ブログ記事を
「リポジトリ単位の設定の**上**に来る、組織的な展開と所有の型」として参照している。
つまり両者は競合ではなく階層関係にある。本プラグインは**リポジトリ単位の設定**を実装し、
組織的な所有の型は `codebase-onboard` Step 8（所有者の決定・棚卸しの予約）に落とした。

## 記事の内容と、本リポジトリでの採否

記事は harness の拡張点を7つ挙げる。**7つすべてを実装しない**判断をした。

| 記事の拡張点 | 採否 | 理由 |
|---|---|---|
| 1. CLAUDE.md（階層化・ルートは薄く） | **採用** | `codebase-onboard` Step 4。白紙からの生成は本体 `/init` に委ね、**削って階層に分ける**部分を担う |
| 2. フック（自己改善・lint 強制） | **不採用** | 「セッション終了時に CLAUDE.md 更新案を出す」型は公式 `claude-md-management` 等と重複。教訓1（`plugins/self-improve` を同じ理由で削除済み）に該当 |
| 3. スキル（オンデマンドの専門知識） | **採用** | `codebase-onboard` Step 7（ディレクトリ別スキルの配置）。書き方は既存の `docs/skill-authoring.md` を参照させ、二重に書かない |
| 4. プラグイン（組織配布） | **部分採用** | 本リポジトリのマーケットプレイス自体が実装。設定側は `enabledPlugins` の案内に留めた |
| 5. LSP 統合 | **採用（案内のみ）** | 公式 LSP プラグインが11言語ぶん存在する。自作せず、言語選定と導入手順の別冊（`references/lsp-plugins.md`）にした |
| 6. MCP サーバー | **不採用** | 「社内の検索基盤を MCP で露出する」は各組織固有で、汎用テンプレートにならない。README で方向性だけ触れる |
| 7. サブエージェント（探索と編集の分離） | **採用** | `subtree-surveyor`・`instruction-auditor`。いずれも read-only（`tools: Read, Grep, Glob`） |

記事の3つの設定パターンのうち、**パターン2（モデルの進化に合わせた設定の見直し）**は
本リポジトリに相当物が無かったため `context-audit` として独立させた。
パターン3（組織的所有・DRI）はスキルにならないので、`codebase-onboard` の最終ステップに
「所有者を1人決める」「次回棚卸しを予約する」という**行動**として埋め込んだ。

## 記事と現行仕様の差分（重要）

記事は生成物の除外を **`.claudeignore` ファイル**と書いている
（ロードマップ第4段では「`.claude/settings.json` にバージョン管理された `.claudeignore` ルール」という
やや矛盾した書き方になっている）。2026-09-05 時点の公式ドキュメントを確認した結果:

- `.claudeignore` というファイルは現行の Claude Code の仕様に**無い**
- バージョン管理して共有できる同等の手段は `.claude/settings.json` の
  `permissions.deny` に `Read(...)` ルールを並べる方法である
- そもそも `.gitignore` に載っているパスは検索が既定で尊重するため、**追加設定は不要**。
  deny が要るのは「リポジトリにコミットされている生成物・vendor」だけ

**記事の字面ではなく現行仕様を実装した。** この判断は `references/settings-recipes.md` と
プラグイン README にも明記してある（記事だけを読んだ利用者が `.claudeignore` を探して
混乱しないため）。

## 教訓1（作る前の3点確認）との照合

| 確認 | 結果 |
|---|---|
| (a) 本体が既にやらないか | `/init`（ルート CLAUDE.md 生成）・`/doctor`（1ファイルの短縮）・`permissions.deny`・`claudeMdExcludes`・`worktree.sparsePaths` は**本体**。**再実装せず、呼ぶ／設定を書く側に回った** |
| (b) 公式プラグインが無いか | LSP は公式が11言語ぶん配信済み → 自作せず案内のみ。CLAUDE.md の自動更新も公式に存在 → フックを作らなかった |
| (c) 著名 OSS が無いか | 仕様の逆引き（cc-rsg）・多モデル配布（rulesync）とは守備範囲が異なる。地図生成は「1行説明を根拠つきで書く」点が既存ツールの機械的な tree 出力と異なる |

**残った差別化**は次の3点に絞られる。これが無ければ作らない判断だった:

1. **実測に基づく取捨選択** — 単一言語・単一ツリーのリポジトリに monorepo 向け設定を配らない。
   「入れなかった設定と理由」まで報告させる
2. **モデルドリフトの棚卸し** — 「正しいか」ではなく「毎回載せる価値があるか」で仕分ける
   5分類（A 陳腐化 / B 矛盾 / C 導出可能 / D 過剰ロード / E 保持）は本体にも公式プラグインにも無い
3. **read-only サブエージェントへの並列委譲** — 地図づくりと指示監査は大量のファイルを開く。
   メインの文脈を汚さずに済ませる型を定義した

## 意図的にやらなかったこと

- **フックを持たせない。** 上記のとおり重複。将来入れるなら「Stop フックで CLAUDE.md 更新案」
  ではなく「SessionStart フックで、起動ディレクトリに対応する所有チームとプラグインを案内する」型
  （公式ドキュメントが挙げている用途）が、既存と重複しない候補
- **`codebase-map` を自動生成の常時実行にしない。** 地図が要らないリポジトリに地図を作ると負債になる。
  スキル側に「作らない判断」を明示的に持たせた
- **組織ガバナンス（ワーキンググループ・段階的展開）をスキル化しない。** 記事の中で最も価値がある
  部分だが、リポジトリ内で自動化できる形にならない。`codebase-onboard` の「所有者を決める」
  1ステップだけを残し、詳細は出典リンクに委ねた
- **`context-audit` に自動削除を持たせない。** 消した規約が原因の事故は、コンテキストが
  数百トークン重いことより高くつく。承認ゲートを必須にし、迷ったら残す側に倒す基準を明記した
