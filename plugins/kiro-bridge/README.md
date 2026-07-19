# kiro-bridge — Kiro にレビュー・相談を依頼するスキル＆エージェント

コードレビュー・相談を **Kiro** に依頼するための Claude Code スキル2種と
サブエージェント2種です。**ユーザー自身は Kiro を直接操作しません**。Claude Code が
`kiro-cli` を**非対話モード（`kiro-cli chat --no-interactive`）**で Bash 越しに駆動し、
ユーザーはスラッシュコマンドを打つ（または自然文で頼む）だけです。

| スラッシュコマンド | 役割 | ツール許可 | 委譲先エージェント |
|-------------------|------|-----------|-------------------|
| `/kiro-review [スコープ]` | 差分/指定ファイルを Kiro にレビューさせ、重大度 P1–P4 で要約 | `--trust-tools=read` | `kiro-reviewer` |
| `/kiro-ask <相談内容>` | 設計相談・セカンドオピニオンを Kiro に答えさせ要約（コードは書かない） | `--trust-tools=read` | `kiro-advisor` |

> **相談相手を変えたいとき** [`ai-peer`](../ai-peer/)・[`codex-bridge`](../codex-bridge/) セクション。
> 依存を増やしたくない・git なし環境なら `/peer`（内部 Claude・依存ゼロ）、別 Claude の独立見解
> なら `/ask-claude`、Codex の意見なら `/codex-ask`。kiro-bridge は相手が **Kiro**
> （`kiro-cli`）のときに使います。

## なぜこの構成か

- **スキル（入口）／エージェント（実行）の分業**: スキルは発動条件・入力整理・結果提示を担い、
  実際の kiro-cli 実行はサブエージェントに委譲します。Kiro の冗長な出力（進捗・全文）を
  メインの文脈から隔離し、要約だけを返すためです（[`codex-bridge`](../codex-bridge/) と同型）。
- **read-only 専用、実装委譲スキルは持たない**: Codex CLI には `--sandbox workspace-write`
  という OS レベルの隔離があり、`codex-bridge` の `/codex-implement` はそれを前提に安全側で
  書き込みを許可しています。kiro-cli の非対話ツール権限（`--trust-tools`）は「どのツール
  カテゴリを確認なしで実行してよいか」を指定する仕組みで、`write`/`shell` を信頼リストに
  入れると**サンドボックス隔離なしに**ファイル書き込み・シェル実行が走ります。この差を
  埋めずに `implement` 系スキルを追加するのは安全側の既定にならないため、**初版では
  read-only（`--trust-tools=read`）の `kiro-review` / `kiro-ask` のみ**を提供します。
  実装を Kiro に代行させたい場合は、この判断が変わるまで Claude 自身が実装するか、
  `codex-bridge` の `/codex-implement` を使ってください。
- **安全側を既定に**: `--trust-tools=read` 固定。`--trust-all-tools`、および write/shell を
  含む `--trust-tools` 指定は**テンプレートでは使いません**。より広い権限が必要な場合に
  選ぶのは利用者の責任です。

## 前提

1. **Kiro CLI の導入** — `kiro-cli` がインストール済みであること（`kiro-cli --version` で確認）。
2. **認証** — Kiro へのログイン、または `KIRO_API_KEY` 環境変数で認証済みであること。
   非対話（ヘッドレス）実行には Kiro Pro 以上のサブスクリプションが必要です（[Kiro 公式ドキュメント](https://kiro.dev/docs/cli/headless/)参照）。
3. **フラグの環境差** — `kiro-cli chat` のフラグ・プロンプト引数の扱いはバージョンで
   異なりうるため、各サブエージェントは `kiro-cli chat --help` で実体を確認する前提で
   書かれています。挙動が変わっている場合はエージェント本文の記述を実環境に合わせて
   調整してください。

> 未導入・未認証のまま起動した場合、サブエージェントが `command -v kiro-cli` と認証エラー
> 文言を検知し、raw なエラーを出さずに日本語で案内して終了します。

## ファイル構成

```
kiro-bridge/
├── README.md
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   ├── kiro-review/SKILL.md
│   └── kiro-ask/SKILL.md
└── agents/
    ├── kiro-reviewer.md    # read-only
    └── kiro-advisor.md     # read-only
```

## 導入方法

### 方法1: プラグインで導入する

```
/plugin marketplace add mrkxlia/claude-code-workbench-ja
/plugin install kiro-bridge@workbench-ja
```

### 方法2: コピーして導入する

スキルとエージェントを、使いたいプロジェクトの `.claude/` にコピーします。

```bash
mkdir -p .claude/skills .claude/agents
cp -r plugins/kiro-bridge/skills/*  .claude/skills/
cp -r plugins/kiro-bridge/agents/*  .claude/agents/
```

グローバルに使いたい場合は `~/.claude/skills/`・`~/.claude/agents/` にコピーします。

## 使い方の例

```
/kiro-review                      # 未コミット差分を Kiro にレビューさせる
/kiro-review base main            # main との差分をレビュー
/kiro-review src/foo.ts           # 指定ファイルをレビュー（git なしでも可）

/kiro-ask この再試行設計は妥当？指数バックオフと比べて
```

自然文（「Kiro にレビューして」「kiro の意見も聞いて」）でも発動します。

## Kiro に文脈（ファイル）を渡す

スキルは、タスク/差分から**明らかに必要なファイルを特定し、その内容ごと** Kiro に
渡します（パスを名指しして Kiro に開かせるのではなく、渡し切る）。渡し方は次の通り:

- **プロンプト引数に短い指示、詳細は stdin が正準**（`kiro-cli chat --no-interactive
  [flags] "<短い指示>" <<'EOF' … EOF`）。プロンプト引数は必須のためコマンド自体には
  必ず指示文を渡し、対象ファイルの内容など長くなりうる部分は stdin に寄せます。
- 大きすぎる場合は「全文 → 関連抜粋 → `git diff` → パス名指し」の順に降格します。
- 追加で渡したいファイルは `@path` で明示指定できます。

## トラブルシュート

| 症状 | 原因 | 対処 |
|------|------|------|
| 「kiro-cli が見つかりません」 | 未導入 | Kiro CLI をインストールし、`kiro-cli --version` を確認 |
| 「kiro-cli が未認証です」 | 未ログイン / API キー未設定 / サブスクリプション不足 | Kiro にログイン、または `KIRO_API_KEY` を設定。ヘッドレス実行には Pro 以上が必要 |
| `--trust-tools` がエラーになる／指定ツール名が通らない | バージョン差でフラグ・ツール名が異なる | `kiro-cli chat --help` で確認。エージェント本文のコマンド例を実環境に合わせて調整 |
| 出力が空・途中で切れる | プロンプト引数の長さ制限、または MCP 起動待ちで超過 | 詳細を stdin 側に寄せる。`--require-mcp-startup` 等の起動系フラグの要否を確認 |

## 安全方針

- 既定ツール許可: `--trust-tools=read` 固定（read-only）。
- `--trust-all-tools`、および write/shell を含む `--trust-tools` 指定は**テンプレートでは
  使いません**。
- Kiro の生出力はサブエージェント内に隔離し、メインセッションには要約のみを返します。
- 実装をコードとして直接書かせるスキルは持ちません（「なぜこの構成か」参照）。

## ライセンス・出典

[MIT License](../LICENSE)。Kiro CLI の仕様（[headless モード](https://kiro.dev/docs/cli/headless/)・
[ツール権限](https://kiro.dev/docs/cli/chat/permissions/)）を参照し、本リポジトリの
[`codex-bridge`](../codex-bridge/) と同型の構成で実装した独自実装です（コードのコピーでは
ありません）。
