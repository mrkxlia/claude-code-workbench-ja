---
name: dataframe-polars
description: >-
  DataFrame の読み込み・フィルタリング・集計・結合・変換・整形など、表形式データの操作全般で参照するスキル。Polars/pandas のコードを書く・直すときや、CSV・Parquet の加工依頼で発動する。
---

# dataframe-polars

DataFrame の読み込み・フィルタリング・集計・結合・変換・整形など、
表形式データの操作全般で参照するスキルです。

---

## ライブラリ選択方針

- **Polars を優先する** — 新規コードはすべて Polars で書く
- **LazyFrame を活用する** — 読み込み・フィルタ・結合・集計は `scan_*` / `lazy()` から始める
- **Pandas は既存コードとの互換時のみ** — 新規コードでは使用しない
- **変換は再現可能・スクリプト化可能にする** — 手動の DataFrame 編集は行わない

---

## 基本パターン

### 遅延読み込みとフィルタリング

```python
import polars as pl
from analysis_project.paths import raw_data_path

# LazyFrame で読み込む（メモリ効率が良い）
df = (
    pl.scan_parquet(raw_data_path("sales_2024.parquet"))
    .filter(
        pl.col("order_date").is_between(
            pl.lit("2024-01-01").str.to_date(),
            pl.lit("2024-03-31").str.to_date(),
        )
    )
    .filter(pl.col("status") == "completed")
    .collect()  # ここで初めてデータを読み込む
)
```

### グループ化と集計

```python
# ユーザーごとに月次集計する
monthly_summary = (
    df
    .with_columns(
        pl.col("order_date").dt.truncate("1mo").alias("month")
    )
    .group_by(["user_id", "month"])
    .agg(
        pl.len().alias("order_count"),
        pl.col("amount").sum().alias("total_amount"),
        pl.col("amount").mean().alias("avg_amount"),
    )
    .sort(["user_id", "month"])
)
```

### 安全な JOIN（行数を検証する）

```python
# JOIN前後の行数を確認する
n_before = len(df_orders)
print(f"JOIN前: {n_before:,} 行")

df_joined = df_orders.join(
    df_users,
    on="user_id",
    how="left",
    validate="m:1",  # 多対1の結合であることを検証する
)

n_after = len(df_joined)
print(f"JOIN後: {n_after:,} 行")

# 行数が増えた場合はデータに問題がある
assert n_before == n_after, f"JOIN後に行数が増加: {n_before} → {n_after}"
```

---

## よく使うレシピ

```python
# カラムの型変換
df = df.with_columns(
    pl.col("order_date").str.to_date("%Y-%m-%d"),
    pl.col("amount").cast(pl.Float64),
)

# 条件付き新カラム作成
df = df.with_columns(
    pl.when(pl.col("amount") > 10_000)
    .then(pl.lit("high"))
    .otherwise(pl.lit("low"))
    .alias("segment")
)

# NULL チェック
null_counts = df.null_count()
print(null_counts)

# 重複行の確認
duplicates = df.filter(df.is_duplicated())
print(f"重複行数: {len(duplicates)}")
```

---

## パフォーマンスのヒント

- `select()` で不要なカラムを早めに落とす
- `filter()` を早い段階で適用してデータを絞る
- 大きなファイルは `scan_parquet()` / `scan_csv()` を使う（`read_*` より省メモリ）
- 文字列カテゴリは `pl.Categorical` を使う
