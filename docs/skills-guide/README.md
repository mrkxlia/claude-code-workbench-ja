# Claude Code おすすめSkills ガイド

> 2026年6月時点の動作確認済み情報をもとに整理。72個紹介された記事から「今すぐ使えるもの」に絞り込み。

---

## 導入プロファイル（私用PC / 会社PC）

「何を入れるか」を環境別にまとめたもの。個別スキルの詳細は下の各節を参照。

### 私用 PC（Opus 4.8 + Sonnet 5・git あり・Codex 不使用）

- settings: `plugins/model-setup/settings.private.json`（`opusplan` + `xhigh`）
- workbench-ja のプラグイン: `model-setup`・`self-improve`・`knowledge-share`
  （`software-pipeline`・`task-pipeline`・`ai-peer` は必要に応じて）
- `plan-mode`・`implementation-skills` はファイルコピーで導入（非プラグイン）
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

# codex-bridge: 会社でのみ Codex CLI が使えるため、単一モデル環境のレビュー/セカンドオピニオン役として導入
cp -r plugins/codex-bridge/skills/* ~/.claude/skills/
cp -r plugins/codex-bridge/agents/* ~/.claude/agents/
# bash が使えない環境ではフック（gen-agents-md.sh）は省いてよい（スキル・エージェントのみで動作する）

# plan-mode / implementation-skills も同様にコピーで導入可能
```

- `software-pipeline` / `task-pipeline` を会社 PC で使う場合は、手動コピーではなく
  **必ず setup スキル経由**（`pipeline-setup` / `task-pipeline-setup`）で導入する
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
| **to-prd** | 会話の文脈から企画書(PRD)を自動生成 | `mattpocock/skills` → `to-prd` |
| **Doc Co-Authoring** | 情報収集→ドラフト→読者テストの3段階で文書作成 | `doc-coauthoring@skills` |

> **旧名称に注意**: 記事では `Write a PRD` と紹介されているが、現在は `to-prd` に改名済み。

### デザイン・資料作成が多い人

| スキル | 用途 | リポジトリ |
|--------|------|-----------|
| **Frontend Design** | 言葉で指示するだけでプロ品質のWebUI生成 | `frontend-design@skills`（公式マーケットプレイス経由でも配布されている場合あり。`/plugin` で確認） |
| **Canvas Design** | 「伝えたいこと」を言語化してからビジュアル生成 | `canvas-design@skills` |
| **Theme Factory** | 10種プリセットからカラー・フォントを資料全体に統一適用 | `theme-factory@skills` |
| **Brand Guidelines** | 自社ブランドカラー・フォントをアーティファクトに自動適用 | `brand-guidelines@skills` |

### 開発者向け

| スキル | 用途 | リポジトリ | 現在の名前 |
|--------|------|-----------|-----------|
| **TDD** | テスト駆動開発のRed-Green-Refactorループを自動化 | `mattpocock/skills` | `tdd` |
| **Systematic Debugging** | バグを4フェーズで体系的に解決（3回失敗でアーキテクチャ見直し） | `obra/superpowers` | `systematic-debugging` |
| **Code Review** | レビュー送る側・受ける側の両観点を構造化 | `obra/superpowers` | `requesting/receiving-code-review` |
| **Improve Codebase Architecture** | ADRを参照しながら設計品質を改善 | `mattpocock/skills` | `improve-codebase-architecture` |
| **Setup Pre-Commit** | コミット前の品質チェックを自動設定 | `mattpocock/skills` | `setup-pre-commit` |
| **Git Guardrails** | 危険なGitコマンド防止・ブランチ保護ルールを自動構築 | `mattpocock/skills` | `git-guardrails-claude-code` |
| **Web Artifacts Builder** | React/TypeScript/TailwindでWebアプリをHTMLとして生成 | `web-artifacts-builder@skills` | — |
| **Superpowers（一括）** | 上記含む14スキルをまとめて導入 | `obra/superpowers` v5.1.0 | — |

---

## 優先度 B: あると便利（用途が合えば）

| スキル | 用途 | 入手先 |
|--------|------|-------|
| **Algorithmic Art** | p5.jsでインタラクティブなアートを生成 | `algorithmic-art@skills` |
| **to-issues** | 企画書をタスクチケットに自動変換（垂直スライス設計） | `mattpocock/skills` |
| **writing-plans** | 企画書から2〜5分単位の実行計画を自動生成 | `obra/superpowers` |
| **Migrate to Shoehorn** | フレームワーク移行の計画・実行ガイド | `mattpocock/skills` |
| **Scaffold Exercises** | コード演習問題・技術研修素材を自動生成 | `mattpocock/skills` |
| **Triage** | バグ報告の分類・優先順位付けを自動化 | `mattpocock/skills` |
| **Git Work Trees** | 複数ブランチの並列作業環境を自動構築 | `obra/superpowers` → `using-git-worktrees` |
| **write-a-skill** | スキルの構造・description の書き方を学べる | `mattpoecraft/skills` |

---

## 入手先リポジトリ

| リポジトリ | スター数 | 特徴 |
|-----------|---------|------|
| [anthropics/skills](https://github.com/anthropics/skills) | 121k+ | Anthropic公式。安定性最高 |
| [mattpocock/skills](https://github.com/mattpocock/skills) | 16.5k+ | 実務向けの小さく組み合わせやすいスキル集 |
| [obra/superpowers](https://github.com/obra/superpowers) | 219k+ | エンジニアリング全般。v5.1.0（2026年5月）も更新中 |
| [skillsmp.com](https://skillsmp.com) | — | 96,000+スキルのマーケットプレイス。発見用に使う |

---

## 使えないことが確認されたもの（入れない）

| スキル | 問題 |
|--------|------|
| Auto-Commit Messages（anthropics/skills） | フォルダが存在しない。リンク切れ |
| Request Refactor Plan（mattpocock） | 公式で deprecated。`diagnose` / `zoom-out` を使う |
| edit-article（mattpocock） | 現在のリポジトリに存在しない |
| design-an-interface（mattpocock） | 現在のリポジトリに存在しない |
| obsidian-vault（mattpocock） | 現在のリポジトリに存在しない |

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
