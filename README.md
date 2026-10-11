# claude-code-workbench-ja — Claude Code リソース・テンプレート集

Claude Code をより快適に使うためのプラグイン・テンプレート・ベストプラクティスをまとめたリポジトリです。
各プラグインは独立しているので、必要なものだけ入れてください（入れすぎるとスキルの説明が文脈から省かれます）。

> この README は「何を入れるか」を決めるための索引です。使い方・設計・コピー導入の手順は各プラグインの README にだけ書いています。

## 導入

```
/plugin marketplace add mrkxlia/claude-code-workbench-ja
/plugin install <プラグイン名>@workbench-ja
```

マーケットプレイスが使えない環境では `git clone --depth 1 https://github.com/mrkxlia/claude-code-workbench-ja` して、
各プラグイン README の手順でコピーします。私用PC（Opus+Sonnet）・会社PC（Sonnet 単独）での使い分けは [model-setup](plugins/model-setup/) を参照。

## はじめに: どこから始める？

1. **個人の運用ルールを整える** — `model-setup`（新規・既存を問わず、ユーザー設定に一度入れれば全プロジェクトで効く）。
2. **何を作るかで土台を選ぶ**
   - コードで機能開発する → [obra/superpowers](https://github.com/obra/superpowers)（このリポジトリには同等品を置かない）
   - 図・ドキュメント・レポート・設計書・マニュアルを作る → `pipeline` の `/pipeline:pipeline-setup`
3. **既存リポジトリなら、先に現状を仕様化する（推奨）** — [daishir0/cc-rsg](https://github.com/daishir0/cc-rsg) 等で `SPEC.md` を逆引きしてから導入する。
   大きなリポジトリ（モノレポ・数十万行以上）は先に公式 [Monorepos and large repos](https://code.claude.com/docs/en/large-codebases) で足場を整える。
4. それ以外のプラグインは、いつ追加してもよい。

## プラグイン一覧

「自動」欄は、導入するだけで常時発火するフックの有無です（それ以外はスキル・エージェントを頼んだときだけ動く）。

| プラグイン | 何をするか | 主な入口 | 自動 |
|---|---|---|---|
| [pipeline](plugins/pipeline/) | コード以外の成果物を、調査→要件→ブリーフ→作成→レビューのエージェント連鎖と3つの承認点で作る。設計書・マニュアル用のスキルも同梱 | `/pipeline-setup`・`/task-pipeline`・`/design-docs`・`/manual-write`・`/manual-check` | 導入先へコピー（機密コミット防止・書き込みガード・SPEC 注入・更新漏れ通知） |
| [cli-bridge](plugins/cli-bridge/) | 外部の AI コーディング CLI（Codex・Kiro）に read-only で相談・レビューを任せる | `/codex-ask`・`/kiro-ask`・`/kiro-review` | なし（プラン前レビューは手動配線の opt-in） |
| [agent-review-panel](plugins/agent-review-panel/) | 複数ペルソナの敵対的パネルレビュー（ブラインド並列→相互批判→統合）。`deep`・`codex`・`kiro` で拡張 | `/review-panel` | なし |
| [adoption-review](plugins/adoption-review/) | 外部の技術・OSS・論文・ポストを Web の一次情報から敵対的に評価し、採用可否を判定する | `/adoption-review` | なし |
| [model-setup](plugins/model-setup/) | Opus+Sonnet / Sonnet 単独の運用ルール（CLAUDE.md テンプレート・追補・設定サンプル）と fresh context 検証 | `/verify-fresh` | なし |
| [feedback-rules](plugins/feedback-rules/) | 指摘を1指摘1ファイルで残し、指摘回数で warn → ask → deny と強制力を上げる | `/feedback-rule`・`/feedback-audit`・`/feedback-setup` | あり（ルールが無い間は素通り） |
| [learning-coach](plugins/learning-coach/) | Claude を教師役にして、変更や設計判断を人間が説明できるまで教える | `/deep-understand` | なし |
| [task-band](plugins/task-band/) | プロンプトの上に、タスクの進捗と task-pipeline のフェーズ・承認待ちを1行で出す mod（トークン0） | `/task-band` | あり |
| [agent-flow](plugins/agent-flow/) | サブエージェントの木をペインに出す mod（上流を無改変で同梱） | `/flow` | あり（観測のみ） |
| [unstuck](plugins/unstuck/) | 堂々巡りを検知して知らせ、1キーで抜け出す mod（上流を無改変で同梱） | `/unstuck` | あり |
| [watch-kit](plugins/watch-kit/) | task-band・agent-flow・unstuck を1回で入れるバンドル | — | — |

## このリポジトリが持たないもの

本体・公式プラグイン・著名 OSS で足りるものは作りません（[`docs/lessons.md`](docs/lessons.md) の教訓1）。

| やりたいこと | 使うもの |
|---|---|
| コードの機能開発を end-to-end で | [obra/superpowers](https://github.com/obra/superpowers) |
| Codex にレビュー・実装を委譲する | 公式 [openai/codex-plugin-cc](https://github.com/openai/codex-plugin-cc) |
| 要件を質問で詰める（単体で） | [mattpocock/skills](https://github.com/mattpocock/skills) の `grilling`（pipeline にも同梱） |
| 既存コード・成果物から仕様を逆引きする | [cc-rsg](https://github.com/daishir0/cc-rsg) 等 |
| 完了条件まで自律で回す | 本体の `/goal` |
| 作る→検査→直すの反復 | [sdsrss/loop_eng](https://github.com/sdsrss/loop_eng)・本体の `/goal` |
| PR の作成から CI の修正まで | 公式 `commit-commands`・本体の `/autofix-pr` |
| 古くなった指示の整理 | 本体の `/doctor`・`/doctor prompt-audit` |

## その他のディレクトリ

- [`tools/`](tools/) — プラグインとして配布しない単体ツール（task-pipeline の進み具合を statusline と HTML に出す `progress`）
- [`docs/`](docs/) — 決定記録・教訓・スキルの書き方・eval・おすすめ Skills ガイド

Claude Code のテーマから外れるものは別リポジトリに分けています:
[power-automate-azure-foundry](https://github.com/mrkxlia/power-automate-azure-foundry)（Power Automate から Azure AI Foundry の GPT を呼ぶサンプル）。

## ライセンス・出典

[MIT License](LICENSE)。外部の成果物を参考にしたプラグインは、帰属を各 README に記載しています。

| 対象 | 参考元 | 扱い |
|---|---|---|
| [model-setup](plugins/model-setup/) | X 記事「Sonnet 5をFable 5にする方法」（[@armadillo_ai 氏](https://x.com/armadillo_ai)） | 7原則を参照・要約・翻案した独自整形 |
| [pipeline](plugins/pipeline/) | [How to Build a Software Factory with Claude Code（@sairahul1 氏）](https://x.com/sairahul1/status/2058832033628241931) | コンセプトをコード以外の成果物へ汎用化した独自実装。`grilling` は mattpocock/skills（MIT）を無改変で同梱 |
| [cli-bridge](plugins/cli-bridge/) | [eddiearc/codex-delegator](https://github.com/eddiearc/codex-delegator)・[hamelsmu/claude-review-loop](https://github.com/hamelsmu/claude-review-loop)・[OpenAI Codex CLI ドキュメント](https://developers.openai.com/codex/) | コンセプトを参考にした独自実装 |
| [agent-review-panel](plugins/agent-review-panel/) | [wan-huiyan/agent-review-panel](https://github.com/wan-huiyan/agent-review-panel)・[makinux/adversarial-panel](https://github.com/makinux/adversarial-panel) | コンセプトを参考にした独自実装 |
| [learning-coach](plugins/learning-coach/) | 2026-08-11 に共有された Anthropic メンバーの「仕事の学習用プロンプト」 | 規範をスキル規約に載せ替えた独自実装 |
| [agent-flow](plugins/agent-flow/) | [Charlie0113-T/claude-agent-flow](https://github.com/Charlie0113-T/claude-agent-flow) | 無改変で同梱（Apache-2.0） |
| [unstuck](plugins/unstuck/) | [sniperunder123/unstuck](https://github.com/sniperunder123/unstuck) | 無改変で同梱（MIT） |
