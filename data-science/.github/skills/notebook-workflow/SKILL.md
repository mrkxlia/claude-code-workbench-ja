# notebook-workflow

Jupyter Notebook の作成・編集・実行・レビュー時に参照するスキルです。

---

## ノートブックの目的と原則

- **探索とコミュニケーション**に使う — 再利用可能なロジックは `src/analysis_project/` に抽出する
- **クリーンな状態で再実行可能**にする — カーネルを再起動して全セルを再実行しても同じ結果になること
- **セルの実行順序に依存しない**設計 — 隠れた状態（前のセルで定義した変数に依存するなど）を避ける
- **機密情報・顧客レコードを出力しない** — セルの出力に個人情報や認証情報が含まれないようにする

---

## 命名規則

```
NNN_short_description.ipynb

例:
001_data_exploration.ipynb
002_feature_engineering.ipynb
003_model_training.ipynb
004_evaluation_report.ipynb
```

---

## 推奨構造

```python
# ==========================================
# タイトル: 月次売上分析
# 作成者: xxx
# 作成日: 2024-03-01
# 目的: 2024年Q1の売上トレンドを分析する
# ==========================================

# --- セクション1: インポートと設定 ---
import polars as pl
import matplotlib.pyplot as plt
import japanize_matplotlib
from analysis_project.paths import raw_data_path, output_figure_path

# 分析パラメータ（上部に集約する）
ANALYSIS_PERIOD_START = "2024-01-01"
ANALYSIS_PERIOD_END   = "2024-03-31"
TARGET_SEGMENT        = "enterprise"

# --- セクション2: データ読み込み ---
df = pl.read_parquet(raw_data_path("sales_2024.parquet"))
print(f"読み込み完了: {len(df):,} 行")

# --- セクション3: 分析 ---
# ...

# --- セクション4: まとめと次のステップ ---
# 発見: ...
# 次のアクション: ...
```

---

## コミット前のチェックリスト

- [ ] Kernel → Restart & Run All で全セルがエラーなく実行できる
- [ ] 大きな出力（DataFrameの全行表示など）をクリアした
- [ ] セルの出力に認証情報・個人情報が含まれていない
- [ ] 最終的なチャートとテーブルは `outputs/` に保存済み

---

## papermill によるパラメータ化実行

```python
# ノートブックの先頭に "parameters" タグ付きセルを作る
# parameters タグを付けることで papermill が書き換え可能になる
ANALYSIS_DATE = "2024-03-31"
TARGET_COHORT = "2024-01"
```

```bash
# CI/CD や定期実行でパラメータを渡して実行する
uv run papermill \
  notebooks/002_cohort_analysis.ipynb \
  outputs/reports/002_cohort_analysis_2024-03.ipynb \
  -p ANALYSIS_DATE "2024-03-31" \
  -p TARGET_COHORT "2024-01"
```

---

## よく使うマジックコマンド

```python
# 実行時間を計測する
%%time

# プロットをインラインで表示する（先頭セルで一度だけ）
%matplotlib inline

# 自動リロード（src/ を編集しながら開発するとき便利）
%load_ext autoreload
%autoreload 2
```
