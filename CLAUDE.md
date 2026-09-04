# CLAUDE.md — claude-code-workbench-ja リポジトリ

このファイルはリポジトリ自体を操作する際に Claude Code に読み込まれます。

---

## このリポジトリについて

Claude Code をより快適に使うためのスクリプト・テンプレート・ベストプラクティスを集めたリポジトリです。
各セクションはそれぞれ独立しており、ユーザーが必要な部分だけコピーして自分のプロジェクトで使うことを想定しています。

Claude Code のテーマから外れる独立ツール・サンプルは別リポジトリに分割している:
- [power-automate-azure-foundry](https://github.com/mrkxlia/power-automate-azure-foundry) — Power Automate から Azure AI Foundry (GPT) を呼ぶサンプル一式

---

## ディレクトリ構成

トップレベルは **plugins/**（プラグイン導入可能な5セクション）・**docs/**（リポジトリ内ドキュメント）の2分類。
コピーして使うテンプレートや独立ツールが増えたら `templates/`・`tools/` を追加する（規約1）。
ルートの `.claude-plugin/` は分類対象外（規約1の例外、現位置維持）。

```
claude-code-workbench-ja/
├── README.md                        # リポジトリ全体の概要（日本語）
├── CLAUDE.md                        # このファイル
├── LICENSE                          # MIT License
├── .gitattributes                   # git 属性定義
├── .github/workflows/ci.yml         # CI（JSON 構文検証・SKILL.md 形式検査＝必須、claude plugin validate＝任意）
├── .claude-plugin/
│   └── marketplace.json             # プラグインマーケットプレイス定義（名前: workbench-ja、source は ./plugins/<name>）
├── plugins/                         # プラグイン導入可能な5セクション（marketplace.json 登録対象・公式標準レイアウト）
│   ├── pipeline/                    #   コード開発（feature-pipeline）と成果物作成（task-pipeline）を統合したパイプラインテンプレート
│   │   ├── README.md
│   │   ├── CLAUDE.md                #     コピーして使う CLAUDE.md サンプル（コードモード）
│   │   ├── CLAUDE.task.md           #     コピーして使う CLAUDE.md サンプル（成果物モード）
│   │   ├── .claude-plugin/plugin.json
│   │   ├── skills/                  #     7種（feature-pipeline / task-pipeline / pipeline-setup〔モード選択・references 分冊。spec-summary.md に SPEC 抽出規則〕/ build-with-tests / pipeline-improve / clarify / notes）
│   │   ├── agents/                  #     8種（共有4: researcher / requirements-writer / brief-writer / final-reviewer＋コード専用3: backend/frontend-builder / test-verifier＋成果物専用1: deliverable-builder）
│   │   ├── hooks/                   #     6種（block-secrets-commit・guard-builder-writes・guard-deliverable-writes・guard-builder-paths・inject-spec-summary・spec-sync-reminder。導入先へコピーする資材＝非自動配線）
│   │   └── setup/settings.json      #     コピー導入用テンプレート（setup がモードに応じて guard を絞る）
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
│   ├── agent-review-panel/          #   複数ペルソナの敵対的パネルレビュー（codex / kiro 混成 opt-in）
│   │   ├── README.md
│   │   ├── .claude-plugin/plugin.json
│   │   ├── skills/                  #     1種（review-panel＋personas.md / report-template.md）
│   │   └── agents/                  #     5種（panel-reviewer / panel-codex / panel-kiro / panel-verifier / panel-judge）
│   └── model-setup/                 #   モデル運用テンプレート（旧名 sonnet-setup。Opus 5 + Sonnet 5 / Sonnet 単独の2プロファイル、9ルール＋追補＋スキル6種＋エージェント3種）
│       ├── README.md
│       ├── CLAUDE.md                #     コピペ用テンプレート本体（9つの行動ルール・共通基盤）
│       ├── CLAUDE.private.md        #     プロファイル追補（Opus+Sonnet・私用PC）ルール10〜14
│       ├── CLAUDE.company.md        #     プロファイル追補（Sonnet単独・会社PC）ルール10〜15
│       ├── MODEL-GUIDE.md           #     モデル仕様・effort選定・プロファイル・Fable 5.1 パリティマップ・AIDLC 簡易版・Fable 本人にやらせる仕事
│       ├── PROMPTS.md               #     都度貼りプロンプト集（Plan モード用初回テンプレート・公式スニペット翻案）
│       ├── settings.private.json    #     私用PC向け設定サンプル（opusplan + xhigh）
│       ├── settings.company.json    #     会社PC向け設定サンプル（sonnet + xhigh）
│       ├── .claude-plugin/plugin.json
│       ├── skills/                  #     6種（task-brief / backlog-loop / pr-merge / fan-out / long-run / verify-fresh）
│       ├── agents/                  #     3種（task-worker / fresh-verifier / bulk-scanner）
│       └── hooks/                  #     reinject-brief（long-run の frontmatter が起動時だけ登録する opt-in。常時発火しない）
└── docs/                            # リポジトリ内ドキュメント置き場
    ├── README.md
    ├── decisions/                   #   日付つきの決定記録・監査記録（追記のみ。覆すときは新記録を足す）
    │   ├── 2026-09-03-fable-5-1-audit.md                      # Fable 5.1 自身による model-setup 監査
    │   └── 2026-09-03-long-run-constraints-and-spec-load.md  # 序盤制約の保持・SPEC.md 必須ロードの構造解
    ├── lessons.md                   #   過去 PR から蒸留した「繰り返さない判断」（根拠の PR 番号つき）
    ├── backlog-2026-09.md           #   Sonnet/Opus 実行用ブリーフ（完了条件・検証方法つき）
    ├── pipeline-spec-alignment-proposal.html  #   パイプラインと仕様整合の提案資料（歴史的決定記録）
    └── skills-guide/                #   おすすめSkillsガイド（優先度・業務タイプ別）
        └── README.md
```

---

## このリポジトリの規約

1. **トップレベルは plugins/・docs/（＋将来追加しうる templates/・tools/）の分類、セクションはディレクトリ単位で管理する** — 新しいセクションを追加する場合、プラグイン導入可能なら `plugins/`、コピーして使うテンプレートなら `templates/`、独立ツールや配布パイプラインなら `tools/` に専用ディレクトリを作り、ルート直下にファイルを置かない（現状 `templates/`・`tools/` は対象セクションが無いため存在しない）。
2. **各ディレクトリには README.md を置く** — セクションの目的・使い方・ファイル構成を説明する README.md を必ず用意する。
3. **リポジトリ全体の言語は日本語** — README.md・CLAUDE.md など、このリポジトリ自体のドキュメントは日本語で記述する。
4. **マーケットプレイス定義はルートの `.claude-plugin/` に置く** — Claude Code プラグイン仕様上の必須配置であり、規約1の例外。
5. **プラグイン配下を変更したら version を上げる（plugin.json のみに書く）** — `plugins/` 配下の5プラグイン（pipeline・codex-bridge・kiro-bridge・agent-review-panel・model-setup）の配信対象ファイル（`skills/`・`agents/`・`hooks/` 配下。これらは既定探索パスのためプラグイン導入で自動配信される）を変更したら、該当する `plugins/<name>/.claude-plugin/plugin.json` の `version` をセマンティックバージョニングで更新する。**version は plugin.json のみに書く**（`.claude-plugin/marketplace.json` 側には書かない — plugin.json が優先されるため二重管理は非推奨、公式仕様）。CLAUDE.md / CLAUDE.task.md サンプル・`setup/settings.json` は setup スキルがコピー配布するため version 対象外。
6. **プラグインの skills/agents/hooks は公式標準レイアウト（プラグインルート直下）に置く** — `<plugin>/skills/`・`<plugin>/agents/`・`<plugin>/hooks/hooks.json` が既定探索パスであり、plugin.json に `skills`/`hooks` フィールドを明示しない（宣言と実体の二重管理を避ける）。コピー導入用の `settings.json` サンプルはプラグインルート直下に置けない（Claude Code の予約パス）ため `<plugin>/setup/settings.json` に置く。pipeline の `hooks/` は導入先リポジトリへコピーする資材であり、この配置自体はプラグインとして自動発火しない（pipeline-setup が対象リポジトリの `.claude/hooks/` へコピーし `.claude/settings.json` に配線する）。

---

## 重要: ファイルはテンプレート・サンプルとして扱うこと

このリポジトリに含まれるファイル（`plugins/pipeline/CLAUDE.md`、各スキルファイルなど）は、**ユーザーが自分のプロジェクトにコピーして使うためのテンプレート・サンプル**です。

このリポジトリ自体の開発にそのまま適用しない。たとえば各パイプラインの `CLAUDE.md` サンプルは導入先リポジトリ用であり、このリポジトリの開発ルールではありません。
