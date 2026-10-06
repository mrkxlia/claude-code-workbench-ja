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
