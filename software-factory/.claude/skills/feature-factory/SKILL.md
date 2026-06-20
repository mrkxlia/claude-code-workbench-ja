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
 → Phase 2: story-writer（ストーリー）        → 🛑 チェックポイント1: ストーリー承認
 → Phase 3: spec-writer（技術ブリーフ）       → 🛑 チェックポイント2: ブリーフ承認
 → Phase 4: backend-builder（バックエンド実装 + API契約）
 → Phase 5: frontend-builder（フロントエンド実装）
 → Phase 6: test-verifier（受け入れテスト）   → 失敗時は担当ビルダーへ差し戻し（上限3回）
 → Phase 7: implementation-validator（最終検証）→ 🛑 チェックポイント3: 最終レビュー
 → コミット・PRの提案（git 管理下の場合）
```

連鎖が長く、コンテキスト圧縮（コンパクション）やセッション中断で進行状態が失われやすい。
そのため進行状況はコンテキスト内のメモではなく **`docs/factory/<slug>/status.md` に永続化する**。
Phase 0 で以下のテンプレートを status.md として保存し、フェーズ完了・チェックポイント承認・
差し戻しのたびに Edit で更新すること（フェーズ飛ばしと差し戻し回数の喪失を防ぐ）:

```
# 工場の進行状況 — <slug>

- [ ] Phase 0: 準備（slug 決定・docs/factory/<slug>/ 作成）
- [ ] Phase 1: Research → research.md 保存
- [ ] Phase 2: Story → clarify で要件を詰める → story.md 保存 → 🛑 ストーリー承認（承認: ）
- [ ] Phase 3: Brief → clarify で仕様を詰める → brief.md 保存 → 🛑 ブリーフ承認（承認: ）
- [ ] Phase 4: Backend → api-contract.md 保存
- [ ] Phase 5: Frontend
- [ ] Phase 6: Verify + テストギャップ分析 — 差し戻し 0/3
- [ ] Phase 7: Validate — 差し戻し 0/3 → 🛑 最終レビュー（承認: ）
```

brief に「並列実行プラン」で独立グループが宣言されている場合は、Phase 4/5 を並列実行に置き換え、
差し戻しカウンタは**グループ別**にする。その場合は上記 Phase 4/5 の2行を次の形に展開する:

```
- [ ] Phase 4: 実装（並列）
      - [ ] ① 共有/先行逐次変更（schema・マイグレーション・package.json・型バレル等）
      - [ ] ② 独立グループ並列（.parallel-active 作成）— group-a 差し戻し 0/3 / group-b 差し戻し 0/3 ...
      - [ ] ③ 依存グループ逐次（.parallel-active 削除・グループ別ノートを本体へマージ）
```

チェックポイントの承認を得たら、その行の「（承認: ）」に日付（YYYY-MM-DD）を記録する。
各チェックポイントで停止する際は、status.md の現在の状態をユーザーへの提示に含める。

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

1. **clarify で要件を詰める（writer 起動の前に1回）。** `clarify` スキルのプロトコルで、
   research.md を踏まえてもなお人間にしか答えられない要件の曖昧さ・抜けを、**一問ずつ**
   （各問に推奨回答つき・AskUserQuestion を使うなら `questions` は常に1問）ユーザーに確認する。
   調べればわかることは聞かない。掘り尽くしたら「決まったこと」をまとめる。
2. Task ツールで `story-writer` を起動する。入力: 依頼内容 + research.md + clarify の「決まったこと」
3. 返ってきたストーリーを `docs/factory/<slug>/story.md` に保存する
4. ユーザーがファイルを開かずにレビューできるよう、チャットに次の2つを必ず表示する
   （「story.md に保存した。確認して」のようにファイルを指すだけで終わらせない）:
   - **要点サマリー** — 一文でのストーリー要約 + 受け入れ基準の箇条書き
   - **全文** — 保存した story.md の内容を省略・要約せずそのまま提示する

**STOP. ユーザーの明示的な承認（「承認」「OK」「進めて」等）があるまで、
絶対に Phase 3 に進んではならない。** 承認🛑はここ1回だけ（clarify を承認のたびに再起動しない）。
修正指示があれば story-writer を修正内容つきで再起動し、再びここで停止する（再提示も step 4 と同じ要点サマリー＋全文の形式で行う）。

## Phase 3: Brief（技術ブリーフ）→ 🛑 チェックポイント2

1. **clarify で仕様を詰める（writer 起動の前に1回）。** `clarify` スキルのプロトコルで、
   設計上の分岐・トレードオフ・残る技術判断を**一問ずつ**（各問に推奨回答つき・AskUserQuestion を
   使うなら `questions` は常に1問）ユーザーに確認する。調べればわかることは聞かない。
   掘り尽くしたら「決まったこと」をまとめる。
2. Task ツールで `spec-writer` を起動する。入力: 承認済み story.md + research.md + CLAUDE.md のルール
   + clarify の「決まったこと」
3. 返ってきたブリーフを `docs/factory/<slug>/brief.md` に保存する
4. ユーザーがファイルを開かずにレビューできるよう、チャットに次の2つを必ず表示する
   （「brief.md に保存した。確認して」のようにファイルを指すだけで終わらせない）:
   - **要点サマリー** — 主要な技術判断・対象（変更/作成）ファイル・残る論点・**並列実行プランの要旨**
   - **全文** — 保存した brief.md の内容を省略・要約せずそのまま提示する

**STOP. ユーザーの明示的な承認があるまで、絶対に Phase 4 に進んではならない。
この時点では1ファイルも変更されていないこと。** 承認🛑はここ1回だけ（clarify を承認のたびに再起動しない）。
修正指示があれば spec-writer を再起動し、再びここで停止する（再提示も step 4 と同じ要点サマリー＋全文の形式で行う）。

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
   フロントがエンドポイントを発明してしまう）。**依存があるグループ（FE→BE-API 等）の並列化は禁止。
   独立グループ（依存なし・所有パスが交わらない・共有ファイルを書かない）の並列化は下記「並列実行」で可。**
3. サマリーに「API契約との不一致」が報告されたら、backend-builder に差し戻して契約を解決してから続行する

## Phase 4/5 の並列実行（brief に「並列実行プラン」で独立グループがある場合）

brief が独立グループを宣言しているときは、Phase 4/5 を次の順で実行する。宣言が無い（全体が依存で
繋がっている）場合は上の既定どおり Backend→Frontend を逐次実行する。

1. **① 共有/先行逐次変更** — brief の「共有/先行逐次変更」（schema・マイグレーション・`package.json`・
   型バレル・ルーティング集約 index 等）を、まず**1つのビルダーで逐次**に実施して共有IFを固定する。
   このステップでは `.parallel-active` マーカーを作らない（共有ファイルの正当な書き込みを止めないため）。
2. **② 独立グループを並列起動** — `docs/factory/<slug>/.parallel-active` を作成してから、独立グループの
   ビルダーを**1メッセージ内の複数 Task で同時に**起動する。各ビルダーへの入力は
   「承認済み brief + 共有先行で確定した schema/API契約 + **当該グループの所有パスと依存だけ**
   （brief 全体を丸投げしない）+ **グループ別ノート** `docs/factory/<slug>/implementation-notes-<group>.md`」。
   差し戻しカウンタは**グループ別**に持つ（`group-a 差し戻し 1/3` 等を status.md に記録）。
   1グループでも上限3回を超えたらそのグループを停止してユーザーに報告する（健全なグループは続行）。
3. **②終了処理** — 全独立グループ完了後、`.parallel-active` を削除し、各
   `implementation-notes-<group>.md` を本体 `implementation-notes.md` へ追記マージして
   Status ブロックを統合更新する（グループ別ノートはマージ後にアーカイブ）。BE グループが
   API契約を出していれば `api-contract.md` に保存する。
4. **③ 依存グループを逐次** — 依存エッジに従い、依存先（例: FE←BE-API契約）を逐次実行する。
   ここは `.parallel-active` 無しで通常どおり進める。
5. 越境（あるグループのビルダーが他グループの所有パスへ書く）を見つけたら、その変更を破棄して
   正しい担当に差し戻す（フックが守るのは共有ファイル衝突のみ。グループ境界は工場長が守る）。

## Phase 6: Verify（受け入れテスト + テストギャップ分析）

1. Task ツールで `test-verifier` を起動する。
   入力: story.md（受け入れ基準）+ brief.md（「必要なテスト」の列挙を含む）+ 両ビルダーのサマリー +
   notes 記録先 `docs/factory/<slug>/implementation-notes.md`
2. 検証レポートに ❌ 失敗があれば:
   - レポートが指定する**差し戻し先ビルダー**（backend-builder または frontend-builder）を
     失敗内容つきで再起動する。自分で直さない。test-verifier にも直させない
   - 差し戻すたびに status.md の Verify カウンタを更新する（例: `差し戻し 1/3`）。
     コンテキストの記憶ではなく status.md のカウンタを正とする
   - 修正後、test-verifier を再実行する
3. **テストギャップ分析**の結果を処理する:
   - 🟢 追加済み（test-verifier がテストを足して埋めたギャップ）はそのまま受け入れる
   - 🔧 要コード修正（テストだけでは埋まらないギャップ）は、レポートが指定する差し戻し先ビルダーに
     差し戻す。**この差し戻しも上の Verify カウンタ（並列時は当該グループのカウンタ）に計上する**
4. **差し戻しループの上限は3回**（ギャップ由来の差し戻し込み・並列時はグループ別）。
   超えたら停止し、状況をユーザーに報告して指示を仰ぐ
5. ⚠️ カバー不能の基準・残ったギャップは、そのままユーザーへの報告に含める（隠さない）

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
5. **並列フェーズの後始末を先に行う**（並列実行プランを使った場合）:
   - 未マージの `implementation-notes-<group>.md` が残っていれば、本体 `implementation-notes.md` へ
     先にマージしてから再開する（再開ロジックは本体ノートしか読まないため、放置すると判断記録を取りこぼす）
   - status.md が Phase 4 の並列②完了済みを示すのに `.parallel-active` マーカーが残っていれば削除する
     （並列中の中断で残留したマーカーを掃除しないと、再開後の共有ファイル書き込みが ask され続ける）

## 工場長のルール

- チェックポイントのスキップは、ユーザーが事前に明示的に指示した場合のみ許される
- 各エージェントには必要な成果物だけを渡す。会話履歴全体を流し込まない（コンテキストを汚さない）
- エージェントの担当範囲の越境（例: test-verifier がプロダクトコードを直す）を見つけたら、
  その変更を破棄して正しい担当者に差し戻す
- 途中でアーキテクチャ上の前提が間違っていたと判明したら、パッチで誤魔化さず、
  正しい前提を織り込んで該当フェーズからやり直す
