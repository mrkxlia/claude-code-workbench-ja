# 2026-10-06 リポジトリの整理（使われていないもの・役目を終えたものの削除）

- 状態: **適用済み**（第1段: docs、第2段: プラグイン単位の公式機能との重複）
- 依頼: 「レポジトリ内を積極的に整理して、いらないもの・使われないものを削除する。adoption-review スキルも使う」
- 基準: `/adoption-review` の判定枠組みを自リポジトリに当てた — **代替手段（git 履歴・本体機能・何もしない）**、
  **保守コスト**（毎セッション読み込まれる CLAUDE.md の量、リンク・索引の追随）、**中核ルール11**
  （「確認できなかった」は削除の根拠にしない。削除の根拠は「参照ゼロ」「完了済み」「読み手が無い」という
  確認できた事実に限る）
- 復元: 削除したものはすべて `git show 9094ace:<path>` で読める

## 削除したもの

| 対象 | 確認できた事実 | 代替 |
|---|---|---|
| `docs/backlog-2026-09.md` | B-1〜B-7 の全7件が「完了記録」に記載済み（2026-09-05）。残っていたのは MODEL-GUIDE の「B-1 で未着手」という**古い記述**の参照元としてだけ | 実装（`reinject-brief`・`inject-spec-summary` ほか）と git 履歴。MODEL-GUIDE の記述は実装済みに直した |
| `docs/pipeline-spec-alignment-proposal.html`（36KB） | 2026-06 時点の提案。柱の `spec-extract` は 2026-08 に外部ツールへの委譲に変わり、README 自身が「歴史的決定記録として残置」と書いていた | git 履歴・`lessons.md` 教訓1 |
| `docs/evals/evals.json`・`gen-evals.py` | `evals.json` を読み込む CI・スクリプト・スキルが**どこにも無い**（`git grep` で参照は README と CLAUDE.md の説明文だけ）。skill-creator はスキル直下の `evals/` を読むので、`docs/evals/` に置いた生成物は配信もされない | Markdown のシナリオ（人が読む正）はそのまま残す。発火ケースは `triggers.md` → `claude plugin eval` |
| 決定記録8件（下表） | 外部記事・X ポストの採否レビューで、取り込みは0〜3点。**プラグイン・ツール・CI・README・lessons のどこからも参照されていない**（他の決定記録からの参照だけ） | 取り込んだ差分は各プラグインの本文に入っている。結論は下表に1行で残す |

| 削除した決定記録 | 結論（1行） |
|---|---|
| `2026-09-06-self-correct-article-adoption.md` | 中核は実装済み。差分3点だけ取り込み。積み残し2件は `2026-09-06-self-correct-stop-rules.md` で実装済み |
| `2026-09-06-prompt-techniques-7-adoption.md` | 5手法とも取り込みなし（4件は上位互換が実装済み、1件は model-setup ルール1と矛盾） |
| `2026-09-06-pm-skill-article-adoption.md` | project-catchup に「生成物の鮮度」と【要確認】の絞り込みの2点だけ取り込み |
| `2026-09-06-for-file-claude-md-adoption.md` | 手法は不採用。project-catchup に「設計判断の理由」章だけ追加 |
| `2026-09-06-dev-principles-adoption.md` | 取り込みなし（公式 Best practices の ❌ Exclude に該当） |
| `2026-09-06-compact-plus-adoption.md` | プラグインは不採用。公式事実4件を PROMPTS・MODEL-GUIDE に取り込み |
| `2026-09-06-global-claude-md-6-items-adoption.md` | 6項目は不採用。context-audit の棚卸し対象に `MEMORY.md` を追加 |
| `2026-09-06-claude-code-dev-flow-adoption.md` | self-correct の README/SKILL に「限界」の明記1点だけ取り込み |

## 残したもの（削除しなかった理由）

- **決定記録のうち、現行コードの理由として参照されているもの**（MODEL-GUIDE・各 README・エージェントの
  frontmatter・CI・lessons から引かれている）
- **積読索引の2件**（`2026-10-03-tsundoku-…`・`2026-10-06-tsundoku-…`）— 参照は少ないが、2026-10-06 の
  レビューが「前回未評価のもの」を選ぶのに実際に使っている（照合用の台帳として機能している）
- **`plan-review-before-present.md`・`self-correct-stop-rules.md`** — 現存するフック・停止ルールの設計理由そのもの
- **プラグイン内部の資材** — 全エージェント・フック・references が SKILL.md / README から参照されていた。
  `.ps1` は参照数0に見えたが、`pipeline-setup/references/windows.md` が `{sh,ps1}` の総称で配線しており使われている
- **evals の Markdown シナリオ11件** — 結果記録表は空のまま（一度も記録されていない）だが、「走らせていない」は
  シナリオの欠陥ではない（中核ルール11）。削除はしない

## 方針の変更

`docs/decisions/` は「追記のみ」だったが、**残す基準**を足した（`docs/README.md` 冒頭）。現行コードの理由に
なっていない記録は、結論を1行で残したうえで削除してよい。CLAUDE.md の決定記録一覧（30行）は毎セッション
読み込まれるため1行に畳み、一覧は `docs/README.md` だけに置く（CLAUDE.md 22.9KB → 約16.5KB）。

## プラグイン（公式機能との重複。前回 2026-09-13 以降の差分を一次情報で取り直した）

`adoption-researcher` 相当の証拠収集（Web・read-only）で、前回の重複チェック以降（Claude Code 2.1.271〜2.1.291、
2026-09-14〜10-06）の公式ドキュメント・CHANGELOG・公式プラグインを取り直した。削除の向きの結論には
Step 6 の自己点検3問（「確認できなかった」だけになっていないか／想定用途に効くか／代替が同じ用途を満たすか）を当てた。

| 対象 | 公式の現況（出典は 2026-10-06 取得） | 判定 |
|---|---|---|
| **codebase-setup / `context-audit`** | **`/doctor prompt-audit`（2.1.283、2026-09-25）** が CLAUDE.md・CLAUDE.local.md・AGENTS.md と `.claude/`・`~/.claude/` 配下の rules・skills・commands・subagents・output styles を対象に「旧モデル向けに書かれた指示」「存在しないファイル・コマンドへの参照」「互いに矛盾するファイル」を検出し、編集を提案する（[Memory](https://code.claude.com/docs/en/memory)「Audit your instruction files」）。`/doctor` はコードから導ける記述の削減と、常時ロードの指示をスキル・ネストした CLAUDE.md へ移すことまで行う | **削除**。前回残した理由「矛盾はレイヤーをまたいで起きるので横断照合が要る」は、公式がまさにその横断照合を持ったため成り立たない（問3: 同じ用途を満たす）。残る差分は `MEMORY.md` が監査対象外であることだけで、スキル1本＋5分類の手順を保守する理由にはならない（`/memory` で開いて目視すれば足りる）。`instruction-auditor` は `codebase-onboard` Step 4 が使うので残す。codebase-setup 0.7.0 |
| model-setup / `fan-out` | `/batch` は 5〜30 単位に分けて worktree 隔離のサブエージェントに実装・テスト・公開させる。dynamic workflows はスクリプトで並列を組める（[Commands](https://code.claude.com/docs/en/commands)・[Workflows](https://code.claude.com/docs/en/workflows)） | **残す**。`/batch` は「1つの変更を多数の worktree・PR に割る」用途で、fan-out の「セッション内で分担し `fresh-verifier` で検証してから統合する」は満たさない（問3 で崩れる） |
| self-correct | `/goal` の評価器は依然としてツールを呼ばず、会話に出たものだけで判定する。リグレッション検出・機械可読な停止条件は無い（[Goal](https://code.claude.com/docs/en/goal)） | 残す（差分は維持） |
| feedback-rules | 公式 `hookify` は `warn`/`block` のみで回数による段階強化が無い。auto memory の `type: feedback` にもフック強制は無い | 残す |
| cli-bridge | `openai/codex-plugin-cc` は 2026-07-07 以降更新なし。相談専用コマンドと CLAUDE.md→AGENTS.md 生成は無い。Kiro の公式プラグインは見つからなかった | 残す |
| agent-review-panel | `/code-review ultra`・`pr-review-toolkit` はマルチエージェントだが、**異種ベンダー混成は公式に無い** | 残す |
| learning-coach | 組み込みの Learning 出力スタイルは Insight と `TODO(human)` だけで、クイズ・理解の実証は無い（[Output styles](https://code.claude.com/docs/en/output-styles)） | 残す |
| pipeline | 公式 `feature-dev` は7フェーズ・3エージェント。要件・ブリーフ文書、ビルダー分離、テスト検証役、フック、成果物モードは無い | 残す |
| `docs/evals/` の Markdown シナリオ | `claude plugin eval`（2.1.269〜）は `llm` グレーダーとスキル無し baseline 比較を持ち、応答の中身も採点できる（[Plugin evals](https://code.claude.com/docs/en/plugin-evals)） | 残す（ただし手動手順は役目を終えつつある）。シナリオは `plugin eval` のケースへ移す材料。移植は別作業 |

確認できなかったこと: 週次の What's new（第38〜40週）が 404、`claude-plugins-official` の一部プラグインのバージョン、
`/batch` の「publishes its change」が PR 作成を指すか。いずれも判定には使っていない。

## 第3段: 「差分があるか」ではなく「代替より良いか」で全件を判定し直す

ユーザーから「独自性と、こちらの方が良いかをしっかり確認して。車輪の再発明は意味ない」と指摘を受けた。
前回（2026-09-13）の重複チェックは README 同士の比較で、**実装本体は未読**のまま「差分が残る」を理由に
A 判定（先行事例が同等以上）の9件を残していた。今回は証拠収集を3並列で走らせ、**こちらの SKILL.md と
代替の実装本文（公式ドキュメント・公式プラグインと OSS のソース）を両方読んで**機能単位で比較した。

基準: 代替（本体機能・公式プラグイン・既存 OSS・公式ガイドの原文）より**導入する人にとって明確に良い**ことを
示せたものだけ残す。次は独自性に数えない — 日本語であること／モデル・ハーネスが既定でやることの言い直し／
運用規律を1行足しただけのもの。

### 削除したもの

| 対象 | 代替 | 判断の根拠（確認できた事実） |
|---|---|---|
| pipeline `build-with-tests` | superpowers `test-driven-development`・mattpocock `tdd` | 失敗するテストを先に書く手順が無く、実装とテストを同じターンで書く。独自は「既存例を3つ読む」「型検査を必須」だけで、代替より弱い |
| model-setup `fan-out`（＋`task-worker`） | 本体のサブエージェント自動委譲・dynamic workflows・`/batch` | 公式 Opus 5 ガイド「Opus 5 は従来より進んで委譲する」。workflows は同時16本・相互の敵対的レビュー・保存と再開を持つ。独自は「最大3並列」「再委譲2回まで」程度 |
| model-setup `long-run`（＋`reinject-brief` フック） | 本体 `/goal`・公式 `ralph-loop`・圧縮時の既定の再注入 | こちらはプロンプト上の規律で、`/goal` は Stop フックで機械的に継続し停滞も検出する。圧縮後は起動済みスキル本文・直近に読んだ5ファイル・計画ファイルが既定で戻る。ルール1は公式 Fable 5.1 の「Finish the whole task」のほぼ直訳 |
| model-setup `backlog-loop` | [Backlog.md](https://github.com/MrLesk/Backlog.md) | タスク DB・カンバン・MCP・依存グラフを持つ。独自は「1ステップごとに止まる」1行と pr-merge への受け渡し |
| model-setup `task-brief` | 本体 Plan モード | Plan モードは読み取り専用を保証し計画ファイルを残す。独自は「質問をまとめて聞く」だけ |
| model-setup `bulk-scanner` | 本体の Explore エージェント | 読み取り専用の高速スキャンとして重複 |
| cli-bridge `codex-agents`（＋`gen-agents-md` フック） | CLAUDE.md から `@AGENTS.md` を読む・Codex の fallback filenames・[rulesync](https://github.com/dyoshikawa/rulesync) | 生成物の同期より正本を1つにするほうが壊れない（教訓2）。Claude Code は AGENTS.md もネイティブに読む |
| codebase-setup `codebase-onboard`（＋`instruction-auditor`） | 公式 [Monorepos and large repos](https://code.claude.com/docs/en/large-codebases) | Step 4〜7（階層化・`claudeMdExcludes`・Read の deny・LSP・`sparsePaths`・ディレクトリ別スキル）は公式ページに例つきで全部ある。足しているのは一般的な進め方だけ |
| model-setup のテンプレート群のうち公式ガイドの翻訳 | 公式 Opus 5 / Sonnet 5.5 / Fable 5.1 ガイドのスニペット原文 | 証拠収集の概算で本文の6〜7割が翻訳・言い直し。翻訳は原文の更新に追随できない。旧ルール2・3・4・8・9、追補10・11・13・会社14、PROMPTS #1〜#10、MODEL-GUIDE のモデル仕様表・effort 表・Sonnet 5 の要点・LLM アプリの一般論を削除し、リンクに置き換えた |

### 残したもの（代替より明確に良い点を確認できたもの）

| 対象 | 代替より良い点 |
|---|---|
| feature-pipeline・`clarify` | 書き込み範囲をフックで強制（`guard-builder-paths` は exit 2）・SPEC 要約の SessionStart/SubagentStart 注入・テストしか書けない検証役は、feature-dev・superpowers・spec-kit のどれにも無い。clarify は pipeline の Phase 2・3 に組み込まれた部品 |
| task-pipeline・design-docs | コード以外の成果物を承認ゲートつきで工程化した同等品が見つからない |
| notes | 作業中の判断を file:line つきで追記するログ。handoff 系は終了時のスナップショットで役割が違う |
| pipeline-improve | 過去の会話ログから訂正を掘り、エージェント定義まで直すものは他に無い |
| verify-fresh・pr-merge | 完了条件と成果物の突き合わせ（非コード含む）は `/verify`（アプリを動かす）・`/code-review`（バグ探し）に無い。CI 確認→マージ→後片付けは公式 `commit-commands` に無い |
| self-correct | `sdsrss/loop_eng` は非コード成果物を「向かない」と明記。非コードの意味判定と Judge の校正（judge-eval）はこちらだけ |
| review-panel | Codex/Kiro CLI を混ぜた異種モデルのパネルは他に無い（wan-huiyan 版は ROADMAP で不可能と明記） |
| feedback-rules | 人間の指摘回数で warn → ask → deny と強制力を上げる仕組みは hookify・auto memory・pro-workflow に無い |
| deep-understand・adoption-review・codebase-map・project-catchup | 同等品が見つからないか、代替が別の用途（Learning スタイルはクイズを持たない／`/deep-research` は採否を判定しない） |
| codex-ask・kiro 系 | codex-ask は `plan-review-codex` フックの実行エンジン。Kiro の代替は1★で全ツール許可が既定 |

### 確認できなかったこと

`/batch` の「publishes its change」が PR 作成を指すか、`# Compact instructions` が自動圧縮に効くか、
Codex の fallback filenames が CLAUDE.md の `@import` を展開するか。いずれも削除の根拠にはしていない。

## 第4段: codebase-setup プラグインを廃止

第3段で `codebase-onboard` を削除したあとに残った2スキルを見直し、ユーザーの判断でプラグインごと削除した。

- **`codebase-map`**: 作るのは「ディレクトリごとの1行説明の目次」で、公式 best practices が「コードから分かるので
  書かない」とする類（ディレクトリ一覧・アーキ概説）そのもの。Claude は Explore エージェントで必要なときに辿れ、
  目次はコードの変化で古くなる（鮮度確認の仕組みまで足していた）。同等品が無いのは、要らないからと判断した
- **`project-catchup`**（＋`subtree-surveyor`・`flow-tracer`）: 人間向け引き継ぎレポートで同等品は無かったが、
  learning-coach へ移す案ではなく削除を選んだ（ユーザー判断）。必要になったら `git show 9094ace:plugins/codebase-setup/` から戻せる
- marketplace に `renames: { "codebase-setup": null }` を入れ、導入済みの利用者には廃止が通知されるようにした
- 決定記録 `2026-09-05-large-codebase-harness.md` は、理由を説明する対象のコードが無くなったため、残す基準に従い削除した

## 第5段: pipeline の `clarify` を mattpocock/skills の `grilling` に置き換え

ユーザーの判断で、独自の `clarify` を上流の `grilling`（[mattpocock/skills](https://github.com/mattpocock/skills)、
MIT、コミット `6fd9479`・2026-10-06 取得）に差し替えた。

- `clarify` 自身が「grill-me と ryonakae/dig を参考にした」と明記しており、中核（推奨回答つきの徹底質問・調べれば
  分かることは聞かない）は上流と同じだった。上流のほうが利用者も保守も厚い
- 上流は「設計ツリーのフロンティアをラウンドごとにまとめて聞き、事実は自分で（サブエージェントで）調べる」方式で、
  一問ずつの clarify より往復が少ない。失ったのは clarify 独自の「答えられないときの3分岐」1点
- `plugins/pipeline/skills/grilling/` に **SKILL.md を無改変で**置き、MIT の著作権表示として上流の LICENSE を同じ
  ディレクトリに置いた。上流の `agents/openai.yaml`（Codex アプリ用の表示名）は Claude Code では使わないので持ち込まない。
  更新は上流から再コピーする（手で直さない）
- `grill-me` は `disable-model-invocation: true` で中身が「grilling を呼べ」の1行なので持ち込まない。pipeline の
  Phase 2・3 は Skill ツールで `grilling` を直接呼ぶ
- 上流の description は英語で「grill」という語に反応する。日本語の自然文（「穴がないように質問して詰めて」）で
  単体発火するかは `triggers.md` のケースで測る。pipeline 内の呼び出しは明示なので発火に依存しない
- pipeline 4.0.0（`/clarify` が消えるため破壊的変更）

## 第6段: adoption-review の証拠集めを本体の `/deep-research` に任せる

`adoption-researcher`（1スコープ1体・最大3体の並列 Web 調査）は、本体同梱の `/deep-research` workflow
（並列調査・ソース同士の照合・主張ごとの投票・裏の取れない主張の除外）の再発明だったので廃止した
（adoption-review 0.3.0）。残したのは判定部分 — 採用しない理由を先に探す・`adoption-challenger`・7択の結論と
6択の採用判断・確認できなかったことを減点に使わない — で、これは `/deep-research`（引用つきレポートを返すだけで
採否を判定しない）に無い。

ユーザーの要件「adoption-review スキルを使ってと言ったときに動くこと」への対応:

- `/deep-research` は「利用者が呼んだときだけ動く」。ただし**利用者が呼んだスキルの手順が Workflow を呼ぶよう
  指示している場合は、それが workflow の許可にあたる**。そこで、`/adoption-review` を打つか「adoption-review を
  使って」と名指ししたときは、確認を挟まず `Workflow`（`name: "deep-research"`）を起動するよう SKILL.md に書いた。
  description にも「adoption-review を使って」を発火句として足した
- 自然文で自動発火しただけのとき（利用者がスキルを名指ししていない）は、複数エージェントの費用がかかるので
  起動前に1行で確認する
- workflows が無効・WebSearch が無い・起動を断られたときは、メインが直接 Web を調べて続け、「照合なし」と明記する
- 名指し起動の挙動は `docs/evals/adoption-review.md` の S-8 で測れる

確認できなかったこと: 組み込みの `deep-research` を `Workflow` ツールで呼ぶときの `args` の形（問いの文字列で
足りるはずだが、公式ドキュメントに明記が無い）。実機では未実行。
