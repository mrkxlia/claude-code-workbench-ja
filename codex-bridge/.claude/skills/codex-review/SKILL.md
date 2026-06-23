---
name: codex-review
description: >-
  コードレビューを OpenAI Codex に依頼するスキル。ユーザー自身は Codex を操作せず、
  Claude Code が Codex CLI を非対話モードで駆動し、差分または指定ファイルを Codex に
  レビューさせて重大度つきの指摘を要約する。「Codex にレビューして」「codex でレビュー」
  「コーデックスにレビューさせて」「別の AI にレビューさせて」「セカンドレビュー」
  といった依頼や、/codex-review [スコープ] での手動起動で発動する。Codex に第三者
  視点のコードレビューを任せたいときに使う。
argument-hint: "[uncommitted | base <branch> | <paths>]"
---

# codex-review — Codex にコードレビューを依頼する（/codex-review）

コードレビューを **OpenAI Codex** に代行させるスキルです。ユーザーは Codex を直接
操作しません。Claude Code が Codex CLI を**非対話モード**で駆動し、レビュー結果を
要約して提示します。実際の codex 実行は **`codex-reviewer` サブエージェント**に委譲し、
冗長な出力をメインの文脈から隔離します。

## 使い方

- `/codex-review` — 既定スコープ（git なら未コミット差分）をレビュー
- `/codex-review base main` — `main` ブランチとの差分をレビュー
- `/codex-review src/foo.ts src/bar.ts` — 指定ファイルをレビュー（git なしでも可）

「Codex にレビューして」のような自然文でも発動します。

> **レビュー相手を変えたいとき**: 依存なしで Claude にレビューさせるなら内蔵 `/code-review`、
> 実装前のプランレビューや壁打ちなら [`ai-peer`](../../../../ai-peer/) の `/peer`。codex-review は
> 相手が **Codex**（`codex` CLI）である点が違う。

## 前提

`codex` CLI が導入・認証済みであること（`codex-bridge/README.md` の「前提」参照）。
未導入・未認証の場合、サブエージェントが日本語で案内して終了します。

## フロー

1. **スコープを決める**
   - 引数があればそれに従う（`uncommitted` / `base <branch>` / パス群）。
   - 引数がなければ:
     - git 配下 → 既定は未コミット差分（`uncommitted`）。上流ブランチがあれば
       「`base <upstream>` で比較しますか？」と提案してよい。
     - git 配下でない → レビュー対象のパスをユーザーに尋ねる。

2. **明らかに必要なファイルを用意する**
   - git あり: `git diff`（対象スコープ）を取得。
   - git なし / パス指定: 対象ファイルの**内容そのもの**を用意。
   - 大きすぎる場合は「全文 → 関連抜粋 → diff → パス名指し」の順に降格（バイト数上限を意識）。

3. **`codex-reviewer` を起動する**（Task ツール）
   - スコープ・観点・**同梱するファイル内容**を渡す。
   - サブエージェントが Codex を read-only で実行し、要約を返す。

4. **結果を提示する**
   - P1〜P4 の指摘（`file:line` ＋ 要約 ＋ 推奨対応）と総評を見せる。
   - **plain パスで実行された場合、重大度は Codex（モデル）の判断であり codex 構造化出力
     ではない**旨を添える。

5. **修正するか確認する**
   - P1 / P2 を Claude が直すか、ユーザーに確認する。
   - 直す場合は Claude 自身が修正するか、規模が大きければ `/codex-implement` に委譲する。

## このスキルがやらないこと

- ユーザーに codex を手動で叩かせる（すべて Claude が非対話で駆動する）
- レビュー指摘を勝手に全部適用する（適用は必ず確認してから）
- 危険なサンドボックスフラグを使う（read-only 既定）
