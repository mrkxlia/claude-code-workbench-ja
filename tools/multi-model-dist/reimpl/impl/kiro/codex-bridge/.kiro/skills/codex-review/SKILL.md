---
name: codex-review
description: >-
  コードレビューを OpenAI Codex に依頼する Kiro スキル。ユーザーは Codex を操作せず、Kiro が Codex CLI を
  非対話モードで駆動し、差分または指定ファイルを Codex にレビューさせて重大度つきの指摘を要約する。
  「Codex にレビューして」「codex でレビュー」「セカンドレビュー」や、codex-review [スコープ] で発動する。
---

# codex-review — Codex にコードレビューを依頼する

コードレビューを **OpenAI Codex** に代行させる Kiro スキル。実際の codex 実行は **`codex-reviewer` サブエージェント**
（`.kiro/agents/codex-reviewer.json`）に委譲し、冗長な出力をメイン文脈から隔離する。共有仕様は
`multi-model-dist/reimpl/SPEC/codex-bridge.md` を正本とする。

## 前提

`codex` CLI が導入・認証済みであること。未導入・未認証ならサブエージェントが前段ガードで日本語案内して終了する。

## フロー

1. **スコープを決める**: 引数があれば従う（`uncommitted` / `base <branch>` / パス群）。無ければ git 配下は未コミット差分、
   git 外はレビュー対象パスをユーザーに尋ねる。
2. **必要なファイルを用意する**: git ありは対象スコープの `git diff`、git なし/パス指定は対象ファイルの**内容そのもの**。
   大きすぎる場合は 全文→関連抜粋→diff→パス名指し の順に降格。
3. **`codex-reviewer` サブエージェントを起動する**: スコープ・観点・**同梱するファイル内容**を渡す。
   Kiro の subagent 機構で `availableAgents` に `codex-reviewer` を含めておくこと。
4. **結果を提示する**: P1〜P4 の指摘（`file:line`＋要約＋推奨対応）と総評。**plain パス実行時は重大度が
   Codex（モデル）の判断であり codex 構造化出力ではない**旨を添える。
5. **修正するか確認する**: 修正の採否はユーザー/ホストが判断する（サブエージェントは編集しない）。
