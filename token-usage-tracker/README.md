# token-usage-tracker — AIエージェント トークン消費トラッカー

Claude Code・Codex・Cline などの AI コーディングエージェントが残す**ローカルログ**を解析し、
**どのリポジトリ・どのタスク（セッション）・どのモデル・どのツールで**どれだけトークン／コストを
消費したかを集計・可視化する独立ツールです。

Azure AI Foundry 経由（API キー利用）でも、トークン数・モデル名・リポジトリ（cwd）は
各ツールのローカルログにそのまま残るため、追加のプロキシやクラウド連携なしで集計できます。

> 目的: コスト意識を持つための「見える化」。最終的には「このタスクなら安いモデルで十分では?」と
> いったコスト削減の判断材料に使うことを見据えています。

## 対応状況

| ツール | 状況 | ログ保存場所 |
|--------|------|-------------|
| **Claude Code** | ✅ 対応済み（M1） | `~/.claude/projects/<cwdをハイフン化>/<sessionId>.jsonl`（サブエージェントは `.../subagents/agent-*.jsonl`） |
| **Codex CLI** | 🚧 予定（M3） | `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl` |
| **Cline** | 🚧 予定（M3） | VSCode globalStorage `saoudrizwan.claude-dev/tasks/<id>/` |

## インストール（uv）

パッケージ管理は [uv](https://docs.astral.sh/uv/) に統一しています。

```bash
cd token-usage-tracker
uv sync                      # CLI のみ
uv sync --extra dashboard    # Web ダッシュボードも使う場合
```

## 使い方（CLI）

```bash
# 1) ローカルログを取り込む（既定で ~/.claude/projects を走査、~/.tokentracker/usage.db に保存）
uv run tokentracker ingest

# 2) 集計表を見る
uv run tokentracker repo       # リポジトリ別
uv run tokentracker model      # モデル別
uv run tokentracker agent      # ツール(エージェント)別
uv run tokentracker session    # セッション(タスク)別
uv run tokentracker daily      # 日次（既定 Asia/Tokyo で日付を区切る）
```

共通オプション:

- `--db PATH` … SQLite ファイル（既定 `~/.tokentracker/usage.db`）
- `--since YYYY-MM-DD` / `--until YYYY-MM-DD` … 期間で絞り込み
- `--tz Asia/Tokyo` … 日次バケットのタイムゾーン
- `--json` … 機械可読な JSON 出力
- `--include-subagents` / `--exclude-subagents` … サブエージェント分の集計ロールアップ切替

`ingest` は何度実行しても安全です（`UNIQUE(source, message_id)` で冪等。重複加算されません）。
cron などで定期実行できます。

## 使い方（Web ダッシュボード）

```bash
uv run --extra dashboard streamlit run tokentracker/dashboard.py \
    --server.address=127.0.0.1 --server.headless=true
```

ローカル完結（外部送信なし）。リポジトリ／モデル／ツール／期間でフィルタし、日次推移グラフと
軸別集計を表示します。

## コスト単価について（重要）

`tokentracker/pricing.py` の `DEFAULT_PRICES` は**ひな型**です。

- 知りたいのは Anthropic 定価ではなく **Azure Foundry の実課金レート**のはずなので、
  自社の課金単価に合わせて上書きしてください（1M トークンあたりの USD）。
- 単価は **トークン種別ごと**に分けています: `input` / `output` /
  `cache_write_1h` / `cache_write_5m` / `cache_read`（read は割引、write は 1h>5m）。
- 単価が**未登録のモデル**は「未割当トークン」として別計上され、判明コストに紛れ込みません
  （静かに 0 円化しない）。集計表の「未割当tok」列に出ます。
- Foundry のデプロイ名が正規モデル ID と異なる場合は `MODEL_ALIASES` にマッピングを追加します。
  日付サフィックス（例 `claude-...-20251001`）は自動で基底 ID に解決されます。

## 集計の正確性（実環境ログで検証済み）

- Claude Code は 1 つの API 応答（`message.id`）が**最大 5 行重複**して JSONL に出力されます。
  本ツールは `message.id` を一意キーに **1 件へ畳み**（重複加算を防止）、ストリーミング途中の
  部分行に備えて `output_tokens` が最大の行を採用します。
- サブエージェントは別ファイルに記録され、各行が `agentId`/`cwd` を持つため、
  リポジトリ割当を保ったまま `is_subagent` フラグで識別・集計切替できます。
- `cache_creation` の 1h / 5m TTL を別フィールドに保持し、単価差を反映できます。
- `server_tool_use`（web 検索／取得の件数課金）は件数列として保持しますが、別建て従量課金の
  ため現状コスト計算の対象外です。

## 開発（TDD）

テスト駆動で開発しています。代表ケース（5重複の dedup、サブエージェント分離、非usage行の除外、
1h/5m 分離、`top-level == sum(iterations)`、未割当コストの別計上、TZ バケット）を
`tests/` に固定しています。

```bash
uv run pytest
```

## ライセンス／参考

MIT License（リポジトリ全体に従う）。設計の参考に
[ccusage](https://github.com/ryoppippi/ccusage)（JSONL パース・コスト計算）と
[tokscale](https://github.com/junhoyeo/tokscale)（Workspace/Session/Model 集計軸）を参照しています
（コードのコピーはせず、設計のみ参照）。
