---
name: pr-merge
description: >-
  作業ブランチの変更を「（未コミットなら）コミット分割 → PR 作成 → CI 確認 → マージ → main
  更新 → ブランチ・一時ファイルの後片付け」まで一気通貫で完了させるスキル。「PR 作成して、
  マージして」「マージまでやって」「PR を出して取り込んで」といった、マージまで含む依頼で
  発動する。手動では /pr-merge [PRタイトル案] で起動する。コミットだけ・PR作成だけの依頼
  （「コミットして」「PR作成して」）では発動しない — 公式プラグイン commit-commands の
  /commit・/commit-push-pr を使う。git / gh が使える環境専用（会社 PC など git が無い環境では
  対象外。backlog-loop の git なし完了処理を案内する）。
argument-hint: "[PRタイトル案]"
---

# pr-merge — PR 作成からマージ・後片付けまで

git / gh が使える環境で、「マージして完了」までを一括で行うスキルです。
**git が使えない環境では発動しません**（`git rev-parse --is-inside-work-tree` が失敗する場合は
何もせず、`backlog-loop` の git なし完了処理 — 変更ファイル一覧の提示 — を案内してください）。

## 住み分け（重要）

| 依頼 | 使うもの |
|---|---|
| コミットだけしたい | `/commit`（commit-commands） |
| PR を出すところまで | `/commit-push-pr`（commit-commands） |
| **マージ・後片付けまで** | **`/pr-merge`（本スキル）** |
| gone ブランチの掃除だけ | `/clean_gone`（commit-commands） |

commit-commands がインストール済みなら前半（コミット〜PR作成）はそれに委譲し、本スキルは
「PR が既にある、またはこれから作る」ところから**マージ以降**を担当する。commit-commands が
無い環境では、git/gh を直接使って前半も自前で行う。

## 中核ルール

1. **マージは CI・チェックの状態を確認してから行う。** 失敗しているチェックがあれば、
   マージを強行せず状況を報告する。
2. **マージ方式（merge commit / squash / rebase）はリポジトリの既定に従う。** 不明なら確認する。
3. **force 系操作は行わない**（`git push --force`、`git reset --hard` 等）。
4. **マージ後は必ず**: `git checkout main && git pull` → 取り込んだブランチをリモート・
   ローカル双方で削除 → commit-commands が導入済みなら `/clean_gone` を案内。
5. **本スキルの発動そのものが「明示的な指示」とみなす。** グローバル CLAUDE.md 等に
   「明示的な指示がない限り git commit/push しない」という規約があっても、
   ユーザーが本スキルを呼び出した（または上記トリガー文言で依頼した）時点で
   コミット・push・マージの実行指示として扱ってよい。

## ワークフロー

1. 変更内容を確認する（`git status` / `git diff`）。
2. commit-commands が使えるか確認する。
   - 使える・まだコミットしていない → `/commit-push-pr` に委譲して PR 作成まで進める。
   - 使えない、または既に PR がある → 自前で: 論理単位にコミット分割 → push →
     `gh pr create` で PR 作成（無ければ）。
3. CI・レビュー状態を確認する（`gh pr checks` 等）。問題があれば報告して止まる。
4. 問題なければマージする（`gh pr merge`）。
5. `git checkout main && git pull` を実行する。
6. 取り込んだブランチを削除する（ローカル・リモート）。commit-commands があれば `/clean_gone` を案内。
7. 作業中に生じた一時ファイルがあれば列挙し、削除・移動を提案する。
8. 完了報告する（PR URL・マージコミットのハッシュ）。

## やらないこと

- レビュー承認の代行（人間のレビューが必要なら待つ）。
- CI 失敗時にマージを強行すること。
- backlog.md の更新（→ `backlog-loop` の責務）。
- git が使えない環境で無理に動作しようとすること（→ 発動しない）。

## 連携

- `backlog-loop` の最終ステップから委譲されることを想定している（マージ後、呼び出し元が
  backlog を更新する）。
- 会社 PC（git なし）では利用不可。`sonnet-setup/MODEL-GUIDE.md` の会社プロファイルを参照。
