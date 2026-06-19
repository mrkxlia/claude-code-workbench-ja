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
├── WindowsSplitTerminalSample/      # Windows Terminal マルチインスタンス起動スクリプト
│   ├── launch-6pane.ps1             #   6ペイン起動スクリプト（PowerShell）
│   └── keybindings.md               #   ペイン操作キーバインド一覧
├── skills-guide/                    # おすすめSkillsガイド（優先度・業務タイプ別）
│   └── README.md
├── data-science/                    # データサイエンス向け CLAUDE.md + Skills テンプレート
│   ├── CLAUDE.md
│   ├── README.md
│   └── .claude/skills/              #   10種のスキルファイル
├── implementation-skills/           # 実装ノート記録 + 仕様書逆引きスキル（単体利用向け原本）
│   ├── README.md
│   └── .claude/skills/              #   notes / spec-extract の2スキル
├── software-factory/                # 7エージェント構成「ソフトウェア工場」テンプレート（プラグイン導入可）
│   ├── README.md
│   ├── CLAUDE.md                    #   コピーして使う CLAUDE.md サンプル
│   ├── .claude-plugin/plugin.json   #   プラグインマニフェスト
│   └── .claude/                     #   agents 7種 / skills 6種（notes / spec-extract 工場連携版・factory-improve 含む）/ hooks / settings.json
├── task-factory/                    # 汎用5エージェント構成「タスク工場」テンプレート（コード以外の成果物向け）
│   ├── README.md
│   ├── CLAUDE.md                    #   コピーして使う CLAUDE.md サンプル
│   └── .claude/                     #   agents 5種 / skills 2種 / hooks / settings.json
├── codex-bridge/                    # Codex にレビュー・実装・相談を依頼するスキル＆エージェント（プラグイン導入可）
│   ├── README.md
│   ├── .claude-plugin/plugin.json   #   プラグインマニフェスト
│   └── .claude/                     #   skills 3種（codex-review / codex-implement / codex-ask）/ agents 3種（codex-reviewer / codex-implementer / codex-advisor）
├── knowledge-share/                 # セッション/リポジトリ横断ナレッジ共有テンプレート（プラグイン導入可）
│   ├── README.md
│   ├── install.sh                   #   ~/.claude/ への冪等インストーラ（@import ベース導入用）
│   ├── templates/index.md           #   ナレッジ・インデックスの初期テンプレート
│   ├── bin/kb-extract-candidates.sh #   jsonl 採掘スクリプト
│   ├── .claude-plugin/plugin.json   #   プラグインマニフェスト
│   └── .claude/                     #   skills 2種（kb / kb-harvest）/ hooks 2種＋hooks.json / settings.json サンプル
├── token-usage-tracker/             # AIエージェントのトークン消費トラッカー（独立Pythonツール / uv / TDD）
│   ├── README.md
│   ├── pyproject.toml               #   uv 管理・[project.scripts] tokentracker
│   ├── tokentracker/                #   parsers(claude_code/codex/cline) / db / pricing(+pricing.toml) / queries / ingest / cli / dashboard
│   └── tests/                       #   pytest（fixtures に実ログ匿名化の代表ケースを固定）
└── GlobalClaudeMD-sample/           # グローバルスコープ用 CLAUDE.md サンプル
    └── CLAUDE.md
```

---

## このリポジトリの規約

1. **セクションはディレクトリ単位で管理する** — 新しいセクションを追加する場合は専用のディレクトリを作成し、ルート直下にファイルを置かない。
2. **各ディレクトリには README.md を置く** — セクションの目的・使い方・ファイル構成を説明する README.md を必ず用意する。
3. **リポジトリ全体の言語は日本語** — README.md・CLAUDE.md など、このリポジトリ自体のドキュメントは日本語で記述する。
4. **マーケットプレイス定義はルートの `.claude-plugin/` に置く** — Claude Code プラグイン仕様上の必須配置であり、規約1の例外。
5. **プラグイン配下を変更したら version を上げる** — `software-factory/`・`knowledge-share/`・`codex-bridge/` のプラグイン対象ファイルを変更したら、該当する `<section>/.claude-plugin/plugin.json` と `.claude-plugin/marketplace.json` の対応エントリの `version` をセマンティックバージョニングで更新する（プラグイン利用者への更新配信に必要）。

---

## 重要: ファイルはテンプレート・サンプルとして扱うこと

このリポジトリに含まれるファイル（`data-science/CLAUDE.md`、`GlobalClaudeMD-sample/CLAUDE.md`、各スキルファイルなど）は、**ユーザーが自分のプロジェクトにコピーして使うためのテンプレート・サンプル**です。

このリポジトリ自体の開発にそのまま適用しない。たとえば `GlobalClaudeMD-sample/CLAUDE.md` はグローバル設定のサンプルであり、このリポジトリの開発ルールではありません。
