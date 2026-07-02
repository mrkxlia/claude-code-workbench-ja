# CLAUDE.md — claude-code-workbench-ja リポジトリ

このファイルはリポジトリ自体を操作する際に Claude Code に読み込まれます。

---

## このリポジトリについて

Claude Code をより快適に使うためのスクリプト・テンプレート・ベストプラクティスを集めたリポジトリです。
各セクションはそれぞれ独立しており、ユーザーが必要な部分だけコピーして自分のプロジェクトで使うことを想定しています。

---

## ディレクトリ構成

```
claude-code-workbench-ja/
├── README.md                        # リポジトリ全体の概要（日本語）
├── CLAUDE.md                        # このファイル
├── LICENSE                          # MIT License
├── .claude-plugin/
│   └── marketplace.json             # プラグインマーケットプレイス定義（名前: workbench-ja）
├── .claude/                         # このリポジトリ自身の作業用スキル（dogfooding・規約1の例外）
│   └── skills/                      #   create-plan / create-plan-calibrate（plan-mode 由来・非競合のみ集約）
├── skills-guide/                    # おすすめSkillsガイド（優先度・業務タイプ別）
│   └── README.md
├── data-science/                    # データサイエンス向け CLAUDE.md + Skills テンプレート
│   ├── CLAUDE.md
│   ├── README.md
│   └── .claude/skills/              #   10種のスキルファイル
├── implementation-skills/           # 実装ノート記録 + 仕様書逆引きスキル（単体利用向け原本。連携版を software/task 両パイプラインに同梱）
│   ├── README.md
│   └── .claude/skills/              #   notes / spec-extract の2スキル（原本）
├── plan-mode/                       # 変更せず実行計画だけ作る create-plan スキル（Plan/Ask モード相当）
│   ├── README.md
│   ├── SPEC.md                      #   create-plan の不変要件 INV / 調整 ADJ 定義
│   └── .claude/skills/              #   create-plan / create-plan-calibrate の2スキル
├── software-pipeline/                # 7エージェント構成「ソフトウェアパイプライン」テンプレート（プラグイン導入可）
│   ├── README.md
│   ├── CLAUDE.md                    #   コピーして使う CLAUDE.md サンプル
│   ├── .claude-plugin/plugin.json   #   プラグインマニフェスト
│   └── .claude/                     #   agents 7種 / skills 7種（clarify / notes / spec-extract パイプライン連携版・pipeline-improve 含む）/ hooks 3種（block-secrets-commit・並列共有衝突を確認する guard-builder-writes・spec-sync-reminder）/ settings.json
├── task-pipeline/                    # 汎用5エージェント構成「タスクパイプライン」テンプレート（コード以外の成果物向け・プラグイン導入可）
│   ├── README.md
│   ├── CLAUDE.md                    #   コピーして使う CLAUDE.md サンプル
│   ├── .claude-plugin/plugin.json   #   プラグインマニフェスト
│   └── .claude/                     #   agents 5種 / skills 5種（task-pipeline / clarify / task-pipeline-setup / notes・spec-extract パイプライン連携版）/ hooks / settings.json
├── codex-bridge/                    # Codex にレビュー・実装・相談を依頼するスキル＆エージェント（プラグイン導入可）
│   ├── README.md
│   ├── .claude-plugin/plugin.json   #   プラグインマニフェスト
│   └── .claude/                     #   skills 4種（codex-review / codex-implement / codex-ask / codex-agents）/ agents 3種（codex-reviewer / codex-implementer / codex-advisor）/ hooks（gen-agents-md＋hooks.json 常時ON・plan-to-codex は opt-in）
├── ai-peer/                         # ピア相談・セカンドオピニオンを依頼するスキル＆エージェント（プラグイン導入可）
│   ├── README.md
│   ├── .claude-plugin/plugin.json   #   プラグインマニフェスト
│   └── .claude/                     #   skills 2種（peer=内部・依存ゼロ / ask-claude=claude CLI）/ agents 2種（peer-engineer / claude-advisor）
├── self-improve/                    # git 不要の自己改善ループ（発見→承認制で適用）（プラグイン導入可）
│   ├── README.md
│   ├── .claude-plugin/plugin.json   #   プラグインマニフェスト
│   └── .claude/                     #   skills 2種（improve-scan / improve-apply）/ hooks 2種＋hooks.json（検出/通知）/ settings.json サンプル
├── knowledge-share/                 # セッション/リポジトリ横断ナレッジ共有テンプレート（プラグイン導入可）
│   ├── README.md
│   ├── install.sh                   #   ~/.claude/ への冪等インストーラ（@import ベース導入用）
│   ├── templates/index.md           #   ナレッジ・インデックスの初期テンプレート
│   ├── bin/kb-extract-candidates.sh #   jsonl 採掘スクリプト
│   ├── .claude-plugin/plugin.json   #   プラグインマニフェスト
│   └── .claude/                     #   skills 2種（kb / kb-harvest）/ hooks 2種＋hooks.json / settings.json サンプル
├── multi-model-dist/                # CC 資産を Codex/Kiro へ配布（原本不変・生成＝Track A／SPEC 再実装＝Track B）
│   ├── README.md / MAPPING.md       #   対応表・ティア監査・配置パス確定・本文用語写像
│   ├── generators/                  #   単一パイプライン（bin/export.sh・lib/convert.py＋serializers/・作業用 export スキル）
│   ├── examples/                    #   生成結果ゴールデン（build/・dist/ は .gitignore）
│   └── reimpl/                      #   Track B（SPEC 共有→各ツール再実装）※段階導入
├── token-usage-tracker/             # AIエージェントのトークン消費トラッカー（独立Pythonツール / uv / TDD）
│   ├── README.md
│   ├── pyproject.toml               #   uv 管理・[project.scripts] tokentracker
│   ├── tokentracker/                #   parsers(claude_code/codex/cline) / models / db / pricing(+pricing.toml) / queries / ingest / cli / dashboard
│   └── tests/                       #   pytest（fixtures に実ログ匿名化の代表ケースを固定）
├── power-automate-azure-foundry/    # Power Automate から Azure AI Foundry(GPT) を呼ぶサンプル一式
│   └── README.md                    #   フロー定義・カスタムコネクタ・インポート手順
├── docs/                            # リポジトリ内ドキュメント置き場
│   ├── README.md
│   └── pipeline-spec-alignment-proposal.html  #   パイプラインと仕様整合の提案資料
└── GlobalClaudeMD-sample/           # グローバルスコープ用 CLAUDE.md サンプル
    ├── README.md
    └── CLAUDE.md
```

---

## このリポジトリの規約

1. **セクションはディレクトリ単位で管理する** — 新しいセクションを追加する場合は専用のディレクトリを作成し、ルート直下にファイルを置かない。
2. **各ディレクトリには README.md を置く** — セクションの目的・使い方・ファイル構成を説明する README.md を必ず用意する。
3. **リポジトリ全体の言語は日本語** — README.md・CLAUDE.md など、このリポジトリ自体のドキュメントは日本語で記述する。
4. **マーケットプレイス定義はルートの `.claude-plugin/` に置く** — Claude Code プラグイン仕様上の必須配置であり、規約1の例外。
5. **プラグイン配下を変更したら version を上げる** — `software-pipeline/`・`task-pipeline/`・`knowledge-share/`・`codex-bridge/`・`ai-peer/`・`self-improve/` のプラグイン対象ファイル（`.claude/skills/` 配下＝プラグインが配信する skills）を変更したら、該当する `<section>/.claude-plugin/plugin.json` と `.claude-plugin/marketplace.json` の対応エントリの `version` をセマンティックバージョニングで更新する（プラグイン利用者への更新配信に必要）。エージェント定義・フック・CLAUDE.md は setup スキルが配布するため version 対象外。
6. **ルートの `.claude/` はこのリポジトリ自身の作業用（dogfooding）** — 規約1の例外（`.claude-plugin/` と同様）。公式慣例「`.claude/` は単一プロジェクト自身のカスタマイズ用」に従い、**競合しない・非プラグインの**スキルだけを集約する（現状は plan-mode 由来の create-plan / create-plan-calibrate）。プラグイン由来スキルや競合名スキル（notes / spec-extract / clarify）は複製しない（version 二重管理・二重ロードを避けるため）。notes / spec-extract の正本は `implementation-skills/` の原本で、作業中はディレクトリスコープで自動ロードされる。

---

## 重要: ファイルはテンプレート・サンプルとして扱うこと

このリポジトリに含まれるファイル（`data-science/CLAUDE.md`、`GlobalClaudeMD-sample/CLAUDE.md`、各スキルファイルなど）は、**ユーザーが自分のプロジェクトにコピーして使うためのテンプレート・サンプル**です。

このリポジトリ自体の開発にそのまま適用しない。たとえば `GlobalClaudeMD-sample/CLAUDE.md` はグローバル設定のサンプルであり、このリポジトリの開発ルールではありません。
