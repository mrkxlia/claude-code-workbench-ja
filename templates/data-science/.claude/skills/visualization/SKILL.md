---
name: visualization
description: >-
  チャートの作成、既存の matplotlib/seaborn コードの改善、レポートやダッシュボード用の図表保存時に参照するスキル。「グラフを描いて」「可視化して」「図を保存して」といった依頼で発動する。
---

# visualization

チャートの作成、既存の matplotlib/seaborn コードの改善、
レポートやダッシュボード用の図表保存時に参照するスキルです。

---

## ライブラリ選択

- **matplotlib** — 基本的なグラフ全般
- **seaborn** — テーマ・スタイリング・統計グラフ（matplotlib と併用）
- **japanize-matplotlib** — 日本語フォントの表示に使用する

---

## 初期設定

```python
import matplotlib.pyplot as plt
import seaborn as sns
import japanize_matplotlib  # noqa: F401 — 日本語フォントを有効化するためインポートする

# グローバルテーマを統一する
sns.set_theme(style="whitegrid", font_scale=1.2)
```

---

## 図の作成（オブジェクト指向 API を使う）

`plt.figure()` / `plt.plot()` のようなステートフルスタイルは避け、
`fig, ax` を明示的に作成するオブジェクト指向 API を使う。

```python
# 良い例: オブジェクト指向API
fig, ax = plt.subplots(figsize=(10, 6), constrained_layout=True)
ax.plot(df["date"], df["revenue"], label="売上", color="#2196F3")
ax.set_title("月次売上推移")
ax.set_xlabel("日付")
ax.set_ylabel("売上 (円)")
ax.legend()

# 悪い例: ステートフルスタイル
plt.figure(figsize=(10, 6))
plt.plot(df["date"], df["revenue"])
plt.title("月次売上推移")
```

---

## 色彩ガイドライン

| データの種類 | 推奨カラーパレット |
|-------------|------------------|
| カテゴリカル（定性） | `"muted"` / `"Set2"` |
| 連続値（定量） | `"viridis"` / `"Blues"` |
| ダイバージング | `"RdBu_r"` / `"coolwarm"` |

**禁止**: `"jet"` / `"rainbow"` — 色覚多様性への配慮と知覚的一様性のため使用しない。

---

## 軸スケール

- **棒グラフ**: Y 軸は必ず 0 から始める
- **折れ線グラフ・散布図**: 自動スケーリングを使う
- **ログスケール**: 桁違いの差がある場合のみ使用し、ラベルに明示する

---

## 図の保存

```python
from analysis_project.paths import output_figure_path

output_path = output_figure_path("monthly_revenue_2024.png")
output_path.parent.mkdir(parents=True, exist_ok=True)

fig.savefig(output_path, dpi=150, bbox_inches="tight")
plt.close(fig)  # メモリリークを防ぐため必ず閉じる

print(f"保存完了: {output_path}")
```

### ファイル名の規則

```
# 良い例: 内容と日付が分かる
monthly_revenue_2024.png
user_cohort_retention_2024q1.png
churn_model_roc_curve_v2.png

# 悪い例: 何の図か分からない
figure1.png
plot.png
```

---

## サブプロット

```python
fig, axes = plt.subplots(2, 2, figsize=(14, 10), constrained_layout=True)

# axes は2次元配列なので flatten() で1次元にする
for ax, (metric, data) in zip(axes.flatten(), metrics.items()):
    ax.plot(data["date"], data["value"])
    ax.set_title(metric)
```
