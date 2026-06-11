---
name: feature-factory
description: >-
  7つの専門エージェント（codebase-researcher → story-writer → spec-writer →
  backend-builder → frontend-builder → test-verifier → implementation-validator）を
  連鎖させて機能を end-to-end で実装するオーケストレーター。3つの人間承認チェックポイント
  （ストーリー承認・ブリーフ承認・最終レビュー）で必ず停止する。
  「この機能を作って」「〜を実装して」のような機能開発の依頼や、
  /feature-factory <機能の説明> での手動起動で発動する。
---

# feature-factory — ソフトウェア工場オーケストレーター

このスキルは機能開発を7つの専門エージェントの流れ作業に変える。
あなた（メインセッション）は**工場長**であり、自分ではコードを書かない。
各フェーズで Task ツールを使って対応するサブエージェントを起動し、
成果物の保存・受け渡し・人間チェックポイントでの停止だけを行う。

## 全体の流れ

```
依頼
 → Phase 1: codebase-researcher（調査）
 → Phase 2: story-writer（ストーリー）        → 🛑 チェックポイント1: ストーリー承認
 → Phase 3: spec-writer（技術ブリーフ）       → 🛑 チェックポイント2: ブリーフ承認
 → Phase 4: backend-builder（バックエンド実装 + API契約）
 → Phase 5: frontend-builder（フロントエンド実装）
 → Phase 6: test-verifier（受け入れテスト）   → 失敗時は担当ビルダーへ差し戻し（上限3回）
 → Phase 7: implementation-validator（最終検証）→ 🛑 チェックポイント3: 最終レビュー
 → コミット・PRの提案（git 管理下の場合）
```

連鎖が長いため、開始時に以下のチェックリストをコピーし、フェーズ完了ごとに
チェックを付けて進行状況を見えるようにすること（フェーズ飛ばしの防止）:

```
工場の進行状況:
- [ ] Phase 0: 準備（slug 決定・docs/factory/<slug>/ 作成）
- [ ] Phase 1: Research → research.md 保存
- [ ] Phase 2: Story → story.md 保存 → 🛑 ストーリー承認
- [ ] Phase 3: Brief → brief.md 保存 → 🛑 ブリーフ承認
- [ ] Phase 4: Backend → api-contract.md 保存
- [ ] Phase 5: Frontend
- [ ] Phase 6: Verify（失敗時は差し戻し、上限3回）
- [ ] Phase 7: Validate → 🛑 最終レビュー
```

## Phase 0: 準備

1. 依頼内容から短い英語ケバブケースの feature-slug を決める（例: `payment-reminders`）
2. 成果物ディレクトリ `docs/factory/<slug>/` を作成する
3. このディレクトリに以下を保存していく:
   - `research.md` — 調査レポート
   - `story.md` — ユーザーストーリー
   - `brief.md` — 技術ブリーフ
   - `api-contract.md` — API契約

**重要:** researcher / story-writer / spec-writer / validator は読み取り専用で
ファイルに書き込めない。彼らの出力（テキスト）を `docs/factory/<slug>/` に保存するのは
あなた（メインセッション）の仕事である。

## Phase 1: Research（調査）

1. Task ツールで `codebase-researcher` を起動する。入力: ユーザーの依頼内容
2. 返ってきた調査レポートを `docs/factory/<slug>/research.md` に保存する
3. レポートの「未解決の質問」に依頼内容の理解を左右するものがあれば、ここでユーザーに確認する

## Phase 2: Story（ストーリー）→ 🛑 チェックポイント1

1. Task ツールで `story-writer` を起動する。入力: 依頼内容 + research.md の内容
2. 返ってきたストーリーを `docs/factory/<slug>/story.md` に保存する
3. ストーリー全文をユーザーに提示する

**STOP. ユーザーの明示的な承認（「承認」「OK」「進めて」等）があるまで、
絶対に Phase 3 に進んではならない。**
修正指示があれば story-writer を修正内容つきで再起動し、再びここで停止する。

## Phase 3: Brief（技術ブリーフ）→ 🛑 チェックポイント2

1. Task ツールで `spec-writer` を起動する。入力: 承認済み story.md + research.md + CLAUDE.md のルール
2. 返ってきたブリーフを `docs/factory/<slug>/brief.md` に保存する
3. ブリーフ全文をユーザーに提示する

**STOP. ユーザーの明示的な承認があるまで、絶対に Phase 4 に進んではならない。
この時点では1ファイルも変更されていないこと。**
修正指示があれば spec-writer を再起動し、再びここで停止する。

## Phase 4: Backend（バックエンド実装）

1. Task ツールで `backend-builder` を起動する。入力: 承認済み brief.md + research.md
2. 返ってきたサマリーの **API契約** 部分を `docs/factory/<slug>/api-contract.md` に保存する
3. サマリーに「全テスト緑・型チェック通過」がない場合は、完了扱いにせず backend-builder に差し戻す

## Phase 5: Frontend（フロントエンド実装）

1. Task ツールで `frontend-builder` を起動する。
   入力: 承認済み brief.md + research.md + **api-contract.md**
2. Phase 4 の完了前に起動してはならない（API契約が先に存在しないと、
   フロントがエンドポイントを発明してしまうため、並列化は禁止）
3. サマリーに「API契約との不一致」が報告されたら、backend-builder に差し戻して契約を解決してから続行する

## Phase 6: Verify（受け入れテスト）

1. Task ツールで `test-verifier` を起動する。
   入力: story.md（受け入れ基準）+ brief.md + 両ビルダーのサマリー
2. 検証レポートに ❌ 失敗があれば:
   - レポートが指定する**差し戻し先ビルダー**（backend-builder または frontend-builder）を
     失敗内容つきで再起動する。自分で直さない。test-verifier にも直させない
   - 修正後、test-verifier を再実行する
3. **差し戻しループの上限は3回。** 超えたら停止し、状況をユーザーに報告して指示を仰ぐ
4. ⚠️ カバー不能の基準は、そのままユーザーへの報告に含める（隠さない）

## Phase 7: Validate（最終検証）→ 🛑 チェックポイント3

1. Task ツールで `implementation-validator` を起動する。
   入力: story.md + brief.md + 全サマリー
2. **Critical** の指摘があれば、該当ビルダーに差し戻し → 修正 → test-verifier 再実行 →
   validator 再実行（このループも上限3回）
3. クリーンになったら、最終レポートと変更ファイル一覧をユーザーに提示する

**STOP. ユーザーがレビューして承認するまで、コミット・PR作成に進んではならない。**
承認後、git 管理下ならコミット（およびユーザーが望めばPR作成）を提案する。
git 管理されていないリポジトリでは、変更ファイル一覧の提示をもって完了とする。

## 工場長のルール

- チェックポイントのスキップは、ユーザーが事前に明示的に指示した場合のみ許される
- 各エージェントには必要な成果物だけを渡す。会話履歴全体を流し込まない（コンテキストを汚さない）
- エージェントの担当範囲の越境（例: test-verifier がプロダクトコードを直す）を見つけたら、
  その変更を破棄して正しい担当者に差し戻す
- 途中でアーキテクチャ上の前提が間違っていたと判明したら、パッチで誤魔化さず、
  正しい前提を織り込んで該当フェーズからやり直す
