# データサイエンティスト向け CLAUDE.md & Skills テンプレート

Claude Code でデータ分析プロジェクトを進める際に使える
CLAUDE.md とスキルファイルのテンプレートです。

## 概要

このテンプレートは [データサイエンティストのためのAGENTS.mdとSkills](https://zenn.dev/green_tea/articles/d310e5cf809190)（著者: atsushi-green）の記事で紹介されているコンセプトをもとに、Claude Code の仕様に合わせて独自に実装したものです。
元のリポジトリ: https://github.com/atsushi-green/ds-ai-coding-skills

## Claude Code の仕様

- **CLAUDE.md** — Claude Code がプロジェクト開始時に自動で読み込むファイル（AGENTS.md は Claude Code では暗黙的に使用されません）
- **`.claude/skills/<name>/SKILL.md`** — スラッシュコマンド `/skill-name` で呼び出すスキルファイルの配置場所
- スキルはユーザーが `/python-project-ops` のように明示的に呼び出して使います

> **設計メモ: このセクションのスキルは意図的に YAML frontmatter（`name` / `description`）を持ちません。**
> 各スキルは CLAUDE.md の「利用可能なスキル」対応表から**手動スラッシュコマンドで呼び出す参照ドキュメント型**であり、
> description によるモデルの自動発動は使いません（frontmatter が無い場合、スキル名はディレクトリ名から補完されます）。
> また [multi-model-dist](../../tools/multi-model-dist/) はこの「frontmatter 無し」を T1g ガイダンス（Kiro steering /
> AGENTS.md 素材への変換対象）の判定条件として利用しているため、frontmatter を追加する場合は
> multi-model-dist 側（`generators/lib/export.py`・MAPPING.md・golden ファイル）の追随修正が必要です。
> 自動発動させたい場合は、コピー先の各 SKILL.md にトリガー条件つき frontmatter を自分で追加してください。

## ファイル構成

```
data-science/
├── CLAUDE.md                          # Claude Codeが自動読み込み（ハードルール・開発コマンド・スキル一覧）
└── .claude/
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
cp path/to/data-science/CLAUDE.md ./CLAUDE.md
cp -r path/to/data-science/.claude ./.claude
```

### 2. CLAUDE.md をプロジェクトに合わせてカスタマイズする

- `docs/agent/` 配下のドキュメントをプロジェクト固有の内容で埋める
- 使わないスキルのエントリを削除する
- プロジェクト固有のハードルールを追加する

### 3. スキルファイルをカスタマイズする

各 `SKILL.md` の内容をプロジェクトのライブラリ・規約・ワークフローに合わせて修正する。

例えば `dataframe-polars/SKILL.md` で Pandas を使うプロジェクトなら、
`dataframe-pandas/SKILL.md` に書き換えるとよいです。

### 4. スキルを呼び出す

Claude Code のチャットで `/` に続けてスキル名を入力します。

```
/python-project-ops   # パッケージ管理・テスト・リント
/dataframe-polars     # DataFrame操作
/visualization        # グラフ作成
```

## 推奨プロジェクト構造

```
my-analysis-project/
├── CLAUDE.md
├── .claude/
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
