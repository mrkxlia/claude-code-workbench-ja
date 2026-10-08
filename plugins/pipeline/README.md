# pipeline — コード以外の成果物を、専門エージェントの連鎖で作るパイプライン

Claude Code のサブエージェント・スキル・フックを組み合わせて、図・ドキュメント・レポート・設計書などの
**コード以外の成果物**づくりを、承認ゲート付きの流れ作業に変えるテンプレートです。

```
/task-pipeline <依頼の説明>
 → Phase 1: researcher（素材・規約の調査）
 → Phase 2: requirements-writer（成果物要件） → 🛑 チェックポイント1: 要件承認（Plan モードレビュー）
 → Phase 3: brief-writer（作業ブリーフ）      → 🛑 チェックポイント2: ブリーフ承認（Plan モードレビュー）
 → Phase 4: deliverable-builder（作成）
 → Phase 5: final-reviewer（レビュー）        → 🛑 チェックポイント3: 最終レビュー（差し戻し上限3回）
```

人間が判断するのは3つの承認チェックポイントだけで、その間は専門エージェントが自走します。途中経過は
`docs/task-pipeline/<slug>/`（status.md / research.md / requirements.md / brief.md）にファイルとして残るので、
セッションが切れても `/task-pipeline 再開 <slug>` で続きから再開できます。

> **コードの機能開発は superpowers を使ってください。** 以前あったコードモード（`/feature-pipeline`・
> backend/frontend-builder・test-verifier）は 2026-10-06 に削除しました（pipeline 5.0.0）。
> [obra/superpowers](https://github.com/obra/superpowers)（導入手順は上流の README）が
> 計画・TDD・サブエージェント駆動の実装・レビュー・worktree 隔離まで、継続的に保守された形で持っているためです
> （経緯は [`docs/decisions/2026-10-06-repo-cleanup.md`](../../docs/decisions/2026-10-06-repo-cleanup.md) の第10段）。
> 導入済みプロジェクトの `docs/pipeline/` はそのまま残せますが、`/feature-pipeline 再開` はできなくなります。

> 本セクションは @sairahul1 氏の記事
> [How to Build a Software Factory with Claude Code That Ships Features While You Sleep](https://x.com/sairahul1/status/2058832033628241931)
> のコンセプトを、コード以外の成果物向けに汎用化した独自実装です（記事のコピーではありません）。

## 専門エージェント

| エージェント | 役割 |
|---|---|
| `researcher` | 既存ドキュメント・データ・過去の成果物・表記規約を調べる（read-only） |
| `requirements-writer` | 依頼を、レビューで検証できる受け入れ基準つきの成果物要件にする（read-only） |
| `brief-writer` | 要件を作業ブリーフ（構成案・作成手順・使用スキル・作成ファイル）にする（read-only） |
| `deliverable-builder` | ブリーフどおりに成果物を作る。**Skill ツール**を持ち、CLAUDE.md の「利用可能なスキル」表で許可された drawio 等を呼べる |
| `final-reviewer` | 成果物を要件・ブリーフと突き合わせ、ギャップを Critical / Important / Minor で報告する（read-only） |
| `design-doc-checker` | 設計書のフェーズ間の矛盾・用語ゆれ・実コードとの乖離を検査する（read-only・design-docs 用） |

## スキル

| スキル | 使いどころ |
|---|---|
| `/task-pipeline <依頼>` | 成果物を5工程で作る（入口） |
| `/design-docs [フェーズ] [対象]` | 要件定義・基本設計・詳細設計・DB設計・図表を、フェーズごとに固定した章立てで書く |
| `/ops-manual [作成 \| レビュー] [作業名 \| パス]` | 運用手順書・作業マニュアルを、シナリオ・タスク・I/O の3層と事前条件・完了条件で書く／既存の手順書を検査して直す |
| `/grilling <詰めたい要件>` | 要件・構成を徹底質問で詰める（[mattpocock/skills](https://github.com/mattpocock/skills) の `grilling` を無改変で同梱・MIT。パイプライン内では Phase 2/3 の writer 起動前に自動で回る） |
| `/notes` | 作業中の判断・逸脱・ハマりどころを `implementation-notes.md` に記録し続ける |
| `/pipeline-improve [期間]` | 運用実績（LEARNINGS・実装ノート・差し戻し回数・会話履歴）から失敗シグナルを拾い、エージェント定義・スキルの改善案を出す（明示専用） |
| `/pipeline-setup` | 一式を対象リポジトリに導入する（明示専用） |

### 設計書を書く場合（design-docs）

設計書は「フェーズごとに読者と粒度が違うのに、毎回ゼロから章立てを指示し直す」ことでブレる成果物です。
[`skills/design-docs/SKILL.md`](skills/design-docs/SKILL.md) がその型を供給します。

| フェーズ | 主な読者 | 書く粒度 |
|---|---|---|
| 要件定義 | 発注者・PM | 業務要件・機能要件・非機能要件 |
| 基本設計 | PM・リードエンジニア | システム構成・機能一覧・画面遷移の概要 |
| 詳細設計 | 実装担当エンジニア | 処理フロー・クラス/メソッド・入出力仕様 |
| DB設計 | 実装担当エンジニア | テーブル定義・制約・ER図 |
| 図表 | 全員 | シーケンス図・フローチャート（Mermaid） |

- フェーズ別のエージェントは作らず、`deliverable-builder` に [`references/templates.md`](skills/design-docs/references/templates.md)
  の章立てを渡す（経緯は [`docs/decisions/2026-09-05-design-doc-subagents.md`](../../docs/decisions/2026-09-05-design-doc-subagents.md)）
- フェーズ間の整合だけは `design-doc-checker` が検査する。`final-reviewer`（要件・ブリーフとの照合）とは対象が違うので両方回す
- 用語集は導入先の CLAUDE.md に1か所だけ置く（[`CLAUDE.task.md`](CLAUDE.task.md) の「用語集」節）
- `【要確認】` は人にしか答えられないことだけに立てる。Grep/Glob で確かめられるものはその場で確かめて根拠つきで書く

### 運用手順書を書く場合（ops-manual）

運用手順書は「一本道で長く、途中で失敗すると最初からやり直し」「分岐と共通手順が混ざって直すたびに矛盾が増える」
「手順どおりにやったのに目的を果たせない」の3つで事故る成果物です。
[`skills/ops-manual/SKILL.md`](skills/ops-manual/SKILL.md) は、運用設計ラボ（波田野裕一氏）の発表
「「ミスを許さない手順書」を作ってみた」（ssmjp online #53）の方法論を型に落としたものです。

| 層 | 持つもの | 持たないもの |
|---|---|---|
| シナリオ | タスクの順序・分岐・設定値（作業の前日までに決める） | 具体的な操作 |
| タスク | 目的・事前条件・完了条件・前処理（事前条件の確認）・主処理・後処理（完了条件の確認）・戻し方。1タスク1操作 | 分岐・特定シナリオの事情 |
| I/O | タスク間でやり取りされる入出力（どのタスクが作り、どのタスクが使うか） | 手順 |

- 型は3つ — 簡易版（小さい定型作業）・完全版・完全版＋実行ガード（CLI 主体の作業に、事前条件を満たさないと主処理が動かないシェル関数の骨格を添える）。小さい作業に完全版を強いない
- 検査は論理的・合目的的・伝承的の3レベル＋runbook の一般的な実践（期待結果つきの確認・戻し方・取り消し不可の警告）
- **手順は実行しない。** 人が試走するための計画（未経験者・本番以外・事前条件の破壊テスト）を添えて返す
- 採否の経緯と、敵対役の反論をどう反映したかは [`docs/decisions/2026-10-08-ops-manual.md`](../../docs/decisions/2026-10-08-ops-manual.md)

## ファイル構成

```
pipeline/
├── README.md
├── CLAUDE.task.md                           # コピーして使う CLAUDE.md サンプル（出力先・利用可能なスキル・表記規約）
├── .claude-plugin/plugin.json
├── agents/                                  # 6種（researcher / requirements-writer / brief-writer / deliverable-builder / final-reviewer / design-doc-checker）
├── skills/
│   ├── task-pipeline/SKILL.md               # オーケストレーター（5工程）
│   ├── design-docs/{SKILL.md,references/}   # 設計書の章立て（templates.md / consistency.md）
│   ├── ops-manual/{SKILL.md,references/}    # 運用手順書の型（templates.md / checklist.md / shell-guard.md）
│   ├── grilling/{SKILL.md,LICENSE}          # 徹底質問（mattpocock/skills から無改変で同梱・MIT）
│   ├── notes/SKILL.md                       # 実装ノート
│   ├── pipeline-improve/SKILL.md            # 自己改善ループ
│   └── pipeline-setup/{SKILL.md,references/}# 導入（deliverable-mode.md / spec-summary.md / windows.md）
├── hooks/
│   ├── block-secrets-commit.{sh,ps1}        # 機密ファイルのコミットをブロック
│   ├── guard-deliverable-writes.{sh,ps1}    # 出力ディレクトリ外への書き込みを ask で確認
│   ├── guard-builder-paths.{sh,ps1}         # ビルダーの担当外パスへの書き込みを exit 2 で拒否（frontmatter から）
│   ├── inject-spec-summary.{sh,ps1}         # SPEC.md の [確定] 要件の目次を SessionStart/SubagentStart で注入
│   └── spec-sync-reminder.{sh,ps1}          # SPEC.md の未同期を知らせる通知
└── setup/settings.json                      # フック配線のサンプル
```

プラグイン導入で自動配信されるのはスキルとエージェントです。CLAUDE.md サンプル・フックはプロジェクトごとの
差し替え（出力ディレクトリなど）が前提なので、`pipeline-setup` が対象リポジトリへコピーしてカスタマイズします。

## セットアップ

### 方式A: プラグインで導入する（推奨）

```
/plugin marketplace add mrkxlia/claude-code-workbench-ja
/plugin install pipeline@workbench-ja
```

新しいセッションを開始して、導入したいリポジトリで `/pipeline:pipeline-setup` を実行します。
出力ディレクトリ・成果物の種類・利用可能なスキルを解析し、**解析結果の承認**を求めて止まったあと、
CLAUDE.md・エージェント・スキル・フック・settings.json を導入します。既存の CLAUDE.md / settings.json は
上書きせずマージを提案します。CLAUDE.md の出力先・ビルダーの担当範囲・フックの許可リストは、
**同じ承認済みデータ**から生成するので食い違いません。

### 方式B: git clone + pipeline-setup

```bash
git clone --depth 1 https://github.com/mrkxlia/claude-code-workbench-ja /tmp/workbench
mkdir -p ~/.claude/skills && cp -r /tmp/workbench/plugins/pipeline/skills/pipeline-setup ~/.claude/skills/
```

導入したいリポジトリで `/pipeline-setup` を実行します。

### git 管理されていないプロジェクト

`/pipeline-setup` が git の有無を判定し、「`git init` の提案 → 断られたら非gitモードで続行」と案内します。
非gitモードでは、機密コミット防止フックが待機状態になり、セットアップの巻き戻しは `.claude/pipeline-backup/` の
バックアップで行います。後から `git init` すれば、その時点から全機能が有効になります。

## 個別スキルを単体で使う（notes など）

`notes` はパイプラインに依存せず単体で使えます。要件を質問で詰めるだけなら、同梱した `grilling` の上流
[mattpocock/skills](https://github.com/mattpocock/skills)（`/plugin install mattpocock-skills@mattpocock`）を
直接入れてください。

```bash
git clone --depth 1 https://github.com/mrkxlia/claude-code-workbench-ja /tmp/workbench
mkdir -p ~/.claude/skills
cp -r /tmp/workbench/plugins/pipeline/skills/notes ~/.claude/skills/
```

`pipeline-improve` はパイプラインの運用ログ（`docs/task-pipeline/`）を前提にするため、単体利用には向きません。

## 試運転とチューニング

1. **小さな成果物で試運転する** — 例: `/task-pipeline 認証フローのシーケンス図を drawio で描いて`
2. **3つのチェックポイントを体験する** — 要件承認では受け入れ基準が「レビューで確かめられる文」か、
   ブリーフ承認では構成案と作成ファイルを、最終レビューでは final-reviewer のレポートを見る。
   どのチェックポイントでも「中止」と伝えれば止まる
3. **ルールを足す** — AI が驚くミスをするたびに「CLAUDE.md にルールがあれば防げたか？」を自問する。
   最終レビューで LEARNINGS.md（`docs/task-pipeline/LEARNINGS.md`）の候補が提示され、承認したものだけがルールになる
4. **`/pipeline-improve` を回す** — 数件流したら（または週1回）実行する。エージェント定義とスキル本文そのものの
   改善案を証拠つき diff で出す。適用は人間の承認後で、ハードルール（チェックポイント・機密・越境禁止）を
   弱める提案はしない。毎日回したいときはヘッドレスモード（`claude -p`）を cron で定期実行し、
   提案の書き出しまでに留める

## フックについての補足

- `block-secrets-commit` — `git commit` 直前にステージを検査し、`.env`・`*.key`・`*.pem`・`secrets.json` を exit 2 でブロック
  （`.env.example` 等は許可）。`.git/hooks/pre-commit` にコピーすれば人間の手コミットも守れる
- `guard-deliverable-writes` — 出力ディレクトリ許可リスト（`ALLOWED_PREFIXES`）外への Edit/Write を `ask` で人間確認に回す
- `guard-builder-paths` — `deliverable-builder` の frontmatter から呼ばれ、担当外パスへの書き込みを exit 2 で拒否する
  （そのサブエージェントが動いている間だけ有効。Claude Code 2.1.218 以降は workspace trust の承認後のみ動き、`claude -p` では動かない）
- `inject-spec-summary` / `spec-sync-reminder` — SPEC.md（要件 ID `D-NN`）の要約注入と、未同期の通知。SPEC.md が無ければ素通り
- **Windows**: `.sh` が基本（Git Bash / WSL）。純 PowerShell 向けに UTF-8 BOM 付きの `.ps1` を同梱し、`/pipeline-setup` が
  `command -v bash` で振り分ける（詳細は [`references/windows.md`](skills/pipeline-setup/references/windows.md)）

## 制限事項

- **スキルは文字どおりには「一時停止」できません。** チェックポイントは「明示的承認まで次フェーズ進行禁止」という
  強い指示で実現しています。承認の言葉（「承認」「OK」「進めて」）は明確に伝えてください
- **サブエージェントはサブエージェントを呼べません。** そのため task-pipeline はメインセッションのスキルとして動き、
  そこから各エージェントを順番に起動します
- 既存の図・ドキュメントからの仕様逆引き（SPEC.md の作成）は持ちません。[daishir0/cc-rsg](https://github.com/daishir0/cc-rsg)
  等の外部ツールに委ねます

## ライセンス・出典

[@sairahul1 氏の記事](https://x.com/sairahul1/status/2058832033628241931)のコンセプト（専門エージェントの連鎖・
3チェックポイント・CLAUDE.md の育て方）に基づく独自実装です。リポジトリの [LICENSE](../../LICENSE)（MIT）に従います。
`skills/grilling/` は [mattpocock/skills](https://github.com/mattpocock/skills)（MIT、上流コミット `6fd9479`・2026-10-06 取得）を
無改変で同梱しており、同ディレクトリの LICENSE に従います。
