# claude-code-workbench-ja — Claude Code リソース・テンプレート集

Claude Code をより快適に使うためのスクリプト、テンプレート、ベストプラクティスをまとめたリポジトリです。

## 導入方法（クイックスタート）

### 方法1: プラグインで導入する（最も簡単）

Claude Code でそのまま実行します（clone 不要）。現在6つのプラグインを配信しています:

```
/plugin marketplace add mrkxlia/claude-code-workbench-ja
/plugin install software-pipeline@workbench-ja
/plugin install task-pipeline@workbench-ja
/plugin install knowledge-share@workbench-ja
/plugin install codex-bridge@workbench-ja
/plugin install ai-peer@workbench-ja
/plugin install self-improve@workbench-ja
```

- **software-pipeline** — 新しいセッションで `/software-pipeline:pipeline-setup` を実行すると、
  対象リポジトリにパイプライン一式（エージェント7種・CLAUDE.md・フック）が導入されます。
  詳しくは [software-pipeline/README.md](software-pipeline/) を参照。
- **task-pipeline** — 新しいセッションで `/task-pipeline:task-pipeline-setup` を実行すると、
  コード以外の成果物（図・ドキュメント・レポート）向けのパイプライン一式（エージェント5種・
  CLAUDE.md・フック）が導入されます。詳しくは [task-pipeline/README.md](task-pipeline/) を参照。
- **knowledge-share** — 導入するだけで、`/knowledge-share:kb`・`/knowledge-share:kb-harvest`
  スキルと、知見の自動読み込み・回収を行う SessionStart/SessionEnd フックが全セッションで
  有効になります。詳しくは [knowledge-share/README.md](knowledge-share/) を参照。
- **codex-bridge** — 導入すると `/codex-review`・`/codex-implement`・`/codex-ask` で、
  コードレビュー・実装・相談を OpenAI Codex に依頼できます（ユーザーは Codex を直接操作せず、
  Claude Code が Codex CLI を非対話で駆動）。詳しくは [codex-bridge/README.md](codex-bridge/) を参照。
- **ai-peer** — 導入すると `/peer`（内部 Claude・**依存ゼロ**で実装前のプランレビュー・ブレスト・
  第二の視点）と `/ask-claude`（別の Claude を CLI で起動して独立見解）でピア相談ができます。
  詳しくは [ai-peer/README.md](ai-peer/) を参照。
- **self-improve** — 導入するだけで、`/improve-scan`（改善の種を発見）・`/improve-apply`（承認制で
  スキル・CLAUDE.md・rules・hook・エージェントを改善）と、改善候補を検出・通知する SessionStart/
  SessionEnd フックが有効になります（git 不要・ローカル完結）。詳しくは [self-improve/README.md](self-improve/) を参照。

### 方法2: git clone してコピーする（全セクション共通）

clone を1回して、使いたいセクションだけコピーします:

```bash
git clone --depth 1 https://github.com/mrkxlia/claude-code-workbench-ja /tmp/workbench
```

```bash
# software-pipeline — pipeline-setup をパーソナルスキル化（以後どのリポジトリでも /pipeline-setup が使える）
mkdir -p ~/.claude/skills && cp -r /tmp/workbench/software-pipeline/.claude/skills/pipeline-setup ~/.claude/skills/

# task-pipeline — task-pipeline-setup をパーソナルスキル化
mkdir -p ~/.claude/skills && cp -r /tmp/workbench/task-pipeline/.claude/skills/task-pipeline-setup ~/.claude/skills/

# implementation-skills — notes / spec-extract をプロジェクト（または ~/.claude/skills/）へ
mkdir -p .claude/skills && cp -r /tmp/workbench/implementation-skills/.claude/skills/* .claude/skills/

# codex-bridge — Codex 依頼スキル3種＋エージェント3種をプロジェクトへ
mkdir -p .claude/skills .claude/agents && cp -r /tmp/workbench/codex-bridge/.claude/skills/* .claude/skills/ && cp -r /tmp/workbench/codex-bridge/.claude/agents/* .claude/agents/

# data-science — CLAUDE.md とスキル一式をプロジェクトへ
cp /tmp/workbench/data-science/CLAUDE.md ./CLAUDE.md && cp -r /tmp/workbench/data-science/.claude ./.claude

# GlobalClaudeMD-sample — グローバル CLAUDE.md として配置
cp /tmp/workbench/GlobalClaudeMD-sample/CLAUDE.md ~/.claude/CLAUDE.md
```

各セクションのカスタマイズ方法は、それぞれの README を参照してください。

> このリポジトリ自身で作業するときは、ルート直下の `.claude/`（dogfooding 用）から `/create-plan` が使えます。

## どれをいつ使う？（スキル/プラグイン早見表）

| やりたいこと | 使うもの | ひとこと |
|--------------|----------|----------|
| 機能をコードで end-to-end 実装したい | **software-pipeline**（`/feature-pipeline`） | 7エージェント連鎖＋3つの人間承認チェックポイント |
| パイプラインを通すほどでない小さな実装＋テスト | software-pipeline の `/build-with-tests` | 既存パターン確認 → 実装とテスト並行 → 型チェック |
| 図・ドキュメント等コード以外の成果物を作りたい | **task-pipeline**（`/task-pipeline`） | 5エージェント連鎖。drawio 等のユーザー導入スキルも呼べる |
| 変更せず実行計画だけ立てたい（Plan/Ask 相当） | **plan-mode**（`/create-plan`） | 非プラグイン。`cp` 導入。コード以外の一般タスクにも使える |
| 別 AI（OpenAI Codex）にレビュー/実装/相談を委譲したい | **codex-bridge**（`/codex-review` ほか） | Claude が Codex CLI を非対話で駆動。ユーザーは Codex を触らない |
| 実装前のプランレビュー・壁打ち・第二の視点が欲しい | **ai-peer**（`/peer`・`/ask-claude`） | peer は依存ゼロ（git/CLI/ネット不要）。ask-claude は別 Claude を CLI で起動 |
| 訂正・繰り返しからスキルや CLAUDE.md を継続改善したい | **self-improve**（`/improve-scan`・`/improve-apply`） | git 不要・承認制・ロールバック付き。kb と連携 |
| セッション/リポジトリ横断で知見を蓄積・再利用したい | **knowledge-share**（`/kb`・`/kb-harvest`） | @import ＋フックで知見の自動読み込み・記録・回収 |
| 要件・仕様を質問で詰めたい | **clarify**（software/task に同梱） | 単体利用も可（各プラグイン README の「単体利用」参照） |
| 既存コード/成果物から仕様書を逆引きしたい | **implementation-skills**（`/spec-extract`） | 確度ラベル付き SPEC.md を生成。`/notes` で実装の経緯も記録 |
| データ分析プロジェクトの土台がほしい | **data-science** | Polars・uv・Jupyter 前提の CLAUDE.md ＋スキル |
| トークン/コストを可視化したい | **token-usage-tracker** | Claude Code 等のログを集計（独立 Python ツール） |

> パイプラインのサブスキル（`clarify`・`build-with-tests` 等）は単体でも使えます。導入は各プラグイン README の
> 「単体で使う（個別利用）」小節を参照してください。

### 仕様駆動開発まわりの違い

仕様にまつわるスキルは守備範囲が重なって見えるので、方向と役割で整理します。

| ツール | 方向 | 入力 → 出力 | いつ使う／違い |
|--------|------|-------------|----------------|
| `spec-extract`（implementation-skills 原本／各パイプライン連携版） | **逆方向** | 既存コード・成果物 → `SPEC.md`（確度ラベル付） | 仕様書の無いレガシーを現状固定したいとき。パイプラインの**入口**。`[確定]/[推定]/[不明]` の物証主義と生きた SPEC 更新が特徴 |
| `feature-pipeline` / `spec-writer`（software-pipeline） | **順方向** | アイデア/ストーリー → 技術ブリーフ → コード | これから作る機能を仕様化して実装まで通す。spec-extract の逆引きと対をなす前進方向 |
| `task-pipeline` の spec-extract 連携版 | 逆方向（成果物） | 既存成果物・規約 → 成果物 SPEC | 図/ドキュメント版。コード前提語を成果物前提に読み替えた点が software 版との違い |
| `clarify`（software/task） | 詰める | 曖昧な要望 → 確定した要件 | 仕様を書く前に穴・前提を質問で潰す。spec-extract/spec-writer の前段。software 版＝コード要件、task 版＝成果物要件で語彙が違う（骨子は同一） |
| `create-plan`（plan-mode） | 計画 | ゴール → 実行計画ファイル（変更なし） | 仕様書ではなく**実行手順**を作る。コードに限らない一般タスク向け |
| `notes`（implementation-skills 原本／連携版） | 記録 | 実装中の判断・逸脱 → `implementation-notes.md` | あるべき姿（SPEC.md）ではなく**実装の経緯**を残す |

**他の仕様駆動開発（SDD）との関係。** spec-kit / Kiro / cc-sdd など一般的な SDD ツールは
`requirements → design → tasks` を前提にします。本リポジトリの対応物は次のとおりです。

| 一般的な SDD | 本リポジトリの相当物 |
|--------------|----------------------|
| requirements.md | feature-pipeline の `story.md`（受け入れ基準つきストーリー） |
| design.md | `brief.md` ＋ `api-contract.md`（技術ブリーフ／API 契約） |
| tasks.md | パイプラインの Phase 連鎖＋ `status.md`（進行管理） |
| PRD / living spec | `SPEC.md`（spec of record・Phase 7 で増分更新） |
| spec-tracker（更新漏れ警告） | `spec-sync-reminder` フック（SessionStart/Stop） |
| spec-validator（実装と仕様の突合） | `implementation-validator` エージェント＋ `test-verifier` |

本リポジトリは順方向（feature-pipeline）に加えて **`spec-extract` による逆方向（レガシー → 仕様）** を持つ点が
spec-kit / Kiro / cc-sdd との主な違いです。運用原則として **「1 Todo = 1 Commit = 1 Spec Update」**
（実装の区切りごとに仕様も更新して同期させる）を採り、これは既存の「Phase 7 での SPEC 増分更新」と
`spec-sync-reminder` フックがそのまま実装になっています。**いつ SDD を使うか**の目安は、本番機能（1日以上）・
チーム作業・厳格なアーキテクチャ・レガシー改善では採用（`feature-pipeline`）、1時間未満の修正・POC・hotfix・
UI 試作では避けて軽量な `build-with-tests` を使う、です（参考: 下記「ライセンス・出典」の SDD 記事）。

## 収録セクション

### [`skills-guide/`](skills-guide/)
おすすめSkillsガイド（2026年6月動作確認済み）。
72個紹介された記事から「今すぐ使えるもの」に絞り込み、優先度別・業務タイプ別に整理しています。

### [`data-science/`](data-science/)
データサイエンスプロジェクト用 CLAUDE.md テンプレート + Skills。
Polars・uv・Jupyter を前提にした CLAUDE.md と、分析業務向け10種のスキルファイルをそのままコピーして使えます。

### [`implementation-skills/`](implementation-skills/)
実装の文脈を残す・取り戻すスキル2種。
実装しながら判断・逸脱・ハマりどころを implementation-notes.md に記録する **notes** と、既存コードから確度ラベル付きの仕様書を逆引き生成する **spec-extract** を収録しています。このディレクトリは単体利用向けの原本で、**software-pipeline・task-pipeline の両パイプラインにパイプライン連携版が統合済み**です。spec-extract は対話時に `[不明]/[推定]` を clarify で詰める「読むだけで終わらせない」運用と、一度作った SPEC.md を増分更新する「生きた仕様」運用に対応します。

### [`plan-mode/`](plan-mode/)
変更を一切加えず「実行計画」だけを作るスキル2種（Claude/Cline の Plan モード・Codex の Ask モード相当）。
ゴールから事実を集めて別セッション/エージェントがそのまま実行できる粒度の計画ファイルを書き出す **create-plan**、
導入先の文脈に合わせて計画の調整ポイントを較正する **create-plan-calibrate** を収録しています。コーディングに
限らず一般タスクに使え、不変要件（INV）と調整ポイント（ADJ）を `SPEC.md` で定義しています。非プラグインのため
`cp` でプロジェクトや `~/.claude/skills/` に入れて使います（このリポジトリ自身ではルート `.claude/` から直接利用可）。

### [`GlobalClaudeMD-sample/`](GlobalClaudeMD-sample/)
グローバルスコープ用 CLAUDE.md サンプル（`~/.claude/CLAUDE.md`）。
Think Before Coding・Simplicity First・Surgical Changes など、すべてのプロジェクトに共通する行動原則を定義したファイルです。

### [`software-pipeline/`](software-pipeline/)
7つの専門エージェントで機能開発を流れ作業化する「ソフトウェアパイプライン」テンプレート。
調査 → ストーリー → 技術ブリーフ → バックエンド → フロントエンド → 受け入れテスト → 最終検証を feature-pipeline スキルが連鎖実行し、3つの人間承認チェックポイントで停止します。**プラグイン2コマンドで導入可能**（上の「導入方法」参照）。対象リポジトリを解析してパイプライン一式を自動導入する **pipeline-setup** スキル、運用実績から定義を改善する **pipeline-improve** スキル（自己改善ループ）を含むスキル6種（implementation-skills 由来の notes / spec-extract パイプライン連携版を含む）・エージェント定義7種・機密コミットブロックフック・CLAUDE.md サンプルを収録しています。ビルダーが実装中の判断を `docs/pipeline/<slug>/implementation-notes.md` に記録し、レガシーコードには `/spec-extract` で仕様を固めてから導入できます。

### [`task-pipeline/`](task-pipeline/)
software-pipeline のパイプラインパターンをコード以外の成果物（drawio 図・ドキュメント・レポートなど）向けに汎用化した「タスクパイプライン」テンプレート。
調査 → 成果物要件 → 作業ブリーフ → 成果物作成 → レビューを task-pipeline スキルが連鎖実行し、3つの人間承認チェックポイントで停止します。ビルダーは drawio などユーザー導入スキルを呼び出せます。出力先・成果物の種類・利用可能スキルを検出して自動導入する **task-pipeline-setup** スキル、エージェント定義5種・出力ディレクトリ外への書き込みを確認するフック・CLAUDE.md サンプルを収録しています。implementation-skills 由来の **notes / spec-extract パイプライン連携版**（成果物仕様向けに読み替え）も同梱し、既存成果物・規約を SPEC.md に逆引きして整合性の土台にできます。**プラグイン1コマンドで導入可能**（上の「導入方法」参照）。

### [`codex-bridge/`](codex-bridge/)
コードレビュー・実装・相談を OpenAI Codex に依頼するスキル4種とサブエージェント3種。
ユーザー自身は Codex を操作せず、Claude Code が Codex CLI を**非対話モード（`codex exec`）**で
駆動します。`/codex-review`（差分/指定ファイルを Codex にレビューさせ重大度 P1–P4 で要約・read-only）、
`/codex-implement`（Codex にファイルを直接編集させ Claude が差分とテストを検証・workspace-write）、
`/codex-ask`（設計相談・セカンドオピニオンを Codex に答えさせ要約・read-only）を収録。実際の codex 実行は
サブエージェント（codex-reviewer / codex-implementer / codex-advisor）に委譲し、冗長な出力をメイン文脈から
隔離します。さらに **`/codex-agents`**（既存の Claude ルール CLAUDE.md 等を取り込んだ `AGENTS.md` を生成し、
Codex に同じルールを効かせる）と、**プラン承認で Codex 実装へ委譲する opt-in フック**を同梱。安全側を
既定にし（危険サンドボックスフラグ不使用）、git を使っていない環境でも動作します（フック/スクリプトは
bash 系のため Windows は Git Bash / WSL が必要・`jq` は不要）。**プラグイン1コマンドで導入可能**（上の「導入方法」参照）。

### [`ai-peer/`](ai-peer/)
セカンドオピニオン／ピア相談を依頼するスキル2種とサブエージェント2種。
**peer**（`/peer`）は内部 Claude サブエージェントで完結し、外部 CLI・git・ネットワークを一切使わずに
（依存ゼロ＝ロックダウン/オフライン/git なし環境でも動く）実装前のプランレビュー・ブレスト・汎用の
第二意見を返します。**ask-claude**（`/ask-claude`）は別の Claude を `claude` CLI で非対話・読み取り専用
（`--permission-mode plan`）に起動して独立見解を要約します。「相談相手」をエンジンで選べるよう、
依存の勾配（peer→ask-claude→〔Codex は codex-bridge〕）を明示しています。行レベルのコードレビューは
内蔵 `/code-review` や `/codex-review` に委譲し、peer は実装前と発想支援に軸足を置きます。**プラグイン
1コマンドで導入可能**（上の「導入方法」参照）。

### [`self-improve/`](self-improve/)
普通の単発セッションの訂正・繰り返し・行き詰まりから、スキル・CLAUDE.md・`.claude/rules`・hook・
エージェントを継続改善する **git 不要の自己改善ループ**。**improve-scan**（`/improve-scan`）が
トランスクリプト（と、あれば `~/.claude/knowledge/`）から改善の種を発見してローカル backlog に貯め、
**improve-apply**（`/improve-apply`）が判定 → 品質ゲート（self-review／任意で peer・ask-claude／公式
スキルガイド検証／サニタイズ）→ **1件ずつ承認** → 適用（`.bak`・差分ロールバック）→ kb へ記録、まで
通します。GitHub Issue/PR は使わずローカル完結し、改善候補を検出・通知する SessionStart/SessionEnd
フックも同梱（「検出/通知は自動・本体は手動」）。`pipeline-improve`（パイプライン前提）・`kb-harvest`
（メモを貯めるだけ）との住み分けを README で明示しています。**プラグイン1コマンドで導入可能**。

### [`knowledge-share/`](knowledge-share/)
セッション/リポジトリ横断のナレッジ共有テンプレート。
複数セッション・複数リポジトリで解決した知見（エラー対処・ハマりどころ）が揮発する問題を、Claude Code の公式機能だけで解決します。ユーザーメモリ＋ **@import** で知見インデックスを全セッションに自動読み込みし、ユーザーレベルスキル **kb**（記録・検索・昇格）・**kb-harvest**（過去トランスクリプトからの採掘）、SessionEnd / SessionStart フックによる回収キューと未回収通知を組み合わせます。構造は公式の自動メモリ（インデックス＋トピック分割・200行/25KB 予算）に揃えた「リポジトリ横断版」です。**プラグイン1コマンドで導入可能**（上の「導入方法」参照）なほか、`@import` ベースで入れたい場合は冪等な `install.sh` も使えます。他セクションに依存せず単体で完結します（フック・スクリプトは bash 系のため Windows は Git Bash / WSL が必要）。

### [`token-usage-tracker/`](token-usage-tracker/)
AIコーディングエージェントのトークン消費トラッカー（独立 Python ツール）。
Claude Code・Codex・Cline がローカルに残すログを解析し、**リポジトリ／タスク／モデル／ツール別**にトークン・コストを集計・可視化します。Azure AI Foundry 経由でも追加連携なしで集計でき、CLI 集計表とローカル Web ダッシュボード（Streamlit）を提供します。パッケージ管理は uv、開発は TDD。現状 Claude Code に対応済み（Codex / Cline は今後）。設計の参考に ccusage / tokscale を参照しています（コードのコピーはなし）。

### [`power-automate-azure-foundry/`](power-automate-azure-foundry/)
Power Automate のクラウドフローから Azure AI Foundry（Azure OpenAI）の GPT を呼び出すサンプル一式。
**テキストのみ**と**画像＋テキスト（Vision）**の2パターンのフロー定義、インポート用の**レガシーパッケージ zip** と **Dataverse ソリューション zip**、**カスタムコネクタ**定義を収録し、最終形として「PowerApps でカメラ撮影 → Automate 経由で GPT に送って OCR」まで通せます。認証は API Key。鍵を安全に扱う3方式（HTTP ヘッダー直書き／カスタムコネクタ／環境変数）の比較、DLP ポリシー下で開けるべきコネクタ、Secure Inputs/Outputs などのセキュリティ解説付き。

## ライセンス・出典

このリポジトリは [MIT License](LICENSE) で公開しています。

一部のセクションは外部の成果物を参考にしており、それぞれ以下のとおり権利関係を明記しています。

| セクション | 参考元 | ライセンス・扱い |
|-----------|--------|----------------|
| [`GlobalClaudeMD-sample/`](GlobalClaudeMD-sample/) | [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) | MIT License — 由来部分の帰属と MIT 全文をファイル内に記載 |
| [`GlobalClaudeMD-sample/`](GlobalClaudeMD-sample/) | [Qiita 記事（4q_sano 氏）](https://qiita.com/4q_sano/items/f313eed59628273b8026) | 著作権は 4q_sano 氏に帰属 — 著作権法第32条に基づく引用・要約 |
| [`data-science/`](data-science/) | [Zenn 記事](https://zenn.dev/green_tea/articles/d310e5cf809190)・[atsushi-green/ds-ai-coding-skills](https://github.com/atsushi-green/ds-ai-coding-skills) | 記事のコンセプトに基づく独自実装（コピーではない）— 帰属を README に記載 |
| [`skills-guide/`](skills-guide/) | [anthropics/skills](https://github.com/anthropics/skills)・[obra/superpowers](https://github.com/obra/superpowers)・[mattpocock/skills](https://github.com/mattpocock/skills) | リンクと独自解説のみ収録。各スキル本体は各リポジトリのライセンス（anthropics/skills は Apache 2.0 + 一部 source-available）に従う |
| [`software-pipeline/`](software-pipeline/) | [How to Build a Software Factory with Claude Code（@sairahul1 氏）](https://x.com/sairahul1/status/2058832033628241931) | 記事のコンセプトに基づく独自実装（コピーではない）— 帰属を README に記載 |
| [`task-pipeline/`](task-pipeline/) | [How to Build a Software Factory with Claude Code（@sairahul1 氏）](https://x.com/sairahul1/status/2058832033628241931) | 記事のコンセプトをコード以外の成果物向けに汎用化した独自実装（コピーではない）— 帰属を README に記載 |
| [`token-usage-tracker/`](token-usage-tracker/) | [ryoppippi/ccusage](https://github.com/ryoppippi/ccusage)・[junhoyeo/tokscale](https://github.com/junhoyeo/tokscale) | いずれも MIT License — 設計（JSONL パース・コスト計算・集計軸）のみ参考にした独自実装（コードのコピーではない） |
| [`codex-bridge/`](codex-bridge/) | [eddiearc/codex-delegator](https://github.com/eddiearc/codex-delegator)・[hamelsmu/claude-review-loop](https://github.com/hamelsmu/claude-review-loop)・[OpenAI Codex CLI ドキュメント](https://developers.openai.com/codex/) | 構成・プロンプト型のコンセプトを参考にした独自実装（コードのコピーではない） |
| [`ai-peer/`](ai-peer/) | [hiroro-work/claude-plugins](https://github.com/hiroro-work/claude-plugins) | `peer`（内部サブエージェント完結）・`ask-*`（他 AI に第二意見を聞く）のコンセプトを参考にした独自実装（コードのコピーではない） |
| [`self-improve/`](self-improve/) | [TerenceBristol/claude-improve](https://github.com/TerenceBristol/claude-improve)・[accidentalrebel/claude-skill-session-retrospective](https://github.com/accidentalrebel/claude-skill-session-retrospective)・[takiko 氏 Zenn 記事](https://zenn.dev/takiko/articles/claude-code-skill-from-logs)・[toarusyakaijin 氏 Qiita 記事](https://qiita.com/toarusyakaijin/items/60cc81bcced532963e6a) | 記事/スキルのコンセプト（シグナル検出・ログからのスキル化6フェーズ・skills-evolve/learn 等）を参考にした独自実装（コードのコピーではない） |
| 仕様駆動開発まわりの解説（本 README の早見表） | [「1 Todo=1 Commit=1 Spec Update」（Zenn / Luup Developers）](https://zenn.dev/luup_developers/articles/server-jang-20251215)・[「SPEC駆動開発ツール比較」（Qiita / kanagawa41 氏）](https://qiita.com/kanagawa41/items/ef134490b61b41675e01) | 記事のコンセプト・比較観点を参考にした独自解説（コードのコピーではない）— 帰属を本表に記載 |
