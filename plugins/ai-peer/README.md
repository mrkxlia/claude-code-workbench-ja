# ai-peer — ピア相談・セカンドオピニオンを依頼するスキル＆エージェント

設計・方針・行き詰まりについて**第二の視点**を得るための Claude Code スキル2種とサブエージェント
2種です。同じ「相談する」目的でも、**どのエンジンに聞くか**で依存と独立性が変わります。

| スラッシュコマンド | 相談相手 | 依存 | 委譲先エージェント |
|-------------------|---------|------|-------------------|
| `/peer [plan\|brainstorm\|review] <題材>` | **内部 Claude サブエージェント** | **なし（CLI/git/ネット不要）** | `peer-engineer` |
| `/ask-claude <相談内容>` | **別プロセスの Claude** | `claude` CLI | `claude-advisor` |

> **Codex に相談・レビュー・実装を頼みたいときは [`codex-bridge`](../codex-bridge/) を使ってください**
> （`/codex-ask`・`/codex-review`・`/codex-implement`）。ai-peer は「内部ピア」と「別 Claude」を担当します。

## どれを選ぶか

- **依存を増やしたくない・オフライン・git なし環境 → `peer`**。外部 CLI もネットワークも使わず、
  内部の Claude サブエージェントが fresh context で独立した視点を返します。
- **別プロセスの Claude による独立性が欲しい → `ask-claude`**（`claude` CLI が必要）。
- **別エンジン（OpenAI Codex）の視点が欲しい → `codex-bridge` の `/codex-ask`**。
- **行レベルのコードレビューが欲しい → 内蔵 `/code-review` か `/codex-review`**。
  ai-peer の `peer` は**実装前のプランレビューと発想支援**に軸足を置き、コードレビューは再実装しません。

## なぜこの構成か

- **スキル（入口）／エージェント（実行）の分業**: スキルは発動条件・入力整理・結果提示を担い、
  実際の相談実行はサブエージェントに委譲します。別 Claude の冗長な出力をメイン文脈から隔離し、
  要約だけを返すためです（codex-bridge と同じ設計）。
- **依存の勾配を明示**: `peer`（依存ゼロ）→ `ask-claude`（claude CLI）→〔Codex は codex-bridge〕。
  もっとも軽い `peer` が git なし環境の中核です。
- **安全側を既定に**: `ask-claude` は別 Claude を `--permission-mode plan`（編集不可）＋ `--allowedTools`
  読み取り限定で起動し、相談中の意図しないファイル編集を**実フラグで**防ぎます。

## 前提

- **`peer`** … 追加の前提なし（Claude Code だけで動く）。
- **`ask-claude`** … `claude` CLI が導入・認証済みであること（`claude --version` で確認）。
  未導入・未認証の場合、サブエージェントが日本語で案内して終了します（依存なしで相談したいなら `peer`）。

## ファイル構成

```
ai-peer/
├── README.md
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   ├── peer/SKILL.md          # /peer（内部・依存ゼロ）
│   └── ask-claude/SKILL.md    # /ask-claude（claude CLI）
└── agents/
    ├── peer-engineer.md       # 内部サブエージェント（read-only ツールのみ・外部CLI不使用）
    └── claude-advisor.md      # claude CLI を非対話・読み取り専用で駆動
```

## 導入方法

### 方法1: プラグインで導入する

```
/plugin marketplace add mrkxlia/claude-code-workbench-ja
/plugin install ai-peer@workbench-ja
```

### 方法2: コピーして導入する

スキルとエージェントを、使いたいプロジェクトの `.claude/` にコピーします。

```bash
mkdir -p .claude/skills .claude/agents
cp -r plugins/ai-peer/skills/*  .claude/skills/
cp -r plugins/ai-peer/agents/*  .claude/agents/
```

グローバルに使いたい場合は `~/.claude/skills/`・`~/.claude/agents/` にコピーします。

## 使い方の例

```
/peer plan このリトライ設計をレビューして（指数バックオフ＋上限3回…）
/peer brainstorm キャッシュ無効化の方針が決まらない。案を広げて
/peer この命名は妥当？別案ある？

/ask-claude この再試行設計は妥当？別 Claude の意見も聞きたい
```

自然文（「ピアに相談して」「壁打ちして」「別の Claude に聞いて」）でも発動します。

## ライセンス・出典

[MIT License](../LICENSE)。ピア相談（`peer` の内部サブエージェント完結）と ask 系（各 AI CLI を
非対話で叩く）の構成は、以下を参考にした独自実装です（コードのコピーではありません）。

- hiroro-work/claude-plugins（`peer`＝内部サブエージェントで完結するピア／`ask-claude`・`ask-codex`
  などの「他 AI に第二意見を聞く」スキル群のコンセプト）
- 委譲スキル＝サブエージェントで実行を隔離する構成は、本リポジトリ `codex-bridge` と同型
