# CLAUDE.md — claude-code-workbench-ja リポジトリ

このファイルはリポジトリ自体を操作する際に Claude Code に読み込まれます。

---

## このリポジトリについて

Claude Code をより快適に使うためのスクリプト・テンプレート・ベストプラクティスを集めたリポジトリです。
各セクションはそれぞれ独立しており、ユーザーが必要な部分だけコピーして自分のプロジェクトで使うことを想定しています。

Claude Code のテーマから外れる独立ツール・サンプルは別リポジトリに分割している:
- [power-automate-azure-foundry](https://github.com/mrkxlia/power-automate-azure-foundry) — Power Automate から Azure AI Foundry (GPT) を呼ぶサンプル一式

---

## ディレクトリ構成

トップレベルは **plugins/**（プラグイン導入可能なセクション）・**docs/**（リポジトリ内ドキュメント）の2分類。
ルートの `.claude-plugin/` は分類対象外（規約4）。各プラグインの中身（スキル・エージェント・フックの一覧）は**そのプラグインの README だけ**に書く（規約7）。

```
claude-code-workbench-ja/
├── README.md                  # 索引（プラグイン一覧・持たないもの・出典）
├── CLAUDE.md                  # このファイル
├── .github/workflows/ci.yml   # CI（JSON 構文・SKILL.md/agent frontmatter 検査・shellcheck・BOM・version 差分・内部リンク）
├── .claude-plugin/marketplace.json  # マーケットプレイス定義（名前: workbench-ja。エントリは name・source・category のみ）
├── plugins/<name>/            # 1プラグイン = 1ディレクトリ（公式標準レイアウト）
│   ├── README.md              #   目的・使い方・ファイル構成・コピー導入の手順・出典
│   ├── .claude-plugin/plugin.json
│   ├── skills/ agents/ hooks/ #   既定探索パス（配信対象。変更したら version を上げる）
│   └── setup/settings.json    #   コピー導入用テンプレート（あれば）
└── docs/
    ├── decisions/             #   日付つきの決定記録（一覧と残す基準は docs/README.md）
    ├── lessons.md             #   過去 PR から蒸留した「繰り返さない判断」
    ├── skill-authoring.md     #   スキルの書き方（公式ガイド準拠）
    └── evals/                 #   主要スキルの期待挙動シナリオ
```

現在のプラグインは marketplace.json に登録された11個（pipeline・cli-bridge・agent-review-panel・adoption-review・model-setup・
feedback-rules・learning-coach・task-band・agent-flow・unstuck・watch-kit）。agent-flow・unstuck は上流を無改変で同梱している。

---

## このリポジトリの規約

1. **トップレベルは plugins/・docs/ の分類、セクションはディレクトリ単位で管理する** — 新しいセクションは `plugins/` に専用ディレクトリを作り、ルート直下にファイルを置かない。プラグインにならない単体ツールなどの新しい分類（`tools/`・`templates/` 等）は中身が2つ以上そろってから作る（lessons 教訓4）。
2. **各ディレクトリには README.md を置く** — セクションの目的・使い方・ファイル構成を説明する README.md を必ず用意する。
3. **リポジトリ全体の言語は日本語** — README.md・CLAUDE.md など、このリポジトリ自体のドキュメントは日本語で記述する。
4. **マーケットプレイス定義はルートの `.claude-plugin/` に置く** — Claude Code プラグイン仕様上の必須配置であり、規約1の例外。
5. **プラグイン配下を変更したら version を上げる。プラグインのメタデータは plugin.json だけに書く** — `plugins/` 配下のプラグインの配信対象ファイル（`skills/`・`agents/`・`hooks/` 配下。これらは既定探索パスのためプラグイン導入で自動配信される）を変更したら、該当する `plugins/<name>/.claude-plugin/plugin.json` の `version` をセマンティックバージョニングで更新する。上流を無改変で同梱したもの（agent-flow・unstuck）はここで書き換えず、取り込み直したときに上流の version に従う。CLAUDE.md / CLAUDE.task.md サンプル・`setup/settings.json` は setup スキルがコピー配布するため version 対象外。

   **`version`・`description`・`keywords`・`license`・`author` は plugin.json のみに書き、`.claude-plugin/marketplace.json` 側には書かない。** marketplace のエントリは `name`・`source`・`category` だけを持つ。公式仕様上、エントリで省略された `description` 等は plugin.json の値が使われ（`strict` 未指定＝true のとき）、両方にあるとエントリ側が黙って優先される。二重に持つと必ずずれる（実際 pipeline の説明文は 2.3.0 の追加を反映しないまま「スキル7種・エージェント8種」と書き続けていた）。出典: [Plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)（2026-09-07 取得）。
6. **プラグインの skills/agents/hooks は公式標準レイアウト（プラグインルート直下）に置く** — `<plugin>/skills/`・`<plugin>/agents/`・`<plugin>/hooks/hooks.json` が既定探索パスであり、plugin.json に `skills`/`hooks` フィールドを明示しない（宣言と実体の二重管理を避ける）。コピー導入用の `settings.json` サンプルはプラグインルート直下に置けない（Claude Code の予約パス）ため `<plugin>/setup/settings.json` に置く。pipeline の `hooks/` は導入先リポジトリへコピーする資材であり、この配置自体はプラグインとして自動発火しない（pipeline-setup が対象リポジトリの `.claude/hooks/` へコピーし `.claude/settings.json` に配線する）。
7. **1つの事実は1か所にだけ書く** — プラグインの中身（スキル・エージェント・フックの名前と数、使い方、コピー導入の手順、出典の詳細）はそのプラグインの README だけに書く。ルートの README.md は索引（1プラグイン1行の一覧・持たないもの・出典の要約）、この CLAUDE.md は構成の骨格と規約だけを持つ。数や一覧を他所に写すと必ずずれる（2026-10-11 の整理時点で、ルート README は削除済みの AGENTS.md 自動生成を代表例に挙げ、adoption-review のエージェント数を誤記していた）。
8. **作る前に削る理由を探す（YAGNI）** — 新しいセクション・スキル・自動化・設定項目は、いま使う具体的な場面があるときだけ足す。先に [`docs/lessons.md`](docs/lessons.md) を読み、本体・公式プラグイン・著名 OSS で足りないかを確かめる。「将来使うかも」の器・オプション・互換レイヤーは作らない。利用者向けの文書には「旧〇〇は×日に削除」のような経緯を書かない（経緯は決定記録と git 履歴に残す）。

---

## 重要: ファイルはテンプレート・サンプルとして扱うこと

このリポジトリに含まれるファイル（`plugins/pipeline/CLAUDE.task.md`、各スキルファイルなど）は、**ユーザーが自分のプロジェクトにコピーして使うためのテンプレート・サンプル**です。

このリポジトリ自体の開発にそのまま適用しない。たとえば各パイプラインの `CLAUDE.md` サンプルは導入先リポジトリ用であり、このリポジトリの開発ルールではありません。
