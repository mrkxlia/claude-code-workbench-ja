# progress — スキルの進み具合を statusline と HTML 1枚で見る

workbench-ja の各スキルが残す状態ファイルを読み、**いまどこまで進んでいて、何があなたの判断を待っているか**を
Claude Code のステータスライン（1行）と `.dashboard/index.html`（1枚）に出すスクリプトです。

- **LLM を使いません。** Python 3 の標準ライブラリだけで動く決定的スクリプトなので、トークン費用は0です
- **状態ファイルは読むだけで、書き換えません。** 書くのは `.dashboard/` 配下だけです。その中に `.gitignore`（中身は `*`）を自分で置くので、
  あなたのリポジトリのコミットに混ざりません
- **判断待ちは表示するだけです。** 作業を「既定の動作で先に進める」ことはしません（成果物が変わる判断は人間がする、という前提を崩さないため）

## 何を読むか

| 読むファイル | 書くスキル | 表示するもの |
|---|---|---|
| `docs/pipeline/*/status.md` | pipeline の `feature-pipeline` | 現在のフェーズ、承認待ち（🛑）、差し戻し回数 |
| `docs/task-pipeline/*/status.md` | pipeline の `task-pipeline` | 同上 |
| `.claude/self-correct/state.json` | self-correct の `self-correct` | ラウンド数、判定、未解決の指摘 ID。`ESCALATED` は判断待ちとして出す |

無いファイルは黙って飛ばします。どれも無ければ、statusline は空行、HTML は「進行中の作業なし」になります。

**承認待ちの判定。** pipeline の status.md では、未チェック行の 🛑 は「そのフェーズの終わりにある関門」です。
そのため次のように判定します。

- その行の成果物（例: `brief.md 保存` の `brief.md`）が既にあるときだけ「承認待ち」と表示します
- 成果物がまだ無いときは「次の関門」として予告します
- 最終レビュー（Phase 7）のように成果物ファイルが無い関門は、承認待ちかどうか判別できません。この場合も「次の関門」と表示します

## 使い方

### 1. statusline に出す（推奨）

`~/.claude/settings.json`（またはプロジェクトの `.claude/settings.json`）に追記します。`<path>` はこのファイルを置いた場所に置き換えてください。

```json
{
  "statusLine": {
    "type": "command",
    "command": "python3 <path>/tools/progress/progress.py statusline"
  }
}
```

表示例:

```
pipeline:login Phase3 🛑ブリーフ承認待ち | self-correct:drafts/article.md 2/3 FAIL(2)
```

statusline が呼ばれるたびに、前回から30秒以上たっていれば `.dashboard/index.html` も作り直します。

### 2. HTML を開く

statusline を設定していれば、`.dashboard/index.html` は自動で更新され続けます。ブラウザで開いたままにすると、10秒ごとに読み直します。
画面の一番上には生成時刻を大きく表示します。表示が古い場合は、statusline が動いていない（Claude Code を閉じている等）ということです。

statusline を使わない場合は、手動で作ります。

```bash
python3 tools/progress/progress.py html          # カレントディレクトリが対象
python3 tools/progress/progress.py html /path/to/repo
```

ライト/ダークは OS の設定（`prefers-color-scheme`）に従います。

## これで足りないもの（本体機能を使う）

- **並行して動かしている複数セッション・バックグラウンドのサブエージェントの状態**は、本体の `claude agents`（agent view）で見ます
  - 状態（working / blocked / idle 等）と1行の要約が、15秒ごとに更新されます
- **離れた場所から見る・入力待ちの通知を受ける**には、本体の Remote Control とモバイル通知を使います
- 出典: [Agent view](https://code.claude.com/docs/en/agent-view)（2026-10-03 取得）

## 制約

- Python 3 が必要です。Python が無い環境（会社 PC プロファイル等）では使えません
- 読むのは上表のファイルだけです。ファイルへ進捗を残さないスキルの状態は出ません
- 状態ファイルの書式は各スキルの SKILL.md のテンプレートに従います。テンプレートを変えたら、このスクリプトの解析も見直してください

## ファイル構成

```
tools/progress/
├── README.md      # このファイル
└── progress.py    # 本体（statusline / html の2コマンド）
```

設計の経緯は [`docs/decisions/2026-10-03-skill-usability-and-mattpocock.md`](../../docs/decisions/2026-10-03-skill-usability-and-mattpocock.md) を参照してください。
