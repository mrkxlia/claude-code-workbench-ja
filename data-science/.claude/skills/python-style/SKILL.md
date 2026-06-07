# python-style

Pythonコードの作成・編集・レビュー時に参照するスタイルガイドです。

---

## 型ヒント

- 公開関数のシグネチャにはすべて型ヒントを付ける
- Python 3.10 以降の構文（`X | None` など）を使う場合は `from __future__ import annotations` を先頭に書く
- 戻り値が None の場合も `-> None` を明示する

```python
from __future__ import annotations

def calculate_retention_rate(
    cohort_size: int,
    retained_users: int,
    period: str = "monthly",
) -> float:
    ...
```

---

## ドキュメント文字列

Google 形式を採用する。公開モジュール・クラス・関数・メソッドに記述する。

```python
def load_sales_data(filepath: Path, *, encoding: str = "utf-8") -> pl.DataFrame:
    """売上データをファイルから読み込む。

    Args:
        filepath: 読み込むファイルのパス。
        encoding: ファイルのエンコーディング。

    Returns:
        売上データを含む DataFrame。

    Raises:
        FileNotFoundError: ファイルが存在しない場合。
        ValueError: 必須カラムが欠損している場合。

    Example:
        >>> df = load_sales_data(Path("data/raw/sales.csv"))
        >>> df.shape
        (10000, 8)
    """
```

---

## コメント

- インラインコメントと説明コメントは**日本語**で記述する
- 非自明なロジックにのみコメントを付ける（コードを読めば分かることは書かない）
- 「何をしているか」ではなく「なぜそうするか」を書く

```python
# 集計期間の末日を含むようにするため +1 日する
end_date = target_month_end + timedelta(days=1)

# 良くない例: コードを繰り返しているだけ
# x に 1 を足す
x = x + 1
```

---

## コードスタイル

- **小さく純粋な関数を優先する** — 副作用は最小限にする
- **明示的なエラーハンドリング** — 素の `except Exception` は使わず具体的な例外を捕捉する
- **ファイルパスは `pathlib.Path`** — 文字列での結合は行わない
- **`pyproject.toml` の ruff 設定に従う** — 手動でスタイルを変更しない

```python
# 良い例: 小さく純粋な関数
def compute_churn_rate(active_users: int, churned_users: int) -> float:
    if active_users == 0:
        raise ValueError("active_users は 0 より大きい必要があります")
    return churned_users / active_users

# 悪い例: 副作用と計算が混在
def compute_and_save_churn_rate(df: pl.DataFrame, output_path: Path) -> None:
    rate = df["churned"].sum() / len(df)  # 計算と保存が一緒
    output_path.write_text(str(rate))
```

---

## インポート順序

ruff の isort 設定に従い、以下の順序とする：

```python
# 1. 標準ライブラリ
from __future__ import annotations
import json
from pathlib import Path

# 2. サードパーティライブラリ
import polars as pl
import matplotlib.pyplot as plt

# 3. プロジェクト内モジュール
from analysis_project.paths import raw_data_path
from analysis_project.utils import validate_schema
```
