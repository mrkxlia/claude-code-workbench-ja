# Claude Code おすすめSkills ガイド

> **どのスキルを入れるか**のガイドです。**スキルを自分で書く**ときは
> [`../skill-authoring.md`](../skill-authoring.md)（公式ガイド準拠の作法・frontmatter 規約）を参照してください。

> **2026-09-04 に外部リポジトリを再検証**（初版は2026年6月。72個紹介された記事から「今すぐ使えるもの」に絞り込み）。
> スター数・スキル名はこの日に各リポジトリで実際に確認した値。**配布元の改名・移動は頻繁に起きる**ため、
> 導入前に `/plugin` かリポジトリのファイル一覧で現在の名前を確認すること。

---

## 導入プロファイル（私用PC / 会社PC）

「何を入れるか」を環境別にまとめたもの。個別スキルの詳細は下の各節を参照。

### 私用 PC（Opus 5 + Sonnet 5・git あり・Codex 不使用）

- settings: `plugins/model-setup/settings.private.json`（`opusplan` + `xhigh`）
- workbench-ja のプラグイン: `model-setup`（`pipeline` は必要に応じて）。同じ指摘を繰り返している自覚があるなら `feedback-rules` も（指摘をファイル化し、回数に応じて hook が段階的に止める）。SNS や記事で流れてくるツールを頻繁に検討するなら `adoption-review`（採用可否を敵対的に判定。依存ゼロ）
- 公式プラグイン: `commit-commands`・`pr-review-toolkit`・`skill-creator`・`claude-md-management`
- `codex-bridge` は導入**しない**（Codex CLI を使っていないため）

### 会社 PC（Sonnet 5 のみ・git なし・Codex CLI あり）

git・マーケットプレイスが使えない前提。zip 等でリポジトリを持ち込み、ファイルコピーのみで完結させる:

```bash
# model-setup: スキル5種（pr-merge は git 専用のため対象外）+ エージェント3種 + CLAUDE.md（共通＋会社追補）+ settings
cp -r plugins/model-setup/skills/task-brief ~/.claude/skills/
cp -r plugins/model-setup/skills/backlog-loop ~/.claude/skills/
cp -r plugins/model-setup/skills/fan-out ~/.claude/skills/
cp -r plugins/model-setup/skills/long-run ~/.claude/skills/
cp -r plugins/model-setup/skills/verify-fresh ~/.claude/skills/
mkdir -p ~/.claude/agents && cp -r plugins/model-setup/agents/* ~/.claude/agents/
cat plugins/model-setup/CLAUDE.md plugins/model-setup/CLAUDE.company.md >> ~/.claude/CLAUDE.md
# ~/.claude/settings.json に plugins/model-setup/settings.company.json をマージ
# 都度貼りプロンプト集（自動配信されない資材）も手元に置いておくと便利
cp plugins/model-setup/PROMPTS.md ~/.claude/model-setup-PROMPTS.md

# codex-bridge: 会社でのみ Codex CLI が使えるため、単一モデル環境のレビュー/セカンドオピニオン役として導入
cp -r plugins/codex-bridge/skills/* ~/.claude/skills/
cp -r plugins/codex-bridge/agents/* ~/.claude/agents/
# bash が使えない環境ではフック（gen-agents-md.sh）は省いてよい（スキル・エージェントのみで動作する）
```

- `pipeline` を会社 PC で使う場合は、手動コピーではなく
  **必ず setup スキル経由**（`pipeline-setup`）で導入する
  （Windows で bash が無い場合の `.ps1` フック振り分けが setup 経由でしか働かないため）。

---

## インストール方法（優先度S以下・外部スキル集）

```bash
# Claude Code 内で /plugin コマンドを実行 → Discover タブから検索するのが最も確実
/plugin

# マーケットプレイスを直接登録してからインストールする場合
claude plugin marketplace add anthropics/skills
claude plugin install pdf@skills
```

> 上記2行目以降はマーケットプレイス名・プラグイン名が配布元の更新で変わることがある。
> 確実なのは `/plugin` の Discover タブから検索する方法。

---

## 優先度 S: まず入れるべき（全員向け）

Anthropic公式リポジトリのスキル。安定性が最も高く、今すぐ使える。

| スキル | 用途 | インストール（プラグイン名） |
|--------|------|-------------|
| **PDF** | 読み取り・結合・分割・OCR・暗号化 | `pdf@skills`（上記「インストール方法」参照） |
| **XLSX** | Excelのデータ整理・グラフ・数式自動化 | `xlsx@skills` |
| **PPTX** | PowerPoint自動生成・既存資料の読み取り | `pptx@skills` |
| **DOCX** | Word文書の作成・書式設定 | `docx@skills` |
| **Skill Creator** | 自分用スキルを作る・既存スキルを改善 | `skill-creator@skills` |

---

## 優先度 A: 業務タイプ別おすすめ

### 企画・提案書をよく作る人

| スキル | 用途 | リポジトリ |
|--------|------|-----------|
| **Brainstorming** | アイデア→設計書を9ステップで構造化。承認まで実装しない | `obra/superpowers` |
| **Grill Me** | 計画の穴を質問攻めで事前に全部潰す | `mattpocock/skills` → `grill-me` |
| **to-spec** | 会話の文脈から仕様書を自動生成 | `mattpocock/skills` → `skills/engineering/to-spec` |
| **Doc Co-Authoring** | 情報収集→ドラフト→読者テストの3段階で文書作成 | `doc-coauthoring@skills` |

> **旧名称に注意**: 記事の `Write a PRD` → 一時 `to-prd` → **現在は `to-spec`**（2026-09-04 確認）。
> mattpocock/skills は 2026-09 時点で `skills/{engineering,productivity,misc,in-progress}/` の入れ子構成に
> なっている。`misc/` は「作者が手元に残しているが plugin では配布しない」、`in-progress/` は
> 「ベータ。予告なく変わる・消える」と明記されているので、常用するなら engineering / productivity から選ぶ。

### デザイン・資料作成が多い人

| スキル | 用途 | リポジトリ |
|--------|------|-----------|
| **Frontend Design** | 言葉で指示するだけでプロ品質のWebUI生成 | `frontend-design@skills`（公式マーケットプレイス経由でも配布されている場合あり。`/plugin` で確認） |
| **Canvas Design** | 「伝えたいこと」を言語化してからビジュアル生成 | `canvas-design@skills` |
| **Theme Factory** | 10種プリセットからカラー・フォントを資料全体に統一適用 | `theme-factory@skills` |
| **Brand Guidelines** | 自社ブランドカラー・フォントをアーティファクトに自動適用 | `brand-guidelines@skills` |

> **フロントエンド周りをまとめて見たいとき**:
> [wilwaldon/Claude-Code-Frontend-Design-Toolkit](https://github.com/wilwaldon/Claude-Code-Frontend-Design-Toolkit)
> — Claude Code で「見栄えのする UI」を出すためのスキル・MCP・テーマ・アニメーション・
> Figma 連携などを10分類・70点超にまとめたリンク集（README 1枚。スキル本体は同梱していない）。
> 上表の Frontend Design / Canvas Design もここに含まれる。**未検証のリンク集として置いてある**だけで、
> 個々のツールの生存確認は本リポジトリでは行っていない（最終更新 2026-02・MIT）。

### 開発者向け

| スキル | 用途 | リポジトリ | 現在の名前 |
|--------|------|-----------|-----------|
| **TDD** | テスト駆動開発のRed-Green-Refactorループを自動化 | `mattpocock/skills` | `engineering/tdd`（superpowers 版は `test-driven-development`） |
| **Systematic Debugging** | バグを4フェーズで体系的に解決（3回失敗でアーキテクチャ見直し） | `obra/superpowers` | `systematic-debugging` |
| **Code Review** | レビュー送る側・受ける側の両観点を構造化 | `obra/superpowers` | `requesting/receiving-code-review` |
| **Improve Codebase Architecture** | ADRを参照しながら設計品質を改善 | `mattpocock/skills` | `engineering/improve-codebase-architecture` |
| **Setup Pre-Commit** | コミット前の品質チェックを自動設定 | `mattpocock/skills` | `misc/setup-pre-commit`（**plugin では配布されない**。手動コピーで使う） |
| **Git Guardrails** | 危険なGitコマンド防止・ブランチ保護ルールを自動構築 | `mattpocock/skills` | `misc/git-guardrails-claude-code`（**plugin では配布されない**） |
| **Web Artifacts Builder** | React/TypeScript/TailwindでWebアプリをHTMLとして生成 | `web-artifacts-builder@skills` | — |
| **Ralph Wiggum** | 完了するまで同じプロンプトを stop-hook で再投入する自走ループ（数時間規模のタスクリスト消化向け。最大反復回数を必ず指定する） | `anthropics/claude-code` → `plugins/ralph-wiggum` | `ralph-loop` |
| **Superpowers（一括）** | 上記含む14スキルをまとめて導入 | `obra/superpowers` | 14スキルであることは 2026-09-04 に確認（版数は未確認） |

---

## 優先度 B: あると便利（用途が合えば）

| スキル | 用途 | 入手先 |
|--------|------|-------|
| **Algorithmic Art** | p5.jsでインタラクティブなアートを生成 | `algorithmic-art@skills` |
| **to-tickets** | 仕様をタスクチケットに自動変換（垂直スライス設計）。旧 `to-issues` | `mattpocock/skills` → `engineering/to-tickets` |
| **writing-plans** | 企画書から2〜5分単位の実行計画を自動生成 | `obra/superpowers` |
| **Migrate to Shoehorn** | フレームワーク移行の計画・実行ガイド | `mattpocock/skills` → `misc/migrate-to-shoehorn`（plugin 非配布） |
| **Scaffold Exercises** | コード演習問題・技術研修素材を自動生成 | `mattpocock/skills` → `misc/scaffold-exercises`（plugin 非配布） |
| **Triage** | バグ報告の分類・優先順位付けを自動化 | `mattpocock/skills` → `engineering/triage` |
| **Git Work Trees** | 複数ブランチの並列作業環境を自動構築 | `obra/superpowers` → `using-git-worktrees` |
| **writing-skills** | スキルの構造・description の書き方を学べる。mattpocock の `write-a-skill` は消滅したため superpowers 版に差し替え | `obra/superpowers` → `writing-skills` |

---

## 入手先リポジトリ

スター数は **2026-09-04 に確認した値**（変動が速いので、参考値として見ること）。

| リポジトリ | スター数 | 特徴 |
|-----------|---------|------|
| [anthropics/skills](https://github.com/anthropics/skills) | 173.9k | Anthropic公式。安定性最高。`skills/` 直下にフラットに19スキル |
| [mattpocock/skills](https://github.com/mattpocock/skills) | 249.2k | 実務向けの小さく組み合わせやすいスキル集。`skills/{engineering,productivity,misc,in-progress}/` の入れ子構成 |
| [obra/superpowers](https://github.com/obra/superpowers) | 281.7k | エンジニアリング全般。`skills/` 直下に14スキル |
| [skillsmp.com](https://skillsmp.com) | — | 2,000,000+スキルのマーケットプレイス。発見用に使う |
| [wilwaldon/Claude-Code-Frontend-Design-Toolkit](https://github.com/wilwaldon/Claude-Code-Frontend-Design-Toolkit) | 1.1k | フロントエンドのデザイン品質向けリンク集（スキル・MCP・テーマ・アニメーション・Figma 連携ほか10分類/70点超）。スキル本体は同梱せず README 1枚で各配布元へ誘導する。**2026-09-05 時点で未検証**（スター数・最終更新 2026-02 は同日に確認） |
| [microsoft/SkillOpt](https://github.com/microsoft/SkillOpt) | 16.7k | スキル自体を「凍結したLLMエージェント向けの再利用可能な自然言語プログラム」として扱い、軌跡駆動の編集＋検証ゲートで段階的に改善するテキスト空間オプティマイザ。`best_skill.md` を成果物として生成し、Claude Code / Codex / Copilot / Devin など複数の実行環境に対応。既存スキルの品質改善に使えそうだが、**2026-09-05 時点で未検証**（スター数は同日確認） |
| [yizhiyanhua-ai/fireworks-tech-graph](https://github.com/yizhiyanhua-ai/fireworks-tech-graph) | 11.2k | 自然言語の説明から本番品質の技術図（SVG/PNG、UML14種＋AI/エージェントワークフロー図含む12スタイル）を自動生成する Agent Skill。Codex と Claude Code の両方で変更なく動作すると明記され、`~/.claude/skills/` へのインストールに対応。**2026-09-05 時点で未検証**（スター数は同日確認） |
| [okdt/claude-code-hardening-cheatsheet](https://github.com/okdt/claude-code-hardening-cheatsheet) | 119 | スキルではなく、Claude Code のサンドボックス・パーミッション・フック設定を固める運用ハードニングガイド（日英併記）。すぐ使える `settings_example.jsonc` テンプレートと監査用プロンプトを収録。「非公式」と明記されており、本番適用前に公式ドキュメントとの突き合わせを推奨と author 自身が注記。**2026-09-05 時点で未検証**（スター数は同日確認） |

---

## 使えないことが確認されたもの（入れない）

| スキル | 問題 |
|--------|------|
| Auto-Commit Messages（anthropics/skills） | フォルダが存在しない。リンク切れ |
| Request Refactor Plan（mattpocock） | 削除済み。後継は `engineering/diagnosing-bugs`（旧称 `diagnose`）。`zoom-out` は現在どのフォルダにも無い |
| edit-article（mattpocock） | 現在のリポジトリに存在しない |
| design-an-interface（mattpocock） | 現在のリポジトリに存在しない |
| obsidian-vault（mattpocock） | 現在のリポジトリに存在しない |
| write-a-skill（mattpocock） | 2026-09-04 時点で存在しない。`obra/superpowers` の `writing-skills` を使う |
| to-prd / to-issues / diagnose / zoom-out（mattpocock） | 改名または削除（→ `to-spec` / `to-tickets` / `diagnosing-bugs` / 該当なし） |

> mattpocock/skills の `deprecated/` は空で、README に「引退したスキルは削除し、削除の変更履歴で
> 後継を示す」と書かれている。つまり**名前が消えていたら改名か廃止**であり、リポジトリに残らない。

---

## メタスキルから始めるなら

スキルを「探す・作る」能力を先に手に入れると、あとが楽になる。

```
1. skill-creator（Anthropic公式）— スキルを自分で作る・改善する
2. write-a-skill（mattpocock）  — スキルの書き方を学ぶ
3. skillsmp.com で検索          — 96,000+から用途で探す
```

---

## 業務別クイックスタート

```
書類整理が多い    → PDF + XLSX + DOCX
プレゼンが多い    → PPTX + Theme Factory
企画・提案が多い  → Brainstorming + Grill Me + to-prd
Webデザインが必要 → Frontend Design + Canvas Design
開発者（全般）    → obra/superpowers 一括導入が最速
```
