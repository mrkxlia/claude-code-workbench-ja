# model-setup — モデル運用テンプレート（Opus + Sonnet / Sonnet 単独）

「Opus+Sonnet が使える私用 PC」と「Sonnet しか使えない会社 PC」の2プロファイルで Claude Code を
使うための、CLAUDE.md テンプレートと検証の仕組みです。

**公式ガイドや本体機能で足りるものは持ちません。** 2026-10-06 に、公式プロンプトガイドの翻訳
（ルール・PROMPTS の大半・モデル仕様表）と、本体機能・既存 OSS の再発明だったスキル4種
（`task-brief`→Plan モード、`fan-out`→本体の委譲・dynamic workflows・`/batch`、`long-run`→`/goal`、
`backlog-loop`→[Backlog.md](https://github.com/MrLesk/Backlog.md)）とエージェント2種
（`task-worker`・`bulk-scanner`→本体の汎用エージェント・Explore）を削除しました。経緯は
[整理の記録](../../docs/decisions/2026-10-06-repo-cleanup.md)。

> **旧名 `sonnet-setup` からの改名**: 旧プラグインを導入済みの場合は `claude plugin uninstall sonnet-setup` →
> `claude plugin install model-setup@workbench-ja` で入れ替えてください。

## 何が入っているか

| ファイル/ディレクトリ | 内容 |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | コピペ用テンプレート本体（公式ガイドに無い4ルール＋公式スニペットへの案内） |
| [`CLAUDE.private.md`](CLAUDE.private.md) | プロファイル追補（Opus+Sonnet・私用PC）: ルール5〜6 |
| [`CLAUDE.company.md`](CLAUDE.company.md) | プロファイル追補（Sonnet 単独・会社PC）: ルール5〜6 |
| [`MODEL-GUIDE.md`](MODEL-GUIDE.md) | プロファイル・エスカレーション・Fable 5.1 パリティマップ・AIDLC 簡易版ワークフロー（公式情報はリンクのみ） |
| [`PROMPTS.md`](PROMPTS.md) | 都度貼りプロンプト（Plan モード用初回テンプレート・テストの棚卸し・AI レビューが収束しないとき） |
| [`settings.private.json`](settings.private.json) | 私用 PC 向け設定サンプル（`opusplan`） |
| [`settings.company.json`](settings.company.json) | 会社 PC 向け設定サンプル（`sonnet`） |
| `skills/verify-fresh/` | 成果物を fresh context の検証エージェントに完了条件と突き合わせさせ、反証させる |
| `skills/pr-merge/` | コミット分割〜PR 作成〜CI 確認〜マージ〜後片付けまで（git/gh 専用） |
| `agents/fresh-verifier.md` | 成果物と完了条件だけを受け取り「完了と認めない理由」を探す検証専用（修正不可・sonnet） |

## ルールと、それぞれが塞ぐ失敗モード

| ルール | 塞ぐ失敗モード |
|--------|----------------|
| 1. 完了条件を先に定義 | 「とりあえず実装して、あとで調整」に走る |
| 2. 同じエラーは2回まで | 間違った方向に粘って時間が溶ける |
| 3. 完了前に初見レビュー（壊れうる隣接機能を1つ挙げる） | 作った本人の甘い自己採点 |
| 4. 確信度と3点報告 | 流暢な文体の中に不確かさが隠れる |
| 5. 評価と実行の境界（追補） | 問題の報告を聞いただけで修正に走る |
| 6. ワークフローの既定（追補） | 依頼のたびにスキル名を指定させる・検証を挟み忘れる |

複数解釈の確認・依頼外の変更をしない・証拠つきの報告・網羅レビュー・自律完走は、公式の
[Opus 5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5)・
[Sonnet 5.5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5-5)・
[Fable 5.1](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-1)
ガイドにスニペットがあります。必要なものを**原文のまま** CLAUDE.md に貼ってください（翻訳は原文の更新に追随できない）。

## 2つのスキル

| スキル | 使いどころ |
|---|---|
| `/verify-fresh [完了条件のパス\|対象]` | 完了報告・マージ・引き渡しの前に、経緯を知らない fresh context に「完了と認めない理由」を探させる。コード以外の成果物にも使える（本体の `/verify` はアプリを動かす確認、`/code-review` はバグ探しで、完了条件との突き合わせはしない） |
| `/pr-merge [PRタイトル案]` | コミット分割〜PR作成〜CI確認〜マージ〜後片付けまで（公式 `commit-commands` は PR 作成まで） |

## 導入手順

### A. プラグインとして入れる（git が使える環境向け）

```bash
claude plugin marketplace add mrkxlia/claude-code-workbench-ja
claude plugin install model-setup@workbench-ja
```

スキル2種・サブエージェント1種が自動配信されます。CLAUDE.md テンプレートと追補は自動配信の対象外なので、
リポジトリを clone してファイルで配置します:

```bash
# 共通ルール + プロファイル追補（私用 PC = private / 会社 PC = company のどちらか一方）
cat plugins/model-setup/CLAUDE.md plugins/model-setup/CLAUDE.private.md >> ~/.claude/CLAUDE.md
```

### B. ファイルコピーで入れる（会社 PC = git なし想定）

```bash
cp -r plugins/model-setup/skills/verify-fresh ~/.claude/skills/   # pr-merge は git 専用なので省く
mkdir -p ~/.claude/agents && cp plugins/model-setup/agents/fresh-verifier.md ~/.claude/agents/
cat plugins/model-setup/CLAUDE.md plugins/model-setup/CLAUDE.company.md >> ~/.claude/CLAUDE.md
# ~/.claude/settings.json に settings.company.json の内容を統合する
```

## 他の行動原則系 CLAUDE.md との併用

[multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) などと併用する場合、
ルール1（完了条件）は Goal-Driven Execution と趣旨が重なるので、どちらか片方に寄せてください。

## カスタマイズの指針

- CLAUDE.md は短く保つ。追記する場合も「これを消したら Claude は間違えるか？」を基準に、答えが No の行は
  入れない（[公式 Best practices](https://code.claude.com/docs/en/best-practices)）。
- 本体の `/doctor prompt-audit` で、旧モデル向けに書かれた指示・矛盾を定期的に洗い出す。

## 出典

- ルール1〜4: X 記事「Sonnet 5をFable 5にする方法〜Claude本人にインタビューして聞いた7つの神設定」
  （[@armadillo_ai](https://x.com/armadillo_ai) 氏）を参照・要約・翻案したもの。著作権は同氏に帰属します。
- 追補ルール6・MODEL-GUIDE §5・PROMPTS.md #0: AWS Labs [aidlc-workflows](https://github.com/awslabs/aidlc-workflows)（AI-DLC）の簡易化。
- Opus 5 実行時の読み替え（検証・委譲の抑制）: [Prompting Claude Opus 5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5)。
- PROMPTS.md #11・#12: catnose99 氏・npaka 氏の記事の翻案（各節に出典）。
