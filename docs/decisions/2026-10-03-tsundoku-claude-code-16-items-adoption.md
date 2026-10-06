# 2026-10-03 — 積読インデックスの Claude Code 関連16件の採用可否レビュー（取り込みは2点）

## 対象と想定用途

- **対象**: [積読（つんどく）公開インデックス](https://tsundoku-public.pages.dev)（2026-10-03 取得・全105件）のうち
  Claude Code 関連の16件。このサイトは個人の読書メモ索引で、**本文は非公開・LLM が生成した要約だけ**が
  載っている。そのため索引の要約ではなく、**各項目のリンク先（原典）**を評価対象にした
  （X ポストは fxtwitter API で本文を取得）
- 除外: 「How Claude Code works in large codebases」（公式ブログ）は
  2026-09-05 に codebase-setup として取り込み済み（codebase-setup は 2026-10-06 に廃止）
- **想定用途（仮置き）**: このリポジトリのプラグインに、まだ入っていない要素があれば取り込む。
  新規プラグインは作らない（先例: PM 業務の Skill 化記事 — 2026-10-06 の整理で記録は削除、`git show 9094ace:docs/decisions/2026-09-06-pm-skill-article-adoption.md`）

[`/adoption-review`](../../plugins/adoption-review/skills/adoption-review/SKILL.md) の手順で評価した。
対象が4件を超えたため、Step 0 の規約どおり先にユーザーへ絞り込みを確認し、16件すべてを1件ずつ評価する
指示を得た。証拠収集はメインが各原典を直接取得した（`adoption-researcher` を16件×最大3体で回すと
スキルのトークン規律を大きく超えるため）。

## 結論（横並び）

| # | 対象（原典） | 結論 | 採用判断 |
|---|---|---|---|
| 1 | [Grillingで詰まったら推測せず分岐する](https://tech.algomatic.jp/entry/2026/08/31/185832)（Algomatic・2026-08-31） | 条件付きで有用 | 特定用途だけ使う → **取り込み1** |
| 2 | [不要テストの精査プロンプト](https://x.com/catnose99/status/2098238001403113924)（X・2026-09-11） | 条件付きで有用 | 特定用途だけ使う → **取り込み2** |
| 3 | [Claude Code 用進捗ダッシュボード構築プロンプト](https://x.com/voxyz_ai/status/2103946635831050740)（X・2026-09-26） | 試す価値はあるが常用は微妙 | 情報収集に留める |
| 4 | [理解負債を防ぐための AI 開発手法](https://zenn.dev/avaintelligence/articles/dont-outsource-understanding-to-ai)（Zenn） | 現時点では不要 | 採用しない |
| 5 | Herdr / Orca による並列実行プロンプト（[X](https://x.com/voxyz_ai/status/2086059460502417772)・[X](https://x.com/voxyz_ai/status/2086483535829884975)） | 現時点では不要 | 採用しない |
| 6 | [個人的な Claude Code 設定の現在地（2026年8月）](https://zenn.dev/kawarimidoll/articles/d3f1a7542de71a)（Zenn） | 面白いが実務採用は弱い | 情報収集に留める |
| 7 | [Claude Code をどのようにキャッチアップしているか](https://speakerdeck.com/oikon48/claude-codewodonoyouni-kiyatutiatupusiteiruka)（SpeakerDeck） | 面白いが実務採用は弱い | 情報収集に留める |
| 8 | [cathrynlavery/diagram-design](https://github.com/cathrynlavery/diagram-design) | 現時点では不要 | 採用しない |
| 9 | [Claude Code × draw.io 公式 Skill で AWS 構成図](https://dev.classmethod.jp/articles/claude-code-trying-out-drawio-skill-for-aws-architecture/)（Classmethod） | 現時点では不要 | 採用しない |
| 10 | [/watch-video（coreyhaines31/makerskills）](https://x.com/claudecode84/status/2085281860725399593) | ほぼ無視でよい | 採用しない |
| 11 | [Deep Research → 会議用レポート Skill](https://x.com/kotetsu_0321/status/2086735553706316213)（Ted0321/kotetsu-work-ai-skills） | 面白いが実務採用は弱い | 情報収集に留める |
| 12 | [INDXDev/autoresearch](https://github.com/INDXDev/autoresearch) | 面白いが実務採用は弱い | 情報収集に留める |
| 13 | [LLM・AI エージェントシステム ベストプラクティス](https://speakerdeck.com/shibuiwilliam/llm-ai)（SpeakerDeck） | 現時点では不要 | 採用しない |
| 14 | [Power Apps を AI 4体で作り直し](https://powerdaaps.hatenablog.com/entry/2026/07/26/204536)（はてなブログ） | 現時点では不要 | 採用しない |
| 15 | [Claude Code 開発ワークショップキット](https://dev.classmethod.jp/articles/2026-08_claude-code-product-workshop-kit/)（Classmethod） | 現時点では不要 | 採用しない |
| 16 | [pstack（Cursor プラグイン）](https://github.com/cursor/plugins/tree/main/pstack) | ほぼ無視でよい | 採用しない |

いずれも取得日は 2026-10-03。

## 取り込んだ差分（2点）

### 1. `clarify` に「答えが返ってこないとき」の3分岐を追加（pipeline 2.5.1）

`clarify` は「調べればわかることは聞かない」「推奨回答を添える」を持つが、**人間が答えられなかったとき**の
扱いが無かった。この空白では、推奨回答がそのまま採用されて推測の前提が writer・実装へ流れる。
記事の分岐（理解不足 → teaching agent／決定権・情報不足 → 質問票／実証不足 → prototype）を、
**このリポジトリに既にある受け皿へ置き換えて**取り込んだ:

| 記事の分岐先（mattpocock/skills） | このリポジトリでの受け皿 |
|---|---|
| `/teach` | `deep-understand`（learning-coach）。未導入なら判断に要る範囲だけ短く説明して同じ問いを出し直す |
| `/to-questionnaire` | `clarify` の「残った未解決の質問」に、design-docs と同じ `確認先 / 現在の仮定` を添えて持ち越す |
| `/prototype` | 小さな試作を**別タスクとして**提案する（clarify は Phase 4 以降に立ち入らないため、その場では作らない） |

新しいスキル・エージェントは足していない。`/to-questionnaire` 相当の質問票スキルを作る案は、
受け皿の書式が design-docs に既にあるため不採用。

### 2. PROMPTS.md に #11「テストの棚卸し」を追加（model-setup・配信対象外のため version 変更なし）

判断基準「削除すると、どんな現実的な不具合を見逃すか」は、件数やカバレッジを目的化しない点で筋が良い。
PROMPTS.md の #3（テスト合わせ込み禁止）とは向きが逆で、同種のスニペットは無かった。
原典を翻案する際に2点を足した — **洗い出しだけを依頼し、削除は別の依頼にする**（model-setup ルール3・8 と
整合させ、一括削除で残すべきテストまで消える事故を防ぐ）、**候補ごとに見逃す不具合を1行で書かせる**
（判断基準を出力に強制し、「念のため残す」「念のため消す」の両方を検査可能にする）。
常設（スキル化・CLAUDE.md）にはしない — 使用頻度が低い定期作業であり、都度貼りで足りる。

## 取り込まなかったもの（と理由）

| # | 理由 |
|---|---|
| 3 | 中核の「判断が要るときは質問リストに積み、既定の動作で進め続ける」が、model-setup **ルール2（複数解釈を勝手に選ばない）**と `long-run` の停止条件1（成果物が変わる複数解釈が出たら止まる）に**正面から矛盾**する。opus のダッシュボード専用サブエージェントを全ステップで呼ぶコストに見合う効果の証拠も、原典には示されていない（主張のみ）。進捗の3点報告（完了・次・気になること）は `long-run` に既存 |
| 4 | `grill-with-docs` ≒ `clarify`、`explain-visually` ≒ `project-catchup`（図を必須化済み）・`deep-understand`、Codex による計画レビュー ≒ cli-bridge の `plan-review-codex.sh`。7段階のうち人間が理解する工程を厚くする主張は、learning-coach を独立させた理由（[2026-09-05](2026-09-05-learning-prompt-as-skill.md)）と同じで、差分が無い |
| 5 | 「レビュー役は read-only・書く役は worktree を分ける・1か所で統合して本物のチェックを再実行・push は承認後」は `fan-out`（書き込み範囲の分離・`fresh-verifier`）と本体 `/batch` で既存。Herdr / Orca という外部ツールへの依存を持ち込む理由が無い |
| 6 | 個人環境のスナップショット（`advisorModel`・auto モード・cage・zmx・agent-browser 等）。設定サンプルは model-setup に既存で、個人ツールは汎用テンプレートにならない |
| 7 | 公式 Docs の各ページ URL に `.md` を付けて取得し、1日4回 git diff で変更を検知する手法は、このリポジトリの「公式一次情報への追随」に有用。ただし `tools/` を新設する規模で、今回の想定用途（既存プラグインへの差分の取り込み）から外れる。必要になったら別途 `/adoption-review` する |
| 8 | `docs/skills-guide/README.md` に掲載済み |
| 9 | pipeline（成果物モード）で draw.io を既に案内している。AWS アイコンの配色ルールは個別ドメインの知識で、汎用テンプレートの範囲外 |
| 10 | README に「Gemini-native」とあり、動画を外部モデルへ送る構成（依存ツールの明記なし）。Claude Code の作業品質というリポジトリのテーマから外れる |
| 11 | 「原文にない数値・固有名詞を足さない／全数値を原文と照合する／出典を3段階で格付けする」は良い規律だが、調査レポートの整形はテーマ外。SKILL.md 本体は取得できなかった（下記） |
| 12 | コミット1件（2026-10-03 時点）。定時実行の Web 調査→Issue 起票は、本体の Routines（スケジュール実行）や GitHub Actions の公式アクションで組める |
| 13 | ハーネスの4要素（制約・補助・検証・観測）は guard フック群・`self-correct`・`verify-fresh`・`feedback-rules` で実装済み。39項目の大半は LLM を組み込むアプリケーションの設計論で、Claude Code の使い方ではない |
| 14 | 「書かせる AI と見張る AI を分ける」「人間が数えられないものは機械検査にする」は `self-correct`（loop-builder / loop-judge / ground truth）で実装済み |
| 15 | 講義用の教材キット（Next.js 固定）。テンプレート集というこのリポジトリの性格と合わない |
| 16 | Cursor 専用。プレイブックの自動振り分けは pipeline・`backlog-loop` と重なり、移植の対象が無い |

## 敵対的検証（Step 6）

肯定寄りの暫定結論は #1・#2・#3 の3件。`adoption-challenger` はこのセッションのエージェント種別に
登録されていなかったため、challenger の観点（改名しただけではないか／既存ルールと矛盾しないか／
「確認できなかった」を根拠にしていないか）を自分で当てた:

- **#3 は格下げ**した。既存ルール2と矛盾するという確認できた事実による（情報の不在による減点ではない）
- **#1 は残った**。clarify の既存本文に「答えられないとき」の記述が0件であること、受け皿が3つとも
  既存であること（新規の仕組みを足さずに済む）を確認した。効果を示す証拠は記事1本の体験談だけで
  弱いが、追加は約15行・撤退は節の削除だけで、運用コストが利益を超えない
- **#2 は残った**。PROMPTS.md は配信対象外の都度貼り集で、導入・撤退コストがほぼゼロ。
  原典は削除まで促す書き方ではない（「リストアップしてください」）が、翻案では削除を別依頼に分けることを明記した

## 確認できなかったこと

- 索引サイト自体は要約のみで、原典の本文は持たない（各原典を直接取得して評価した）
- #11 の SKILL.md 本体（GitHub のディレクトリページでは README しか取得できなかった）。評価は X ポスト本文と README による
- web.archive.org は取得ツールから到達できなかった（X ポストは fxtwitter API で代替）
- #1 の3分岐が推測の流出を実際にどれだけ減らすかの測定（記事・mattpocock/skills とも数値なし）
