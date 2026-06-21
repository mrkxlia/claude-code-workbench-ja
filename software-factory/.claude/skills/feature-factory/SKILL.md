---
name: feature-factory
description: >-
  7つの専門エージェント（codebase-researcher → story-writer → spec-writer →
  backend-builder → frontend-builder → test-verifier → implementation-validator）を
  連鎖させて機能を end-to-end で実装するオーケストレーター。3つの人間承認チェックポイント
  （ストーリー承認・ブリーフ承認・最終レビュー）で必ず停止する。
  「この機能を作って」「〜を実装して」のような機能開発の依頼や、
  /feature-factory <機能の説明> での手動起動で発動する。
  中断した工場は /feature-factory 再開 <slug> で status.md から再開できる。
argument-hint: <機能の説明>
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
 → Phase 2: story-writer（ストーリー）        → 🛑 チェックポイント1: ストーリー承認（Plan モードレビュー）
 → Phase 3: spec-writer（技術ブリーフ）       → 🛑 チェックポイント2: ブリーフ承認（Plan モードレビュー）
 → Phase 4: backend-builder（バックエンド実装 + API契約）
 → Phase 5: frontend-builder（フロントエンド実装）
 → Phase 6: test-verifier（受け入れテスト）   → 失敗時は担当ビルダーへ差し戻し（上限3回）
 → Phase 7: implementation-validator（最終検証）→ 🛑 チェックポイント3: 最終レビュー
 → コミット・PRの提案（git 管理下の場合）
```

> 凡例: **（Plan モードレビュー）** が付く CP1・CP2 は、Claude Code の Plan モードの計画レビューで承認を取る
> （詳細は後述の「Plan モードレビューについて」）。**CP3 には付かない** — 完成物の検証のため従来どおりテキスト承認。

連鎖が長く、コンテキスト圧縮（コンパクション）やセッション中断で進行状態が失われやすい。
そのため進行状況はコンテキスト内のメモではなく **`docs/factory/<slug>/status.md` に永続化する**。
Phase 0 で以下のテンプレートを status.md として保存し、フェーズ完了・チェックポイント承認・
差し戻しのたびに Edit で更新すること（フェーズ飛ばしと差し戻し回数の喪失を防ぐ）:

```
# 工場の進行状況 — <slug>

- [ ] Phase 0: 準備（slug 決定・docs/factory/<slug>/ 作成）
- [ ] Phase 1: Research → research.md 保存
- [ ] Phase 2: Story → story.md 保存 → 🛑 ストーリー承認（承認: ／方式: ）
- [ ] Phase 3: Brief → brief.md 保存 → 🛑 ブリーフ承認（承認: ／方式: ）
- [ ] Phase 4: Backend → api-contract.md 保存
- [ ] Phase 5: Frontend
- [ ] Phase 6: Verify — 差し戻し 0/3
- [ ] Phase 7: Validate — 差し戻し 0/3 → 🛑 最終レビュー（承認: ）
```

チェックポイントの承認を得たら、その行の「（承認: ）」に日付（YYYY-MM-DD）を記録する
（CP1/CP2 は「方式」に承認方法 — Plan モードレビューなら `Plan`、フォールバックなら `テキスト` — も残す）。
各チェックポイントで停止する際は、status.md の現在の状態をユーザーへの提示に含める。

## Plan モードレビューについて（CP1・CP2）

前向きのチェックポイント **CP1（ストーリー承認）・CP2（ブリーフ承認）** は、Claude Code の
**Plan モードの計画レビュー**で承認を取る。CP3（最終レビュー）は完成物の検証なので対象外（従来どおりテキスト承認）。

工場は research.md / story.md / brief.md 等を**書き出す**ため、全体は**通常モード**で動かす。
Plan モードへ入るのは各 CP の提示のときだけにする。Plan モードで起動された場合は CP まで進めない
（Plan モード中は計画ファイルしか書けない）ので、通常モードに戻してから実行する
（戻せなければユーザーに通常モードでの再起動を促す）。

各 CP では次の二段構えで承認を取る:

**(A) Plan モードレビュー（既定 / `EnterPlanMode`・`ExitPlanMode` が使える Claude Code）**
1. 成果物を所定パスに保存する（通常モード）。
2. **通常モードであることを確認し、`EnterPlanMode` で Plan モードに入る**（既に Plan モード中なら呼ばない＝冪等）。
3. 計画として次を提示する: ① 承認対象の成果物の**全文**、② **遷移宣言**＝「承認後に実行するのは**次の1フェーズだけ**で、
   完了後に**次の CP で必ず再停止する**」（全工程を今から実行するとは書かない）。
4. `ExitPlanMode` で承認を得る。
5. 承認後は通常モードに戻り、status.md に承認日付・方式を記録して、宣言した**次の1フェーズだけ**を実行する。
   - **「次 CP で必ず止まる」担保**は遷移宣言テキストではなく、**次フェーズ完了時に次 CP として再び
     `EnterPlanMode`→`ExitPlanMode` を呼ぶこと自体**である（承認が出るまで先へ進めない）。
     CP1 承認後に brief を作ったら、**Phase 4 に着手する前に CP2 として再度 `EnterPlanMode` に入る**。
   - 修正指示時は対応ビルダーを再起動し、必要なら再び `EnterPlanMode` に入り直して再提示する。

**(B) フォールバック（`EnterPlanMode`/`ExitPlanMode` が無い環境・非 Claude Code）**
- 成果物の全文を提示し、「🛑 STOP. 明示承認があるまで次フェーズに進まない」で承認を待つ。

> どちらを使うかは、`EnterPlanMode` が使えるかで決める（使えなければ (B)）。

## Phase 0: 準備

1. 依頼内容から短い英語ケバブケースの feature-slug を決める（例: `payment-reminders`）
2. 成果物ディレクトリ `docs/factory/<slug>/` を作成する
3. 上記テンプレートから `status.md` を作成して保存する（依頼が「再開」なら下の「中断からの再開」へ）
4. このディレクトリに以下を保存していく:
   - `status.md` — 進行状況（フェーズ・承認・差し戻しカウンタ）
   - `research.md` — 調査レポート
   - `story.md` — ユーザーストーリー
   - `brief.md` — 技術ブリーフ
   - `api-contract.md` — API契約
   - `implementation-notes.md` — 実装ノート（判断・逸脱・トレードオフ・ハマりどころ・積み残し）。
     **ビルダー3種が実装中に直接追記する**ため、保存はメインセッションの仕事ではない。
     status.md（進行管理）とは役割が違う — 進行状況を notes に、判断を status に書かない

**重要:** researcher / story-writer / spec-writer / validator は読み取り専用で
ファイルに書き込めない。彼らの出力（テキスト）を `docs/factory/<slug>/` に保存するのは
あなた（メインセッション）の仕事である。

## Phase 1: Research（調査）

1. Task ツールで `codebase-researcher` を起動する。入力: ユーザーの依頼内容
   （リポジトリに `SPEC.md` / `SPEC-recovered.md` があればその旨も伝える — 一次資料として読まれる）
2. 返ってきた調査レポートを `docs/factory/<slug>/research.md` に保存する
3. レポートの「未解決の質問」に依頼内容の理解を左右するものがあれば、ここでユーザーに確認する

## Phase 2: Story（ストーリー）→ 🛑 チェックポイント1

1. Task ツールで `story-writer` を起動する。入力: 依頼内容 + research.md の内容
2. 返ってきたストーリーを `docs/factory/<slug>/story.md` に保存する
3. ストーリー全文をユーザーに提示する

**🛑 チェックポイント1 — 「Plan モードレビューについて」の手順で承認を取る。**
- **(A)**: `EnterPlanMode` →（story.md の全文 ＋ 遷移宣言「承認後は spec-writer を起動して brief を作り、
  CP2 で必ず停止する」）を計画として提示 → `ExitPlanMode` で承認を得る。承認まで**絶対に Phase 3 に進まない**。
- **(B)**: story.md 全文を提示し、明示的な承認（「承認」「OK」「進めて」等）があるまで Phase 3 に進まない。
- 承認後は status.md の「ストーリー承認」に日付と方式（Plan／テキスト）を記録する。
修正指示があれば story-writer を修正内容つきで再起動し、再びここで停止する（(A) の場合は再び `EnterPlanMode` に入り直して提示する）。

## Phase 3: Brief（技術ブリーフ）→ 🛑 チェックポイント2

1. Task ツールで `spec-writer` を起動する。入力: 承認済み story.md + research.md + CLAUDE.md のルール
2. 返ってきたブリーフを `docs/factory/<slug>/brief.md` に保存する
3. ブリーフ全文をユーザーに提示する

**🛑 チェックポイント2 — 「Plan モードレビューについて」の手順で承認を取る。この時点では1ファイルも変更されていないこと。**
- **(A)**: `EnterPlanMode` →（brief.md の全文 ＋ 遷移宣言「承認後は実装フェーズ（Phase 4-6）を実行し、
  CP3 で必ず停止する」）を計画として提示 → `ExitPlanMode` で承認を得る。承認まで**絶対に Phase 4 に進まない**。
- **(B)**: brief.md 全文を提示し、明示的な承認があるまで Phase 4 に進まない。
- 承認後は status.md の「ブリーフ承認」に日付と方式（Plan／テキスト）を記録する。
修正指示があれば spec-writer を再起動し、再びここで停止する（(A) の場合は再び `EnterPlanMode` に入り直して提示する）。

## Phase 4: Backend（バックエンド実装）

1. Task ツールで `backend-builder` を起動する。入力: 承認済み brief.md + research.md +
   notes 記録先 `docs/factory/<slug>/implementation-notes.md`（差し戻しで再起動するときも同じパスを渡す）
2. 返ってきたサマリーの **API契約** 部分を `docs/factory/<slug>/api-contract.md` に保存する
3. サマリーに「全テスト緑・型チェック通過」がない場合は、完了扱いにせず backend-builder に差し戻す

## Phase 5: Frontend（フロントエンド実装）

1. Task ツールで `frontend-builder` を起動する。
   入力: 承認済み brief.md + research.md + **api-contract.md** +
   notes 記録先 `docs/factory/<slug>/implementation-notes.md`（差し戻し時も同じパスを渡す）
2. Phase 4 の完了前に起動してはならない（API契約が先に存在しないと、
   フロントがエンドポイントを発明してしまうため、並列化は禁止）
3. サマリーに「API契約との不一致」が報告されたら、backend-builder に差し戻して契約を解決してから続行する

## Phase 6: Verify（受け入れテスト）

1. Task ツールで `test-verifier` を起動する。
   入力: story.md（受け入れ基準）+ brief.md + 両ビルダーのサマリー +
   notes 記録先 `docs/factory/<slug>/implementation-notes.md`
2. 検証レポートに ❌ 失敗があれば:
   - レポートが指定する**差し戻し先ビルダー**（backend-builder または frontend-builder）を
     失敗内容つきで再起動する。自分で直さない。test-verifier にも直させない
   - 差し戻すたびに status.md の Verify カウンタを更新する（例: `差し戻し 1/3`）。
     コンテキストの記憶ではなく status.md のカウンタを正とする
   - 修正後、test-verifier を再実行する
3. **差し戻しループの上限は3回。** 超えたら停止し、状況をユーザーに報告して指示を仰ぐ
4. ⚠️ カバー不能の基準は、そのままユーザーへの報告に含める（隠さない）

## Phase 7: Validate（最終検証）→ 🛑 チェックポイント3

1. Task ツールで `implementation-validator` を起動する。
   入力: story.md + brief.md + 全サマリー
2. **Critical** の指摘があれば、該当ビルダーに差し戻し → 修正 → test-verifier 再実行 →
   validator 再実行（このループも上限3回。status.md の Validate カウンタを更新する）
3. **学習の回収:** 両ビルダーのサマリーに「CLAUDE.md への提案」があれば、
   `docs/factory/LEARNINGS.md` に追記する
   （形式: `- [ ] YYYY-MM-DD <slug> (backend-builder): 提案内容`）。
   さらに `docs/factory/<slug>/implementation-notes.md` の **Decisions / Deferred** を読み、
   他機能にも一般化できる判断・ルール化すべき積み残しがあれば、同形式で LEARNINGS.md に
   追記する（agent 名はエントリの日付見出し `## YYYY-MM-DD — <agent>: ...` から取る）
4. クリーンになったら、最終レポート・変更ファイル一覧・LEARNINGS.md の未昇格エントリ
   （チェックの付いていない行）をユーザーに提示する

**STOP. ユーザーがレビューして承認するまで、コミット・PR作成に進んではならない。**
承認時、提示した LEARNINGS エントリを CLAUDE.md のルールに昇格させるか確認する。
昇格させたエントリには LEARNINGS.md 上でチェック（`- [x]`）を付ける（採用しないものは未チェックのまま残す）。
承認後、git 管理下ならコミット（およびユーザーが望めばPR作成）を提案する。
git 管理されていないリポジトリでは、変更ファイル一覧の提示をもって完了とする。

## 中断からの再開

セッション中断やコンパクションで進行状態を見失ったら、会話の記憶ではなく
`docs/factory/<slug>/status.md` を正として再開する:

1. `/feature-factory 再開 <slug>`（または slug を特定できる再開の依頼）を受けたら、
   `docs/factory/<slug>/` の status.md と保存済みの中間成果物
   （research.md / story.md / brief.md / api-contract.md / implementation-notes.md）を読む。
   implementation-notes.md がある場合は、まず冒頭の **Status ブロック（State / Next / Watch out）**
   を読む — 前セッションの実装状態と注意点が10秒でわかる
2. status.md の最初の未チェックフェーズから処理を続ける
3. 承認が記録されているチェックポイントは再承認を求めない（承認済みの成果物をそのまま入力に使う）
4. status.md と現実が食い違う場合（例: Phase 3 がチェック済みなのに brief.md が無い）は、
   食い違いをユーザーに報告し、整合する最後のフェーズからやり直す

## 工場長のルール

- チェックポイントのスキップは、ユーザーが事前に明示的に指示した場合のみ許される
- 各エージェントには必要な成果物だけを渡す。会話履歴全体を流し込まない（コンテキストを汚さない）
- エージェントの担当範囲の越境（例: test-verifier がプロダクトコードを直す）を見つけたら、
  その変更を破棄して正しい担当者に差し戻す
- 途中でアーキテクチャ上の前提が間違っていたと判明したら、パッチで誤魔化さず、
  正しい前提を織り込んで該当フェーズからやり直す
