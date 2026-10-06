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

トップレベルは **plugins/**（プラグイン導入可能な9セクション）・**tools/**（独立ツール）・**docs/**（リポジトリ内ドキュメント）の3分類。
コピーして使うテンプレートが増えたら `templates/` を追加する（規約1）。
ルートの `.claude-plugin/` は分類対象外（規約1の例外、現位置維持）。

```
claude-code-workbench-ja/
├── README.md                        # リポジトリ全体の概要（日本語）
├── CLAUDE.md                        # このファイル
├── LICENSE                          # MIT License
├── .gitattributes                   # git 属性定義
├── .github/workflows/ci.yml         # CI（JSON 構文・SKILL.md 形式〔公式準拠: 許可キー・1024字・三人称・references 1階層と目次・自動発火スキルの description 合計の予算〕・agent frontmatter〔description 合計の予算〕・shellcheck・.ps1 の BOM・version 差分・内部リンク＝必須、claude plugin validate＝任意）
├── .claude-plugin/
│   └── marketplace.json             # プラグインマーケットプレイス定義（名前: workbench-ja、source は ./plugins/<name>）
├── plugins/                         # プラグイン導入可能な9セクション（marketplace.json 登録対象・公式標準レイアウト）
│   ├── pipeline/                    #   コード開発（feature-pipeline）と成果物作成（task-pipeline）を統合したパイプラインテンプレート
│   │   ├── README.md
│   │   ├── CLAUDE.md                #     コピーして使う CLAUDE.md サンプル（コードモード）
│   │   ├── CLAUDE.task.md           #     コピーして使う CLAUDE.md サンプル（成果物モード）
│   │   ├── .claude-plugin/plugin.json
│   │   ├── skills/                  #     7種（feature-pipeline / task-pipeline / pipeline-setup〔モード選択・references 分冊。spec-summary.md に SPEC 抽出規則〕/ pipeline-improve / clarify / notes / design-docs〔設計書5フェーズの章立て。references 分冊: templates / consistency〕）
│   │   ├── agents/                  #     9種（共有4: researcher / requirements-writer / brief-writer / final-reviewer＋コード専用3: backend/frontend-builder / test-verifier＋成果物専用2: deliverable-builder / design-doc-checker）
│   │   ├── hooks/                   #     6種（block-secrets-commit・guard-builder-writes・guard-deliverable-writes・guard-builder-paths・inject-spec-summary・spec-sync-reminder。導入先へコピーする資材＝非自動配線）
│   │   └── setup/settings.json      #     コピー導入用テンプレート（setup がモードに応じて guard を絞る）
│   ├── cli-bridge/                  #   外部 AI コーディング CLI（Codex・Kiro）への相談・レビュー委譲（read-only 専用。旧 codex-bridge ＋ 旧 kiro-bridge）
│   │   ├── README.md
│   │   ├── .claude-plugin/plugin.json
│   │   ├── skills/                  #     3種（codex-ask / kiro-review / kiro-ask。レビュー・実装の委譲は公式 openai/codex-plugin-cc、AGENTS.md は @AGENTS.md import に任せる）
│   │   ├── agents/                  #     3種（codex-advisor / kiro-reviewer / kiro-advisor。いずれも read-only）
│   │   └── hooks/                   #     plan-review-codex.sh（プラン提示前レビュー・opt-in・手動配線。常時発火のフックは持たない）
│   ├── agent-review-panel/          #   複数ペルソナの敵対的パネルレビュー（codex / kiro 混成 opt-in。反グループシンク機構7つ）
│   │   ├── README.md
│   │   ├── .claude-plugin/plugin.json
│   │   ├── skills/                  #     1種（review-panel＋references/{personas,report-template}.md）
│   │   └── agents/                  #     5種（panel-reviewer / panel-codex / panel-kiro / panel-verifier / panel-judge）
│   ├── adoption-review/             #   外部の技術・OSS・論文・Xポスト等を Web の一次情報から敵対的に評価し採用可否を判定
│   │   ├── README.md
│   │   ├── .claude-plugin/plugin.json
│   │   ├── skills/                  #     1種（adoption-review＋references/source-checklists.md〔対象種別ごとの確認項目・条件付き分冊〕）
│   │   └── agents/                  #     2種（adoption-researcher〔証拠収集・並列・read-only〕/ adoption-challenger〔採用しない論拠だけを作る敵対役。肯定寄りのときだけ起動〕）
│   ├── codebase-setup/              #   大規模リポジトリの地図（codebase-map）＋参画した案件の人間向けキャッチアップ（足場は公式 Monorepos and large repos、棚卸しは /doctor prompt-audit へ委譲）
│   │   ├── README.md
│   │   ├── .claude-plugin/plugin.json
│   │   ├── skills/                  #     2種（codebase-map / project-catchup〔悪い例・良い例で具体度を縛り図を必須化。references 分冊: stack-probes / interview〕）
│   │   └── agents/                  #     2種（subtree-surveyor〔面の調査〕/ flow-tracer〔線の調査〕。いずれも read-only。フックは持たない）
│   ├── model-setup/                 #   モデル運用テンプレート（旧名 sonnet-setup。Opus+Sonnet / Sonnet 単独の2プロファイル、公式ガイドに無い4ルール＋追補＋スキル2種＋エージェント1種）
│   │   ├── README.md
│   │   ├── CLAUDE.md                #     コピペ用テンプレート本体（4つの行動ルール。公式スニペットは原文で貼る）
│   │   ├── CLAUDE.private.md        #     プロファイル追補（Opus+Sonnet・私用PC）ルール5〜6
│   │   ├── CLAUDE.company.md        #     プロファイル追補（Sonnet単独・会社PC）ルール5〜6
│   │   ├── MODEL-GUIDE.md           #     プロファイル・エスカレーション・Fable 5.1 パリティマップ・AIDLC 簡易版（公式情報はリンクのみ）
│   │   ├── PROMPTS.md               #     都度貼りプロンプト（Plan モード用初回テンプレート・テストの棚卸し・AI レビューが収束しないとき）
│   │   ├── settings.private.json    #     私用PC向け設定サンプル（opusplan。effort は書かない — MODEL-GUIDE §2）
│   │   ├── settings.company.json    #     会社PC向け設定サンプル（sonnet。effort は書かない — MODEL-GUIDE §2）
│   │   ├── .claude-plugin/plugin.json
│   │   ├── skills/                  #     2種（verify-fresh / pr-merge）
│   │   └── agents/                  #     1種（fresh-verifier）
│   ├── self-correct/                #   自己修正ループ（作る役と検査する役を分離し、FAIL 箇所だけ直して再検査する）
│   │   ├── README.md
│   │   ├── CLAUDE.md                #     コピーして使う CLAUDE.md サンプル（行動ルール・停止ルール）
│   │   ├── .claude-plugin/plugin.json
│   │   ├── skills/                  #     3種（self-correct〔references 分冊: ground-truth / criteria / handoff〕/ judge-eval / self-correct-setup〔明示専用〕）
│   │   ├── agents/                  #     3種（loop-builder / loop-judge〔Edit・Write を持たない〕/ judge-auditor）
│   │   ├── hooks/                   #     2種（loop-stop-check〔Stop〕・guard-ground-truth〔PreToolUse〕。hooks.json で自動配線・状態ファイルが ACTIVE のときだけ効く）
│   │   └── setup/settings.json      #     コピー導入用のフック配線サンプル
│   ├── feedback-rules/              #   指摘を1指摘1ファイルで永続化し、指摘回数（count）で強制力を段階的に上げる
│   │   ├── README.md
│   │   ├── .claude-plugin/plugin.json
│   │   ├── skills/                  #     3種（feedback-rule〔references 分冊: rule-format〕/ feedback-audit / feedback-setup〔明示専用〕）
│   │   ├── agents/                  #     1種（feedback-auditor。read-only・提案のみ）
│   │   ├── hooks/                   #     3種の入口（hooks.json で自動配線。feedback-hook.sh がシム、feedback_rules.py が本体。ルールが無ければ素通り）
│   │   └── setup/settings.json      #     コピー導入用のフック配線サンプル
│   └── learning-coach/              #   人間の側の理解を作る学習コーチ（教師役・3層チェックリスト・クイズで実証）
│       ├── README.md
│       ├── .claude-plugin/plugin.json
│       └── skills/                  #     1種（deep-understand。エージェント・フックは持たない）
├── tools/                           # 独立ツール（プラグインとして配布しない単体スクリプト）
│   ├── README.md
│   └── progress/                    #   各スキルの状態ファイル（pipeline status.md・self-correct state.json）を読み、進み具合を statusline と .dashboard/index.html に出す（LLM なし・Python 標準ライブラリのみ）
│       ├── README.md
│       └── progress.py
└── docs/                            # リポジトリ内ドキュメント置き場
    ├── README.md
    ├── decisions/                   #   日付つきの決定記録（現行コードの理由になっているものだけ残す。一覧と残す基準は docs/README.md）
    ├── lessons.md                   #   過去 PR から蒸留した「繰り返さない判断」（根拠の PR 番号つき）
    ├── skill-authoring.md           #   スキルの書き方（公式ガイド準拠。frontmatter 規約・分冊基準・監査結果）
    ├── evals/                       #   主要スキル8件の期待挙動シナリオ（Sonnet / Opus のパリティ実測用）
    │   ├── README.md                #     走らせ方・baseline 比較・20クエリの trigger eval・結果記録表
    │   ├── triggers.md              #     同一プラグイン内の衝突組の発火ケース（正本）
    │   ├── gen-trigger-cases.py     #     triggers.md から claude plugin eval のケースを一時ディレクトリへ生成
    │   └── {verify-fresh,review-panel,adoption-review,self-correct,feature-pipeline,project-catchup,feedback-rule,deep-understand}.md
    └── skills-guide/                #   おすすめSkillsガイド（優先度・業務タイプ別）
        └── README.md
```

---

## このリポジトリの規約

1. **トップレベルは plugins/・tools/・docs/（＋将来追加しうる templates/）の分類、セクションはディレクトリ単位で管理する** — 新しいセクションを追加する場合、プラグイン導入可能なら `plugins/`、コピーして使うテンプレートなら `templates/`、独立ツールや配布パイプラインなら `tools/` に専用ディレクトリを作り、ルート直下にファイルを置かない（現状 `templates/` は対象セクションが無いため存在しない）。
2. **各ディレクトリには README.md を置く** — セクションの目的・使い方・ファイル構成を説明する README.md を必ず用意する。
3. **リポジトリ全体の言語は日本語** — README.md・CLAUDE.md など、このリポジトリ自体のドキュメントは日本語で記述する。
4. **マーケットプレイス定義はルートの `.claude-plugin/` に置く** — Claude Code プラグイン仕様上の必須配置であり、規約1の例外。
5. **プラグイン配下を変更したら version を上げる。プラグインのメタデータは plugin.json だけに書く** — `plugins/` 配下の9プラグイン（pipeline・cli-bridge・agent-review-panel・adoption-review・model-setup・codebase-setup・self-correct・feedback-rules・learning-coach）の配信対象ファイル（`skills/`・`agents/`・`hooks/` 配下。これらは既定探索パスのためプラグイン導入で自動配信される）を変更したら、該当する `plugins/<name>/.claude-plugin/plugin.json` の `version` をセマンティックバージョニングで更新する。CLAUDE.md / CLAUDE.task.md サンプル・`setup/settings.json` は setup スキルがコピー配布するため version 対象外。

   **`version`・`description`・`keywords`・`license`・`author` は plugin.json のみに書き、`.claude-plugin/marketplace.json` 側には書かない。** marketplace のエントリは `name`・`source`・`category` だけを持つ。公式仕様上、エントリで省略された `description` 等は plugin.json の値が使われ（`strict` 未指定＝true のとき）、両方にあるとエントリ側が黙って優先される。二重に持つと必ずずれる（実際 pipeline の説明文は 2.3.0 の追加を反映しないまま「スキル7種・エージェント8種」と書き続けていた）。出典: [Plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)（2026-09-07 取得）。
6. **プラグインの skills/agents/hooks は公式標準レイアウト（プラグインルート直下）に置く** — `<plugin>/skills/`・`<plugin>/agents/`・`<plugin>/hooks/hooks.json` が既定探索パスであり、plugin.json に `skills`/`hooks` フィールドを明示しない（宣言と実体の二重管理を避ける）。コピー導入用の `settings.json` サンプルはプラグインルート直下に置けない（Claude Code の予約パス）ため `<plugin>/setup/settings.json` に置く。pipeline の `hooks/` は導入先リポジトリへコピーする資材であり、この配置自体はプラグインとして自動発火しない（pipeline-setup が対象リポジトリの `.claude/hooks/` へコピーし `.claude/settings.json` に配線する）。

---

## 重要: ファイルはテンプレート・サンプルとして扱うこと

このリポジトリに含まれるファイル（`plugins/pipeline/CLAUDE.md`、各スキルファイルなど）は、**ユーザーが自分のプロジェクトにコピーして使うためのテンプレート・サンプル**です。

このリポジトリ自体の開発にそのまま適用しない。たとえば各パイプラインの `CLAUDE.md` サンプルは導入先リポジトリ用であり、このリポジトリの開発ルールではありません。
