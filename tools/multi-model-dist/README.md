# multi-model-dist — Claude Code 資産を Codex / Kiro へ配布する

このリポジトリの Claude Code(CC) 用資産（スキル・サブエージェント・指示書・フック）を、**原本を変えずに**
OpenAI **Codex** と AWS **Kiro** でも使えるようにするための配布ジェネレータ＆再実装パッケージです。

> 本 README は実装の入口で、対応表・ティア・使い方をまとめます。設計の全体像・意思決定の経緯は
> [`MAPPING.md`](MAPPING.md) を正本とします。

## なぜこの構成か（2トラック）

CC 資産はツールごとに移植容易度が大きく異なります。そこで **2トラック**に分けます。

- **Track A ＝ 生成（原本不変・単一ソース）**: tool-agnostic な資産は、原本 `*/.claude/**`・`CLAUDE.md` を
  読み取り Codex/Kiro の native パッケージを**生成**します。原本は一切編集しません。
- **Track B ＝ SPEC 基準の再実装（原本から分離）**: パイプラインやフック依存など**生成では忠実度が出ない**ものは、
  機能の SPEC を1枚に固定し、それを共有源に各ツールへ**ネイティブ実装を手書き**します（`reimpl/`）。

**統合方針**: ツールごとに二度手間を作らないため、共通化できる層は1つに畳みます（正規化中間表現 IR ＋薄い出力アダプタ）。
ツール別に分かれるのは「**配置パス・シリアライズ形式・配布パッケージ包装**」の3点だけにします。

## 対応関係（一次ソース確認済み・2026-06）

両ツールとも **SKILL.md 形式スキル＋サブエージェント**をネイティブ対応します。

| CC 原本（単一ソース） | Codex 生成物 | Kiro 生成物 |
|---|---|---|
| `CLAUDE.md` | `AGENTS.md`（repo 直下） | `.kiro/steering/*.md`（`inclusion: always`） |
| `.claude/skills/X/SKILL.md` | `.agents/skills/X/SKILL.md` | `.kiro/skills/X/SKILL.md`（CLI）／steering（IDE） |
| スキル同梱ファイル（personas.md・SPEC.md 等） | 同じスキルディレクトリへサイドカー複製 | 同左 |
| `.claude/agents/*.md` | `.codex/agents/*.toml` | `.kiro/agents/*.json` |
| hooks（`.sh`/`hooks.json`） | ほぼ非対応 | `.kiro/hooks/*.json`（trigger＋action・意味論写像） |
| パイプライン（多エージェント） | subagents＋skills で再実装 | spec ワークフロー＋subagents で再実装 |
| プラグイン（marketplace.json） | Codex plugin（repo marketplace） | Kiro Power |

> 各ツールの正式な配置パス・配布形式は `MAPPING.md` の「配置パス確定表」を正とします。
> `disable-model-invocation: true` は Codex では `allow_implicit_invocation: false` に反転、
> Kiro では Agent Skills 標準フィールドのままパススルーします（MAPPING ③）。

### Track A の生成カバレッジ（現在）

- **T1 スキル**: implementation-skills（notes / spec-extract）・plan-mode（create-plan / create-plan-calibrate）・
  **data-science 10種**・**model-setup**（task-brief / backlog-loop / pr-merge / long-run）
- **T2p スキル＋エージェント対**: ai-peer（peer＋peer-engineer）・**model-setup**（fan-out / verify-fresh＋
  task-worker / fresh-verifier / bulk-scanner）・**agent-review-panel**（review-panel＋panel-* 4種・サイドカー同梱）
- **ガイダンス CLAUDE.md**: global-claude-md-sample・data-science（Codex＋Kiro）／model-setup（Kiro のみ。
  Claude モデル運用ルールのため）
- **Track B（生成しない）**: software/task-pipeline・knowledge-share・self-improve・codex-bridge・フック・ask-claude
  → `reimpl/` の SPEC から手書き再実装

## ディレクトリ構成

```
multi-model-dist/
├── README.md            このファイル
├── MAPPING.md           ①ティア網羅監査表 ②配置パス確定表 ③frontmatter対応 ④本文用語写像
├── generators/          Track A（生成・単一パイプライン）
│   ├── .claude/skills/export/SKILL.md   作業用スキル /export（このリポジトリ内ローカル・非配信）
│   ├── bin/export.sh                    走査・センチネル・冪等判定（共通1本）
│   ├── templates/                       配布パッケージの雛形（codex-plugin/MANIFEST.toml・kiro-power/power.json）
│   └── lib/
│       ├── convert.py                   原本→正規化IR→各ツール出力
│       ├── export.py                    export.sh から呼ぶエントリポイント（allowlist・サイドカー複製・残存検証）
│       ├── serializers/{codex.py,kiro.py}
│       └── test_convert.py              変換・実データ整合・export 統合・ゴールデン一致のテスト
├── build/               IR 由来の共有アーティファクト（生成時に作成・.gitignore 済みでリポジトリには無い）
├── reimpl/              Track B（SPEC 基準の再実装）
│   ├── SPEC/            機能ごとの共有仕様
│   ├── impl/            各ツールのネイティブ実装（skill 本体は共有）
│   └── test_reimpl.py   再実装の整合テスト
├── examples/            生成結果ゴールデン（検証用）
└── dist/                配布パッケージ（生成時に作成・.gitignore 済みでリポジトリには無い）
    ├── codex-plugin/    Codex plugin（Skills/MCP＋マニフェスト）
    └── kiro-power/      Kiro Power（steering＋hooks＋skills＋agents）
```

## 使い方（生成）

```bash
# このリポジトリ直下で
multi-model-dist/generators/bin/export.sh --target codex,kiro
# 生成物は build/ と dist/ に出力される（原本 *.claude/** は不変）
```

- 生成物の先頭には**センチネル**（出典・手編集禁止）が入ります。手書き（センチネル無し）の生成先は上書きしません。
- 走査対象は各セクション配下の `<section>/.claude/**` のみ。**ルート直下 `.claude/`・`.claude-plugin/` は除外**します。

## 原本不変の保証

- 編集するのはこのセクション（`multi-model-dist/`）と、ドキュメント（ルート `README.md`・`CLAUDE.md`）のみ。
- 各セクションのスキル/エージェント/フック本体（`*/.claude/**`）は**変更しません**。
- 検証で `git status` が原本に差分を出さないことを確認します。

## 実装の進め方（複数エージェント）

[obra/superpowers](https://github.com/obra/superpowers) の subagent-driven development を参考にします
（参考方法論・コードのコピーではない）: bite-sized タスク → タスクごとに fresh subagent ＋二段レビュー
（仕様適合→コード品質）→ TDD（RED-GREEN-REFACTOR）→ 独立タスクは git worktree で並列 → Phase 境界で人間承認。

## ライセンス・出典

[MIT License](../LICENSE)。実装方法論は obra/superpowers（MIT）を参考にした独自実装（コードのコピーではない）。
Codex / Kiro の各仕様は各公式ドキュメントに基づく独自対応です。
