---
name: path-and-io
description: >-
  ローカルファイルの読み書き・パス構築・ディレクトリ作成など、ファイルシステム操作全般で参照するスキル。ファイル入出力を含むコードを書く・直すときに発動する。
---

# path-and-io

ローカルファイルの読み書き、パス構築、ディレクトリ作成など、
ファイルシステム操作全般で参照するスキルです。

---

## ルール

1. **`pathlib.Path` を使用する** — `os.path` や文字列結合でのパス操作は行わない
2. **絶対パスをハードコードしない** — `/Users/xxx/project/...` のような絶対パスを書かない
3. **リポジトリルートからの相対パスを使う** — `Path("data/raw/file.csv")` のように記述する
4. **パスユーティリティを活用する** — `src/analysis_project/paths.py` に定義された関数を使う
5. **`data/raw/` と `data/external/` への書き込み禁止** — safe-data-handling のルールを守る
6. **親ディレクトリを明示的に作成する** — `path.parent.mkdir(parents=True, exist_ok=True)` を必ず呼ぶ
7. **ファイル名に日付・識別子を含める** — `sales_2024-01.parquet` のように意味がわかる名前にする

---

## paths.py のユーティリティ例

```python
# src/analysis_project/paths.py
from pathlib import Path

# リポジトリルートを基準とする
REPO_ROOT = Path(__file__).parent.parent.parent

def raw_data_path(*parts: str) -> Path:
    """data/raw/ 配下のパスを返す（読み取り専用）"""
    return REPO_ROOT / "data" / "raw" / Path(*parts)

def processed_data_path(*parts: str) -> Path:
    """data/processed/ 配下のパスを返す"""
    return REPO_ROOT / "data" / "processed" / Path(*parts)

def output_figure_path(*parts: str) -> Path:
    """outputs/figures/ 配下のパスを返す"""
    return REPO_ROOT / "outputs" / "figures" / Path(*parts)

def output_table_path(*parts: str) -> Path:
    """outputs/tables/ 配下のパスを返す"""
    return REPO_ROOT / "outputs" / "tables" / Path(*parts)
```

---

## 使用例

```python
from analysis_project.paths import raw_data_path, processed_data_path
import polars as pl

# 読み込み
df = pl.read_parquet(raw_data_path("sales_2024.parquet"))

# 書き出し（親ディレクトリを必ず作成）
output = processed_data_path("sales_2024_clean.parquet")
output.parent.mkdir(parents=True, exist_ok=True)
df.write_parquet(output)
```

---

## ファイル命名規則

```
# 良い例
sales_2024-01_cleaned.parquet
user_cohort_2024q1.csv
churn_model_v2_20240315.pkl

# 悪い例
data.csv          # 意味不明
final.parquet     # どの final か不明
data2.csv         # 連番は避ける
```
