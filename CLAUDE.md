# CLAUDE.md — claude-code-workbench-ja リポジトリ

このファイルはリポジトリ自体を操作する際に Claude Code に読み込まれます。

---

## このリポジトリについて

Claude Code をより快適に使うためのスクリプト・テンプレート・ベストプラクティスを集めたリポジトリです。
各セクションはそれぞれ独立しており、ユーザーが必要な部分だけコピーして自分のプロジェクトで使うことを想定しています。

Claude Code のテーマから外れる独立ツール・サンプルは別リポジトリに分割している:
- [power-automate-azure-foundry](https://github.com/mrkxlia/power-automate-azure-foundry) — Power Automate から Azure AI Foundry (GPT) を呼ぶサンプル一式
- [token-usage-tracker](https://github.com/mrkxlia/token-usage-tracker) — AIエージェントのトークン消費トラッカー

---

## ディレクトリ構成

トップレベルは **plugins/**（プラグイン導入可能な9セクション）・**templates/**（コピーして使うテンプレート4種）・
**tools/**（独立ツール・CC資産の配布パイプライン）・**docs/**（リポジトリ内ドキュメント）の4分類。
ルートの `.claude/` と `.claude-plugin/` は分類対象外（規約1の例外、現位置維持）。

```
claude-code-workbench-ja/
├── README.md                        # リポジトリ全体の概要（日本語）
├── CLAUDE.md                        # このファイル
├── LICENSE                          # MIT License
├── .gitattributes                   # git 属性定義
├── .claude-plugin/
│   └── marketplace.json             # プラグインマーケットプレイス定義（名前: workbench-ja、source は ./plugins/<name>）
├── .claude/                         # このリポジトリ自身の作業用スキル（dogfooding・規約1の例外）
│   └── skills/                      #   create-plan（SPEC.md 同梱）/ create-plan-calibrate（templates/plan-mode 由来・非競合のみ集約）
├── plugins/                         # プラグイン導入可能な9セクション（marketplace.json 登録対象・公式標準レイアウト）
│   ├── software-pipeline/           #   7エージェント構成「ソフトウェアパイプライン」テンプレート
│   │   ├── README.md
│   │   ├── CLAUDE.md                #     コピーして使う CLAUDE.md サンプル
│   │   ├── .claude-plugin/plugin.json
│   │   ├── skills/                  #     7種（clarify / notes / spec-extract パイプライン連携版・pipeline-improve 含む）
│   │   ├── agents/                  #     7種
│   │   ├── hooks/                   #     3種（block-secrets-commit・並列共有衝突を確認する guard-builder-writes・spec-sync-reminder。導入先へコピーする資材＝非自動配線）
│   │   └── setup/settings.json      #     コピー導入用テンプレート
│   ├── task-pipeline/               #   汎用5エージェント構成「タスクパイプライン」テンプレート（コード以外の成果物向け）
│   │   ├── README.md
│   │   ├── CLAUDE.md                #     コピーして使う CLAUDE.md サンプル
│   │   ├── .claude-plugin/plugin.json
│   │   ├── skills/                  #     5種（task-pipeline / clarify / task-pipeline-setup / notes・spec-extract パイプライン連携版）
│   │   ├── agents/                  #     5種
│   │   ├── hooks/                   #     guard-deliverable-writes・spec-sync-reminder（導入先へコピーする資材＝非自動配線）
│   │   └── setup/settings.json      #     コピー導入用テンプレート
│   ├── codex-bridge/                #   Codex にレビュー・実装・相談を依頼するスキル＆エージェント
│   │   ├── README.md
│   │   ├── .claude-plugin/plugin.json
│   │   ├── skills/                  #     4種（codex-review / codex-implement / codex-ask / codex-agents）
│   │   ├── agents/                  #     3種（codex-reviewer / codex-implementer / codex-advisor）
│   │   └── hooks/                   #     hooks.json（gen-agents-md＝プラグイン導入で自動ON）/ plan-to-codex.sh（opt-in・手動配線）
│   ├── kiro-bridge/                 #   Kiro にレビュー・相談を依頼するスキル＆エージェント（read-only 専用）
│   │   ├── README.md
│   │   ├── .claude-plugin/plugin.json
│   │   ├── skills/                  #     2種（kiro-review / kiro-ask）
│   │   └── agents/                  #     2種（kiro-reviewer / kiro-advisor）
│   ├── ai-peer/                     #   ピア相談・セカンドオピニオンを依頼するスキル＆エージェント
│   │   ├── README.md
│   │   ├── .claude-plugin/plugin.json
│   │   ├── skills/                  #     2種（peer=内部・依存ゼロ / ask-claude=claude CLI）
│   │   └── agents/                  #     2種（peer-engineer / claude-advisor）
│   ├── agent-review-panel/          #   複数ペルソナの敵対的パネルレビュー（codex / kiro 混成 opt-in）
│   │   ├── README.md
│   │   ├── .claude-plugin/plugin.json
│   │   ├── skills/                  #     1種（review-panel＋personas.md / report-template.md）
│   │   └── agents/                  #     5種（panel-reviewer / panel-codex / panel-kiro / panel-verifier / panel-judge）
│   ├── self-improve/                #   git 不要の自己改善ループ（発見→承認制で適用）
│   │   ├── README.md
│   │   ├── RESEARCH.md              #     関連研究・他実装の調査ノート（論文・OSS 比較）
│   │   ├── .claude-plugin/plugin.json
│   │   ├── skills/                  #     2種（improve-scan / improve-apply）
│   │   ├── hooks/                   #     hooks.json（検出/通知＝プラグイン導入で自動ON）
│   │   └── setup/settings.json      #     手動導入時の登録サンプル
│   ├── knowledge-share/             #   セッション/リポジトリ横断ナレッジ共有テンプレート
│   │   ├── README.md
│   │   ├── install.sh               #     ~/.claude/ への冪等インストーラ（@import ベース導入用）
│   │   ├── templates/index.md       #     ナレッジ・インデックスの初期テンプレート
│   │   ├── bin/kb-extract-candidates.sh
│   │   ├── .claude-plugin/plugin.json
│   │   ├── skills/                  #     2種（kb / kb-harvest）
│   │   ├── hooks/                   #     hooks.json（SessionStart/SessionEnd＝プラグイン導入で自動ON）
│   │   └── setup/settings.json      #     手動導入時の登録サンプル
│   └── model-setup/                 #   モデル運用テンプレート（旧名 sonnet-setup。Opus 4.8 + Sonnet 5 / Sonnet 単独の2プロファイル、9ルール＋追補＋スキル6種＋エージェント3種）
│       ├── README.md
│       ├── CLAUDE.md                #     コピペ用テンプレート本体（9つの行動ルール・共通基盤）
│       ├── CLAUDE.private.md        #     プロファイル追補（Opus+Sonnet・私用PC）ルール10〜14
│       ├── CLAUDE.company.md        #     プロファイル追補（Sonnet単独・会社PC）ルール10〜15
│       ├── MODEL-GUIDE.md           #     モデル仕様・effort選定・プロファイル・Fable 5 パリティマップ
│       ├── settings.private.json    #     私用PC向け設定サンプル（opusplan + xhigh）
│       ├── settings.company.json    #     会社PC向け設定サンプル（sonnet + xhigh）
│       ├── .claude-plugin/plugin.json
│       ├── skills/                  #     6種（task-brief / backlog-loop / pr-merge / fan-out / long-run / verify-fresh）
│       └── agents/                  #     3種（task-worker / fresh-verifier / bulk-scanner）
├── templates/                       # コピーして使うテンプレート（プラグイン非対応・marketplace.json 未登録）
│   ├── data-science/                #   データサイエンス向け CLAUDE.md + Skills テンプレート
│   │   ├── CLAUDE.md
│   │   ├── README.md
│   │   └── .claude/skills/          #     10種のスキルファイル
│   ├── implementation-skills/       #   実装ノート記録 + 仕様書逆引きスキル（単体利用向け原本。連携版を software/task 両パイプラインに同梱）
│   │   ├── README.md
│   │   └── .claude/skills/          #     notes / spec-extract の2スキル（原本）
│   ├── plan-mode/                   #   変更せず実行計画だけ作る create-plan スキル（Plan/Ask モード相当）
│   │   ├── README.md
│   │   └── .claude/skills/          #     create-plan（不変要件 INV / 調整 ADJ を定義する SPEC.md 同梱）/ create-plan-calibrate の2スキル
│   └── global-claude-md-sample/     #   グローバルスコープ用 CLAUDE.md サンプル（旧名 GlobalClaudeMD-sample）
│       ├── README.md
│       └── CLAUDE.md
├── tools/                           # 独立ツール・CC資産の配布パイプライン
│   ├── multi-model-dist/            #   CC 資産を Codex/Kiro へ配布（原本不変・生成＝Track A／SPEC 再実装＝Track B）
│   │   ├── README.md / MAPPING.md   #     対応表・ティア監査・配置パス確定・本文用語写像
│   │   ├── generators/              #     単一パイプライン（bin/export.sh・lib/convert.py＋serializers/・作業用 export スキル）
│   │   ├── examples/                #     生成結果ゴールデン（build/・dist/ は .gitignore）
│   │   └── reimpl/                  #     Track B（SPEC 共有→各ツール再実装）※段階導入
│   └── skill-sync/                  #   リポジトリ内の複製スキル/フックを原本から機械生成（sync.py・fragments/）
│       ├── sync.py                  #     原本→派生を生成／--check で CI 検証
│       └── fragments/               #     notes・spec-extract のパイプライン連携セクション（単一ソース）
└── docs/                            # リポジトリ内ドキュメント置き場
    ├── README.md
    ├── pipeline-spec-alignment-proposal.html  #   パイプラインと仕様整合の提案資料
    └── skills-guide/                #   おすすめSkillsガイド（優先度・業務タイプ別）
        └── README.md
```

---

## このリポジトリの規約

1. **トップレベルは plugins/・templates/・tools/・docs/ の4分類、セクションはディレクトリ単位で管理する** — 新しいセクションを追加する場合、プラグイン導入可能なら `plugins/`、コピーして使うテンプレートなら `templates/`、独立ツールや配布パイプラインなら `tools/` に専用ディレクトリを作り、ルート直下にファイルを置かない。
2. **各ディレクトリには README.md を置く** — セクションの目的・使い方・ファイル構成を説明する README.md を必ず用意する。
3. **リポジトリ全体の言語は日本語** — README.md・CLAUDE.md など、このリポジトリ自体のドキュメントは日本語で記述する。
4. **マーケットプレイス定義はルートの `.claude-plugin/` に置く** — Claude Code プラグイン仕様上の必須配置であり、規約1の例外。
5. **プラグイン配下を変更したら version を上げる（plugin.json のみに書く）** — `plugins/` 配下の9プラグイン（software-pipeline・task-pipeline・knowledge-share・codex-bridge・kiro-bridge・ai-peer・agent-review-panel・self-improve・model-setup）の配信対象ファイル（`skills/`・`agents/`・`hooks/` 配下。これらは既定探索パスのためプラグイン導入で自動配信される）を変更したら、該当する `plugins/<name>/.claude-plugin/plugin.json` の `version` をセマンティックバージョニングで更新する。**version は plugin.json のみに書く**（`.claude-plugin/marketplace.json` 側には書かない — plugin.json が優先されるため二重管理は非推奨、公式仕様）。CLAUDE.md サンプル・`setup/settings.json` は setup スキルがコピー配布するため version 対象外。
6. **ルートの `.claude/` はこのリポジトリ自身の作業用（dogfooding）** — 規約1の例外（`.claude-plugin/` と同様）。公式慣例「`.claude/` は単一プロジェクト自身のカスタマイズ用」に従い、**競合しない・非プラグインの**スキルだけを集約する（現状は templates/plan-mode 由来の create-plan / create-plan-calibrate）。プラグイン由来スキルや競合名スキル（notes / spec-extract / clarify）は複製しない（version 二重管理・二重ロードを避けるため）。**リポジトリ内で重複管理している派生ファイル（notes・spec-extract の両パイプライン連携版、software-pipeline の clarify → task-pipeline、templates/plan-mode の create-plan・create-plan-calibrate → root `.claude/skills/`、software-pipeline の spec-sync-reminder.{sh,ps1} → task-pipeline）は `tools/skill-sync/sync.py` が原本から機械生成する**。原本または `tools/skill-sync/fragments/*.md`（パイプライン連携セクション本文）のみを編集し、`python3 tools/skill-sync/sync.py` を実行して派生を更新する（`--check` は CI で使う検証専用モード）。派生ファイル自体を直接編集しない（先頭の `SYNCED by tools/skill-sync` 注記がその旨を明示する）。
7. **プラグインの skills/agents/hooks は公式標準レイアウト（プラグインルート直下）に置く** — `<plugin>/skills/`・`<plugin>/agents/`・`<plugin>/hooks/hooks.json` が既定探索パスであり、plugin.json に `skills`/`hooks` フィールドを明示しない（宣言と実体の二重管理を避ける）。コピー導入用の `settings.json` サンプルはプラグインルート直下に置けない（Claude Code の予約パス）ため `<plugin>/setup/settings.json` に置く。software-pipeline・task-pipeline の `hooks/` は導入先リポジトリへコピーする資材であり、この配置自体はプラグインとして自動発火しない（pipeline-setup が対象リポジトリの `.claude/hooks/` へコピーし `.claude/settings.json` に配線する）。

---

## 重要: ファイルはテンプレート・サンプルとして扱うこと

このリポジトリに含まれるファイル（`templates/data-science/CLAUDE.md`、`templates/global-claude-md-sample/CLAUDE.md`、各スキルファイルなど）は、**ユーザーが自分のプロジェクトにコピーして使うためのテンプレート・サンプル**です。

このリポジトリ自体の開発にそのまま適用しない。たとえば `templates/global-claude-md-sample/CLAUDE.md` はグローバル設定のサンプルであり、このリポジトリの開発ルールではありません。
