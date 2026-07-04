# sonnet-setup — Sonnet/Haiku 運用向け CLAUDE.md テンプレート

会社の環境などコストの制約で Sonnet / Haiku しか使えないときに、上位モデルの「振る舞い」
—— 成功条件を先に決める・検証してから完了を名乗る・不確かさを隠さない —— を
CLAUDE.md に常設化するテンプレートです。

> プロンプトは一時的、構造は永続的。毎回長いプロンプトを貼る代わりに、環境そのものに仕事の型を置きます。

## 何が入っているか

| ファイル | 内容 |
|---------|------|
| [`CLAUDE.md`](CLAUDE.md) | コピペ用テンプレート本体（7つの行動ルール） |
| [`settings.json`](settings.json) | `effortLevel` の設定サンプル |

## 7つのルールと、それぞれが塞ぐ失敗モード

| ルール | 塞ぐ失敗モード |
|--------|----------------|
| 1. 完了条件を先に定義 | 「とりあえず実装して、あとで調整」に走る |
| 2. 複数解釈を勝手に選ばない | それらしい解釈を選んで突っ走り、手戻りする |
| 3. ついで改善の禁止 | スコープ膨張・頼んでいないリファクタ |
| 4. 「検証した」を報告 | 「動くはず」のまま完了を名乗る |
| 5. 同じエラーは2回まで | 間違った方向に粘って時間が溶ける |
| 6. 完了前に初見レビュー | 作った本人の甘い自己採点 |
| 7. 確信度と3点報告 | 流暢な文体の中に不確かさが隠れる |

## 導入手順

### A. グローバルに入れる（全プロジェクト共通・個人向け）

```bash
# 既存の ~/.claude/CLAUDE.md がある場合は末尾に追記
cat sonnet-setup/CLAUDE.md >> ~/.claude/CLAUDE.md

# まだ無い場合はコピー
cp sonnet-setup/CLAUDE.md ~/.claude/CLAUDE.md
```

### B. プロジェクトに入れる（チームで共有・レビューできる）

対象リポジトリ直下の `CLAUDE.md` に追記します。

```bash
cat sonnet-setup/CLAUDE.md >> /path/to/your-repo/CLAUDE.md
```

### C. effort を設定する

`~/.claude/settings.json`（またはプロジェクトの `.claude/settings.json`）に
[`settings.json`](settings.json) の内容をマージします。

**effort 判断表**（[公式 model-config](https://code.claude.com/docs/en/model-config) 準拠）:

| 設定 | 意味 |
|------|------|
| `"effortLevel": "high"` | **Sonnet 5 のデフォルト値**。設定する意味は「モデルを切り替えても深さを固定する」こと |
| `"effortLevel": "xhigh"` | もっと粘らせたいときの実質的な格上げ。トークン消費（＝コスト）は増える |
| `/effort` コマンド | セッション中にスライダーで変更。`max` はセッション限定 |
| プロンプトに `ultrathink` | そのターンだけ深い推論を要求（設定変更なし） |

> **注意**: 「settings.json に high を入れると粘る側に寄る」という紹介を見かけますが、
> Sonnet 5 のデフォルトは既に `high` なので、それだけでは挙動は変わりません。
> 本当に深くしたい場合は `xhigh` を選び、コスト増と引き換えにします。

## GlobalClaudeMD-sample との併用（重複に注意）

[`GlobalClaudeMD-sample/`](../GlobalClaudeMD-sample/) と両方導入する場合、次の3つが重複します。
**どちらか片方に寄せてください**（二重に書くとシグナルが薄まります）。

| 本テンプレートのルール | GlobalClaudeMD-sample の対応原則 |
|------------------------|----------------------------------|
| 2. 複数解釈を勝手に選ばない | 1. Think Before Coding |
| 3. ついで改善の禁止 | 3. Surgical Changes |
| 4. 「検証した」を報告 | 4. Goal-Driven Execution ／ 6. 検証できない場合は理由と手動確認手順 |

ルール 1・5・6・7 は GlobalClaudeMD-sample に対応物がないため、そのまま追加できます。

## Haiku との使い分け

- 判断を伴う実装・調査・レビュー → **Sonnet**
- 正解が機械的に決まる大量処理（分類・抽出・一括変換） → **Haiku**
- サブエージェントの frontmatter で `model` / `effort` をタスクごとに指定できます
  （例: 機械的スキャン担当のエージェントだけ `model: haiku`）

## プロンプト最適化（既存 OSS の活用）

本テンプレートが「実行側の型」だとすると、入力プロンプト側の型は既存 OSS
[severity1/claude-code-prompt-improver](https://github.com/severity1/claude-code-prompt-improver)
（MIT License）で補えます。フックでプロンプトを評価し、曖昧なときだけ 1〜6 個の質問で
確認してから実行してくれるツールです（明確なプロンプトは素通し）。

```bash
claude plugin marketplace add severity1/severity1-marketplace
# その後 /plugin からインストール（最新の手順は本家 README を参照）
```

プラグインを導入できない環境では、依頼を出すときに次の5項目を手で埋めるだけでも効きます:

```text
## ゴール（1行）
## 完了条件（機械的に判定できる形で）
## やらないこと
## 検証方法
## 報告形式（検証の証拠つき。不確かな箇所は確信度 高/中/低 を明記）
```

## CLAUDE.md では埋まらない差（正直な注意書き）

以下は設定では完全には埋まりません。**手戻りが2回続いたタスクだけ上位モデルに切り替える**のが
現実的な使い分けです。

- 長時間の作業で序盤の制約を終盤まで保持し続ける力
- 受け入れ条件を書くこと自体が仕事の核心になる仕事（設計判断・移行計画の穴探しなど）
- 「何がシンプルか」のようなルール適用の判断そのもの

## カスタマイズの指針

- テンプレートは60行未満に収めています。追記する場合も「これを消したら Claude は間違えるか？」を
  基準に、答えが No の行は入れないでください。
- コードから分かること・リンターが保証することは書かない（[公式ベストプラクティス](https://code.claude.com/docs/en/memory)）。

## 出典

- 7つのルール: X 記事「Sonnet 5をFable 5にする方法〜Claude本人にインタビューして聞いた7つの神設定」
  （[@armadillo_ai](https://x.com/armadillo_ai) 氏）を参照・要約・翻案したものです。著作権は同氏に帰属します。
- effort・モデル仕様: [Claude Code 公式 model-config](https://code.claude.com/docs/en/model-config)・
  [effort ドキュメント](https://platform.claude.com/docs/en/build-with-claude/effort)
- CLAUDE.md 運用: [Claude Code 公式 memory ドキュメント](https://code.claude.com/docs/en/memory)
