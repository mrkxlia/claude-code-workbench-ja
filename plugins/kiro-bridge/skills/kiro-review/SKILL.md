---
name: kiro-review
description: >-
  コードレビューを Kiro に依頼するスキル。ユーザー自身は Kiro を操作せず、Claude Code
  が kiro-cli を非対話モードで駆動し、差分または指定ファイルを Kiro にレビューさせて
  重大度つきの指摘を要約する。「Kiro にレビューして」「kiro でレビュー」「キロにレビュー
  させて」「別の AI にレビューさせて」「セカンドレビュー」といった依頼や、
  /kiro-review [uncommitted | base <branch> | <paths>] での手動起動で発動する。
  Kiro に第三者視点のコードレビューを任せたいときに使う。
argument-hint: "[uncommitted | base <branch> | <paths>]"
---

# kiro-review — Kiro にコードレビューを依頼する（/kiro-review）

コードレビューを **Kiro** に代行させるスキルです。ユーザーは Kiro を直接操作しません。
Claude Code が kiro-cli を**非対話モード**（`--no-interactive --trust-tools=read`）で
駆動し、レビュー結果を要約して提示します。実際の kiro-cli 実行は **`kiro-reviewer`
サブエージェント**に委譲し、冗長な出力をメインの文脈から隔離します。

## 使い方

- `/kiro-review` — 既定スコープ（git なら未コミット差分）をレビュー
- `/kiro-review base main` — `main` ブランチとの差分をレビュー
- `/kiro-review src/foo.ts src/bar.ts` — 指定ファイルをレビュー（git なしでも可）

「Kiro にレビューして」のような自然文でも発動します。

> **レビュー相手を変えたいとき**: 依存なしで Claude にレビューさせるなら内蔵 `/code-review`、
> 実装前のプランレビューや壁打ちなら [`ai-peer`](../../../../ai-peer/) の `/peer`、相手を
> Codex にしたいなら [`codex-bridge`](../../../../codex-bridge/) の `/codex-review`。
> kiro-review は相手が **Kiro**（`kiro-cli`）である点が違う。

## 前提

`kiro-cli` が導入・認証済みであること（`kiro-bridge/README.md` の「前提」参照）。
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

3. **`kiro-reviewer` を起動する**（Task ツール）
   - スコープ・観点・**同梱するファイル内容**を渡す。
   - サブエージェントが Kiro を read-only（`--trust-tools=read`）で実行し、要約を返す。

4. **結果を提示する**
   - P1〜P4 の指摘（`file:line` ＋ 要約 ＋ 推奨対応）と総評を見せる。
   - **重大度は Kiro（モデル）の判断であり構造化出力ではない**旨を添える（Kiro には
     Codex の `codex exec review` に相当する構造化レビューサブコマンドが無いため、常に
     plain な相談プロンプト経由になる）。

5. **修正するか確認する**
   - P1 / P2 を Claude が直すか、ユーザーに確認する。
   - 直す場合は Claude 自身が修正する（kiro-bridge に実装委譲スキルはない。規模が大きい
     場合は `/codex-implement` か通常の実装フローを使う）。

## このスキルがやらないこと

- ユーザーに kiro-cli を手動で叩かせる（すべて Claude が非対話で駆動する）
- レビュー指摘を勝手に全部適用する（適用は必ず確認してから）
- `--trust-all-tools` や write/shell 系の信頼指定を使う（read-only 既定）
- コードを書かせる（kiro-bridge に implement 系スキルはない。理由は README 参照）
