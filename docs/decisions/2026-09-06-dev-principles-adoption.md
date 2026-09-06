# 2026-09-06 — 開発原則記事（SOLID・KISS・YAGNI・DRY）の採用可否レビュー: 取り込みなし

## 対象と想定用途

- **対象**: Qiita 記事「開発原則(SOLID, KISS, YAGNI, DRY)の理解」（@wataru-nakamura6、2024-12-02 投稿）
  <https://qiita.com/wataru-nakamura6/items/387d99751bcf3b9e3cf6>（2026-09-06 取得）
  SOLID の5原則・KISS・YAGNI・DRY を各数行で説明する入門解説。**本文にコード例・外部リンク・
  数値・ベンチマーク・事例が0件**（Qiita API `/api/v2/items/387d99751bcf3b9e3cf6` で全文を確認）。
  反応は 72 LGTM / 48 ストック（**事実として記録するだけで採用理由には使わない**）
- **想定用途（仮置き）**: このリポジトリの `CLAUDE.md` テンプレート・スキル定義に、
  SOLID・KISS・YAGNI・DRY を **Claude Code の行動ルールとして書き込むか**。
  ユーザーは用途を指定していないため、リポジトリの性格から最も自然な用途を仮置きした

[`/adoption-review`](../../plugins/adoption-review/skills/adoption-review/SKILL.md) の手順
（Step 0 → Step 7）で評価した。証拠収集は外部評価スコープに1体を割り当て（記事1本のため
SKILL.md の体数表どおり1体）、要となる2出典はメインが原文を再取得して裏を取った。
暫定結論が否定寄りのため `adoption-challenger` は起動せず、Step 6 の自己点検3問を通した。

## 結論: 現時点では不要（取り込んだ差分は0件）

記事の内容そのものは正しいが、**想定用途に対しては Anthropic 公式が「書くな」と明示している
種類の記述**であり、YAGNI 相当は既に運用可能な形でこのリポジトリに実装済み。
**プラグインへの変更は行わない。**

採用判断は **採用しない**。総合スコア 1/10。

## 否定側の根拠 — 3点とも「確認できた事実」であって情報の不在ではない

`/adoption-review` の中核ルール11 は「確認できなかったことを減点材料にしない」と定めている。
今回の否定は、以下のいずれも**確認できた事実**に立っている。

### 1. 公式ガイダンスが、この種の記述を除外側に分類している

[Best practices for Claude Code](https://code.claude.com/docs/en/best-practices)（2026-09-06 取得・
原文確認）の CLAUDE.md 節は、❌ Exclude 欄に次を挙げている。

- `Self-evident practices like "write clean code"`
- `Standard language conventions Claude already knows`
- `Anything Claude can figure out by reading code`

今回の4原則はこの3つすべてに該当する。同ページはさらに次を明記している。

- `Keep it concise. For each line, ask: "Would removing this cause Claude to make mistakes?"
  If not, cut it. Bloated CLAUDE.md files cause Claude to ignore your actual instructions!`
- `The over-specified CLAUDE.md. If your CLAUDE.md is too long, Claude ignores half of it
  because important rules get lost in the noise. Fix: Ruthlessly prune. If Claude already
  does something correctly without the instruction, delete it or convert it to a hook.`

つまり**効果の無い行はゼロコストではなく、既存ルールの遵守率を下げる側に働く**。
なお公式が SOLID / DRY / KISS / YAGNI という略語に**名指しで**言及した記述は確認できなかった
（該当するのは上記の近接記述まで）。

### 2. 同一実践の一次報告が1件あり、結論は「削除して問題なし」

GMOペパボの あたに 氏は、**まさにこの4原則を並べたファイル**を `CLAUDE.md` から `@import` して
いた状態から削除した経緯を報告している（<https://zenn.dev/pepabo/articles/claude-code-rules-skills-split>、
2026-04-21 公開・2026-09-06 取得・原文確認）。

> SOLID、DRY、KISS、YAGNI を並べたファイルを `@import` していました。ある日読み返して
> 「これ、Claude が既に知ってるやつだ」と気づきました。

> コンテキストに入れる価値がない文書を毎セッション読ませていたことになります。
> 削除して特に困ることはありませんでした。

同記事は起動時ロードを **114,847 → 19,232 トークン（約83%減、tiktoken cl100k_base）**にした
実測を併載している。**想定用途とまったく同じことを実行した一次報告は、確認できた範囲でこの1件
だけで、結論は削除側。**

### 3. YAGNI 相当は既に上位互換が実装済み

[`plugins/model-setup/CLAUDE.md`](../../plugins/model-setup/CLAUDE.md) のルール3「ついで改善の禁止」
（依頼されていない変更を実装しない）とルール8「スコープを字義どおりに守り、拡張はブリーフ更新で」が、
記事の YAGNI「いま必要なコードのみ追加すべき」に対応する。**既存版のほうが判定可能**で、
「依頼にあるか」で機械的に切れる（記事版は「必要」の定義がエージェント側の裁量に残る）。

SOLID・KISS・DRY に相当する行は、このリポジトリ内に**1箇所も存在しない**（全 `.md` を grep して確認）。
これは穴ではなく、根拠1・2 に照らした選択として妥当である。

## 記事の主張 × 検証結果（2026-09-06 取得）

| 記事の主張 | 検証結果 |
|---|---|
| 4原則を守れば「コードの品質、可読性、拡張性が向上し、プロジェクトの長期的な成功へと導く」 | **確認できた効果は0件** — 記事内に測定条件・比較対象・数値・事例・外部リンクが一切ない（本文全文から確認） |
| 原則は無条件に適用できる（文脈依存性への言及なし） | 実務側に逆方向の議論がある。[Sandi Metz, *The Wrong Abstraction*](https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction)（`duplication is far cheaper than the wrong abstraction`、早すぎる抽象化が条件分岐に埋もれた手続き的コードへ退化する8段階）／[Kent C. Dodds, *AHA Programming*](https://kentcdodds.com/blog/aha-programming)（性急な抽象化を避けよ）／[Dan North, *CUPID*](https://dzone.com/articles/why-you-should-start-using-cupid-and-not-solid-to)（SOLID を principles でなく properties に置き換える。原則は普遍ではなく文脈依存） |
| DRY =「同じコードは避けるべき」 | **構文レベルの読み方**であり、LLM 生成コードの文脈ではこれが最も害の出やすい形。「DRY が構文レベルの強迫観念になっており、構造的・構文的な類似が抽象化衝動を引き起こす」「共有された構文ではなく共有された意味を識別すべき」「LLM は過剰にエンジニアリングし、不要な抽象・ヘルパークラス・間接層を導入する傾向がある」（<https://www.faros.ai/blog/ai-generated-code-and-the-dry-principle>） |
| 記事の新規性 | **記事は新規性を主張していない**（入門解説として自己整合的）。この点は減点していない |

補足として、指示の遵守率そのものにも上限がある — AgentIF（実運用50エージェントアプリ由来の
707指示、平均11.9制約）は `all LLMs perform poorly and even the best-performing model only
follows fewer than 30% of the instructions perfectly` を報告している
（[arXiv:2505.16944](https://arxiv.org/abs/2505.16944)、NeurIPS 2025 D&B）。
**効果の確認できない行に遵守率の枠を割く余地はない。**

## 代替手段

| 代替 | 状況 |
|---|---|
| **公式ガイダンス（＝書かない）** | 上記「否定側の根拠1」。❌ Exclude 欄の3項目すべてに該当する |
| **既存実装（このリポジトリ）** | [`model-setup/CLAUDE.md`](../../plugins/model-setup/CLAUDE.md) ルール3・8 が YAGNI 相当の上位互換 |
| **本体機能** | 本体の `/code-review`（差分の正しさ）・`/simplify`（reuse・simplification・efficiency）が担当する領域 |
| **フック** | 公式は `Unlike CLAUDE.md instructions which are advisory, hooks are deterministic` と明記。強制したいなら lint / CI が正しい置き場所であり、`CLAUDE.md` の1行ではない |
| **何もしない** | **有力**。これを選ぶ |

**代替仮説（なぜ良く見えるのか）** — 4原則はいずれも公知で正しく、読んで反対しにくい。
「正しいこと」と「エージェントに書く価値があること」が混同されやすい。

## コスト

| 区分 | 見積もり |
|---|---|
| 導入 | 低（`CLAUDE.md` に数行） |
| 運用 | **見合わない** — 毎セッション消費するトークンと、公式が指摘する「実際の指示が無視される」副作用 |
| 学習 | ほぼゼロ（既知の用語） |
| 撤退 | 低（行削除）。ただし「効果が無い」と気づくまでの時間がコスト（先例: 上記 pepabo 記事） |

**運用コストが利益を超える。**利益側は「確認できた効果0件」＋「公式が明示的に不要と分類」であり、
比較の余地がない。

## Step 6 の自己点検（否定寄りのため challenger は起動していない）

| 点検項目 | 結果 |
|---|---|
| 否定の根拠が「確認できなかった」だけになっていないか | **なっていない**。根拠3点はいずれも確認済み事実（公式ドキュメントの原文・一次報告1件・リポジトリ内の既存実装） |
| 否定の根拠は想定用途に効いているか | **効いている**。論点は「4原則を**エージェント指示として**書くか」であり、根拠3点はすべてその是非に直接あたる。原則そのものへの難癖ではない |
| 比較した代替手段は同じ想定用途を満たすか | **満たす**。ルール3・8 は YAGNI 相当を代替する。SOLID・KISS・DRY には対応行が無いが、これは「埋めるべき穴」ではない — 公式が `Claude already knows` と分類し、DRY については規範化がむしろ害（wrong abstraction）を生むという実務側の議論がある |

3問とも否定側の根拠は崩れなかったため、暫定結論「現時点では不要」を確定した。

## 最終評価

| 観点 | 点数 | 根拠 |
|---|---|---|
| コンセプト | 6/10 | 4原則自体は定着した設計原則。ただし記事は文脈依存性に触れず無条件に断定している（CUPID・AHA が反対側にある） |
| 実装品質 | 判定不能 | 記事でありコード・テスト・CI が存在しない |
| 実務採用価値 | 1/10 | 想定用途に対し公式が ❌ Exclude に分類。YAGNI 相当は既存ルール3・8 が上位互換 |
| 再現性 | 2/10 | 「品質・可読性・拡張性が向上」の測定条件・比較対象・数値が記事に0件 |
| コスト効率 | 2/10 | 効果0に対し毎セッションのトークン消費＋既存指示の遵守率低下（公式の明示的な警告） |
| メンテナンス性 | 判定不能 | 配布物ではなく、保守主体・更新の概念がない |
| 過大評価耐性 | 5/10 | 新規性を主張しておらず誇張は少ない。一方で「長期的成功へ導く」は出典なしの断定、DRY を構文レベルで説明している |
| **総合** | **1/10** | 実務採用価値1とコスト効率2の低いほう |

判定不能は2件（3件未満のため、結論の選択に制限はかからない）。

## 試すなら検証方法（今回は実施しない）

| 項目 | 内容 |
|---|---|
| 検証対象 | 「4原則を `CLAUDE.md` に書く／書かない」で生成コードが変わるか |
| 手順 | 同一リポジトリ・同一タスク10件を、①原則行あり ②原則行なし ③既存ルール3・8 のみ、の3条件 × 各3回で実行 |
| 成功条件 | ①が②に対し、不要な抽象層・ヘルパークラス・間接層の件数で有意に少ない |
| 失敗条件 | 差が無い、または①で過剰抽象化が増える（faros.ai の指摘どおりなら DRY 行がこれを起こす） |
| 比較対象 | ③（既存ルールのみ） |
| メトリクス | 差分行数・新規ファイル数・新規抽象（interface / 基底クラス / ヘルパー）数・起動時トークン数 |

## 教訓との照合

- **[教訓1](../lessons.md)（作る前に本体・公式プラグイン・著名 OSS を確認する）** — 今回はその
  `CLAUDE.md` 版として適用した。公式 Best practices の ❌ Exclude 欄を先に読んだ時点で、
  取り込み候補が消えた。**「本体・公式が既にやらないか」だけでなく「本体・公式が既に不要と
  言っていないか」も確認対象に含まれる**
- **教訓4（分類を中身より先に増やさない）** — 略語が4つ（SOLID を分解すれば8つ）並ぶと8個の穴が
  あるように見えるが、想定用途に効く中身は既存ルール1〜2件に収束する。名前の数を実装の数にしない

## 積み残し（今回は実装しない）

「`CLAUDE.md` に何を書かないか」という観点は `model-setup/README.md` に節を設ける価値がありうるが、
**今回のレビュー対象（記事）には無い論点**であり、スコープを広げないため別途の判断とする
（先例: [2026-09-06 のプロンプト手法レビュー](2026-09-06-prompt-techniques-7-adoption.md) の積み残し節）。

## 確認できなかったこと

以下はいずれも**調査の限界であって対象の欠陥ではない**。中核ルール11 に従い、
**減点材料にしていない**（否定の根拠は上記3点であり、情報の不在ではない）。

- **この記事への第三者の言及・引用・批判** — 日本語・英語の検索で **0件**。
  ただし Qiita のコメント欄・非公開の言及は検索インデックスに現れない可能性がある
- **「4原則を書いた／書かない」の対照実験** — 確認できなかった。存在するのは指示密度と遵守率の
  一般研究、指示の静的検証可能性の解析、単一著者の非対照的な報告のみ
- **「DRY 指示 → 過剰抽象化」の因果を測定した報告** — 確認できなかった
  （LLM の過剰抽象化傾向を述べる記事は複数あるが、因果の測定ではない）
- **Anthropic 公式が SOLID / DRY / KISS / YAGNI を名指しした記述** — 無い。
  確認できたのは `Self-evident practices like "write clean code"` 等の近接記述まで
- **取得に失敗した URL** — <https://news.ycombinator.com/item?id=47526973>（HTTP 429）、
  <https://www.javacodegeeks.com/2026/05/the-dark-side-of-clean-code-when-solid-and-dry-principles-actively-hurt-you.html>（HTTP 403）
