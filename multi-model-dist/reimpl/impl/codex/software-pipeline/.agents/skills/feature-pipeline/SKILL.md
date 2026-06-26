---
name: feature-pipeline
description: >-
  7つの専門サブエージェント（codebase-researcher → story-writer → spec-writer → backend-builder →
  frontend-builder → test-verifier → implementation-validator）を連鎖させて機能を end-to-end で実装する
  Codex 版オーケストレーター。3つの人間承認チェックポイント（ストーリー/ブリーフ/最終レビュー）で必ず停止する。
  「この機能を作って」「〜を実装して」や、feature-pipeline <機能の説明> で発動。共有仕様は
  multi-model-dist/reimpl/SPEC/software-pipeline.md を正本とする。
---

# feature-pipeline（Codex 版）— ソフトウェアパイプライン

機能開発を7つの専門サブエージェントの流れ作業にする。あなた（オーケストレーター）は自分でコードを書かず、
各フェーズで対応するサブエージェントを起動し、成果物の保存・受け渡し・人間チェックポイントでの停止だけを行う。
共有仕様（連鎖・CP・差し戻し・並列・越境禁止）は `reimpl/SPEC/software-pipeline.md` を正本とする。

## サブエージェント（`.codex/agents/*.toml`）

7体を Codex のサブエージェント機構で起動する。読み取り専用4体（researcher/story-writer/spec-writer/validator）は
`sandbox_mode = "read-only"`、書き込み3体（backend/frontend-builder, test-verifier）は `workspace-write`。

## 進行の永続化

Codex には Kiro のような native spec ワークフローが無いため、**原本どおり `docs/pipeline/<slug>/` にファイル永続化**する:
`status.md`（進行・承認・差し戻しカウンタ）／`research.md`／`story.md`／`brief.md`／`api-contract.md`／`implementation-notes.md`。
read-only エージェントの出力テキストの保存はオーケストレーターの仕事。

## 全体の流れ（SPEC S1）

```
依頼
 → Phase 1: codebase-researcher（調査）→ research.md
 → Phase 2: story-writer（ストーリー）→ story.md      → 🛑 CP1: ストーリー承認
 → Phase 3: spec-writer（技術ブリーフ）→ brief.md     → 🛑 CP2: ブリーフ承認
 → Phase 4: backend-builder（BE 実装＋API契約）→ api-contract.md
 → Phase 5: frontend-builder（FE 実装・API契約に忠実）
 → Phase 6: test-verifier（受け入れテスト＋ギャップ分析）→ 失敗は担当ビルダーへ差し戻し（上限3回）
 → Phase 7: implementation-validator（最終検証）→ 🛑 CP3: 最終レビュー
 → コミット・PR の提案（git 管理下の場合）
```

## 人間承認チェックポイント（SPEC S2）

CC の Plan モードレビューは Codex に無いため、**「成果物の要点サマリー＋全文を提示し、明示承認まで停止」**で置換する。

- **CP1（Phase 2 後）**: story.md の①要点サマリー＋②全文を提示し、明示承認まで Phase 3 に進まない。
- **CP2（Phase 3 後）**: brief.md の①要点サマリー＋②全文を提示。**この時点で1ファイルも変更されていないこと**。承認まで Phase 4 に進まない。
- **CP3（Phase 7 後）**: 最終レポート・変更ファイル一覧を提示。承認まで**コミット・PR に進まない**。
- 承認のたびに status.md の該当行へ承認日付を記録する。

## 差し戻しと並列（SPEC S4/S5）

- Phase 6/7 で ❌失敗・Critical があれば、レポートが指定する**差し戻し先ビルダー**を再起動（自分で直さない）。
  **上限3回**（並列時グループ別）。カウンタは status.md を正とする。超えたら停止して報告。
- brief が独立グループ（所有パスが交わらず共有ファイルを書かない）を宣言したときのみ、Phase 4/5 を
  ①共有/先行逐次 → ②独立グループ並列 → ③依存逐次 で実行。グループ越境はオーケストレーターが守る。

## オーケストレーターのルール

- 各エージェントには必要な成果物だけを渡す（会話履歴全体を流し込まない）。
- 越境（test-verifier がプロダクトコードを直す等）を見つけたら、その変更を破棄して正しい担当へ差し戻す。
- notes と status は役割が違う: 判断・逸脱は implementation-notes、進行状況は status。

## 中断からの再開

会話の記憶でなく `docs/pipeline/<slug>/status.md` を正として、最初の未完了フェーズから続ける。承認済み CP は再承認を求めない。

## 忠実度の差分（原本との違い）

- Plan モードレビュー → 「要点＋全文提示で停止」に置換。
- Task ツール連鎖 → Codex サブエージェント機構。
- 共有ファイル衝突ガード（原本の PreToolUse フック）→ 本実装には含まない（T2h・Codex はフックが貧弱）。並列時は「①共有先行逐次」で衝突を避ける。
