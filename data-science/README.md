# データサイエンティスト向け AGENTS.md & Skills テンプレート

Claude Code や GitHub Copilot Agent Mode でデータ分析プロジェクトを進める際に使える
AGENTS.md とスキルファイルのテンプレートです。

## 概要

このテンプレートは [データサイエンティストのためのAGENTS.mdとSkills](https://zenn.dev/green_tea/articles/d310e5cf809190)（著者: atsushi-green）の記事で紹介されているコンセプトをもとに、独自に実装したものです。
元のリポジトリ: https://github.com/atsushi-green/ds-ai-coding-skills

## ファイル構成

```
data-science/
├── AGENTS.md                          # エージェントルーター（ここから全スキルへ誘導）
└── .github/
    └── skills/
        ├── python-project-ops/        # uv・テスト・リント・型チェック
        ├── safe-data-handling/        # 生データ保護・安全な読み書き
        ├── path-and-io/               # pathlib・パス管理ユーティリティ
        ├── sql-analysis/              # SQLクエリ作成・レビュー
        ├── python-style/              # コードスタイル・型ヒント・ドキュメント
        ├── dataframe-polars/          # Polars DataFrame操作
        ├── visualization/             # matplotlib/seaborn グラフ作成
        ├── notebook-workflow/         # Jupyter Notebook管理
        ├── statistical-ml-review/     # 統計分析・A/Bテスト・機械学習
        └── analysis-reporting/        # 分析レポート作成
```

## 使い方

### 1. ファイルをプロジェクトにコピーする

```bash
# 自分のプロジェクトのルートから実行する
cp path/to/data-science/AGENTS.md ./AGENTS.md
cp -r path/to/data-science/.github/skills ./.github/skills
```

### 2. AGENTS.md をプロジェクトに合わせてカスタマイズする

- `docs/agent/` 配下のドキュメントをプロジェクト固有の内容で埋める
- 使わないスキルのルーティングエントリを削除する
- プロジェクト固有のハードルールを追加する

### 3. スキルファイルをカスタマイズする

各 `SKILL.md` の内容をプロジェクトのライブラリ・規約・ワークフローに合わせて修正する。

例えば `dataframe-polars/SKILL.md` で Pandas を使うプロジェクトなら、
`dataframe-pandas/SKILL.md` に書き換えるとよいです。

## 推奨プロジェクト構造

```
my-analysis-project/
├── AGENTS.md
├── .github/
│   └── skills/
│       └── ...（上記のスキルファイル群）
├── data/
│   ├── raw/         # 変更不可（.gitignore に追加する）
│   ├── external/    # 変更不可（.gitignore に追加する）
│   ├── interim/
│   └── processed/
├── notebooks/
├── outputs/
│   ├── figures/
│   ├── tables/
│   └── reports/
├── src/
│   └── analysis_project/
│       ├── __init__.py
│       └── paths.py
├── tests/
├── docs/
│   └── agent/
│       ├── 01_project_overview.md
│       └── ...
└── pyproject.toml
```

## ライセンスについて

元のリポジトリ（https://github.com/atsushi-green/ds-ai-coding-skills）には明示的なライセンスファイルがありません。
このテンプレートは元記事で紹介されているコンセプトに基づいて独自に作成したものです。
元の著者（atsushi-green）の成果を参照していることを明記します。
