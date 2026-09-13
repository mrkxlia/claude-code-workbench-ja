# 2026-09-13 — 全33スキルの「車輪の再発明」チェック

依頼は「各スキルが車輪の再発明になっていないか Web 上等を調べて」。

2026-09-07 の棚卸し（`2026-09-07-plugin-inventory-and-official-spec-alignment.md`）は**プラグイン10件**
の粒度だった。今回は**スキル33件**を1件ずつ、先行事例と突き合わせた。

## 判定の物差し

圧力の強い順に3層で見る。同じことをしていても、層が違えば意味が違う。

1. **本体機能**（バンドルスキル・組み込みコマンド・auto memory）— 全ユーザーが無料で持っている。
   ここと重なるものは、原則として存在理由を説明できなければならない（教訓1）
2. **公式プラグイン**（`claude-plugins-official` / `anthropics/claude-code`）— `/plugin install` 1行で入る
3. **先行 OSS** — 導入コストは当方と同等。重なっていても「日本語」「異種モデル混成」等の差分は意味を持つ

重なり度は A（先行事例が同等以上）／B（中核が重なるが差分が機能する）／C（隣接するが担当が違う）／
D（該当を確認できず）の4段階。

**限界の明示**: 判定は各 OSS の README・公式ドキュメントの記述に基づく。`openai/codex-plugin-cc`・
`wan-huiyan/agent-review-panel`・`sdsrss/loop_eng` の3件は前回「実装を読む」と宣言したが、今回も
**実装本体は読んでいない**（README と DeepWiki の要約まで）。したがって下の A 判定は「削除の決定」
ではなく「削除を検討する根拠が揃った」という意味である。

---

## 1. 一覧（32スキル）

| # | スキル | 主な先行事例 | 重なり | 残る差分 |
|---|---|---|---|---|
| 1 | feature-pipeline | 公式 `feature-dev`（多エージェントの7フェーズ）、`obra/superpowers`、`github/spec-kit` | **A** | 日本語・人間承認CP3点・status.md からの再開 |
| 2 | task-pipeline | 該当なし（コード以外の成果物を工程化したものは確認できず） | **D** | — |
| 3 | pipeline-setup | 本体 `/init`（`CLAUDE_CODE_NEW_INIT=1` で skills/hooks まで提案）、公式 `claude-code-setup` | **B** | パイプライン資材一式の配線・モード選択 |
| 4 | build-with-tests | `superpowers` の TDD、`mattpocock-skills`（TDD・spec flow） | **A** | 「パイプラインを通すほどではない」軽量版という位置づけだけ |
| 5 | clarify | `spec-kit` の `/speckit.clarify`、`superpowers` の brainstorming | **A** | 一問ずつ・推奨回答つき・甘い回答に突っ込む対話規律 |
| 6 | notes | `REMvisual/claude-handoff` 等の handoff スキル群 | **B** | handoff は終了時のスナップショット、notes は**作業中の逐次記録** |
| 7 | design-docs | 日本語ブログの個人実装は複数あるが、配布物は確認できず | **D** | 要件定義〜DB設計の5フェーズ固定章立て |
| 8 | pipeline-improve | 公式 `claude-md-management`（session learnings の取り込み）、`rohitg00/pro-workflow` | **B** | 改善対象が CLAUDE.md ではなく**エージェント定義とスキル本文** |
| 9 | codex-review | **公式 `openai/codex-plugin-cc` の `/codex:review`** | **A** | 日本語要約のみ |
| 10 | codex-implement | **`/codex:rescue`・`/codex:transfer`**（＋ `status`/`result`/`cancel` のジョブ管理） | **A** | 無し。向こうはバックグラウンドジョブ管理まで持ち、**上位互換** |
| 11 | codex-ask | 公式側に「相談専用」コマンドは無い（review / rescue / transfer の3系統） | **C** | read-only の自由質問という入口 |
| 12 | codex-agents | `dyoshikawa/rulesync`・`ai-rules-sync`・`agent_sync`／本体 `/import`・`@AGENTS.md` import・symlink | **B** | CLAUDE.md → AGENTS.md 方向で @import を展開して平坦化する点。ただし本体は**逆方向（AGENTS.md を CLAUDE.md に取り込む）を公式に推奨**しており、問題自体は本体で解ける |
| 13 | kiro-review | 該当を確認できず（`claude-kiro` は Kiro の手法を Claude Code で再現するもので逆方向） | **D** | — |
| 14 | kiro-ask | 同上 | **D** | — |
| 15 | review-panel | **`wan-huiyan/agent-review-panel`**（4〜6ペルソナ自動選択・10技術シグナル・Supreme Judge・判定後の再検証ゲート・懐疑度20〜60%） | **A** | **codex / kiro の異種モデル混成**（相手は「Claude 専用・素の API では動かない」と明記）・日本語 |
| 16 | adoption-review | deep research 系は多いが「採用可否の判定」を出力契約にしたものは確認できず | **D** | — |
| 17 | codebase-onboard | 公式 `claude-code-setup`、本体 `/init` の新フロー | **B** | permissions.deny・claudeMdExcludes・LSP・sparse worktree といった**大規模特化の実測→適用** |
| 18 | codebase-map | 本体 Explore サブエージェント、community の codebase-onboarding スキル群 | **B** | 「どこに何があるか」だけに絞った成果物を**残す**こと |
| 19 | context-audit | 公式 `claude-md-management`、本体 `/doctor` の CLAUDE.md トリム提案（v2.1.206+）、`/skill-doctor` | **A** | CLAUDE.md 階層＋rules＋スキル＋**auto memory の MEMORY.md** を横断で1回に棚卸しする点 |
| 20 | project-catchup | community の onboarding / handover ドキュメント生成スキル群 | **B** | 実装者水準の粒度・出典必須・図必須・悪い例/良い例で下限を縛る |
| 21 | task-brief | `superpowers` の brainstorming / writing-plans、本体 Plan モード | **B** | 数分で埋まる軽量ブリーフに徹する（設計書もタスク分解も作らない） |
| 22 | backlog-loop | **`MrLesk/Backlog.md`**（MCP/CLI つきの Markdown タスク管理）、本体 `/loop` | **A** | **1ステップごとに必ず停止して承認を待つ**運用規律（Backlog.md は状態管理であって承認ゲートではない） |
| 23 | pr-merge | 公式 `commit-commands`（`/commit`・`/commit-push-pr`・`/clean_gone`） | **B** | CI 確認 → マージ → main 更新 → 後片付けまでの一気通貫 |
| 24 | fan-out | **本体 `/batch`**（1つの変更を5〜30の worktree 分離サブエージェントに割り、各々が PR を出す）、agent teams、dynamic workflows | **A** | セッション内で完結し PR を作らない点だけ |
| 25 | long-run | **本体 `/goal`**（完了条件を毎ターン小型モデルが判定）、公式 `ralph-loop` | **A** | 圧縮対策の reinject-brief フック。ただし本体も CLAUDE.md の再注入を公式に持つ |
| 26 | verify-fresh | 本体バンドル `/verify`（**アプリを実際に動かして確認**する別軸）、公式 `math-olympiad` の fresh-context 敵対検証 | **B** | 「成果物 vs 完了条件」の突き合わせ。`/verify` は動作確認であって完了条件との照合ではない |
| 27 | self-correct | **`sdsrss/loop_eng`**（builder/checker のツール許可分離・二値基準の hash-lock・`.loop/` の disk 永続・Stop ゲート・**停止6ルール**）、公式 `ralph-loop`、本体 `/goal` | **A** | Ground Truth の設計手順と judge-eval との接続 |
| 28 | judge-eval | `wenxuec/llm-judge`（ルーブリック設計・バイアス配慮・Cohen's κ での校正）、`claude plugin eval` の `llm` グレーダー | **B** | 検定対象が「自己修正ループの Judge」に限定され、合否が本番投入の可否に直結する |
| 29 | self-correct-setup | 該当なし（loop_eng は導入スクリプトを README で案内） | **C** | — |
| 30 | feedback-rule | **本体 auto memory**（`type: feedback` ＝ユーザーの訂正を自動記録・既定ON）、`pro-workflow`、`Engram` | **B** | 公式が「memory は context であって強制ではない。**強制したいなら PreToolUse フック**」と明記している層を、count と enforce で埋める |
| 31 | feedback-audit | 本体の MEMORY.md 肥大リマインド（200行/25KB） | **B** | 発火ログの集計による形骸化・誤検知・昇格候補の判定 |
| 32 | feedback-setup | 該当なし | **C** | — |
| 33 | deep-understand | **`rodbv/socratic-skills`**（diff・spec・plan をクイズして理解を確認）、公式 `learning-output-style` / `explanatory-output-style`、socratic-tutor 系多数 | **A** | 3層チェックリストの常時維持・`AskUserQuestion` によるクイズ・日本語の粒度指定（ELI5/14/I） |

集計: **A = 12件**、B = 13件、C = 3件、D = 5件。

---

## 2. 前回「審議中」とした3件の決着

### codex-bridge → **codex-review・codex-implement は A（重複）**、codex-agents は B、codex-ask は C

`openai/codex-plugin-cc` は `/codex:review`（read-only）・`/codex:adversarial-review`・`/codex:rescue`
（委任）に加えて、**`/codex:status`・`/codex:result`・`/codex:cancel` のバックグラウンドジョブ管理**と
SessionStart / Stop フックを持つ。委任の粒度では当方の codex-review / codex-implement は上位互換を
相手に持たれている。

一方、**AGENTS.md の生成・同期は公式プラグインに無い**（Codex CLI が既存の AGENTS.md を読むだけ）。
前回の仮説どおりで、codex-agents の存在理由はここで保たれる。ただし同機能の汎用 CLI（rulesync ほか）
は複数あり、さらに Claude Code 本体は「CLAUDE.md から `@AGENTS.md` を import する／symlink する」
「`/import` で他エージェントの設定を取り込む」を**公式に推奨**している。つまり「CLAUDE.md と AGENTS.md
を一致させる」という問題自体は本体で解ける。当方が担うのは**逆方向（Claude を正、Codex を従）に限った
平坦化**である、と役割を狭く言い直すべき。

### agent-review-panel → **A（相手の機構が厚い）**

`wan-huiyan/agent-review-panel` は、前回把握していた反グループシンク機構に加えて、
**技術シグナル10グループからのペルソナ自動選択**、**Phase 14 の Supreme Judge**、
**Phase 14.5（裁定者が新規に出した P0/P1 を再検証してハルシネーションを潰すゲート）**、
**懐疑度20〜60%のプライベート内省**を持つ。当方の review-panel が持つ機構はこの部分集合に近い。

決定的な差分は1つだけ残る。相手は **Claude 専用**で「素の Anthropic API では動かない・Claude Code の
サーフェス必須」と明記しており、**Codex / Kiro の混成には対応していない**。当方の review-panel の
存在理由は「異種モデルを混ぜられること」に絞られる。逆に言えば、**内部3ペルソナだけで使うなら
相手を入れたほうがよい**。README にこの線引きを書くべき。

### self-correct → **A（loop_eng が同等以上）**

`sdsrss/loop_eng` は停止6ルール（ALL GREEN／ラウンド上限5／同一失敗2連続／リグレッション検出／
2ラウンド進捗なし／能力境界）を持ち、当方が 2026-09-06 に追加した2件を含んでいる。加えて
**基準ファイルの hash-lock**、**完了成果物への書き込みを塞ぐ PreToolUse 証拠ゲート**、
**`.loop/results.json` を「モデルの主張ではなく機械が書いた事実」として扱う設計**を持つ。

当方に残る差分は **judge-eval（Judge 自身を正解つきで検定する）** で、これは相手の README に無い
（「検証プロセス自体のメタ評価は無い」と DeepWiki も要約している）。self-correct 本体は再発明に
近く、**judge-eval が本命**という関係になる。

---

## 3. 副産物 — `claude plugin eval` は実在する（前回の記述は誤り）

前回（2026-09-07）の記録 3-F は「`claude plugin eval` は公式ドキュメントに存在しない」と書き、
`docs/evals/` を skill-creator の `evals/evals.json` 形式に寄せた。**これは誤りだった。**

公式ドキュメント [Test plugins with evals](https://code.claude.com/docs/en/plugin-evals) に
`claude plugin eval` があり、しかも当方が手作業の手順として `docs/evals/README.md` に書いていたことを
そのまま機能として持っている:

- `evals/<case>/prompt.md` ＋ `graders/*.md` のケースディレクトリ形式
- グレーダー6種（`regex` / `tool_used` / `tool_order` / `file_exists` / `llm` / `baseline`）
- **no-plugin ベースライン（ablation）を既定で自動実行**し、`WITH` / `W/OUT` / `Δ` を出す
  — 当方が「baseline 比較」として人手で回していたもの
- `tool_used: Skill` グレーダーで**スキルが実際に発火したか**を判定（＝trigger eval）
- 既定3回実行、`--threshold` で合否、`--json` と終了コードで CI ゲート、`report.html`
- `claude plugin eval init` がケースとグレーダーを対話で生成

公式ページは「この形式は skill-creator の `evals/evals.json` とは別物」と明記しているので、
**当方の `gen-evals.py` + `evals.json` は skill-creator 形式としては間違っていない**。ただし
「ベースライン比較と trigger eval を人手で回す」部分は本体に吸収されている。`docs/evals/` を
`claude plugin eval` の形式へ移すのが筋。**本記録では変更しない**（依頼は調査であり、
eval 基盤の入れ替えは独立した決定）。

---

## 4. 示唆

削除を即決できる材料は無い（実装未読）。優先度をつけるなら:

1. **codex-review / codex-implement** — 公式 `openai/codex-plugin-cc` が上位互換。
   「公式プラグインを入れてください」と README で案内し、当方は codex-agents（＋ codex-ask）に
   絞るのが最も素直。これは A 10件の中で唯一、**相手が公式で、機能も明確に多い**ケース
2. **fan-out / long-run / backlog-loop** — いずれも本体（`/batch`・`/goal`・`/loop`）と重なる。
   差分（PR を作らない／ブリーフ再注入／ステップ承認）を README とスキル本文の冒頭に明記して
   「本体を使うべき場合」を書く。書けないなら畳む
3. **review-panel / self-correct** — 存在理由をそれぞれ「異種モデル混成」「judge-eval との接続」に
   絞って明記する。絞れば残る
4. **build-with-tests / clarify** — 先行事例が厚く、差分が「軽量であること」「対話の作法」だけ。
   パイプラインの部品としてしか使われないなら、独立スキルを畳んで pipeline の references に
   落とす選択肢がある
5. **context-audit** — 本体 `/doctor` のトリム提案と公式 `claude-md-management` に挟まれている。
   差分は「auto memory まで含めた横断棚卸し」の一点なので、そこを前面に出す
6. **deep-understand** — 前回 B 相当としたが、`rodbv/socratic-skills`（diff・spec・plan をクイズ）の
   発見で A に下がった。残る差分は3層チェックリストの常時維持と日本語なので、
   「英語圏の socratic 系で足りるならそちらでよい」と README に書ける程度には差が薄い

## 5. 確認できなかったこと

- 上記3 OSS の実装本体（前回に続き未読）。README・公式ドキュメント・DeepWiki の要約まで
- 各 OSS のスター数・最終更新日（本セッションの GitHub アクセスは本リポジトリに限定）
- `claude-plugins-official` の全プラグイン一覧の網羅（検索経由で該当カテゴリのみ確認）
- community の codebase-onboarding / socratic 系スキルの実装（マーケットプレイスの説明文まで）
- `mattpocock-skills`・`math-olympiad` の中身（公式マーケットプレイスの説明文まで）

これらは**判定を下げる根拠には使っていない**（adoption-review 中核ルール11）。

## 出典

- [Test plugins with evals（公式）](https://code.claude.com/docs/en/plugin-evals)
- [How Claude remembers your project（公式・auto memory）](https://code.claude.com/docs/en/memory)
- [Skills（公式・バンドルスキル `/run` `/verify` `/debug` `/batch` `/loop`）](https://code.claude.com/docs/en/skills)
- [Slash commands（公式・`/goal` `/batch` `/doctor` `/skill-doctor`）](https://code.claude.com/docs/en/slash-commands)
- [Run agents in parallel（公式）](https://code.claude.com/docs/en/agents)
- [anthropics/claude-plugins-official の marketplace.json](https://github.com/anthropics/claude-plugins-official/blob/main/.claude-plugin/marketplace.json)
- [Official Plugins | anthropics/claude-code（DeepWiki）](https://deepwiki.com/anthropics/claude-code/4-official-plugins)
- [openai/codex-plugin-cc](https://github.com/openai/codex-plugin-cc)
- [wan-huiyan/agent-review-panel](https://github.com/wan-huiyan/agent-review-panel)
- [sdsrss/loop_eng](https://github.com/sdsrss/loop_eng)
- [obra/superpowers](https://github.com/obra/superpowers)
- [github/spec-kit](https://github.com/github/spec-kit)
- [MrLesk/Backlog.md](https://github.com/MrLesk/Backlog.md)
- [dyoshikawa/rulesync](https://github.com/dyoshikawa/rulesync)
- [rodbv/socratic-skills](https://github.com/rodbv/socratic-skills)
- [wenxuec/llm-judge](https://github.com/wenxuec/llm-judge)
- [REMvisual/claude-handoff](https://github.com/REMvisual/claude-handoff)
- [rohitg00/pro-workflow](https://github.com/rohitg00/pro-workflow)
- [commit-commands（公式プラグイン）](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/commit-commands)
