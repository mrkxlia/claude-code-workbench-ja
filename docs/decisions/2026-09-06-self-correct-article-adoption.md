# 2026-09-06 — 自己修正ループ解説記事の採用可否レビュー（self-correct への取り込みは3点に限定）

## 対象と想定用途

- **対象**: 自己修正ループ（Builder / Judge / Manager・Ground Truth・`/goal`・Stop フック）を
  Claude Code だけで組む手順を7 Lecture で解説した記事（本文の貼り付けで受領。URL なし）
- **想定用途**: **このリポジトリの `plugins/self-correct/` に、まだ入っていない内容があれば
  取り込む**。新規プラグインを作るかどうかの判断ではない（2026-09-05 に実装済みのため）

`/adoption-review` の手順（Step 0 → Step 7）で評価した。証拠収集は一次情報（Claude Code 公式
ドキュメント）と外部評価（先行 OSS・研究）に分けた。

## 結論: 現時点では不要（＝記事の中核はすでに取り込み済み）。差分だけ3点を反映した

記事の骨格 — 生成と評価の分離／ツール権限による分離／Ground Truth の3層／
PASS・FAIL・UNVERIFIED／FAIL 箇所だけ修正／最大回数と連続 FAIL での停止／引き継ぎ書式／
記事・競合調査・コードの実務テンプレート／本番投入前チェックリスト／リスク3区分／
`/goal` の併用と再実装しない判断 — は、[2026-09-05 の決定記録](2026-09-05-self-correction-loop.md)
に基づき `plugins/self-correct/` にすでに実装されている。**新規に作るものは無い。**

## 一次情報で検証した記事の事実主張（2026-09-06 取得）

出典: [`/goal` ドキュメント](https://code.claude.com/docs/en/goal)、
[Hooks guide](https://code.claude.com/docs/en/hooks-guide)

| 記事の主張 | 検証結果 |
|---|---|
| `/goal` の評価器はツールを持たず、会話に出た内容だけで判定する | **確認できた** — 「The evaluator ... does not call tools, so it can only judge what Claude has already surfaced in the conversation.」本プラグインの存在理由そのものなので、README の出典に明記した |
| 完了条件は最大 4,000 文字 | **確認できた** — 「The condition can be up to 4,000 characters.」（`references/criteria.md` に記載済み） |
| 1セッション1つ・新しい設定で置き換わる／引数なしで状態確認／`/goal clear` で解除 | **確認できた**（SKILL.md に記載済み） |
| `/goal` を設定しても権限は広がらない | **確認できた** — 「A goal doesn't change your permission mode.」（記載済み） |
| ツールを使える agent 型フックがあり、それは実験的機能 | **確認できた** — 「Agent hooks are experimental. ... For production workflows, prefer command hooks.」→ **取り込んだ（下記1）** |
| `/goal` は v2.1.139 以降で使える | **確認できなかった** — ドキュメントに v2.1.139 の記載は無い（版の記載は v2.1.234 / 236 / 239 / 246 が check-in・resume 周りに存在）。**バージョン番号は書かない**（未確認であり、書けば陳腐化する） |
| 評価器の呼称「Goal Evaluator」 | **公式用語ではない** — ドキュメントの表記は "small fast model"。本リポジトリの表記（「評価器」）は変えない |

## 取り込んだ差分（3点）

1. **agent 型フック（`type: "agent"`）を「採らない」と明記した** — 本プラグインは
   「prompt 型 Stop フックはファイルを開けないから command 型の状態ファイルにした」と
   書いていたが、**ツールを使えるフックが存在すること自体に触れていなかった**。
   選ばなかった理由（公式が実験的とし本番では command フックを推奨）を、
   README の「本体機能との関係」表と `references/ground-truth.md` の Layer 3 に追記した。
   教訓1（本体でできることの確認）は、**採らなかった本体機能を書き残すところまで**が範囲である
2. **`/goal` と Hooks の出典 URL（取得日つき）を README に明記した** — 「評価器はツールを
   持たない」は本プラグインの設計全体を支える主張であり、出典なしで断定していた
3. **段階に Level 1.5 を追加した** — 記事の Week 2（Judge を作った直後は自動修正させず、
   人間が指摘の当否を見る）。既存の Level 1 → 2 は「`/goal` だけ」から「ループを回す」へ
   直接飛んでおり、**精度の分からない Judge に修正の指揮を渡す**段差があった

## 取り込まなかったもの（と理由）

| 記事の要素 | 理由 |
|---|---|
| `/goal` は v2.1.139 以降 | 一次情報で確認できなかった。推測で書かない（`adoption-review` 中核ルール6） |
| 「Goal Evaluator」という呼称 | 公式表記は "small fast model"。非公式の呼称を持ち込まない |
| 4週間ロードマップ（Week 1〜4） | SKILL.md の「段階（Level 1 → 3）」と実質同じ。差分の Week 2 だけを Level 1.5 として吸収した（教訓4: 分類を中身より先に増やさない） |
| CLAUDE.md・Builder・Judge・Skill・Stop フックのコピペ資材 | `plugins/self-correct/` の実体がすでに上位互換（Judge のツール権限剥奪・状態ファイル駆動の停止ゲート・Ground Truth 保護フック） |
| 「よくある失敗7選」「本番投入前チェックリスト10項目」 | README のチェックリストと SKILL.md の「やらないこと」に同内容が入っている |
| 記事・競合調査・コードの実務テンプレート3種 | `references/handoff.md` に同等のものが実装済み |
| 記事末尾のスクール告知 | 対象外 |

## 外部評価（Step 1・外部評価スコープ）

| 調べたもの | 分かったこと | 本プラグインとの関係 |
|---|---|---|
| [Huang et al., "Large Language Models Cannot Self-Correct Reasoning Yet"](https://arxiv.org/abs/2310.01798) | 外部フィードバックの無い内在的自己修正は推論タスクで性能を改善せず、劣化することもある | 記事と本プラグインの前提（同じ文脈での見直しでは足りない／Ground Truth を外に置く）を裏づける。**手法の方向自体は第三者の研究と整合** |
| [sdsrss/loop_eng](https://github.com/sdsrss/loop_eng)（MIT・2026-09-06 取得） | builder/checker をツールホワイトリストで分離、`.loop/active` を使う command 型 Stop フック、機械が書く証拠ファイル、**停止ルール6件**（基準充足／ラウンド切れ／同一失敗2連続／リグレッション／2ラウンド進捗なし／能力限界）。checker 自体の精度検定は見当たらない | **設計が本プラグインとほぼ収束している**（独立に同じ結論に達した先行事例）。2026-09-05 の記録が「先行 OSS に見当たらない」と書いたのは `judge-eval` に相当するものについてであり、その点は今回の調査でも覆らなかった |
| `claude plugin eval`・LLM-as-judge 系フレームワーク | 成果物ではなく**プラグイン／エージェントの評価**が対象 | `judge-eval`（ループの Judge 自体をゴールデンセットで採点する）とは対象が違う |

## 積み残し（今回は実装しない）

`loop_eng` の停止ルールのうち、本プラグインの Phase 3 に無いものが2件ある。

- **リグレッション** — 前ラウンドで PASS だった基準が FAIL に転じた
- **進捗なし** — 2ラウンド連続で未解決件数が減っていない（同一 ID の連続 FAIL とは別条件）

どちらも「問題のない箇所を書き換えて壊す」という本プラグインが警戒している事故を機械的に
検出できるが、**今回のレビュー対象（記事）には無い論点**であり、スコープを広げないために
別途の判断とする。採るなら `state.json` に前ラウンドの PASS 基準 ID を持たせる変更になる。
