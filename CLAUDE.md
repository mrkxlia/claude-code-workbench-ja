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
├── WindowsSplitTerminalSample/      # Windows Terminal マルチインスタンス起動スクリプト
│   ├── launch-6pane.ps1             #   6ペイン起動スクリプト（PowerShell）
│   └── keybindings.md               #   ペイン操作キーバインド一覧
├── skills-guide/                    # おすすめSkillsガイド（優先度・業務タイプ別）
│   └── README.md
├── data-science/                    # データサイエンス向け CLAUDE.md + Skills テンプレート
│   ├── CLAUDE.md
│   ├── README.md
│   └── .claude/skills/              #   10種のスキルファイル
├── implementation-skills/           # 実装ノート記録 + 仕様書逆引きスキル
│   ├── README.md
│   └── .claude/skills/              #   notes / spec-extract の2スキル
└── GlobalClaudeMD-sample/           # グローバルスコープ用 CLAUDE.md サンプル
    └── CLAUDE.md
```

---

## このリポジトリの規約

1. **セクションはディレクトリ単位で管理する** — 新しいセクションを追加する場合は専用のディレクトリを作成し、ルート直下にファイルを置かない。
2. **各ディレクトリには README.md を置く** — セクションの目的・使い方・ファイル構成を説明する README.md を必ず用意する。
3. **リポジトリ全体の言語は日本語** — README.md・CLAUDE.md など、このリポジトリ自体のドキュメントは日本語で記述する。

---

## 重要: ファイルはテンプレート・サンプルとして扱うこと

このリポジトリに含まれるファイル（`data-science/CLAUDE.md`、`GlobalClaudeMD-sample/CLAUDE.md`、各スキルファイルなど）は、**ユーザーが自分のプロジェクトにコピーして使うためのテンプレート・サンプル**です。

このリポジトリ自体の開発にそのまま適用しない。たとえば `GlobalClaudeMD-sample/CLAUDE.md` はグローバル設定のサンプルであり、このリポジトリの開発ルールではありません。
