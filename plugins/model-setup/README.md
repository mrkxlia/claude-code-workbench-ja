# model-setup — モデル運用テンプレート（Opus 4.8 + Sonnet 5 / Sonnet 単独）

**Opus 4.8 と Sonnet 5 の両方**（および補助の Haiku 4.5）を対象に、上位モデル
（Fable 5 級）の「振る舞い」—— 成功条件を先に決める・検証してから完了を名乗る・
不確かさを隠さない・並列に委譲して fresh な目で検証する —— をプロファイル別の
CLAUDE.md・スキル・サブエージェントとして常設化するテンプレート／プラグインです。
「Opus+Sonnet が使える私用 PC」と「Sonnet しか使えない会社 PC」の2プロファイルを同梱します。

> プロンプトは一時的、構造は永続的。毎回長いプロンプトを貼る代わりに、環境そのものに仕事の型を置きます。

> **旧名 `sonnet-setup` からの改名**: 名前が Sonnet 専用に見えるため `model-setup` に改名しました。
> 旧プラグインを導入済みの場合は `claude plugin uninstall sonnet-setup` →
> `claude plugin install model-setup@workbench-ja` で入れ替えてください（自動更新はされません）。

## 何が入っているか

| ファイル/ディレクトリ | 内容 |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | コピペ用テンプレート本体（9つの行動ルール・Opus/Sonnet 共通基盤） |
| [`CLAUDE.private.md`](CLAUDE.private.md) | プロファイル追補（Opus+Sonnet・私用PC）: 追補ルール10〜14 |
| [`CLAUDE.company.md`](CLAUDE.company.md) | プロファイル追補（Sonnet 単独・会社PC）: 追補ルール10〜15 |
| [`MODEL-GUIDE.md`](MODEL-GUIDE.md) | モデル仕様・effort 選定・プロファイル・Fable 5 パリティマップ |
| [`settings.private.json`](settings.private.json) | 私用 PC 向け設定サンプル（`opusplan` + `xhigh`） |
| [`settings.company.json`](settings.company.json) | 会社 PC 向け設定サンプル（`sonnet` + `xhigh`） |
| `.claude/skills/task-brief/` | 最初のターンでタスク仕様をブリーフ化するスキル |
| `.claude/skills/backlog-loop/` | backlog.md 駆動の定型ループ（計画→承認ゲート→実施→完了処理→backlog更新） |
| `.claude/skills/pr-merge/` | PR 作成〜マージ〜後片付けまでを一括で行うスキル（git/gh 専用） |
| `.claude/skills/fan-out/` | 独立サブタスクの並列委譲＋fresh 検証マージのオーケストレーション |
| `.claude/skills/long-run/` | 長時間自律作業の完走プロトコル（停止条件の閉じた列挙・証拠つき区切り報告） |
| `.claude/skills/verify-fresh/` | 成果物を fresh context の検証エージェントに反証させるスキル |
| `.claude/agents/` | サブエージェント3種（task-worker / fresh-verifier / bulk-scanner） |
| `.claude-plugin/plugin.json` | プラグインマニフェスト |

## 9つのルールと、それぞれが塞ぐ失敗モード

| ルール | 塞ぐ失敗モード |
|--------|----------------|
| 1. 完了条件を先に定義 | 「とりあえず実装して、あとで調整」に走る |
| 2. 複数解釈を勝手に選ばない | それらしい解釈を選んで突っ走り、手戻りする |
| 3. ついで改善の禁止 | スコープ膨張・頼んでいないリファクタ |
| 4. 「検証した」を報告 | 「動くはず」のまま完了を名乗る |
| 5. 同じエラーは2回まで | 間違った方向に粘って時間が溶ける |
| 6. 完了前に初見レビュー | 作った本人の甘い自己採点 |
| 7. 確信度と3点報告 | 流暢な文体の中に不確かさが隠れる |
| 8. スコープを字義どおりに守る | 指示にない範囲へ勝手に広げる（Sonnet 5 は字義どおり実行するため、逆に範囲の明示漏れが起きやすい） |
| 9. レビューは網羅で報告 | 「重要そうなものだけ」に絞って低重要度の指摘を黙って落とす |

## 6つのスキル

| スキル | 使いどころ |
|---|---|
| `/task-brief <依頼内容>` | 着手前に、最初のターンでゴール・完了条件・スコープ・制約・検証方法・報告形式を一括確定させる |
| `/backlog-loop [パス\|タスク名]` | backlog.md を起点に、Step 承認ゲート付きで計画→実施→完了処理→backlog更新まで回す |
| `/pr-merge [PRタイトル案]` | コミット分割〜PR作成〜CI確認〜マージ〜後片付けまで（git/gh が使える環境専用） |
| `/fan-out <分割したいタスク>` | 書き込み範囲が交わらないサブタスクに分解し、task-worker へ並列委譲→fresh-verifier で検証→マージ |
| `/long-run <タスク内容>` | 長時間の自律作業を、早期切り上げ・許可待ち・証拠のない進捗報告なしで完走させる |
| `/verify-fresh [完了条件のパス\|対象]` | 完了報告・マージ・引き渡しの前に、経緯を知らない fresh context に「完了と認めない理由」を探させる |

いずれも自然な依頼文（「ブリーフを作って」「backlog.md に基づき実施して」「手分けして進めて」
「最後までやり切って」「新鮮な目でチェックして」）でも自動発動します。詳細な住み分け
（clarify・create-plan・feature-pipeline・peer・codex-review・commit-commands との境界）は
各 SKILL.md 内に明記してあります。

## 3つのサブエージェント

| エージェント | 役割 | model |
|---|---|---|
| `task-worker` | ブリーフ6項目を受け取り、その範囲だけを実装して証拠つきで返す汎用並列作業員 | sonnet |
| `fresh-verifier` | 成果物と完了条件だけを受け取り「完了と認めない理由」を反証的に探す検証専用（修正不可） | sonnet |
| `bulk-scanner` | 一覧化・分類・一次スクリーニングなど機械的な大量スキャン（読み取り専用） | haiku |

サブエージェント定義（`.claude/agents/`）とプロファイル追補（`CLAUDE.private.md` /
`CLAUDE.company.md`）はプラグインの version 管理対象外（このリポジトリの規約5）のため、
**プラグイン導入（方法A）の場合もファイルコピー（下記）が必要**です。
Fable 5 のどの挙動を何が担うかの対応は [`MODEL-GUIDE.md`](MODEL-GUIDE.md) §8 を参照。

## 導入手順

### A. プラグインとして入れる（git が使える環境向け）

```bash
claude plugin marketplace add mrkxlia/claude-code-workbench-ja
claude plugin install model-setup@workbench-ja
```

プラグインが配信するのはスキル6種のみ。サブエージェントとプロファイル追補は
続けてファイルコピーで配置する（リポジトリを clone した上で）:

```bash
# サブエージェント3種（ユーザースコープに置く例。プロジェクトの .claude/agents/ でもよい）
mkdir -p ~/.claude/agents && cp -r model-setup/.claude/agents/* ~/.claude/agents/

# 共通ルール + プロファイル追補（私用 PC = private / 会社 PC = company のどちらか一方）
cat model-setup/CLAUDE.md model-setup/CLAUDE.private.md >> ~/.claude/CLAUDE.md
```

更新するときは:

```bash
claude plugin marketplace update workbench-ja && claude plugin update model-setup
```

### B. ファイルコピーで入れる（会社 PC = git なし想定）

リポジトリを zip 等で持ち込んだ上で:

```bash
# スキルを配置（pr-merge は git 専用なので、git が無い環境では省いてよい）
cp -r model-setup/.claude/skills/task-brief ~/.claude/skills/
cp -r model-setup/.claude/skills/backlog-loop ~/.claude/skills/
cp -r model-setup/.claude/skills/fan-out ~/.claude/skills/
cp -r model-setup/.claude/skills/long-run ~/.claude/skills/
cp -r model-setup/.claude/skills/verify-fresh ~/.claude/skills/

# サブエージェントを配置
mkdir -p ~/.claude/agents && cp -r model-setup/.claude/agents/* ~/.claude/agents/

# CLAUDE.md に追記（共通ルール + 会社プロファイル追補。既存ファイルがあれば末尾へ）
cat model-setup/CLAUDE.md model-setup/CLAUDE.company.md >> ~/.claude/CLAUDE.md

# settings をマージ（会社 PC 用プロファイル）
# ~/.claude/settings.json に settings.company.json の内容を統合する
```

私用 PC で git がある場合は `settings.private.json` と `CLAUDE.private.md`、会社 PC では
`settings.company.json` と `CLAUDE.company.md` を使う（追補はどちらか一方だけ）。
どちらのプロファイルを選ぶ根拠・effort の考え方は [`MODEL-GUIDE.md`](MODEL-GUIDE.md) を参照。

## モデル・effort の選び方

Opus 4.8 / Sonnet 5 / Haiku 4.5 の仕様比較、effort レベルの意味、私用・会社プロファイル、
Opus で計画→Sonnet で実行する流れ、Sonnet 5 特有の運用注意(字義どおりの実行・網羅レビュー
指示)、LLM アプリ開発で「賢さでなく構造」で差を埋める7作法、そして
**Fable 5 の挙動を何で再現するかのパリティマップ（§8）**までは
[`MODEL-GUIDE.md`](MODEL-GUIDE.md) にまとめてある。

## GlobalClaudeMD-sample との併用（重複に注意）

[`GlobalClaudeMD-sample/`](../../templates/global-claude-md-sample/) と両方導入する場合、次の3つが重複します。
**どちらか片方に寄せてください**（二重に書くとシグナルが薄まります）。

| 本テンプレートのルール | GlobalClaudeMD-sample の対応原則 |
|------------------------|----------------------------------|
| 2. 複数解釈を勝手に選ばない | 1. Think Before Coding |
| 3. ついで改善の禁止 | 3. Surgical Changes |
| 4. 「検証した」を報告 | 4. Goal-Driven Execution ／ 6. 検証できない場合は理由と手動確認手順 |

ルール 1・5・6・7・8・9 は GlobalClaudeMD-sample に対応物がないため、そのまま追加できます。

## プロンプト最適化（既存 OSS の活用）

`task-brief` スキルが使える環境なら、着手前のブリーフ化はそれに任せてください。
スキルが導入できない環境向けの手動テンプレートとしては、次の5項目を埋めるだけでも効きます:

```text
## ゴール（1行）
## 完了条件（機械的に判定できる形で）
## やらないこと
## 検証方法
## 報告形式（検証の証拠つき。不確かな箇所は確信度 高/中/低 を明記）
```

さらに入力プロンプト側の型を強化したい場合は、既存 OSS
[severity1/claude-code-prompt-improver](https://github.com/severity1/claude-code-prompt-improver)
（MIT License）も参考になる。フックでプロンプトを評価し、曖昧なときだけ質問で確認してから
実行してくれるツール。

```bash
claude plugin marketplace add severity1/severity1-marketplace
# その後 /plugin からインストール（最新の手順は本家 README を参照）
```

## CLAUDE.md では埋まらない差（正直な注意書き）

以下は設定では完全には埋まりません。**手戻りが2回続いたタスクだけ上位モデルに切り替える**のが
現実的な使い分けです（詳細は `MODEL-GUIDE.md` §7）。

- 長時間の作業で序盤の制約を終盤まで保持し続ける力
  （`/long-run` の「ブリーフ固定＋区切りごとの再読」で部分的には補えるようになったが、完全ではない）
- 受け入れ条件を書くこと自体が仕事の核心になる仕事（設計判断・移行計画の穴探しなど）
- 「何がシンプルか」のようなルール適用の判断そのもの

## カスタマイズの指針

- CLAUDE.md テンプレートは短く保つ。追記する場合も「これを消したら Claude は間違えるか？」を
  基準に、答えが No の行は入れないでください。
- コードから分かること・リンターが保証することは書かない（[公式ベストプラクティス](https://code.claude.com/docs/en/memory)）。

## 出典

- ルール1〜7: X 記事「Sonnet 5をFable 5にする方法〜Claude本人にインタビューして聞いた7つの神設定」
  （[@armadillo_ai](https://x.com/armadillo_ai) 氏）を参照・要約・翻案したものです。著作権は同氏に帰属します。
- ルール8〜9・MODEL-GUIDE.md: Claude 公式ドキュメント（2026-07時点）に基づく。
- 追補ルール10〜13・fan-out / long-run / verify-fresh スキル・パリティマップ:
  [Prompting Claude Fable 5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5)
  （自律実行・進捗の証拠監査・並列委譲・fresh 検証・境界の各公式スニペット）の翻案。
- effort・モデル仕様: [Claude Code 公式 model-config](https://code.claude.com/docs/en/model-config)・
  [effort ドキュメント](https://platform.claude.com/docs/en/build-with-claude/effort)・
  [Prompting Claude Sonnet 5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5)・
  [Prompting best practices（Opus 4.8 の項を含む）](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- サブエージェントの `model:` / `effort:` frontmatter:
  [Claude Code 公式 sub-agents ドキュメント](https://code.claude.com/docs/en/sub-agents)
- CLAUDE.md 運用: [Claude Code 公式 memory ドキュメント](https://code.claude.com/docs/en/memory)
