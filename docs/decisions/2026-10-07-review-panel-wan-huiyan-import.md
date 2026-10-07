# 2026-10-07 — review-panel に wan-huiyan/agent-review-panel の仕組みを取り込んだ決定

## 背景

2026-10-06 の整理で、review-panel の存在理由は「Claude 以外のモデル（Codex・Kiro）を混ぜられること」だけだと
確認した（[`2026-10-06-repo-cleanup.md`](2026-10-06-repo-cleanup.md) 第3段）。同趣旨の
[wan-huiyan/agent-review-panel](https://github.com/wan-huiyan/agent-review-panel)（MIT）は仕組みが厚いが
Claude 専用で、別モデルを混ぜる案は ROADMAP の「Cross-Model Adversarial」で「Agent ツールは Claude の
サブエージェントしか起動できない」として見送られている（2026-10-07 取得・commit 8e7a491・v3.9.1）。

ユーザーの判断は「Claude 以外も混ぜたい。向こうの良い点を取り込んで改造する」。そこで向こうの SKILL.md
（2,278 行）を読み、**混成という強みを伸ばすもの**と**軽く取り込めるもの**だけを選んだ（agent-review-panel 0.7.0）。

## 取り込んだもの

| 取り込んだもの | 向こうの該当箇所 | こちらでの形 |
|---|---|---|
| 外部モデルを相互批判にも参加させる | （向こうには無い。ROADMAP の「1〜2枠を別系統のモデルに」を実装側で受けた） | light でも R2 に `panel-codex`/`panel-kiro` を入れる。別モデルが Claude の所見を、Claude が別モデルの所見を批判する |
| 網羅監査（パネル全体の見落とし探し） | Phase 8 Completeness Audit | deep のみ1名。**外部パネリストがいれば別モデルに任せる**（見落としは同じモデルで繰り返しやすい）。いなければ ⑦網羅監査役 |
| 同じ箇所を読んだ一致は1件 | Live-State Rule 3・Shared-artifact consensus | 支持を「支持1（同一箇所）」と数え、別モデルが独立に出した一致だけ「異種一致」と書く |
| 反証テスト | Live-State Rule 4（Pre-promotion falsification） | 「高」に「誤りを示す観察1つ」と「read-only の1手で確かめられるか」を付ける。ファシリテーターが最大5件確かめ、未確認の「高」は「中」に留める |
| 稼働中の状態の扱い | Live-State Rule 1・2 | `echo`・コメント・手順書は設定の証拠にしない。ソースから推測した稼働中の状態は `[静的推測]` で「高」にしない |
| 確信度 | Phase 4 Private Reflection | 別ラウンドにせず R1 の戻り値に確信度（高中低）を足すだけにした |
| 外部知識の Web 確認 | Phase 11 の external domain claim | deep の「高」のうち製品仕様・API・法規に依存するものをファシリテーターが一次情報で確認（1件2回・最大5件） |
| 裁定後の検証 | Phase 14.5 Post-Judge Verification | 裁定者が持ち込んだ指摘だけ `panel-verifier` で再照合 |
| 討論の欠落チェック | Phase 13.5 の debate-presence assertion | 統合前に R2 の実施を確認。できなければ「⚠️ 討論なし」を見出しに出す |
| 推論の型 | Reasoning Strategy Assignment（DMAD） | ペルソナごとに1行（列挙・攻撃者の模擬・類推・第一原理・逆算） |
| 初見の読者 | Fresh-Reader Reviewer | ⑧として追加。ドキュメントの deep の4人目 |

## 取り込まなかったもの

| 機能 | 理由 |
|---|---|
| HTML レポート・処理履歴ファイル・state ファイル群 | 1回のレビューの出力としては重い。Markdown 1枚（deep のみ）で足りる |
| 複数回実行の統合（--runs N） | ペルソナを回して N 回走らせる費用に対し、混成のほうが安く相関を下げられる |
| データフロー追跡（Phase 2） | コード専用で、`/code-review` の守備範囲と重なる |
| 主観品質の評価モード（Assessment・対照検証ゲート） | 戦略レポート等の採点用で、このパネルの用途（欠陥の発見と対立の裁定）と違う。必要になったら別に検討する |
| 重大度の段階別エージェント（Phase 12・13）・persistent reviewer と SendMessage | 往復の回数を増やす方向で、R2→R3 の1往復に絞った方針と合わない |
| 「既存の欠陥」でなければ最上位にしない規則 | こちらは3段階（高中低）で、計画のレビューでは全指摘が「計画上のリスク」になり「高」が消える。反証テストで代える |
| VoltAgent 連携・ペルソナの自動選択・予算モード | 依存が増える／既定の編成表で足りる |

## 確認できなかったこと

- 取り込んだ規則が実際に偽陽性を減らすかは測っていない。`docs/evals/review-panel.md` に S-4（`echo` を設定と
  取り違えないか・未確認の「高」を出さないか）を足したが、`claude plugin eval` での実測はまだ
- 外部パネリストを R2 に入れたことで、light の CLI 呼び出しが1回から最大2回に増える。費用と効果は未測定
