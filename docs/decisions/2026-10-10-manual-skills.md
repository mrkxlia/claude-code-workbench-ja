# 2026-10-10 マニュアルを書く・直すスキル（manual-write / manual-check / manual-checker）

## 経緯

1. 2026-10-08、運用設計ラボ（波田野裕一氏）の発表「「ミスを許さない手順書」を作ってみた」（ssmjp online #53）を
   `/adoption-review` で評価し（下の「発表の評価」）、その方法論で運用手順書のスキル `ops-manual` を作った
2. 利用者から「デッキの方法論に縛らず、マニュアル一般のあるべき姿を支援するスキルにしたい。deep-research で情報を集めて
   反映して」と依頼があった。あわせて「書くスキル」と「チェックして直すスキル」に分ける要望があった
3. `/deep-research` と補足調査で根拠を集め直し、名前から `ops-` を外して `manual-write`・`manual-check`・`manual-checker`
   に作り直した（pipeline 5.1.0）。運用設計ラボの方法論は「分岐・再利用・中断が多い作業の構造化」という選択肢の一つに下げた

## 調査の方法

- `/deep-research` workflow（5観点・103エージェント）: 21ソースを取得し、82の主張から上位25件を3票で敵対的に検証。
  24件が通り、1件が否定された（EPA の研究室 SOP が「15節固定」を要求するという主張、0-3）。重複をまとめて12の知見
- 補足（メインが WebSearch / WebFetch）: deep-research で確認できなかった観点のうち、手順設計の公的資料（NASA/TM-2016-219421 の
  本文 PDF）、手順逸脱の原因（Flight Safety Foundation）、日本語の作法（JTCA の二次情報）を当たった。補足分は照合を経ていない

取得日はすべて 2026-10-10（運用設計ラボの発表のみ 2026-10-08）。

## 根拠にした出典

| 略号 | 出典 | 種類 | 使ったところ |
|---|---|---|---|
| EPA | [EPA QA/G-6 Guidance for Preparing Standard Operating Procedures（EPA/600/B-07/001, 2007）](https://www.epa.gov/sites/default/files/2015-06/documents/g6-final.pdf) | 公的ガイド | 文体（1.4）・詳しさと作成者（2.1）・確認と試走と承認（2.2）・改訂と定期見直しと廃止（2.3） |
| EPA-Lab | [EPA OPP Microbiology Laboratory Branch SOP ADM-02-07](https://19january2021snapshot.epa.gov/sites/static/files/2019-08/documents/adm-02-07.pdf) | 研究室1か所の内部 SOP | 見直し周期（最長3年）・旧版に「Obsolete」の例。EPA 全体の規則ではない |
| NASA | [NASA/TM-2016-219421 Designing Flightdeck Procedures（Barshi, Mauro, Degani, Loukopoulou）](https://ntrs.nasa.gov/citations/20160013263) | NASA 技術メモ | 手順の要件（2.4.1）・試験（2.4.4.5）・チェックリスト（2.4.5）・文章/構成/語彙/数値（2.5.1〜2.5.4） |
| EOI | [San Onofre Unit 1 Procedures Generation Package（NUREG-0899 に沿った EOI 作成ガイド, 1985）](https://www.nrc.gov/docs/ML1332/ML13329A499.pdf) | 1事業者の作成ガイド | 1ステップ1つの考え・対象と数値・状態のきっかけ・条件の書き方・2列形式・注意書き・検証の方法。NUREG-0899 本体ではない |
| DITA | [OASIS DITA 1.3 task トピック](https://docs.oasis-open.org/dita/dita/v1.3/os/part2-tech-content/archSpec/technicalContent/dita-task-topic.html) | 規範仕様 | 前提 → 背景 → 手順 → 結果 → 例 → 後続作業、各ステップに操作が必須 |
| Diátaxis | [diataxis.fr](https://diataxis.fr/start-here/)・[compass](https://diataxis.fr/compass/)・[how-to guides](https://diataxis.fr/how-to-guides/) | 提唱者のサイト | 4種類の分離、ハウツーは読者の視点で |
| SRE | [Google SRE Workbook: On-Call](https://sre.google/workbook/on-call/) | 実践の記述 | アラートごとに1項目、呼び出されたときに更新。効果（MTTR 低減）は Google 自身の主張で測定値ではない |
| Degani & Wiener | [Cockpit Checklists: Concepts, Design, and Use（Human Factors 35(2), 1993）](https://ntrs.nasa.gov/citations/19930068509) | 論文（要旨） | チェックリストの不適切な使用・不使用が事故の主要な寄与要因としてしばしば挙げられる |
| FAA | [DOT/FAA/AM-22/01（Key ほか, 2022）](https://www.faa.gov/data_research/research/med_humanfacs/oamtechreports/2020s/2022/202201) | 公的報告書 | 手順の不遵守は整備で最も広く見られるヒューマンファクター問題の一つで、組織・監督・環境の多層的な問題 |
| FSF | [Procedural Drift: Causes and Consequences（Robert I. Baron, Flight Safety Foundation, 2018-03-29）](https://flightsafety.org/asw-article/procedural-drift-causes-and-consequences/) | 業界団体の記事 | 手順が使われない原因（無い・入手できない・誤り・非公式な近道・違反）と、責任追及でなく原因を調べること |
| JTCA | テクニカルコミュニケーター協会『日本語スタイルガイド』— [二次情報（スタディング, 2022-06-16）](https://studying.jp/engineer/blog/20220616.html) | **二次情報** | 一文一義、接続助詞で操作をつながない。一次情報は確認できていない |
| OpsLab | [「ミスを許さない手順書」を作ってみた](https://speakerdeck.com/opelab/20260827-ssmjp-operation-procedure-update)・[「正しい」運用手順書を作る（2018）](https://speakerdeck.com/opelab/20181106-ssmjp-operation-procedure) | 発表 | 構造化（シナリオ／タスク／I/O）・前提と結果のつながり・共通手順の重複 |

**どれも「この書き方でエラーが何%減る」という定量的な実証ではない。** 手順の不遵守が事故要因になることの根拠（Degani & Wiener・
FAA）と、公的機関・仕様の定める作法が中心。形式（チェックリスト・フローチャート・2列）とエラー率の定量的な関係を示す研究は
検証を通っていない。

## 作ったもの

| 種類 | 名前 | 役割 |
|---|---|---|
| スキル | `manual-write` | 種類（手順・教育・一覧・解説）と形式（基本・2列・runbook・チェックリスト・業務マニュアル・構造化）を決め、23の原則（出典つき）で新しく書く |
| スキル | `manual-check` | 既存のマニュアルを検査 → 直す範囲を選んでもらう → 修正 → 再検査（1回まで）。変更の反映（改訂）もここ |
| エージェント | `manual-checker` | 8群・約50項目の検査項目（出典つき）を定義に埋め込んだ read-only の検査役。修正しない |

- `manual-write/references/templates.md` — 版管理欄と6形式のうち5形式（基本・2列・runbook・チェックリスト・業務マニュアル）、書き方の約束
- `manual-write/references/structured.md` — 構造化（運用設計ラボの方法論）。通し版・自動化済み作業の手動版を含む
- `manual-write/references/shell-guard.md` — 構造化した CLI 手順に添える実行ガードの骨格（4つの終了経路をこのリポジトリで実行して確認済み）

### 設計の判断

- **書くと直すを分けた。** 依頼が「書いて」と「チェックして直して」で分かれており、1つのスキルのモードにすると、直す側の規律
  （選ばれた指摘だけを直す・意図を創作しない・再検査は1回まで）が作成の手順に埋もれるため
- **検査をエージェントに切った。** 書いた本人・直した本人が自分で合格を出さないため（EPA 2.2 の「書いた人以外が試す」の考え方を、
  文書の検査段階にも当てた）。設計書の `design-docs` と `design-doc-checker` の分担に揃えた
- **検査項目をエージェントの定義に埋め込んだ。** 初版では検査項目を `references/checklist.md` に置き、checker がファイルを読む
  形にしていた。`claude -p --plugin-dir` での実地テストで、checker（とメイン）がプラグイン内のファイルを読む権限を得られず、
  検査が止まった（止まり方は規律どおり — 記憶で代用せず、権限を迂回せず、原本を変えなかった）。対話実行なら承認ダイアログで
  通るが、検査の要が承認の経路に左右されないよう、定義の本文に移した
- **運用設計ラボの方法論は選択肢の一つに下げた。** 効果を測ったデータが無く、一般的な手順書には重い。分岐・共通手順の再利用・
  中断が多い作業でだけ使う
- **pipeline プラグインに置いた。** マニュアルは「コード以外の成果物」で、`task-pipeline` の連結（ブリーフの構成案に形式を転記）と
  `design-docs` の `【要確認】` 書式をそのまま使えるため（教訓4）

## 発表の評価（2026-10-08、adoption-review）

結論は**条件付きで有用 → 特定用途だけ使う**。採ったのは文書の型（分岐はシナリオ・共通化はタスク、目的を完了条件に・前提を
事前条件に、設定値の指定と実行の分離）と、CLI 作業に限った実行ガード。採らなかったのは「この構造にすればミスが起きない」という
暗黙の主張（効果測定が無く、著者以外の採用事例も確認できなかった）。

敵対役（adoption-challenger の役割）の反論6件と、現行の設計での扱い:

| 反論（重大度） | 現行の扱い |
|---|---|
| 効果を支えるのは著者本人の実践だけ（高） | 構造化は選択肢の一つに下げ、原則の根拠は公的ガイド等に置き換えた |
| ミス防止の中心はシェル実装で、文書の型では再現できない（高） | 実行ガードは CLI 作業の構造化にだけ添える（shell-guard.md） |
| 記述量が重く形骸化しやすい（中） | 既定は基本の手順書。中核ルール6「空欄だらけの型は短い手順書より悪い」 |
| 一般的な runbook テンプレートで大半を代替できる（中） | 一般の実践は原則と検査項目に取り込み、構造化は分岐・再利用が多い作業に限定 |
| レベル3（伝承的）に基準がない（低〜中） | 3レベルの枠組みは使わず、出典のある原則に置き換えた |
| 公開実装が無く独自解釈になる（低） | shell-guard.md に「再構成であって発表の実装ではない」と明記 |

## 確認できなかったこと

- ISO/IEC/IEEE 26514・26515、IEC/IEEE 82079-1 の要求事項の本文（有償規格。公式の概要から、26514 がソフトウェア利用者情報の
  構成・内容・書式の要件をライフサイクル全体で定めること、82079-1:2019 が作成プロセスと実証的な評価方法を必須部分に含めることだけを確認）
- FDA/GMP（21 CFR 211 など）の SOP 要件、NUREG-0899 本体
- JTCA『日本語スタイルガイド』・JIS の一次情報（日本語の作法は二次情報のみ）
- ミニマリズム（Carroll）の一次情報。二次情報（Williams & Farkas）から、4つの特徴＝簡潔さ・実際の作業への集中・エラーの認識と
  回復の支援・誘導された探索、を読み取ったのみ（原則には入れていない）
- Information Mapping、ASD-STE100、PagerDuty・Atlassian の runbook ガイド、docs-as-code、ユーザビリティテストの方法論
- 手順書の形式とエラー率の定量的な関係を示す実証研究

## 発火の確認

`docs/evals/triggers.md` の manual-write・manual-check のケースと、衝突する `task-pipeline` の「運用手順書を工程を踏んで作って」を
`claude plugin eval`（Sonnet 5.5・各3回）で流す。結果は下に追記する。

## 試すなら検証方法

- 対象: 導入先で実際に使っているマニュアル2〜3本（手順書・runbook・チェックリストを1本ずつが望ましい）
- 手順: `/manual-check` で検査・修正した版と元の版を、書いていない人に本番以外で使ってもらう
- 成功条件: 迷った・聞き返した・書かれていない権限や値が要った箇所の件数が元の版より減る。前提をわざと崩した試験で止まれる
- 失敗条件: 件数が減らない、または修正で文書が長くなり読まれなくなる
- メトリクス: 試走での質問・停止の件数、所要時間、`【要確認】` の回収数
