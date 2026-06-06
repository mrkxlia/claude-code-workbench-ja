# AGENTS.md — データサイエンスプロジェクト用エージェントルーター

<!-- 
Inspired by: https://zenn.dev/green_tea/articles/d310e5cf809190
Original repository: https://github.com/atsushi-green/ds-ai-coding-skills (© atsushi-green)
This file is a derivative work based on the concepts described in the article above.
-->

このファイルはエージェントのルーターです。高レベルのルールを定め、
詳細な手順は `.github/skills/*/SKILL.md` の各スキルファイルに委譲します。

---

## ハードルール（常に適用）

1. **機密データは絶対にコミットしない** — 生データ、認証情報、APIキー、トークン、顧客レベルのレコードをリポジトリに含めない
2. **生データは変更しない** — `data/raw/` と `data/external/` は読み取り専用として扱う
3. **変更は小さく保つ** — レビュー可能な粒度で変更を行い、大きな変更は分割する
4. **分析の前提を説明する** — 分析上の判断を下す前に前提条件と仮定を明示する
5. **データの意味が不明な場合は確認する** — 曖昧なカラム名や指標定義がある場合は作業を止めて確認する
6. **依存関係管理は `uv` のみ使用** — pip、poetry、conda は使用しない

---

## ルーティングテーブル

タスクの種類に応じて、以下のスキルファイルを参照してください。

| タスク | 参照するスキル |
|--------|----------------|
| 依存関係のインストール・更新、テスト実行、リント | `.github/skills/python-project-ops/SKILL.md` |
| データファイルの読み書き、パス操作 | `.github/skills/safe-data-handling/SKILL.md` + `.github/skills/path-and-io/SKILL.md` |
| SQLクエリの作成・レビュー・修正 | `.github/skills/sql-analysis/SKILL.md` |
| Pythonコードの作成・編集・レビュー | `.github/skills/python-style/SKILL.md` |
| DataFrameの操作（読み込み・フィルタ・集計・結合） | `.github/skills/dataframe-polars/SKILL.md` |
| チャート・図表の作成と保存 | `.github/skills/visualization/SKILL.md` |
| Jupyterノートブックの作成・編集・実行 | `.github/skills/notebook-workflow/SKILL.md` |
| 統計分析、仮説検定、A/Bテスト、機械学習 | `.github/skills/statistical-ml-review/SKILL.md` |
| 分析レポート・実験結果のまとめ | `.github/skills/analysis-reporting/SKILL.md` |

---

## プロジェクトコンテキスト

プロジェクト固有の情報は `docs/agent/` 配下に格納してください。
エージェントは作業開始前に関連ドキュメントを参照してください。

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
