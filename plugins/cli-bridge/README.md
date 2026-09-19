# cli-bridge — 外部の AI コーディング CLI（Codex・Kiro）に相談・レビューを委譲する

Claude Code から **OpenAI Codex** と **Kiro** に相談・レビューを依頼するためのスキル4種と
サブエージェント3種です。**ユーザー自身は外部 CLI を直接操作しません**。Claude Code が
各 CLI を**非対話・read-only** で Bash 越しに駆動し、生出力をサブエージェント内に隔離して
要約だけを返します。

| スラッシュコマンド | 役割 | 権限 | 委譲先エージェント |
|-------------------|------|------|-------------------|
| `/codex-ask <相談内容>` | 設計相談・セカンドオピニオンを Codex に答えさせ要約（コードは書かない） | `--sandbox read-only` | `codex-advisor` |
| `/codex-agents [--project-only]` | 既存の Claude ルール（CLAUDE.md 等）を取り込んだ `AGENTS.md` を生成 | —（ローカル生成） | —（スクリプト） |
| `/kiro-review [スコープ]` | 差分/指定ファイルを Kiro にレビューさせ、重大度 P1–P4 で要約 | `--trust-tools=read` | `kiro-reviewer` |
| `/kiro-ask <相談内容>` | 設計相談・セカンドオピニオンを Kiro に答えさせ要約（コードは書かない） | `--trust-tools=read` | `kiro-advisor` |

さらに、**プラン提示前に Codex レビューを挟む opt-in フック**（`plan-review-codex.sh`）と、
**セッション開始時に `AGENTS.md` を再生成する常時フック**（`hooks.json`）を同梱します（後述）。

## Codex へのレビュー・実装の委譲は公式プラグインを使ってください

OpenAI 公式の **[openai/codex-plugin-cc](https://github.com/openai/codex-plugin-cc)** が
Claude Code プラグインとして配布されており、レビューと実装委譲はそちらが広くカバーします
（`/codex:review`・`/codex:adversarial-review`・`/codex:rescue`・`/codex:transfer` と、
`/codex:status`・`/codex:result`・`/codex:cancel` のバックグラウンドジョブ管理）。

```
/plugin marketplace add openai/codex-plugin-cc
/plugin install codex@openai-codex
```

出典: [openai/codex-plugin-cc README](https://github.com/openai/codex-plugin-cc)（2026-09-19 取得）。
要件は Node.js 18.18 以降と、ChatGPT サブスクリプション（Free 含む）または OpenAI API キー。

**このプラグインが担当するのは、公式に無い2つと Kiro 側です。**

- `/codex-ask` — read-only の**自由質問**（公式は review / rescue / transfer の3系統で、
  「コードを書かせずに相談だけする」入口を持たない）
- `/codex-agents` — **AGENTS.md の生成・同期**（公式プラグインは既存の AGENTS.md を
  Codex CLI が読むことに依存し、生成はしない）
- `/kiro-review`・`/kiro-ask` — Kiro 側には公式相当のプラグインが見つかっていない

## 旧 codex-bridge / kiro-bridge からの移行

2026-09-19 に `codex-bridge` を廃止し、`kiro-bridge` を `cli-bridge` へ改名して統合しました。

| 旧 | 新 |
|---|---|
| `/codex-review` | 公式プラグインの `/codex:review`（敵対的レビューは `/codex:adversarial-review`） |
| `/codex-implement` | 公式プラグインの `/codex:rescue` |
| `/codex-ask`・`/codex-agents` | 変更なし（このプラグインに収録） |
| `/kiro-review`・`/kiro-ask` | 変更なし（このプラグインに収録） |
| `plugin install codex-bridge@workbench-ja` | 廃止 |
| `plugin install kiro-bridge@workbench-ja` | `plugin install cli-bridge@workbench-ja` |

マーケットプレイス定義に `renames`（`kiro-bridge` → `cli-bridge`、`codex-bridge` → `null`）を
入れてあるので、Claude Code v2.1.193 以降なら `enabledPlugins`・`pluginConfigs` のキーは
自動で書き換わり、通知が1回出ます。ただし**リモートソースでは改名後に `plugin-cache-miss` に
なるため、`/plugin install cli-bridge@workbench-ja` を一度だけ実行**してください。
出典: [Plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)（2026-09-19 取得）。

生成ずみの `AGENTS.md` は**そのまま使えます**。所有判定のセンチネルは旧
`codex-bridge:generated` も受け付け、次の再生成で新しい印に置き換わります。
`plan-review-codex.sh` の状態ディレクトリ（`.claude/codex-bridge/`）は、進行中セッションの
ゲートが二重に開くのを避けるため**意図的に旧名のまま**です。

## なぜこの構成か

- **スキル（入口）／エージェント（実行）の分業**: スキルは発動条件・入力整理・結果提示を担い、
  実際の CLI 実行はサブエージェントに委譲します。外部 CLI の冗長な出力（進捗・JSONL・全文）を
  メインの文脈から隔離し、要約だけを返すためです。
- **安全側を既定に**: Codex は `--sandbox read-only`、Kiro は `--trust-tools=read` に固定。
  `--yolo` / `--dangerously-bypass-approvals-and-sandbox` / `danger-full-access` /
  `--trust-all-tools` と、非推奨の `--full-auto` は**テンプレートでは使いません**。
  より緩い権限が必要な場合に選ぶのは利用者の責任です。
- **Kiro には実装委譲スキルを持たせない**: Codex CLI には `--sandbox workspace-write` という
  OS レベルの隔離がありますが、kiro-cli の `--trust-tools` は「どのツールカテゴリを確認なしで
  実行してよいか」を指定する仕組みで、`write`/`shell` を信頼リストに入れると**サンドボックス
  隔離なしに**ファイル書き込み・シェル実行が走ります。この差を埋めずに `implement` 系を
  足すのは安全側の既定にならないため、Kiro は read-only 限定です。
- **Kiro 側の権限モデル**: ケイパビリティは `fs_read` / `fs_write` / `shell` / `web_fetch` / `mcp`、
  エフェクトは `deny`（常に拒否）/ `ask`（確認）/ `allow`（黙って実行）で、**deny はスコープに
  関わらず常に勝ちます**。ただしこれはプロセス内の許可判定であって、Codex の `--sandbox` のような
  **OS レベルの隔離についての記述は公式ドキュメントに見当たりません**（無いことの証明ではなく、
  一次情報で確認できなかったということです）。上の read-only 限定はこの前提に基づきます。
  出典: [Kiro Permissions](https://kiro.dev/docs/permissions/)
- **モデル名をテンプレートに焼き込みません**（公式が非推奨モデルへの参照更新を求めており
  陳腐化するため）。重要な判断を任せたいときは利用者が `config.toml` の `model` か `-m` で
  明示してください。

## 前提

1. **CLI の導入** — 使う側だけでかまいません。Codex は `codex --version`、Kiro は
   `kiro-cli --version` で確認します。Windows では Codex 自体が WSL を推奨/必要とする場合が
   あります（環境依存）。
2. **認証** — Codex は ChatGPT ログインまたは `OPENAI_API_KEY`。Kiro は Kiro へのログインまたは
   `KIRO_API_KEY` で、非対話（ヘッドレス）実行には Pro 以上のサブスクリプションが必要です
   （[Kiro 公式ドキュメント](https://kiro.dev/docs/cli/headless/)）。
3. **シェル（フック/スクリプトを使う場合）** — 同梱の `.sh` は bash 系です。**Windows では
   Git Bash か WSL** が前提。**`jq` は不要**です。
4. **フラグの環境差** — `kiro-cli chat` のフラグ・プロンプト引数の扱いはバージョンで異なりうるため、
   各サブエージェントは `kiro-cli chat --help` で実体を確認する前提で書かれています。最新の一覧は
   [CLI commands](https://kiro.dev/docs/reference/cli-commands/) と
   [Headless mode](https://kiro.dev/docs/cli/headless/) にあります。

> 未導入・未認証のまま起動した場合、サブエージェントが `command -v` と認証エラー文言を検知し、
> raw なエラーを出さずに日本語で案内して終了します。

## ファイル構成

```
cli-bridge/
├── README.md
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   ├── codex-ask/SKILL.md
│   ├── codex-agents/SKILL.md   # AGENTS.md ジェネレータ（/codex-agents）
│   ├── kiro-review/SKILL.md
│   └── kiro-ask/SKILL.md
├── agents/
│   ├── codex-advisor.md        # read-only
│   ├── kiro-reviewer.md        # read-only
│   └── kiro-advisor.md         # read-only
└── hooks/
    ├── hooks.json              # SessionStart で AGENTS.md を再生成（常時ON・再生成のみ）
    ├── gen-agents-md.sh        # AGENTS.md 生成スクリプト
    └── plan-review-codex.sh    # プラン提示前→Codex レビュー（opt-in）
```

## 導入方法

### 方法1: プラグインで導入する

```
/plugin marketplace add mrkxlia/claude-code-workbench-ja
/plugin install cli-bridge@workbench-ja
```

> **Kiro だけが目的の場合の注意**: プラグインを入れると `hooks.json` により
> `SessionStart`（startup/resume）で `gen-agents-md.sh --auto` が走ります。これは
> **既存の生成物を最新化するだけ**で、`AGENTS.md` が無ければ何もしません（プロセス1つ分の
> コストだけ）。止めたい場合はコピー導入にして `hooks/` を持ち込まないでください。

### 方法2: コピーして導入する

```bash
mkdir -p .claude/skills .claude/agents .claude/hooks
cp -r plugins/cli-bridge/skills/*  .claude/skills/
cp -r plugins/cli-bridge/agents/*  .claude/agents/
cp plugins/cli-bridge/hooks/gen-agents-md.sh \
   plugins/cli-bridge/hooks/plan-review-codex.sh  .claude/hooks/
```

グローバルに使いたい場合は `~/.claude/skills/`・`~/.claude/agents/` にコピーします。

> フックはコピーしただけでは動きません。下記「プランを提示する前に Codex にレビューさせる」
> 「Claude のルールを Codex にも効かせる」を参照して `.claude/settings.json` に登録してください
> （プラグイン導入なら `hooks.json` 由来の AGENTS.md 再生成は自動）。

## 使い方の例

```
/codex-ask この再試行設計は妥当？指数バックオフと比べて
/codex-agents                     # CLAUDE.md 等から AGENTS.md を生成・更新

/kiro-review                      # 未コミット差分を Kiro にレビューさせる
/kiro-review base main            # main との差分をレビュー
/kiro-review src/foo.ts           # 指定ファイルをレビュー（git なしでも可）
/kiro-ask この再試行設計は妥当？
```

自然文（「Codex に相談して」「Kiro にレビューして」）でも発動します。相手を名指ししない
「セカンドオピニオンがほしい」では発動しません（内蔵の Task サブエージェントに任せます）。

## 外部 CLI に文脈（ファイル）を渡す

スキルは、タスク/差分から**明らかに必要なファイルを特定し、その内容ごと**渡します
（パスを名指しして開かせるのではなく、渡し切る）。

- **Codex は stdin / heredoc が正準**（`codex exec [flags] - <<'EOF' … EOF`）。`/tmp` のファイルは
  サンドボックス下で codex が読めないことがあるため既定にしません。
- **Kiro はプロンプト引数に短い指示、詳細は stdin**（`kiro-cli chat --no-interactive [flags]
  "<短い指示>" <<'EOF' … EOF`）。プロンプト引数が必須のためです。
- 大きすぎる場合は「全文 → 関連抜粋 → `git diff` → パス名指し」の順に降格します。
- 追加で渡したいファイルは `@path` で明示指定できます。

## Claude のルールを Codex にも効かせる（AGENTS.md 生成）

普段 Claude Code しか使わない人向けに、既存の Claude ルールを取り込んだ **`AGENTS.md`** を
生成します。Codex が読むのは CLAUDE.md ではなく `AGENTS.md` ですが、`AGENTS.md` は `@import`
非対応のため、**中身を取り込んだ（`@import` も展開した）平らな `AGENTS.md`** を
マテリアライズして橋渡しします。

| ソース | 出力先 |
|--------|--------|
| `~/.claude/CLAUDE.md`（home） | `$CODEX_HOME/AGENTS.md`（既定 `~/.codex/AGENTS.md`・全 Codex セッション共通） |
| プロジェクト `CLAUDE.md` ＋ `.claude/*.md`・`.claude/rules/*.md`（小ルール・深さ1） | `<プロジェクト>/AGENTS.md` |

- **手動**: `/codex-agents`（`--project-only` で home をスキップ）。**新規作成もできます**。
- **自動**: プラグイン導入時は `SessionStart`（startup/resume）で `gen-agents-md.sh --auto` が走り、
  **既存の生成物を最新化するだけ**（新規作成しません）。初回は `/codex-agents` で作成してください。
- **安全策**: 生成物は1行目にセンチネルを持ち、**手書きの `AGENTS.md`（センチネル無し）は
  上書きしません**。生成済みは**差分があるときだけ**更新します。生成された `AGENTS.md` は
  再生成物なので、**手編集せず CLAUDE.md 側を更新**してください（コミットしたくなければ
  `.gitignore` 推奨）。旧 `codex-bridge` 時代のセンチネルも所有印として受け付けます。
- Codex の AGENTS.md 階層連結（グローバル＋プロジェクト、後勝ち）の仕様はバージョンで
  変わりうるため、実環境の挙動を確認のうえ利用してください。

## プランを提示する前に Codex にレビューさせる（opt-in）

Claude Code のプランモードで、**プランがユーザーに提示される前**に Codex のレビューを1回挟む
連携です。`PreToolUse`（matcher `ExitPlanMode`）フックが `permissionDecision: "deny"` を返し、
Claude は「先に `/codex-ask` でプランをレビューさせ、致命的な指摘を反映してから出し直せ」という
**固定文字列**の理由を受け取ります。

**なぜ `deny` なのか。** `additionalContext` を足すだけでは ExitPlanMode 自体は成立し、プランが
そのまま提示されうるためです（ExitPlanMode に対するフック実行とプラン提示の前後関係は公式
ドキュメントに記載がありません）。`deny` なら ExitPlanMode が成立しないので、仕様の穴に依存せず
「レビューが先」という順序が決まります。

**フック自身は codex を呼びません。** 呼ぶとフックが数十秒ブロックし、Codex の出力を JSON に
埋めるため `jq` とエスケープが要り、外部モデルの出力を無検証で文脈へ注入する経路もできます。
実行は `codex-advisor`（`--sandbox read-only` 固定・未導入時は日本語で案内）に委譲します。

```json
{"hooks":{"PreToolUse":[{"matcher":"ExitPlanMode",
  "hooks":[{"type":"command","command":"bash \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/plan-review-codex.sh"}]}]}}
```

- スクリプトは `mkdir -p .claude/hooks && cp plugins/cli-bridge/hooks/plan-review-codex.sh .claude/hooks/` で配置。
- **deny は1セッション1回まで**。状態ファイル `.claude/codex-bridge/plan-reviewed-<session_id>` を
  作った時点でゲートは開き、改訂後の再提示はそのまま通ります（**構造的にループしません**）。
  この状態ファイルは `.gitignore` に入れることを推奨します（`.claude/codex-bridge/`）。
- **異常系は素通り**（`session_id` が取れない・状態ファイルを作れない場合は deny しません）。
  codex が未導入・未認証のときはレビューを飛ばして再提示してよい旨を理由文に含めてあるため、
  プランモードが詰まることはありません。
- **適用条件**: プラン提示のたびに Codex の課金とレイテンシが発生します。**設計判断を含む
  プロジェクトにだけ配線**してください（typo 修正のプランでも走ります）。既定を「発火しない」に
  するために opt-in にしてあります。

> 公式プラグインにも Stop フックによるレビューゲートがありますが、README が
> 「Claude / Codex の長いループになり利用上限を急速に消費しうる」と注意しています。
> 併用するなら片方だけを有効にしてください。

## トラブルシュート

| 症状 | 原因 | 対処 |
|------|------|------|
| 「codex CLI が見つかりません」 | 未導入 | Codex CLI をインストールし、`codex --version` を確認 |
| 「kiro-cli が見つかりません」 | 未導入 | Kiro CLI をインストールし、`kiro-cli --version` を確認 |
| 「未認証です」と案内される | 未ログイン / APIキー未設定 / サブスクリプション不足 | ChatGPT ログインか `OPENAI_API_KEY`、Kiro ログインか `KIRO_API_KEY`（ヘッドレスは Pro 以上） |
| `--trust-tools` がエラーになる／ツール名が通らない | バージョン差でフラグ・ツール名が異なる | `kiro-cli chat --help` で確認し、エージェント本文のコマンド例を実環境に合わせる |
| 出力が空・途中で切れる | プロンプト引数の長さ制限、または MCP 起動待ちで超過 | 詳細を stdin 側に寄せる。`--output-format stream-json` への切り替えも検討（[Headless mode](https://kiro.dev/docs/cli/headless/)） |
| プランが提示されず「先にレビューせよ」と返る | `plan-review-codex.sh` を配線している（仕様どおり） | `/codex-ask` でプランをレビューさせ、P1・P2 を反映して再提示。ゲートは1セッション1回だけ |
| プラン提示前レビューのフックが効かない | 配線漏れ／`session_id` が取れない／状態ファイルを作れない | `.claude/settings.json` の `PreToolUse` 登録を確認。異常系は**安全側に素通り**する設計 |
| `AGENTS.md` が更新されない | 手書き（センチネル無し）でガード／取り込むソースが無い／`--project-only` | 既存 AGENTS.md を退避するか `/codex-agents` で再生成。CLAUDE.md 等のソース有無を確認 |
| Windows で `bash\r` エラー | `.sh` が CRLF | リポジトリ直下の `.gitattributes`（`*.sh text eol=lf`）で LF に正規化。Git Bash/WSL を使用 |

## 安全方針

- 既定は全スキル read-only（Codex は `--sandbox read-only`、Kiro は `--trust-tools=read`）。
  **このプラグインは書き込みを伴う委譲スキルを持ちません**（実装委譲は公式プラグインの
  `/codex:rescue` へ）。
- 危険フラグ（`--yolo` / `--dangerously-bypass-approvals-and-sandbox` / `danger-full-access` /
  `--trust-all-tools`）と非推奨の `--full-auto` は使いません。
- 外部 CLI の生出力はサブエージェント内に隔離し、メインセッションには要約のみを返します。
- フックが出力するのは**ユーザー入力を含まない定数 JSON** だけです（外部モデルの出力を
  フック経由で文脈に注入しません）。

## ライセンス・出典

[MIT License](../../LICENSE)。各 CLI の仕様を参照した独自実装です（コードのコピーではありません）。

- OpenAI Codex CLI ドキュメント（non-interactive / command line options）
- [openai/codex-plugin-cc](https://github.com/openai/codex-plugin-cc)（公式プラグイン・2026-09-19 取得）
- Kiro CLI（[headless モード](https://kiro.dev/docs/cli/headless/)・[ツール権限](https://kiro.dev/docs/cli/chat/permissions/)）
- eddiearc/codex-delegator（委譲スキルのプロンプト型）
- hamelsmu/claude-review-loop（レビューループ plugin の構成）

廃止の経緯は [`docs/decisions/2026-09-19-retire-codex-bridge-and-cli-bridge.md`](../../docs/decisions/2026-09-19-retire-codex-bridge-and-cli-bridge.md) を参照してください。
