---
name: codex-agents
description: >-
  普段 Claude Code しか使わない人が、既存の Claude ルール（プロジェクト CLAUDE.md・
  home の ~/.claude/CLAUDE.md・.claude 内の小ルール）をそのまま OpenAI Codex にも
  効かせるための AGENTS.md を生成/更新するスキル。Codex は AGENTS.md の @import 非対応
  のため、中身を取り込んで（@import も展開して）平らな AGENTS.md をマテリアライズする。
  「AGENTS.md を作って/更新して」「Claude のルールを Codex にも効かせて」「CLAUDE.md を
  AGENTS.md に同期して」といった依頼や、/codex-agents での手動起動で発動する。
argument-hint: "[--project-only]"
---

# codex-agents — Claude のルールを Codex にも効かせる（/codex-agents）

既存の Claude ルールを取り込んだ **AGENTS.md** を生成/更新するスキルです。Codex は
`codex-bridge` の各スキル経由で Claude が駆動しますが、Codex 側は CLAUDE.md を読みません。
Codex が読むのは **AGENTS.md** です。しかし AGENTS.md は `@import` 非対応なので、
**生成時に中身を取り込んだ平らな AGENTS.md** を作って橋渡しします。

## 何を取り込んで、どこに出力するか

| ソース | 出力先 |
|--------|--------|
| `~/.claude/CLAUDE.md`（home） | `$CODEX_HOME/AGENTS.md`（既定 `~/.codex/AGENTS.md`・全 Codex セッション共通） |
| プロジェクト `CLAUDE.md` ＋ `.claude/*.md`・`.claude/rules/*.md`（小ルール） | `<プロジェクト>/AGENTS.md` |

- Claude の `@import`（行全体が `@path` の行）は**展開して取り込み**ます（深さ5・循環防止・
  フェンスドコードブロック内はスキップ。インラインコード内の `@` は厳密に追わない既知の限界あり）。
- 小ルールは `.claude` 直下と `.claude/rules` 直下の `.md`（深さ1）のみ。`.claude/skills/`・
  `.claude/agents/` や `settings*.json` は取り込みません。

## 使い方

- `/codex-agents` — home とプロジェクトの AGENTS.md を生成/更新
- `/codex-agents --project-only` — home（`~/.codex/AGENTS.md`）はスキップ

自然文（「Claude のルールを Codex にも効かせて」）でも発動します。

## フロー

1. スクリプトを実行する（**`--auto` は付けない** = 新規作成も行う）:
   ```bash
   bash .claude/hooks/gen-agents-md.sh        # または --project-only
   ```
   - プラグイン導入時は `bash "${CLAUDE_PLUGIN_ROOT}/.claude/hooks/gen-agents-md.sh"`。
2. 結果を提示する: 生成/更新したパス、取り込んだソース一覧、`@import` の展開・未解決、
   サイズ超過でスキップしたファイル、手書きガードでスキップした出力先（あれば理由つき）。

## 自動更新との関係

`codex-bridge` をプラグイン導入している場合、`SessionStart`（startup/resume）で
`gen-agents-md.sh --auto` が走り、**既存の生成済み AGENTS.md を最新化**します。
`--auto` は**新規作成しない**ので、初回の作成はこのスキル（`/codex-agents`）で行ってください。

## 書き込み規律（安全策）

- 生成物は1行目にセンチネル（`<!-- codex-bridge:generated v1 DO NOT EDIT -->`）を持ちます。
- **手書きの AGENTS.md（センチネル無し）は上書きしません**（警告して当該出力先だけスキップ）。
- 生成済みファイルは**内容に差分があるときだけ**更新します（無変更なら触りません）。
- 生成された `AGENTS.md` は再生成物です。**手編集せず CLAUDE.md 側を更新**してください
  （リポジトリにコミットしたくない場合は `.gitignore` 推奨）。

## このスキルがやらないこと

- CLAUDE.md を書き換える（AGENTS.md は CLAUDE.md から生成する一方向）
- 手書き AGENTS.md の上書き
