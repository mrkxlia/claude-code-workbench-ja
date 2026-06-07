# safe-data-handling

データファイルを操作する際に必ず参照するスキルです。
生データの保護と安全な読み書きの手順を定めます。

---

## ハードルール

1. **機密情報は絶対にコミットしない** — 生データ、認証情報、APIキー、トークン、顧客レコードをリポジトリに含めない
2. **生データディレクトリは読み取り専用** — `data/raw/` と `data/external/` を直接変更・削除・上書きしない
3. **派生データの書き出し先を守る** — 加工データは `data/interim/`、最終データは `data/processed/`、出力物は `outputs/` に書く
4. **書き込み前にパスを確認する** — ターゲットパスが保護ディレクトリでないことを必ず確認する

---

## ディレクトリ構成と役割

```
data/
├── raw/          # 変更不可 — 元の生データ（読み取り専用）
├── external/     # 変更不可 — 外部から取得したデータ（読み取り専用）
├── interim/      # 変更可   — 中間加工データ
└── processed/    # 変更可   — 分析に使用する最終データ

outputs/
├── figures/      # 変更可   — 図表・グラフ
├── tables/       # 変更可   — 集計テーブル
└── reports/      # 変更可   — 分析レポート
```

---

## 推奨ワークフロー

1. 入力データのパスと種別（raw / external / interim / processed）を確認する
2. 生データは不変として読み込む（書き込み操作は一切行わない）
3. 変換・加工後は適切な出力ディレクトリに書き出す
4. 作業完了後、読み込んだファイルと書き出したファイルの一覧をまとめる

```python
# 安全なデータ読み込みの例
from pathlib import Path

RAW_DIR = Path("data/raw")
PROCESSED_DIR = Path("data/processed")

# 生データは読み取りのみ
df = pl.read_parquet(RAW_DIR / "sales_2024.parquet")

# 加工後は processed に書き出す
output_path = PROCESSED_DIR / "sales_2024_clean.parquet"
output_path.parent.mkdir(parents=True, exist_ok=True)
df_clean.write_parquet(output_path)
```

---

## .gitignore 必須設定

```gitignore
# データファイル
data/raw/
data/external/
data/interim/
data/processed/

# 環境変数・認証情報
.env
*.env
credentials/
secrets/
```
