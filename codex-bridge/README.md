# codex-bridge — Codex にレビュー・実装・相談を依頼するスキル＆エージェント

コードレビュー・実装・相談を **OpenAI Codex** に依頼するための Claude Code スキル3種と
サブエージェント3種です。**ユーザー自身は Codex を直接操作しません**。Claude Code が
Codex CLI を**非対話モード（`codex exec`）**で Bash 越しに駆動し、ユーザーはスラッシュ
コマンドを打つ（または自然文で頼む）だけです。

| スラッシュコマンド | 役割 | サンドボックス | 委譲先エージェント |
|-------------------|------|---------------|-------------------|
| `/codex-review [スコープ]` | 差分/指定ファイルを Codex にレビューさせ、重大度 P1–P4 で要約 | read-only | `codex-reviewer` |
| `/codex-implement <タスク>` | Codex にファイルを直接編集させ、Claude が差分・テストを検証 | workspace-write | `codex-implementer` |
| `/codex-ask <相談内容>` | 設計相談・セカンドオピニオンを Codex に答えさせ要約（コードは書かない） | read-only | `codex-advisor` |

## なぜこの構成か

- **スキル（入口）／エージェント（実行）の分業**: スキルは発動条件・入力整理・結果提示を担い、
  実際の codex 実行はサブエージェントに委譲します。Codex の冗長な出力（進捗・JSONL・全文）を
  メインの文脈から隔離し、要約だけを返すためです。
- **安全側を既定に**: review/ask は `read-only`、implement は `workspace-write`。
  `--yolo` / `--dangerously-bypass-approvals-and-sandbox` / `danger-full-access` は
  **テンプレートでは使いません**。より緩いサンドボックスが必要な場合に選ぶのは利用者の責任です。

## 前提

1. **Codex CLI の導入** — OpenAI Codex CLI がインストール済みであること（`codex --version` で確認）。
2. **認証** — ChatGPT ログイン、または `OPENAI_API_KEY` 環境変数で認証済みであること。

> 未導入・未認証のまま起動した場合、サブエージェントが `command -v codex` と認証エラー文言を
> 検知し、raw なエラーを出さずに日本語で案内して終了します。

## ファイル構成

```
codex-bridge/
├── README.md
├── .claude-plugin/
│   └── plugin.json
└── .claude/
    ├── skills/
    │   ├── codex-review/SKILL.md
    │   ├── codex-implement/SKILL.md
    │   └── codex-ask/SKILL.md
    └── agents/
        ├── codex-reviewer.md      # read-only
        ├── codex-implementer.md   # workspace-write
        └── codex-advisor.md       # read-only
```

## 導入方法

### 方法1: プラグインで導入する

```
/plugin marketplace add mrkxlia/claude-code-workbench-ja
/plugin install codex-bridge@workbench-ja
```

### 方法2: コピーして導入する

スキルとエージェントを、使いたいプロジェクトの `.claude/` にコピーします。

```bash
# プロジェクトに導入（スキル3種＋エージェント3種）
mkdir -p .claude/skills .claude/agents
cp -r codex-bridge/.claude/skills/*  .claude/skills/
cp -r codex-bridge/.claude/agents/*  .claude/agents/
```

グローバルに使いたい場合は `~/.claude/skills/`・`~/.claude/agents/` にコピーします。

## 使い方の例

```
/codex-review                      # 未コミット差分を Codex にレビューさせる
/codex-review base main            # main との差分をレビュー
/codex-review src/foo.ts           # 指定ファイルをレビュー（git なしでも可）

/codex-implement ユーザー削除APIにソフトデリートを実装して
/codex-ask この再試行設計は妥当？指数バックオフと比べて
```

自然文（「Codex にレビューして」「codex にも実装させて」「codex の意見も聞いて」）でも発動します。

## Codex に文脈（ファイル）を渡す

スキルは、タスク/差分から**明らかに必要なファイルを特定し、その内容ごと** Codex に
渡します（パスを名指しして Codex に開かせるのではなく、渡し切る）。渡し方は次の通り:

- **stdin / heredoc が正準**（`codex exec [flags] - <<'EOF' … EOF`）。`/tmp` のファイルは
  サンドボックス下で codex が読めないことがあるため既定にしません。
- 大きすぎる場合は「全文 → 関連抜粋 → `git diff` → パス名指し」の順に降格します。
- 追加で渡したいファイルは `@path` で明示指定できます。

### AGENTS.md を置くと Codex が自動で拾う

Codex は repo 直下の **`AGENTS.md`**（CLAUDE.md 相当のプロジェクト指示）を自動で文脈に
取り込みます。CLAUDE.md の要点（アーキテクチャ・命名・禁止事項など）を `AGENTS.md` にも
置いておくと、Codex のレビュー・実装の精度が上がります。

## トラブルシュート

| 症状 | 原因 | 対処 |
|------|------|------|
| 「codex CLI が見つかりません」 | 未導入 | Codex CLI をインストールし、`codex --version` を確認 |
| 「codex が未認証です」 | 未ログイン / APIキー未設定 | ChatGPT ログイン、または `OPENAI_API_KEY` を設定 |
| implement で依存取得やネットワークが必要な処理が失敗する | workspace-write は既定でネットワーク無効 | ネットワークが要るのは想定外。必要なら**利用者の責任で**緩いサンドボックスを選ぶ |
| `/codex-review` の P1–P4 が codex 構造化出力でないように見える | git 外/パス指定では plain `codex exec` パスで実行（重大度はモデル判断） | 構造化レビューが要るなら git 管理下で差分に対して実行する |
| `codex exec review` がフラグエラーになる | バージョン差でサブコマンド仕様が異なる | `codex exec review --help` で確認。使えなければスキルが plain パスに自動フォールバック |

## 安全方針

- 既定サンドボックス: review/ask = `read-only`、implement = `workspace-write`。
- 危険フラグ（`--yolo` / `--dangerously-bypass-approvals-and-sandbox` / `danger-full-access`）と
  非推奨の `--full-auto` は使いません。
- Codex の生出力はサブエージェント内に隔離し、メインセッションには要約のみを返します。

## ライセンス・出典

[MIT License](../LICENSE)。Codex CLI の仕様および、Claude Code × Codex 連携の構成は
以下を参考にした独自実装です（コードのコピーではありません）。

- OpenAI Codex CLI ドキュメント（non-interactive / command line options）
- eddiearc/codex-delegator（委譲スキルのプロンプト型）
- hamelsmu/claude-review-loop（レビューループ plugin の構成）
