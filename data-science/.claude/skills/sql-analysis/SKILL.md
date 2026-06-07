# sql-analysis

SELECT、CTE、JOIN、集計、ウィンドウ関数を含む SQL クエリの作成・レビュー・修正時に参照するスキルです。

---

## ルール

1. **`SELECT *` を使わない** — 必要なカラムを明示的に列挙する
2. **CTE で可読性を高める** — 複雑なクエリは WITH 句で段階的に分解する
3. **大規模テーブルには日付フィルターを適用する** — フルスキャンを避ける
4. **JOIN 前に結合キーと基数を確認する** — 1対多・多対多を事前に把握する
5. **JOIN 前後の行数を検証する** — 意図しない行の増減を検知する
6. **暗黙的なクロス結合を避ける** — WHERE 句での結合は使わず明示的な JOIN 構文を使う
7. **破壊的 SQL は実行しない** — DROP、DELETE、TRUNCATE、UPDATE の直接実行は禁止
8. **本番実行前はドライランを提案する** — LIMIT を付けた確認クエリを先に実行する

---

## 推奨クエリ構造

```sql
-- 段階的なCTEでロジックを分解する
WITH
-- Step 1: 対象期間のデータを絞り込む
filtered_orders AS (
    SELECT
        order_id,
        user_id,
        order_date,
        amount
    FROM orders
    WHERE order_date BETWEEN '2024-01-01' AND '2024-03-31'
        AND status = 'completed'
),

-- Step 2: ユーザーごとに集計する
user_summary AS (
    SELECT
        user_id,
        COUNT(order_id)  AS order_count,
        SUM(amount)      AS total_amount,
        MIN(order_date)  AS first_order_date,
        MAX(order_date)  AS last_order_date
    FROM filtered_orders
    GROUP BY user_id
)

-- 最終結果
SELECT
    u.user_id,
    u.segment,
    s.order_count,
    s.total_amount
FROM user_summary AS s
INNER JOIN users AS u USING (user_id)
ORDER BY s.total_amount DESC;
```

---

## レビューチェックリスト

作成したクエリをレビューする際に確認する項目：

- [ ] 分析の粒度（1行が何を表すか）は明確か
- [ ] 対象期間は意図通りか（境界値を含む/含まない）
- [ ] NULL 値の扱いは適切か
- [ ] 重複排除は必要か（DISTINCT / ROW_NUMBER）
- [ ] JOIN の基数は想定通りか（行数が増えていないか）
- [ ] 指標の計算式はビジネス定義と一致しているか
- [ ] インデックスが効くフィルター条件になっているか
- [ ] LIMIT なしで実行しても安全な規模か

---

## 行数検証の例

```sql
-- JOINの前後で行数を確認する
SELECT COUNT(*) FROM table_a;              -- 100,000行
SELECT COUNT(*) FROM table_b;              -- 50,000行
SELECT COUNT(*) FROM table_a JOIN table_b  -- 期待値: ≒100,000行
    ON table_a.id = table_b.a_id;
```
