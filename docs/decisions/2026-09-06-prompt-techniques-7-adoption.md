# 2026-09-06 — プロンプト手法5件（「プロンプトアイデア #7」）の採用可否レビュー: 取り込みなし

## 対象と想定用途

- **対象**: note 記事「プロンプトアイデア #7」（本文の貼り付けで受領。URL なし）。
  「まだ世にほとんど出回っていない、新しいプロンプトテクニック」として5手法を提示している —
  Multi-Facet Echo / Blind Intersection Prompting / Keyhole Inversion /
  Fractal Narrative Chaining / Reflection-by-Proxy
- **想定用途**: **このリポジトリのプラグインに、まだ入っていない要素があれば取り込む**

`/adoption-review` の手順（Step 0 → Step 7）で評価した。証拠収集のサブエージェント
（`adoption-researcher`）はセッション上限で起動できなかったため、Web 調査はメインで実施した。

## 結論: 現時点では不要（取り込んだ差分は0件）

5手法のうち4件は**上位互換が実装済み**であり、残る1件（Keyhole Inversion）は
`plugins/model-setup/CLAUDE.md` のルール1「完了条件を先に定義する（必ず）」を**緩める方向**の
変更になるため、取り込めば既存ルールと矛盾する。**プラグインへの変更は行わない。**

## 5手法 × 既存実装の対応

| 記事の手法 | 既存実装 | 記事版との差 |
|---|---|---|
| **Multi-Facet Echo**（複数役が互いの結論を参照して修正し統合） | [`review-panel`](../../plugins/agent-review-panel/skills/review-panel/SKILL.md) の R2 相互批判 → R3 応答・譲歩 → Synthesis | 既存には記事版に無い安全装置がある — 匿名化配布・具体性ゲート・追従的収束の検出・全員一致警告 |
| **Blind Intersection Prompting**（互いを見ずに独立生成 → 交差 → 統合） | 同 R1「他のパネリストの存在・回答は一切渡さない」＋ Synthesis の合意/対立抽出 | 記事版は同一コンテキスト内の「見ない前提」＝**宣言**。既存は別コンテキストで**渡さない**＝**構造**（`self-correct` の「Builder の自己評価を Judge に渡さない」も同じ考え方） |
| **Keyhole Inversion**（特定部分だけゴール先行で逆算） | [`model-setup/CLAUDE.md`](../../plugins/model-setup/CLAUDE.md) ルール1（全体のゴール先行）／[`design-docs/references/templates.md`](../../plugins/pipeline/skills/design-docs/references/templates.md) の「マイグレーション／スキーマ定義から逆算する」 | 記事版は逆算を一部に限定する＝ルール1の緩和。取り込めば矛盾する |
| **Fractal Narrative Chaining**（同じ構成を入れ子で自己相似に繰り返す） | [`design-docs`](../../plugins/pipeline/skills/design-docs/SKILL.md) のフェーズ別固定章立て＋brief の「構成案」を CP2 で人が承認 | 設計書はフェーズごとに読者と粒度が違うため自己相似にならない。再帰的な長文生成は長編小説向けの先行研究の領分 |
| **Reflection-by-Proxy**（別ロールがレビューし生成役に戻す） | [`self-correct`](../../plugins/self-correct/skills/self-correct/SKILL.md)（`loop-judge` から Edit/Write を剥奪）／`pipeline` の `final-reviewer`／`model-setup` の `fresh-verifier` | 記事版は同一コンテキストでのロール切り替え。既存は fresh context ＋ツール権限による分離 |

## 記事の「新しい」という主張の検証（2026-09-06 取得）

| 記事の主張 | 検証結果 |
|---|---|
| 5手法は「まだ世にほとんど出回っていない、新しいテクニック」 | **命名だけが新規**。独立回答 → 相互参照 → 統合は [Du et al. 2023, *Improving Factuality and Reasoning in Language Models through Multiagent Debate*](https://arxiv.org/abs/2305.14325)、自己フィードバックによる改訂は [Madaan et al. 2023, *Self-Refine*](https://arxiv.org/abs/2303.17651)、再帰的な長文生成は [Yang et al. 2022, *Re3*](https://arxiv.org/abs/2210.06774) が先行する |
| 5つの手法名の流通 | **0件** — 記事の外でこれらの命名が使われている例は Web 検索で確認できなかった |
| 効果（「より創造的かつ深みのあるアウトプット」） | **確認できた効果は0件** — 記事内に実測・比較対象・測定条件つきの数値が一切ない（記事本文から確認） |

## 否定側の根拠 — 相互参照そのものに害の実証がある

記事の中核（役同士に互いの結論を参照させて修正させる）については、第三者研究が**逆方向の
結果**を報告している。

- [Wynn et al. 2025, *Talk Isn't Always Cheap: Understanding Failure Modes in Multi-Agent Debate*](https://arxiv.org/abs/2509.05396)（2026-09-06 取得）
  — 討論により精度が下がることがあり、モデルは誤った説得に同調して正答から誤答へ移る
- [Wang et al. 2024（ACL）, *Rethinking the Bounds of LLM Reasoning: Are Multi-Agent Discussions the Key?*](https://arxiv.org/abs/2402.18272)（同）
  — 強いプロンプトの単一エージェントが、既存の討論手法とほぼ同等の性能に達する
- [Huang et al. 2023, *Large Language Models Cannot Self-Correct Reasoning Yet*](https://arxiv.org/abs/2310.01798)
  — 外部フィードバックの無い内在的自己修正は性能を改善せず、劣化することもある
  （`self-correct` の 2026-09-05 決定記録ですでに参照している）

既存の `review-panel` はこの害に対処する装置（追従的収束の検出・全員一致警告・匿名化・
具体性ゲート）を持っており、記事版にはこれが無い。**取り込めば後退する。**

## 最終評価

| 観点 | 点数 | 根拠 |
|---|---|---|
| コンセプト | 6/10 | 早期収束の回避・自己レビューの客観化という問題設定自体は妥当（先行研究が同じ方向を向いている） |
| 実装品質 | 判定不能 | 記事でありコード・テスト・CI が存在しない |
| 実務採用価値 | 2/10 | 想定用途に対し4件は上位互換が実装済み、1件はルール1と矛盾 |
| 再現性 | 3/10 | プロンプト文面は再現できるが、効果の測定条件・比較対象・数値が記事に無い |
| コスト効率 | 2/10 | 取り込みコスト（スキル改訂・整合確認・撤退）に対し差分0。記事自身がトークン増と混乱リスクを認めている |
| メンテナンス性 | 判定不能 | 配布物ではなく、保守主体・更新の概念がない |
| 過大評価耐性 | 3/10 | 「ほとんど出回っていない新手法」の主張に対し4件に先行研究があり、記事に出典が0件 |
| 総合 | 2/10 | 実務採用価値2とコスト効率2の低いほう |

## 教訓との照合

- **教訓1（作る前に本体・公式プラグイン・著名 OSS を確認する）** — 今回は「自リポジトリの
  既存実装」を先に確認する形で適用した。5手法中4件がここで消えた
- **教訓4（分類を中身より先に増やさない）** — 手法名が5つ並ぶと5つの穴があるように見えるが、
  中身は既存の1〜2機構に収束する。名前の数を実装の数にしない

## 積み残し（今回は実装しない）

`review-panel` の R2/R3（相互批判・応答譲歩）と「追従的収束の検出」「全員一致警告」は、
上記 Wynn et al. / Wang et al. の実証に裏づけられている。**出典 URL を SKILL.md か README に
明記する**のは妥当な改善だが、**今回のレビュー対象（記事）には無い論点**であり、スコープを
広げないため別途の判断とする（先例: [2026-09-06 の self-correct 記事レビュー](2026-09-06-self-correct-article-adoption.md) の積み残し節）。

## 確認できなかったこと

- **記事の元 URL** — 本文の貼り付けのみで受領したため、掲載媒体・公開日・著者の他の発信を
  確認できなかった
- **5手法の効果に関する第三者の実証・実運用報告** — **0件**。ただし
  `adoption-review` の中核ルール11 に従い、これを減点の材料にはしていない
  （否定の根拠は「先行研究の存在」と「既存実装の優位」であって、情報の不在ではない）
- **`adoption-researcher` による並列証拠収集** — セッション上限（rate limit）で起動できず、
  Web 調査はメインが直接実施した
