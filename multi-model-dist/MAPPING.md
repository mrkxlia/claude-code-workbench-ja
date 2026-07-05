# MAPPING.md — 移植マッピングの正本（Phase 0 成果物）

このファイルは生成・再実装の**唯一の判断基準**です。`generators/lib/convert.py` とシリアライザはこの表に従います。

---

## ① ティア網羅監査表（全 SKILL.md / agents / hooks）

走査対象は各セクション配下の `<section>/.claude/**` のみ。**ルート直下 `.claude/` と `.claude-plugin/` は走査除外**。

判定列: **(a) frontmatter 有無**（※ファイル名が SKILL.md でも frontmatter 無しなら T1g）／
**(b) 本文 CC 依存**（Task ツール・`/command`・`.claude/` 等）／**(c) 対エージェント有無**／
**(d) セクション名前空間**（同名衝突回避用）／**(e) 二層分離可否**（`PIPELINE-INTEGRATION` センチネル）／
**(f) フック起動契機の CC 結合度**。

### スキル（SKILL.md）

| パス | (a)FM | (b)本文CC依存 | (e)二層分離 | ティア | 配り方 |
|---|---|---|---|---|---|
| implementation-skills/notes | 有 | 中（Task/`/cmd`） | — | **T1** | Track A 生成（本文用語写像）＝**正本** |
| implementation-skills/spec-extract | 有 | 中（`/cmd`） | — | **T1** | Track A 生成（本文用語写像）＝**正本** |
| plan-mode/create-plan | 有 | 中（ADJ/SPEC.md 参照） | — | **T1** | Track A 生成（本文用語写像＋ADJ→許可機構写像） |
| plan-mode/create-plan-calibrate | 有（`disable-model-invocation`） | 低 | — | **T1** | Track A 生成（`disable-model-invocation: true`→Codex `allow_implicit_invocation: false`） |
| data-science/*（10件） | **無** | 低（参照ドキュメント） | — | **T1g** | スキル化せず Codex=AGENTS.md 本文／Kiro=steering(`inclusion: auto`) |
| ai-peer/peer | 有 | 高（Task で peer-engineer 起動） | — | **T2p** | スキル＋エージェント対で移植 |
| ai-peer/ask-claude | 有 | 高（`claude` CLI 駆動） | — | **対象外** | CC 結合（別 Claude 起動）のため移植しない |
| software-pipeline/notes | 有 | 中 | **可**（上=正本同一/下=連携） | 上=**T1**(正本へ集約)／下=**T3** | 上半分は正本で代替・下半分は Track B |
| software-pipeline/spec-extract | 有 | 中 | **可** | 同上 | 同上 |
| task-pipeline/notes | 有 | 中 | **可** | 同上 | 同上 |
| task-pipeline/spec-extract | 有 | 中 | **可** | 同上 | 同上 |
| software-pipeline/clarify | 有 | 高（feature-pipeline 結合・全文） | **不可** | **T3** | Track B（汎用版生成 or 再実装）／監査2行のうち software |
| task-pipeline/clarify | 有 | 高（全文・別内容） | **不可** | **T3** | Track B／監査2行のうち task |
| software-pipeline/build-with-tests | 有 | 高（feature-pipeline 言及） | 不可 | **T3** | Track B（software のみ） |
| software-pipeline/feature-pipeline | 有 | 高（7エージェント連鎖） | — | **T3** | Track B（orchestration 再実装） |
| software-pipeline/pipeline-setup | 有（`disable-model-invocation`） | 高 | — | **T3** | Track B |
| software-pipeline/pipeline-improve | 有（`disable-model-invocation`） | 高 | — | **T3** | Track B |
| task-pipeline/task-pipeline | 有 | 高（5エージェント連鎖） | — | **T3** | Track B |
| task-pipeline/task-pipeline-setup | 有（`disable-model-invocation`） | 高 | — | **T3** | Track B |
| knowledge-share/kb | 有 | 高（グローバルKB/@import/self-improve閉ループ） | **不可** | **T3** | Track B（knowledge-share 一式で統一） |
| knowledge-share/kb-harvest | 有 | 高（SessionStart/jsonl 採掘） | — | **T3** | Track B（同上） |
| self-improve/improve-scan | 有 | 高（transcript 走査） | — | **T3** | Track B |
| self-improve/improve-apply | 有 | 高（承認制適用） | — | **T3** | Track B |
| codex-bridge/codex-review,implement,ask,codex-agents | 有 | 高（`codex exec` 駆動） | — | **Track B(Kiro版)** | Kiro→Codex 駆動の Kiro 版を SPEC から再実装 |

> **ルート除外（重複）**: `./.claude/skills/create-plan`・`create-plan-calibrate` は plan-mode と md5 一致の複製。走査対象外。

### サブエージェント（agents/*.md・計17件）

| セクション | ファイル | ティア | 備考 |
|---|---|---|---|
| software-pipeline | 7件（backend/frontend-builder, codebase-researcher, spec-writer, story-writer, test-verifier, implementation-validator） | **T2** | `.md`→Codex `.toml`／Kiro `.json`。`color` 捨て・`model: inherit` 捨て/既定・`sonnet/opus`→model id・`tools:`→各ツール表現。**ただし所属パイプラインが T3 なので実体は Track B の素材** |
| task-pipeline | 5件（brief/requirements-writer, deliverable-builder/reviewer, source-researcher） | **T2** | 同上（パイプラインは Track B） |
| ai-peer | peer-engineer | **T2p** | peer スキルと対で移植 |
| ai-peer | claude-advisor | **対象外** | ask-claude（別 Claude 起動）専用 |
| codex-bridge | 3件（codex-reviewer/implementer/advisor） | **Track B(Kiro版)** | Kiro `.kiro/agents/*.json` へ再実装の素材 |

### フック（T2h・`.sh`/`.ps1`/`hooks.json`）

| フック | 起動契機 | ティア | Codex | Kiro |
|---|---|---|---|---|
| software-pipeline/block-secrets-commit | PreToolUse(Bash)＋`exit 2` | **T2h** | ほぼ非対応 | `.kiro/hooks/*.json`（PreToolUse 相当＋command action）へ意味論写像 |
| software-pipeline/guard-builder-writes | PreToolUse | T2h | 非対応 | trigger＋matcher へ写像 |
| software-pipeline,task-pipeline/spec-sync-reminder | SessionStart/Stop | T2h | 非対応 | SessionStart hook へ写像 |
| task-pipeline/guard-deliverable-writes | PreToolUse | T2h | 非対応 | 同上 |
| knowledge-share/kb-session-{start,end} | SessionStart/End | T3 | 非対応 | knowledge-share 一式の再実装に含める |
| self-improve/si-session-{start,end} | SessionStart/End | T3 | 非対応 | self-improve 再実装に含める |
| codex-bridge/gen-agents-md, plan-to-codex | SessionStart/PostToolUse | 流用/対象外 | — | gen-agents-md は Track A の AGENTS.md 生成に流用 |

---

## ② 配置パス確定表（生成スクリプトの出力先の正）

| 種別 | Codex | Kiro |
|---|---|---|
| スキル | `.agents/skills/<name>/SKILL.md` | `.kiro/skills/<name>/SKILL.md`（CLI）／`.kiro/steering/<name>.md`（IDE） |
| サブエージェント | `.codex/agents/<name>.toml` | `.kiro/agents/<name>.json` |
| プロジェクト指示書 | `AGENTS.md`（repo 直下） | `.kiro/steering/{product,tech,structure}.md` |
| フック | （ほぼ非対応） | `.kiro/hooks/<name>.json` |
| 配布パッケージ | `dist/codex-plugin/`（manifest＋marketplace） | `dist/kiro-power/`（Power 一式） |

**衝突回避**: 共有素材は `build/skills/<section>/<name>/` のように**セクション修飾**して出力（同名別内容の衝突排除）。
`notes`/`spec-extract` の**正本は implementation-skills**（pipeline 連携版は Track B）。

---

## ③ frontmatter フィールド対応（CC → Codex → Kiro）

| CC フィールド | Codex(TOML agent / skill yaml) | Kiro(JSON agent / skill yaml) | 規則 |
|---|---|---|---|
| `name` | `name` | `name` | そのまま |
| `description` | `description` | `description` | そのまま |
| `disable-model-invocation: true` | skill: `allow_implicit_invocation: false` | steering: `inclusion: manual` | **真理値反転（true→false）** |
| `argument-hint` | （無し） | （無し） | 捨てる／必要なら description へ畳む |
| `tools: A, B` | agent: sandbox/権限へ（直接1:1なし） | agent: `tools: [A,B]` / `allowedTools` | カンマ列→配列、CC ツール名は各ツール語彙へ |
| `model: inherit` | （無し） | （無し） | 捨てる／既定に任せる |
| `model: sonnet\|opus` | （素の tier は出力しない） | `claude-sonnet-5`／`claude-opus-4-8` | Kiro は写像表 `_MODEL_MAP` で id へ。Codex は確証ある id が無いため **omit**（壊れた model を出さない）。未知 tier は両者 omit |
| `color` | （無し） | （無し） | 捨てる |
| ADJ（ツール許可・シェル前提・create-plan SPEC.md） | `sandbox_mode` 等 | `tools`/`allowedTools` | ADJ→各ツールの許可機構へ。create-plan は `plan-mode/SPEC.md` を**参照**（複製しない） |

---

## ④ 本文用語写像（Markdown 本文に適用）

| 原本本文 | Codex | Kiro | 備考 |
|---|---|---|---|
| `/<skill>`（相互参照・自己参照とも） | `$<skill>` mention | `#<skill>` | 既知スキル名のみ置換。直前が ASCII 英数字/`_`/`/` のときだけ除外（**日本語密着の `/cmd` も写像**＝F3 修正）。残存検証も同じ境界で相互チェック |
| frontmatter `description` 本文 | 同上を適用 | 同上 | description も prose なので写像（CC リテラルを残さない） |
| guidance（CLAUDE.md→AGENTS.md/steering）本文 | 同上を適用 | 同上 | 平坦化後に用語写像（data-science のスキル一覧表の `/name`・図中の `.claude/` を変換） |
| 「Task ツールで起動」「サブエージェント」 | Codex subagents | Kiro subagents | 多段連鎖は Track B |
| `.claude/skills/`・`.claude/agents/` | `.agents/skills/`・`.codex/agents/` | `.kiro/skills/`・`.kiro/agents/` | 配置パス確定表に従う |
| bare `.claude/`（設定・図・配置先） | `.codex/` | `.kiro/` | catch-all（残り全ての `.claude/`） |
| `$CLAUDE_PROJECT_DIR` | （該当機構） | （該当機構） | フック文脈は T2h で別途 |
| `@import`（CLAUDE.md） | 展開して平坦化（AGENTS.md） | 展開して steering へ | codex-agents の展開ロジック流用 |

**ゴールデン検証**: 生成後に本文へ残存する `/<cmd>`・`.claude/`・`Task ツール`・未展開 `@import` を検出して fail させる
（自己参照の誤置換ケースも固定）。
