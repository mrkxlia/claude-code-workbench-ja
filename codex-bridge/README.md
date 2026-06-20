# codex-bridge — Codex にレビュー・実装・相談を依頼するスキル＆エージェント

コードレビュー・実装・相談を **OpenAI Codex** に依頼するための Claude Code スキル4種と
サブエージェント3種です。**ユーザー自身は Codex を直接操作しません**。Claude Code が
Codex CLI を**非対話モード（`codex exec`）**で Bash 越しに駆動し、ユーザーはスラッシュ
コマンドを打つ（または自然文で頼む）だけです。

| スラッシュコマンド | 役割 | サンドボックス | 委譲先エージェント |
|-------------------|------|---------------|-------------------|
| `/codex-review [スコープ]` | 差分/指定ファイルを Codex にレビューさせ、重大度 P1–P4 で要約 | read-only | `codex-reviewer` |
| `/codex-implement <タスク>` | Codex にファイルを直接編集させ、Claude が差分・テストを検証 | workspace-write | `codex-implementer` |
| `/codex-ask <相談内容>` | 設計相談・セカンドオピニオンを Codex に答えさせ要約（コードは書かない） | read-only | `codex-advisor` |
| `/codex-agents [--project-only]` | 既存の Claude ルール（CLAUDE.md 等）を取り込んだ `AGENTS.md` を生成（Codex に同じルールを効かせる） | —（ローカル生成） | —（スクリプト） |

さらに、**プラン承認で Codex 実装へ委譲する opt-in フック**（`plan-to-codex.sh`）と、
**セッション開始時に `AGENTS.md` を再生成する常時フック**（`hooks.json`）を同梱します（後述）。

## なぜこの構成か

- **スキル（入口）／エージェント（実行）の分業**: スキルは発動条件・入力整理・結果提示を担い、
  実際の codex 実行はサブエージェントに委譲します。Codex の冗長な出力（進捗・JSONL・全文）を
  メインの文脈から隔離し、要約だけを返すためです。
- **安全側を既定に**: review/ask は `read-only`、implement は `workspace-write`。
  `--yolo` / `--dangerously-bypass-approvals-and-sandbox` / `danger-full-access` は
  **テンプレートでは使いません**。より緩いサンドボックスが必要な場合に選ぶのは利用者の責任です。

## 前提

1. **Codex CLI の導入** — OpenAI Codex CLI がインストール済みであること（`codex --version` で確認）。
   Windows では Codex 自体が WSL を推奨/必要とする場合があります（環境依存）。
2. **認証** — ChatGPT ログイン、または `OPENAI_API_KEY` 環境変数で認証済みであること。
3. **シェル（フック/スクリプトを使う場合）** — 同梱の `.sh` は bash 系です。**Windows では Git Bash か WSL** が
   前提（`bash` を PATH に通すか WSL を使う）。**`jq` は不要**（フックもジェネレータも追加ツールなしで動きます）。

> 未導入・未認証のまま起動した場合、サブエージェントが `command -v codex` と認証エラー文言を
> 検知し、raw なエラーを出さずに日本語で案内して終了します。

## ファイル構成

```
codex-bridge/
├── README.md
├── .claude-plugin/
│   └── plugin.json
└── .claude/
    ├── hooks.json                 # SessionStart で AGENTS.md を再生成（常時ON・再生成のみ）
    ├── skills/
    │   ├── codex-review/SKILL.md
    │   ├── codex-implement/SKILL.md
    │   ├── codex-ask/SKILL.md
    │   └── codex-agents/SKILL.md  # AGENTS.md ジェネレータ（/codex-agents）
    ├── agents/
    │   ├── codex-reviewer.md      # read-only
    │   ├── codex-implementer.md   # workspace-write
    │   └── codex-advisor.md       # read-only
    └── hooks/
        ├── plan-to-codex.sh       # プラン承認→Codex 実装委譲（opt-in）
        └── gen-agents-md.sh       # AGENTS.md 生成スクリプト
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
# プロジェクトに導入（スキル4種＋エージェント3種＋フック2種）
mkdir -p .claude/skills .claude/agents .claude/hooks
cp -r codex-bridge/.claude/skills/*  .claude/skills/
cp -r codex-bridge/.claude/agents/*  .claude/agents/
cp -r codex-bridge/.claude/hooks/*   .claude/hooks/
```

グローバルに使いたい場合は `~/.claude/skills/`・`~/.claude/agents/` にコピーします。

> フック（`plan-to-codex.sh` / `gen-agents-md.sh`）はコピーしただけでは動きません。
> 下記「プラン承認で自動的に Codex に実装させる」「Claude のルールを Codex にも効かせる」を参照して
> `.claude/settings.json` に登録してください（プラグイン導入なら `hooks.json` 由来の AGENTS.md 再生成は自動）。

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

## プラン承認で自動的に Codex に実装させる（opt-in）

Claude Code のプランモードで**プランを承認した瞬間**に、その内容を Codex に実装させる連携です。
`PostToolUse`（matcher `ExitPlanMode`）フックが、Claude に「承認済みプランを `/codex-implement` で
Codex に実装・検証させよ」と促します（プラン本文は Claude が会話の文脈からそのまま使うため、
フックは**ユーザー入力を埋め込まない固定文字列**を出すだけ。エスケープも `jq` も不要です）。

**opt-in**です。使いたいプロジェクトの `.claude/settings.json` に登録したときだけ有効になります
（「今回は Claude 自身に実装させたい」場面を潰さないため）。

```json
{"hooks":{"PostToolUse":[{"matcher":"ExitPlanMode",
  "hooks":[{"type":"command","command":"bash \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/plan-to-codex.sh"}]}]}}
```

- スクリプトは `mkdir -p .claude/hooks && cp -r codex-bridge/.claude/hooks/* .claude/hooks/` で配置。
- 全プロジェクトで使いたい場合は `~/.claude/hooks/` に置き、ユーザーの settings に同様に登録します。
- 注意: **全プラン承認で発火**します／無効化は settings.json から該当エントリを消すだけ／
  `additionalContext` は強い誘導であって厳密な強制ではありません／委譲はその承認済みプラン1件のみ・一度きり。

## Claude のルールを Codex にも効かせる（AGENTS.md 生成）

普段 CC しか使わない人向けに、既存の Claude ルールを取り込んだ **`AGENTS.md`** を生成します。
Codex が読むのは CLAUDE.md ではなく `AGENTS.md` ですが、`AGENTS.md` は `@import` 非対応のため、
**中身を取り込んだ（`@import` も展開した）平らな `AGENTS.md`** をマテリアライズして橋渡しします。

| ソース | 出力先 |
|--------|--------|
| `~/.claude/CLAUDE.md`（home） | `$CODEX_HOME/AGENTS.md`（既定 `~/.codex/AGENTS.md`・全 Codex セッション共通） |
| プロジェクト `CLAUDE.md` ＋ `.claude/*.md`・`.claude/rules/*.md`（小ルール・深さ1） | `<プロジェクト>/AGENTS.md` |

- **手動**: `/codex-agents`（`--project-only` で home をスキップ）。**新規作成もできます**。
- **自動**: プラグイン導入時は `SessionStart`（startup/resume）で `gen-agents-md.sh --auto` が走り、
  **既存の生成物を最新化するだけ**（新規作成しません）。初回は `/codex-agents` で作成してください。
- **安全策**: 生成物は1行目にセンチネルを持ち、**手書きの `AGENTS.md`（センチネル無し）は上書きしません**。
  生成済みは**差分があるときだけ**更新します。生成された `AGENTS.md` は再生成物なので、**手編集せず
  CLAUDE.md 側を更新**してください（コミットしたくなければ `.gitignore` 推奨）。
- Codex の AGENTS.md 階層連結（グローバル＋プロジェクト、後勝ち）の仕様はバージョンで変わりうるため、
  実環境の挙動を確認のうえ利用してください。

## トラブルシュート

| 症状 | 原因 | 対処 |
|------|------|------|
| 「codex CLI が見つかりません」 | 未導入 | Codex CLI をインストールし、`codex --version` を確認 |
| 「codex が未認証です」 | 未ログイン / APIキー未設定 | ChatGPT ログイン、または `OPENAI_API_KEY` を設定 |
| implement で依存取得やネットワークが必要な処理が失敗する | workspace-write は既定でネットワーク無効 | ネットワークが要るのは想定外。必要なら**利用者の責任で**緩いサンドボックスを選ぶ |
| `/codex-review` の P1–P4 が codex 構造化出力でないように見える | git 外/パス指定では plain `codex exec` パスで実行（重大度はモデル判断） | 構造化レビューが要るなら git 管理下で差分に対して実行する |
| `codex exec review` がフラグエラーになる | バージョン差でサブコマンド仕様が異なる | `codex exec review --help` で確認。使えなければスキルが plain パスに自動フォールバック |
| プラン承認しても Codex 実装が始まらない | フック未登録／誘導は強制ではない | `.claude/settings.json` にフックが登録されているか確認（`additionalContext` は強い誘導であり強制ではない） |
| `AGENTS.md` が更新されない | 手書き（センチネル無し）でガード／取り込むソースが無い／`--project-only` | 既存 AGENTS.md を退避するか `/codex-agents` で再生成。CLAUDE.md 等のソース有無を確認 |
| Windows で `bash\r` エラー | `.sh` が CRLF | リポジトリ直下の `.gitattributes`（`*.sh text eol=lf`）で LF に正規化。Git Bash/WSL を使用 |

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
