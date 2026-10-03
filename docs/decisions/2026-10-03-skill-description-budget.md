# 2026-10-03 — スキル description の予算超過を実測し、長い10件を短縮した

## 問題

ユーザーから「スキルが自動で発火しない」という声があった（[同日の記録](2026-10-03-skill-usability-and-mattpocock.md)）。
公式仕様の次の2点が原因候補になる（[Skills](https://code.claude.com/docs/en/skills)、2026-10-03 取得）。

- スキル一覧の description には**文脈の1%という予算**がある。超えると一部の description が落とされ、
  Claude が依頼と突き合わせるための発火語が消える
- description と when_to_use の合計は、1スキルあたり 1,536 字で切られる

本リポジトリの自動発火スキル（`disable-model-invocation` でないもの）は26件ある。
YAML で読んだ description の合計は約 9,400 字だった。CI には agent description の予算検査はあったが、
skill の予算検査は無かった。

## 実測1 — スキル一覧に description が残っているか

方法: `claude -p` に `--plugin-dir` で9プラグインをすべて載せ、ツールを使わずに
「一覧の全スキルについて、description が見えるか（yes / no）」を答えさせた。
このセッションの環境には、別に `anthropic-skills` プラグイン（13スキル）などが入っている。

| 条件 | モデル | description が見えないスキル |
|---|---|---|
| 本リポジトリのプラグイン無し（対照） | Sonnet 5.5 | 0件（30スキル中） |
| 9プラグインあり・短縮前 | Sonnet 5.5（2回）・Opus 5.5（1回） | **6件**（`anthropic-skills` の docx・google-workspace・pdf・pptx・skill-creator・xlsx。3回とも同じ） |
| 9プラグインあり・短縮後 | Sonnet 5.5・Opus 5.5 | **1件**（xlsx） |

- 本リポジトリの26スキルは、どの条件でも description が見えていた
- 予算は全プラグインで共有なので、本リポジトリの description が**同居する他プラグインのスキルを押し出していた**
- 逆向きも起こりうる。`mattpocock-skills`（27スキル）などを足せば、次に落ちるのは本リポジトリのスキルである可能性が高い。
  「自動で発火しない」の原因として、少なくとも本リポジトリが関与しうることを確認した
- この方法はモデルの自己申告による。一覧の生データを直接見たわけではない。ただし対照ありで3回とも同じ6件が落ち、
  短縮で5件が戻ったので、結果の向きは信頼できると判断した

## 対応 — 400字を超える10件を短縮した（ユーザーが「長いものだけ短縮」を選択）

| スキル | 短縮後（字） | プラグイン（version） |
|---|---|---|
| project-catchup | 227 | codebase-setup 0.6.0 → 0.6.1 |
| codebase-map | 205 | 同上 |
| context-audit | 224 | 同上 |
| adoption-review | 205 | adoption-review 0.2.0 → 0.2.1 |
| deep-understand | 194 | learning-coach 0.1.2 → 0.1.3 |
| task-pipeline | 218 | pipeline（このブランチ系列で 2.5.1 に上げ済み） |
| feature-pipeline | 231 | 同上 |
| verify-fresh | 217 | model-setup 3.7.0 → 3.7.1 |
| review-panel | 212 | agent-review-panel 0.6.0 → 0.6.1 |
| codex-ask | 245 | cli-bridge 1.1.0 → 1.1.1 |

短縮の方針:
- ユーザーが実際に言う発火語は残し、前半に置いた
- 「〜には任せる」は、隣接スキルとの衝突に効くものだけを残した
- 機構の説明（エージェント名の列挙・出力の細目）は本文に任せた

自動発火スキル26件の合計は 7,383 字になった。

CI の「SKILL.md 検査」に、自動発火スキルの description 合計の予算 **7,500 字**を足した。
短縮後でも1件が落ちているので、この値は「これ以上増やさない」ための上限である。上げるときは実測1をやり直す。

## 実測2 — 短縮で発火の精度が落ちていないか（`claude plugin eval`）

[`docs/evals/triggers.md`](../evals/triggers.md) の32ケースを使った。対象は同一プラグイン内の衝突組で、
各スキルに should と not を2件ずつ置いた。

- model-setup: task-brief / long-run / fan-out / backlog-loop / verify-fresh
- pipeline: clarify / build-with-tests / feature-pipeline

採点は `tool_used`（`tool: Skill`）の grader で、ケースは Skill ツールだけを許可して最大2ターンにした。
実行条件は `--ablation none --runs 1 --no-publish`、モデルは Sonnet 5.5。

| | model-setup（20件） | pipeline（12件） | 費用 |
|---|---|---|---|
| 短縮前 | 20/20 | 12/12 | $1.92 |
| 短縮後 | 20/20 | 12/12 | $1.85 |

- 短縮による劣化は無かった
- 同時に、**1プラグインだけを載せた状態では、もともと発火は正しかった**ことも分かった
- したがって、ユーザーが感じている「発火しない」の主因は、同一プラグイン内の description の書き方ではない。
  次の2つのほうが疑わしい
  - 多くのプラグインを同居させたときの予算超過（実測1）
  - プラグインをまたぐ衝突。`claude plugin eval` は1プラグインずつしか載せられず、この組は測れていない
- 測定の限界: 1ケース1回で、件数も少ない。should の依頼はスキル名を思い出させやすい言い回しに寄っている可能性がある

## 利用者向けの示唆（README に反映済み）

- **入れるプラグインは必要なものに絞る。** 予算は全プラグインで共有なので、入れすぎるとどれかの description が落ちる
- 迷ったら本体の `/skills` で一覧を見るか、自然文で「どのスキル？」と聞く

## 積み残し

- xlsx の1件はまだ落ちる。全件を 250 字程度に短縮するか、ユーザーが打つ前提のスキル（pr-merge・backlog-loop・judge-eval 等）を
  `disable-model-invocation` にして一覧から外すかは、利用環境で落ちるスキルを確認してから決める
- プラグインをまたぐ衝突（clarify と task-brief、verify-fresh と review-panel など）の発火は、`claude plugin eval` では測れない。
  測るなら複数の `--plugin-dir` を載せた `claude -p` で、Skill の呼び出しを数える仕組みが要る
