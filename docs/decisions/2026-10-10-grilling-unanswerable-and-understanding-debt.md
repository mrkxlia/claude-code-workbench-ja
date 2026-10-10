# 2026-10-10 — Grilling の分岐・理解負債の記事・Issue 運用ポストの再評価（取り込みは1点）

## 対象と想定用途

ユーザーから「取り入れて」として3件が渡された。[`/adoption-review`](../../plugins/adoption-review/skills/adoption-review/SKILL.md)
の手順で1件ずつ評価した。

| # | 対象 | 種別 |
|---|---|---|
| 1 | [Grillingで詰まったら、推測せず分岐する](https://tech.algomatic.jp/entry/2026/08/31/185832)（Algomatic・2026-08-31） | ブログ記事 |
| 2 | [AIに丸投げしないで理解するためのAI開発手法（2026年8月現在）](https://zenn.dev/avaintelligence/articles/dont-outsource-understanding-to-ai)（Zenn・keitakn・2026-08-28／09-09 更新） | ブログ記事 |
| 3 | [gogo_tanaka の X ポスト](https://x.com/gogo_tanaka/status/2086410676684345710)（2026-08-09） | X ポスト（本文は fxtwitter API で取得） |

- **想定用途（仮置き）**: このリポジトリの既存プラグインに、まだ入っていない要素があれば取り込む
- #1・#2 は [2026-10-03 の積読レビュー](2026-10-03-tsundoku-claude-code-16-items-adoption.md)で評価済み
  （#1 は「条件付きで有用」、#2 は「現時点では不要」）。今回は**その後に変わった事実**を中心に見直した
- 取得日はすべて 2026-10-10。`/deep-research` workflow はこのセッションで使えなかったため、メインが WebFetch と
  上流リポジトリの clone で集めた（ソース同士の照合はしていない）

## 前回から変わった事実

1. 前回 #1 を取り込んだ受け皿の `clarify` は、[2026-10-06 第5段](2026-10-06-repo-cleanup.md)で上流 `grilling`
   （無改変で同梱）に置き換えられた。そこには「失ったのは clarify 独自の『答えられないときの3分岐』1点」とある。
   **この時点で、3分岐はリポジトリから消えていた**
2. 前回 #2 を不採用にした理由の一つ「`explain-visually` ≒ `project-catchup`」は、受け皿の `project-catchup` が
   10-06 の第4段で削除されたため成り立たなくなった
3. 上流 mattpocock/skills は v1.3.1。`teach`・`to-questionnaire`・`handoff`・`grill-with-docs`・`triage` は
   `disable-model-invocation: true` のまま（Claude からは呼べない）。`prototype` はモデルから呼べる。
   上流 `grilling` には、同梱版に無い1行 "Word each question so "yes" accepts your recommended answer." が追加されている
4. #3 の添付画像は、上流 `setup-matt-pocock-skills/triage-labels.md` のラベル表
   （`needs-triage`・`needs-info`・`ready-for-agent`・`ready-for-human`・`wontfix`）と同じものだった

## 結論（横並び）

| # | 結論 | 採用判断 |
|---|---|---|
| 1 | 条件付きで有用 | 特定用途だけ使う → **取り込み**（pipeline 5.2.0） |
| 2 | 試す価値はあるが常用は微妙 | 情報収集に留める |
| 3 | 現時点では不要 | 採用しない |

## 取り込んだもの: task-pipeline の「答えが返ってこない問い」と CP1 での未解決の質問の扱い

`plugins/pipeline/skills/task-pipeline/SKILL.md` の Phase 2・Phase 3 に、次の2点を足した。

- **grilling で答えが返ってこない問いを推奨回答で埋めない。** 理由で分ける — 意味・前提が分からない → 判断に要る範囲だけ
  説明して出し直す（深く学ぶなら `deep-understand`）／決める人・情報が別にいる → `確認先 / 現在の仮定` を添えて
  「未解決の質問」として writer に渡す／試さないと分からない → 別タスクの試作を提案し、同じく「未解決の質問」へ
- **未解決の質問が残ったまま承認しない。** CP1 の要点サマリーに全件を出し、1件ずつ「回答する／仮定のまま進める／
  回答を待つ」を選ばせる。待つなら status.md に「回答待ち」と書いて止め、回答が来たら requirements-writer を
  再起動して CP1 をやり直す。CP2 も同じ扱い

同梱の `grilling` は書き換えていない（無改変の方針を維持）。上流のコマンド名（`/to-questionnaire` 等）は
[skills-guide](../skills-guide/README.md) の1節にだけ置く規約（教訓9）のため、SKILL.md には書いていない。

## 敵対的検証（Step 6）

肯定寄りの #1・#2 に `adoption-challenger` の定義を渡し、fresh context の general-purpose エージェントで反論させた
（このセッションには adoption-challenger のエージェント種別が登録されていなかった）。

### #1 — 初版案（3分岐を約10行足し、grilling を上流から再コピー）への反論と処理

| 反論 | 重大度 | 処理 |
|---|---|---|
| 推測が入るのは「分からない」と言ったときではなく、黙って推奨回答に同意したとき。再コピーする1行（yes で推奨回答を受け入れる）はその経路を太くする | 高 | 採用。**再コピーは見送った**。分岐の対象に「回答から決める人・情報が別にいると分かった問い（推奨回答への同意を含む）」を入れた |
| `確認先 / 現在の仮定` は推測に札を付けるだけ。CP1 で未解決のまま承認されれば下流は同じ誤った前提で作る | 高 | 採用。**CP1・CP2 で未解決の質問を1件ずつ判断させる**ことを取り込みの中心にした |
| 記事の4ルール目「結果を戻して再開する」が無く、回答待ち・試作待ちで宙に浮く | 中 | 採用。status.md の「回答待ち」と、回答後に writer を再起動して CP をやり直す手順を書いた |
| 推測で埋めないルールは既に4か所にあり、差分は書式と分岐先の案内だけ | 中 | 一部採用。requirements-writer の「未解決の質問」は既にあるので新設せず、それを CP で止める側に寄せた |
| 10-03 追加 → 10-06 削除 → 今回再追加の往復で、新しい根拠が無い | 中 | 不採用。10-06 の削除は clarify ごとの置換の副作用で、3分岐自体を不要と判断した記録は無い。今回は形も変えている |
| `deep-understand` は grilling の途中に入るには重い | 低〜中 | 採用。既定は「その場で短く説明して出し直す」にし、`deep-understand` は腰を据えて学ぶ場合の括弧書きに下げた |
| 試作の分岐は非コードの成果物と合いにくい | 低 | 残した。頻度は低くても、出たときに推測で埋めない受け皿として1行で済む |
| 仮定で持ち越すと grilling の終了条件（何も黙って仮定しない）と食い違う | 低 | 「決まったこと」と分けて明示的に持ち越すので、黙った仮定にはならない |

### #2 — explain-visually を skills-guide に1行載せる案への反論（格下げの理由）

- **最も効いた反論**: 「人間がレビュー前に読み解く」用途では、人間が読むのは原文ではなくモデルの並べ直しになる。
  SKILL.md 自身が「要約から要約を作ると、原文にない誤りが混ざり、しかも読み手には検出できない」と書き、
  `verify_page.py` が確かめるのは描画だけで、原文への忠実さを照合する仕組みは無い
- `verify_page.py` は Chrome のパスを `/Applications/Google Chrome.app/...` に固定しており、macOS 以外では
  中核の検証工程が失敗する（会社 PC プロファイルは Windows・git なしを想定）
- 他人の PR を読みながら Bash サンドボックスの外での実行を前提にしている
- 作者1名・全12コミット・Mermaid は `mermaid@11` のメジャー固定で CDN から読む

理解負債という主張そのものは、learning-coach を独立させた理由（[2026-09-05](2026-09-05-learning-prompt-as-skill.md)）と同じ。
記事の他の工程（grill-with-docs・Codex での計画／PR レビューループ）は、上流 `grill-with-docs`（skills-guide に掲載済み）・
cli-bridge の `plan-review-codex.sh`・公式 `openai/codex-plugin-cc` と重なる。

## #3 を採用しない理由（否定寄りの点検）

ポストの中身は「`/grill-with-docs` で実装・`docs/adr` にコンテキスト・課題管理は GitHub Issues だけ・ラベルを設計して
PdM は `needs-xxx` をさばく」。これは上流の `setup-matt-pocock-skills`＋`triage` の運用そのもので、どちらも
skills-guide に案内済み。否定の根拠は「確認できなかった」ではなく「上流に既にあり案内済み」という確認できた事実で、
想定用途（このリポジトリへの取り込み）に効いている。根拠は投稿者の「最強だと確信した」という感想のみ。

## 確認できなかったこと

- 3分岐や CP での止め方が、推測の流出を実際にどれだけ減らすかの測定（記事・上流とも数値なし）
- 旧 clarify の3分岐が 10-03〜10-06 に使われた記録
- explain-visually の作者以外の利用報告、macOS 以外での動作
- X ポストの引用ポスト1件の本文
- 証拠は単独の経路で集めた（`/deep-research` による照合なし）
