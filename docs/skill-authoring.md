# skill-authoring — このリポジトリでスキルをどう書くか

公式ガイド **The Complete Guide to Building Skills for Claude** に沿ってスキルを書くための指針。
「**どのスキルを入れるか**」（消費者向け）は [`skills-guide/README.md`](skills-guide/README.md) を参照。
こちらは「**スキルをどう書くか**」（作者向け）。

## 出典

| 項目 | 値 |
|---|---|
| 資料 | The Complete Guide to Building Skills for Claude |
| URL | https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf |
| 取得日 | 2026-09-05 |
| 分量 | 33ページ・6章＋Reference A/B/C |

再取得と本文抽出:

```bash
curl -sSL -o guide.pdf "https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf"
python3 -c "
from pypdf import PdfReader
print('\n'.join((p.extract_text() or '') for p in PdfReader('guide.pdf').pages))" > guide.txt
```

このガイドは claude.ai のスキル配布を主な想定にしている。Claude Code 固有のフィールド
（`argument-hint`・`disable-model-invocation`・`hooks`）は登場しないが、**ガイドに無いこと自体は
違反ではない**。ガイドが明文で禁止している事項だけを制約として扱う。

## 3段階の開示（progressive disclosure）

| 段 | 中身 | いつ読まれるか | コスト |
|---|---|---|---|
| 1 | frontmatter（`name`・`description`） | **常時**。システムプロンプトに載る | 全スキル分が常に効く |
| 2 | SKILL.md 本文 | スキルが発動したとき | 発動時のみ |
| 3 | `references/`・`scripts/`・`assets/` | 本文から指示されたとき | 必要時のみ |

第1段が常駐するため、`description` の質がそのまま発動の質になる。逆に、長い手順を frontmatter に
書くのは最も高くつく。

## 圧縮後の再注入（第2段は「全部は」戻らない）

長いセッションでコンテキストが自動圧縮されると、**起動済みスキルの本文（第2段）は再注入されるが
上限がある** — 1スキルあたり 5,000 トークン、全スキル合計 25,000 トークンで、上限を超えると
**古く起動したものから脱落**する。切り詰めは**ファイルの先頭を残す**
（出典: [What survives compaction](https://code.claude.com/docs/en/context-window#what-survives-compaction)、
2026-09-06 取得）。

このリポジトリの執筆規約:

- **重要な指示・停止条件・禁止事項は SKILL.md の先頭寄りに置く。** 末尾に置いた規律は、
  長時間セッションの後半で切り落とされうる。`long-run` の「中核ルール」、`self-correct` の
  停止ルール、`adoption-review` の「中核ルール（これを守れないなら出力しない）」が
  いずれも本文の早い位置にあるのはこのため
- **「やらないこと」節を末尾に置く場合、そこにしか無い制約を作らない。** 末尾の禁止事項は
  リマインダとして書き、本体の手順側にも同じ制約を1行で織り込む
- 長い手順・表・テンプレートは `references/` に切る（下記「別冊に切る基準」）。
  第3段は必要時に読まれるので、圧縮の上限とは無関係に効く

なお CLAUDE.md・スコープ無しの `.claude/rules/`・auto memory・Plan モードの計画ファイルは
圧縮後に disk から再注入されるため、この上限の影響を受けない。**恒久ルールをスキル本文に
置かない**理由がもう1つここにある。

## フォルダ構成

```
your-skill-name/
├── SKILL.md        # 必須。ファイル名は完全一致（SKILL.MD・skill.md は不可）
├── scripts/        # 任意。実行可能なコード
├── references/     # 任意。条件付きで読ませるドキュメント
└── assets/         # 任意。テンプレート等
```

**スキルフォルダに `README.md` を置かない。** ドキュメントは SKILL.md か `references/` に置く
（リポジトリ全体の README は別。人間の読者向けなので必要）。

## frontmatter

### キーの採否（このリポジトリの方針）

| キー | 区分 | このリポジトリ | 理由 |
|---|---|---|---|
| `name` | ガイド必須 | **必須** | kebab-case・フォルダ名と一致・`claude`/`anthropic` を含まない（予約） |
| `description` | ガイド必須 | **必須** | 下記の型に従う |
| `argument-hint` | Claude Code 固有 | 使う | `/コマンド` の引数表示。**必ずクオートする**（後述） |
| `disable-model-invocation` | Claude Code 固有 | 使う | 明示起動専用にする（`pipeline-setup`・`pipeline-improve`） |
| `hooks` | Claude Code 固有 | 使う | スキル起動中だけ有効なフック（`long-run`） |
| `compatibility` | ガイド任意 | 使ってよい | 外部バイナリ等の環境要件（1〜500字） |
| `license` | ガイド任意 | **使わない** | plugin.json とルート LICENSE が既に MIT を宣言済み。3つ目の写しになる |
| `metadata` | ガイド任意 | **使わない** | `metadata.version` は規約5（version は plugin.json のみ）と衝突する |
| `allowed-tools` | ガイド任意 | **使わない** | read-only 系スキルも `Bash`（`git diff` 等）と `Task` を要するため実質絞れない。read-only の担保はエージェント定義側（`tools:` と `--sandbox read-only` / `--trust-tools=read`）にある |

### 山括弧 `<` `>` は禁止

ガイドが **security restriction** として明記している（Field requirements と Reference B の2箇所）。
理由は frontmatter が Claude のシステムプロンプトにそのまま載るため、注入の面になりうること。

**プレースホルダは角括弧 `[]` を使う。**

```yaml
# 悪い例
argument-hint: "<タスク内容>"
description: ... /long-run <タスク内容> での手動起動で発動する。

# 良い例
argument-hint: "[タスク内容]"
description: ... /long-run [タスク内容] での手動起動で発動する。
```

入れ子になる場合は外側の角括弧を外す:
`"[uncommitted | base <branch> | <paths>]"` → `"uncommitted | base [branch] | [paths]"`

**本文（frontmatter 終端 `---` より下）は対象外。** 禁止の理由がシステムプロンプトへの混入である以上、
本文中の `<slug>` や出力テンプレートの `<ブリーフから再掲>` はそのままでよい。

### `argument-hint` はクオート必須

角括弧に変えるとき、クオートを忘れると YAML の解釈が変わる。実測:

| 書き方 | 解釈 |
|---|---|
| `argument-hint: [タスク内容]` | **list**（型が静かに変わる） |
| `argument-hint: [deep] [codex]` | **ParserError**（ファイルごと壊れる） |
| `argument-hint: "[タスク内容]"` | str（正しい） |

### description の型

```
[何をするか] + [いつ使うか（トリガー句）] + [主要な能力] + [否定トリガー]
```

- 上限はガイドが 1024 字。このリポジトリの CI は**日本語のため 1536 字**で判定する
- トリガー句は**ユーザーが実際に言う言葉**を「」で並べる（技術用語だけでは発動しない）
- 「〜は X に任せる」の否定トリガーを添える。これが無いと隣接スキルと衝突する

## 本文の型

```
# スキル名 — 一行の要約
## 使い方 / 使いどころ・住み分け
## 前提            ← 外部バイナリ・認証が要るとき
## Common Issues   ← 外部プロセスを叩くとき（下記）
## フロー / ワークフロー
## やらないこと
## 連携
```

**具体的に書く。** 「検証する」ではなく、実行するコマンドと失敗時の見分け方を書く。

## Common Issues（エラー処理）

ガイドの "Include error handling" に対応する。書式は症状／原因／対処の3列表。

**付けるスキル**: 不透明に失敗しうる外部プロセスを持つもの（外部 CLI・`git`/`gh`・ネットワーク・
ファイル配置）。現状は codex 系4・kiro 系2・`pr-merge`・`pipeline-setup` の8つ。

**付けないスキル**: 会話で完結し、失敗モードが「要件が曖昧」「サブエージェントの出力が弱い」型のもの。
`## やらないこと`・`## 中核ルール`・`## 中断からの再開` が既に受けている。
無理に足すと水増しになり、ガイド自身が挙げる「冗長すぎて指示が守られない」失敗に転ぶ。

**書く視点**: 失敗の**検出**はサブエージェント定義側にあることが多い（`codex-reviewer.md` の
「前段チェック」等）。スキル側は重複させず、**オーケストレーターの視点**で書く —
利用者に何が見え、このセッションが次に何をするか。

## 発動の調整

| 症状 | 対処 |
|---|---|
| 発動しない | トリガー句を増やす。ユーザーが実際に言う言葉か見直す。「Claude はこのスキルをいつ使う?」と聞くと description を引用して答えるので、足りないものが分かる |
| 発動しすぎる | ①否定トリガーを足す ②より具体的にする ③スコープを明示する |

**複数スキルが同じトリガー句を自称してはいけない。** どちらでもない依頼は、どちらも受けずに
本体機能（内蔵の Task サブエージェント・`/code-review`）へ譲るのが正しい。

## 別冊（`references/`）に切る基準

**1回の実行で条件付きにしか読まないなら切る。順に全部読むなら切らない。**

| 例 | 判断 |
|---|---|
| `pipeline-setup` の `code-mode.md` / `deliverable-mode.md` | **切る**。1回の実行で片方しか読まない |
| `review-panel` の `personas.md`（Round 0 承認後）・`report-template.md`（deep のみ） | **切る**。条件付き |
| `feature-pipeline` の各 Phase | **切らない**。Phase 0→7 で全節を順に読むので、切ると読み込み回数が増えるだけ |

加えて、`feature-pipeline` と `task-pipeline` はほぼ同文の節を持つため、各自に `references/` を
持たせると重複が2本のツリーに複写される（[`lessons.md`](lessons.md) の教訓2「重複を自動化する前に
重複そのものを消す」）。統合するなら独立した検討が要る。

## テスト

1. **発動テスト** — should / should NOT のクエリ表を作り、1シナリオ＝1セッションで確認する
2. **機能テスト** — 発動した後、書いたとおりに動くか
3. 記録は [`evals/`](evals/README.md) に置く（`claude plugin eval` は early access のため現状 Markdown）

## CI が守っている項目

`.github/workflows/ci.yml` の「SKILL.md 検査」が機械化しているもの:

| 検査 | 内容 |
|---|---|
| frontmatter | 先頭にある・終端がある・YAML としてパースできる |
| `name` | 必須・kebab-case・ディレクトリ名と一致・予約語を含まない |
| `description` | 必須・1536字以内 |
| キー集合 | 上表の9キー以外はエラー（打ち間違いが無言で無効化されるのを防ぐ） |
| 山括弧 | `name`・`description`・`argument-hint`・`compatibility`・`license`・`metadata` の値に `< >` があればエラー |
| `argument-hint` | 文字列であること（クオート漏れの検出） |
| 本文 | 500行以内 |
| レイアウト | スキル直下は `SKILL.md` のみ／`references/*.md` が SKILL.md か他の references から到達できる |

**機械化していない**（人がレビューする）: description が「何を＋いつ」を含むか、トリガー句が
実際の言い回しか、否定トリガーが足りているか、Common Issues の内容が実際の失敗モードと合っているか。

---

## 2026-09-05 監査の結果

全20スキルを上記の基準で照合した。**変更しなかったものも全件挙げる**（model-setup ルール9）。

> 監査後に追加した `design-docs`（pipeline 2.3.0）・`deep-understand`（learning-coach 0.1.0）は、
> この監査基準に沿って新規作成した（山括弧なし・`argument-hint` クオート済み。`design-docs` は
> 条件付き分冊2本、`deep-understand` は全節を順に読むため分冊なし）。
> 監査表そのものは記録として当時のまま残す。

### (b) 違反 — 修正した

| 対象 | 分類 | 重大度 | 所見 | 対応 |
|---|---|---|---|---|
| 13スキル | frontmatter | **高** | `description`・`argument-hint` に `< >`。ガイドが security restriction として2箇所で禁止 | 角括弧に統一 |
| `build-with-tests`・`clarify`・`feature-pipeline`・`task-pipeline` | frontmatter | 中 | `argument-hint` がクオート無し。角括弧化すると list 化・パースエラーになる | クオート追加 |
| `review-panel` | レイアウト | 中 | `personas.md`・`report-template.md` がスキル直下 | `references/` へ移動。参照3箇所を Markdown リンク化 |
| `codex-ask` / `kiro-ask` | 発動 | 中 | 「セカンドオピニオン」「別の AI の意見も」を両方が自称 | 両方から削除。内蔵 Task サブエージェントへ譲る |
| `codex-review` / `kiro-review` | 発動 | 中 | 「セカンドレビュー」「別の AI にレビューさせて」を両方が自称 | 両方から削除。`/code-review` へ譲る |
| codex系4・kiro系2・`pr-merge`・`pipeline-setup` | エラー処理 | 中 | 外部プロセスを叩くのに失敗モードの記載が無い | `## Common Issues` を追加 |

### (a) 準拠済み — 変更なし

| 対象 | 所見 |
|---|---|
| 全20スキルの `name` | kebab-case・ディレクトリ名と一致・予約語なし |
| 全20スキルの `description` 字数 | 全件 1024 字以内（ガイド上限） |
| 全20スキルの `SKILL.md` 命名 | 完全一致 |
| 全20スキルの description 構造 | 「何を＋いつ＋トリガー句」を既に満たす。日本語の「」トリガー句は良い実践 |
| スキル直下の `README.md` | 元から1件も無い |
| `pipeline-setup` の `references/` 分冊 | モード別に片方しか読まない構成で、分冊基準に合致 |
| `feature-pipeline`・`task-pipeline`・`notes` | 分冊しない判断を維持（全節を順に読むため。上記「別冊に切る基準」） |
| 残り12スキルの Common Issues | 会話で完結し外部依存が無いため付けない（水増し回避） |
| `review-panel` の外部依存 | codex/kiro パネリストは opt-in で欠席縮退する設計。`compatibility` は付けない |

### 積み残し

- **`feature-pipeline` と `task-pipeline` の重複節** — ほぼ同文の節を複数持つ。共有別冊への統合は
  分冊基準（全節を順に読む）と衝突するため今回は見送った。独立した検討が要る
- **`compatibility` の付与** — 今回は付けていない。外部 CLI が要る7スキルの「前提」節は本文（第2段）に
  あり、発動前には読まれない。frontmatter に上げるかは、過剰発動とのトレードオフを実測してから決める
