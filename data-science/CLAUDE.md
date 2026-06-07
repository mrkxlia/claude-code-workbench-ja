# CLAUDE.md — データサイエンスプロジェクト

<!--
Inspired by: https://zenn.dev/green_tea/articles/d310e5cf809190
Original repository: https://github.com/atsushi-green/ds-ai-coding-skills (© atsushi-green)
This file is an independent implementation based on the concepts from the article above.
-->

## ハードルール（常に適用）

1. **機密データは絶対にコミットしない** — 生データ、認証情報、APIキー、顧客レコードをリポジトリに含めない
2. **生データは変更しない** — `data/raw/` と `data/external/` は読み取り専用として扱う
3. **変更は小さく保つ** — レビュー可能な粒度で変更を行い、大きな変更は分割する
4. **分析の前提を説明する** — 分析上の判断を下す前に前提条件と仮定を明示する
5. **データの意味が不明な場合は確認する** — 曖昧なカラム名や指標定義があれば作業を止めて確認する
6. **依存関係管理は `uv` のみ使用** — pip、poetry、conda は使用しない

---

## 開発コマンド

```bash
uv sync                        # 依存関係を同期
uv add <package>               # パッケージを追加
uv run pytest                  # テストを実行
uv run ruff check .            # リントチェック
uv run ruff format .           # コードフォーマット
uv run mypy src                # 型チェック
uv run papermill <in> <out>    # ノートブックをパラメータ化実行
```

---

## コードスタイル

- **言語**: Pythonコードは英語、コメントは日本語
- **型ヒント**: 公開関数のシグネチャには必ず型ヒントを付ける
- **DataFrame**: Polars を優先（Pandas は既存コードとの互換時のみ）
- **パス操作**: `pathlib.Path` を使用（`os.path` や文字列結合は不可）
- **パッケージ管理**: `uv` のみ（pip / poetry / conda は不可）
- **ドキュメント文字列**: Google 形式

---

## プロジェクト構造

```
my-analysis-project/
├── CLAUDE.md
├── .claude/
│   └── skills/           # スラッシュコマンドで呼び出すスキル群
├── data/
│   ├── raw/              # 読み取り専用（.gitignore に追加する）
│   ├── external/         # 読み取り専用（.gitignore に追加する）
│   ├── interim/          # 中間加工データ
│   └── processed/        # 分析用最終データ
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
│   └── agent/            # プロジェクト固有のコンテキスト文書
└── pyproject.toml
```

---

## プロジェクトコンテキスト

プロジェクト固有の情報は `docs/agent/` 配下に格納する。
作業開始前に関連ドキュメントを参照すること。

| ドキュメント | 内容 |
|-------------|------|
| `docs/agent/01_project_overview.md` | プロジェクト概要と目標 |
| `docs/agent/02_repository_structure.md` | ディレクトリ構成の説明 |
| `docs/agent/03_data_catalog.md` | 利用可能なデータの一覧と説明 |
| `docs/agent/04_metrics_definitions.md` | KPI・指標の定義 |
| `docs/agent/05_analysis_workflows.md` | 分析フローとパイプライン |
| `docs/agent/06_statistical_guidelines.md` | 統計手法の選択基準 |
| `docs/agent/07_validation_procedures.md` | 検証・QCの手順 |
| `docs/agent/08_reporting_templates.md` | レポートのテンプレートと規約 |
| `docs/agent/09_security_privacy.md` | セキュリティ・プライバシー方針 |

---

## 利用可能なスキル

以下のスラッシュコマンドで詳細な手順を呼び出せる。

| スラッシュコマンド | 使用する場面 |
|-------------------|-------------|
| `/python-project-ops` | 依存関係のインストール・更新、テスト実行、リント |
| `/safe-data-handling` | データファイルの読み書き、生データの保護 |
| `/path-and-io` | パス操作、ディレクトリ管理 |
| `/sql-analysis` | SQLクエリの作成・レビュー・修正 |
| `/python-style` | Pythonコードのスタイル・型ヒント・ドキュメント |
| `/dataframe-polars` | DataFrameの操作（読み込み・フィルタ・集計・結合） |
| `/visualization` | チャート・図表の作成と保存 |
| `/notebook-workflow` | Jupyterノートブックの作成・編集・実行 |
| `/statistical-ml-review` | 統計分析、仮説検定、A/Bテスト、機械学習 |
| `/analysis-reporting` | 分析レポート・実験結果のまとめ |
