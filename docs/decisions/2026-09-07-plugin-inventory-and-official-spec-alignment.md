# 2026-09-07 — 全10プラグインの棚卸しと、公式一次情報への追随

依頼は「adoption-review スキルでリポジトリの各スキル・プラグインをチェックし、必要／不要を
選別し、Web や OSS の情報を取り込んで品質を上げる」。

`adoption-review` は自身の description で「自分のリポジトリの評価は `/code-review`・
`/review-panel` に任せる」と明示しているため、**判定の枠組み**（代替手段＝本体機能・既存OSS・
何もしない／導入・運用・学習・撤退コスト／中核ルール11「確認できなかったことを減点に使わない」）
だけを自リポジトリに適用し、**スキル本来の用途**は取り込みを検討する公式仕様・外部 CLI・
競合 OSS に対して使った。証拠収集は Step 1 のとおり3スコープ並列（一次情報／運用情報／外部評価）。

---

## 1. 判定結果 — プラグインは1つも削除しない

`plugins/` 配下10件すべてを「継続」とした。ただしこれは**無条件の継続ではない**。3件について
2026-08 のレビュー当時は存在しなかった公式プラグイン・OSS が重なっていることが分かったため、
**要否の判定を先送りし、審議中として記録する**（下記2）。

| プラグイン | 重なる先行事例 | 判定 | 決め手 |
|---|---|---|---|
| pipeline | 公式 `feature-dev`（7フェーズ・explorer/architect/reviewer を各2〜3並列・承認ブロック2箇所）、`github/spec-kit` v1.0.0、`obra/superpowers` | 継続 | `task-pipeline` の非コード成果物モードと `design-docs` に該当が無い |
| codex-bridge | **`openai/codex-plugin-cc`（OpenAI 公式）** | **審議中** | 下記2 |
| kiro-bridge | 該当を確認できず | 継続 | 複数クエリで Kiro 委任ブリッジは見つからなかった。Kiro CLI 自体は現役 |
| agent-review-panel | **`wan-huiyan/agent-review-panel`（同名・同趣旨）** | **審議中** | 下記2 |
| adoption-review | 完全一致を確認できず | 継続 | deep research 系は複数あるが「採用可否の判定」を出力契約にしたものは見つからなかった |
| codebase-setup | 公式 `claude-code-setup`、公式 `claude-md-management`、`alirezarezvani/ClaudeForge` | 継続 | `project-catchup`（人間向けキャッチアップ）に該当が無い |
| model-setup | 公式 `/goal`・`/loop`・`ralph-loop`、`az9713/claude-coding-skills`、`rulesync`、`ccusage` | 継続 | プロファイル2種の配布テンプレートに該当が無い |
| self-correct | 公式 `/goal`・公式 `ralph-loop`・**`sdsrss/loop_eng`** | **審議中** | 下記2 |
| feedback-rules | `BayramAnnakov/claude-reflect`、`rohitg00/pro-workflow` | 継続 | 訂正の永続化は共通だが、**1指摘1ファイル**も **count による段階的強制**もどちらの説明文にも無い |
| learning-coach | `alexknowshtml/claude-skills` の `teach`、公式 `learning-output-style` | 継続 | 一致度は高い。日本語・ELI5/14/I の粒度指定・`AskUserQuestion` クイズが差分 |

## 2. 審議中の3件 — なぜ今回決めなかったか

重複の判定は各 OSS の **README・公式ドキュメントの記述**に基づく。**実装本体は読んでいない。**
「同じに見える」ことと「同じ」ことは別であり、README の一致を根拠にプラグインを削除するのは
証拠の強度に見合わない。よって今回は削除せず、次に読むべきものを名指しして先送りする。

### codex-bridge ↔ `openai/codex-plugin-cc`

- 重なり: `/codex:review`（read-only）・`/codex:adversarial-review`・`/codex:rescue`（委任・
  書き込み可）で、レビュー／実装／相談の3用途をカバー。ローカル codex バイナリを呼ぶ方式も同じ
- 当リポジトリ側にあって公式側に見当たらないもの: `/codex-agents`（Claude のルールを取り込んだ
  AGENTS.md 生成・@import 展開・センチネル所有判定）、プラン提示前レビューの opt-in フック、日本語
- **読むべきもの**: `openai/codex-plugin-cc` の `commands/`・`agents/`・AGENTS.md 生成の有無

### agent-review-panel ↔ `wan-huiyan/agent-review-panel`

- 重なり: 名前も趣旨も同じ（複数ペルソナの敵対的レビュー＋裁定者）
- 当リポジトリ側の差分: codex / kiro の異種モデル混成 opt-in、依存ゼロで動くこと、日本語
- 相手側にあって当方に無かった機構は今回2つ取り込んだ（下記3-J）
- **読むべきもの**: 相手の `skills/` 2種の本文と、反グループシンク機構の実装

### self-correct ↔ 公式 `ralph-loop` / `sdsrss/loop_eng`

- 重なり: `loop_eng` は builder/checker のツール許可リスト分離・二値基準の TSV・証拠の disk 永続化・
  **停止6ルール**（当リポジトリが 2026-09-06 に追加したリグレッション検出と進捗なし検出を含む）
- 当リポジトリ側の差分: `judge-eval`（Judge 自身を正解つきで採点する）、Ground Truth の設計手順
- **読むべきもの**: `sdsrss/loop_eng` の `.loop/` 状態設計と Stop フック、`ralph-loop` の `stop-hook.sh`

## 3. 適用した品質改善

### A. marketplace.json の単一情報源化
10エントリが plugin.json の `description`/`keywords`/`license`/`author` を二重に持ち、
実際にずれていた（pipeline の説明文が 2.3.0 の追加を反映せず「スキル7種・エージェント8種」の
まま。実体は8種・9種）。公式仕様ではエントリで省略すると plugin.json の値が使われる
（`strict` 未指定＝true）ため、エントリを `name`/`source`/`category` だけに縮めた。
同期の自動化ではなく重複そのものを消す形（lessons 教訓2）。

### B. CI の検査を公式現況へ
`ALLOWED_KEYS` を9キーに固定していたため、公式が受け付ける `when_to_use`・`paths`・`model`・
`effort`・`context`・`agent`・`background`・`shell`・`arguments`・`disallowed-tools`・
`user-invocable` を**全部エラーにしていた**。集合を追随させ、あわせて公式が明文で求める検査を
追加（description 1024字・三人称・references 1階層・100行超の目次・agent description 合計の予算）。

### C. 公式ガイドラインへの実体の適合
- `deep-understand` の description を三人称化（公式 "Always write in third person"）
- `spec-summary.md` を SKILL.md から直接参照して1階層に（公式 "Keep references one level deep"）
- 100行超の references 7本に目次（公式 "include a table of contents"）

### D. 外部 CLI
- Codex: ドキュメントが `learn.chatgpt.com/docs/` へ移転、`--ephemeral` の採用、`--full-auto` が
  非推奨、`--ask-for-approval` の3値、`--json`/`--output-last-message`、`CODEX_API_KEY`。
  `gen-agents-md.sh` に AGENTS.md の読み込み上限（`project_doc_max_bytes` 既定 32 KiB）超過の警告
- Kiro: ケイパビリティベース権限（`fs_read`/`fs_write`/`shell`/`web_fetch`/`mcp`、deny 優先）を
  出典つきで記載し、read-only 限定の根拠を補強。`--output-format stream-json` を案内

### E. 本体機能（教訓1 の維持）
`context-audit` に `/skill-doctor`、`fan-out` に `/batch` と並列上限の実値、`self-correct` に
`/goal` の制約6件を、いずれも一次情報の出典つきで追加。

### F. eval
`docs/evals/README.md` の「`claude plugin eval` は early access」という前提が**誤り**だった
（そのコマンドは公式ドキュメントに存在しない）。実在するのは公式 `skill-creator` プラグインの
`evals/evals.json` なので、その形に寄せた（`gen-evals.py` が Markdown から生成）。
公式が実際に行っている **baseline 比較**（スキル有り／無しを同時に走らせる）と
**20クエリの trigger eval セット**も採り、対象を5スキル→11スキルに広げた。

### I. フック
配線18件を exec 形式（`args` 配列）へ。公式は「パスのプレースホルダを参照するフックは exec 形式を
推奨」と明記している。あわせて終了コードの規約（exit 2 だけがブロックする）を主要7本の
先頭コメントに明記した。現行スクリプトの終了コードは全件確認したが、修正が要るものは無かった。

### J. review-panel の反グループシンク機構（先行事例からの取り込み）
`wan-huiyan/agent-review-panel` が README で挙げる機構のうち、**当方に無かった2つだけ**を
概念として取り込んだ（実装は未読のため移植ではなく自作）:

- **統制検証ゲート** — 「対象を見なくても書けた指摘」（物証の無い一般論）を統合から外す。
  落とした件数と理由は開示する
- **ブラインド最終採点** — R1 のスコアは討論前の値なので、R3 で他者の結論を見せないまま
  最終スコアを取り直し、R1 と並べて出す。分散が縮んだ場合は根拠による収束か同調かを
  譲歩履歴と併せて判断する

相手側が挙げる「追認検出」「相関バイアス警告」は当方に**既にあった**（追従的収束の検出・
全員一致警告）ため、重複させていない。

### K. サブエージェントの規約
公式の「description 合計が 15,000 トークン超で起動時警告」に対し、31体の実測（7,001字）を
記録し、CI に 12,000 字の上限検査を入れた。`disallowedTools` の適用順、プラグインでは
`permissionMode`/`mcpServers`/`hooks` が無視されること、ツール名が `Agent`（`Task` は
エイリアス）であることも執筆規約に追記した。

## 3.5. `claude plugin validate` の警告について（変更しない判断）

全10プラグイン＋marketplace を検証したところ、`model-setup`・`pipeline`・`self-correct` の3件が
次の警告つきで通る:

```
root: CLAUDE.md at the plugin root is not loaded as project context.
To ship context with your plugin, use a skill (skills/<name>/SKILL.md) instead.
```

**これは意図どおりなので直さない。** 3件のプラグインルートにある `CLAUDE.md` は、プラグインの
文脈として読ませるものではなく、**導入先リポジトリへコピーして使うサンプル**である
（`pipeline-setup`・`self-correct-setup` がコピーし、model-setup は README の手順で人がコピーする）。
警告の言うとおりスキルへ移すと、コピー配布という用途そのものが失われる。今回の検証で初めて
出た警告ではなく、以前から出ていた既知のもの。

## 4. 確認できなかったこと

- 各 OSS の実装本体（`wan-huiyan/agent-review-panel`・`sdsrss/loop_eng`・`claude-reflect` の
  SKILL.md・agents・hooks）。README と公式ドキュメントの記述までしか見ていない
- `claude-plugins-official` の第三者プラグイン一覧の N〜Z 範囲（ファイルが大きく逐語取得できず）
- 各 OSS のスター数・最終更新日の一部（このセッションの GitHub アクセスは本リポジトリに
  限定されており api.github.com は 403。取得できたものは commits の Atom フィード経由）
- `codex -q` が現在も有効かどうか（公式リファレンスに記載が無い、という事実までしか言えない）
- Kiro CLI の `--trust-tools` に指定できるカテゴリの網羅的な一覧（公式は例示のみ）

これらは**判定を下げる根拠には使っていない**（中核ルール11）。
