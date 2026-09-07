# self-correct — 自己修正ループ（作る役と検査する役を分ける）

AI に仕事を任せても、最後に人間が全部チェックしているなら、確認する人間がボトルネックに
なります。100件を数分で作れても、100件を人間が検品するなら速くなっていません。

このプラグインは、**「作る役」だけでなく「ミスを見つける役」と「修正して再検査する仕組み」**を
Claude Code の中に用意します。

```
作る（loop-builder） → 検査する（loop-judge） → 問題を特定する
  → FAIL した箇所だけ修正する → もう一度検査する → 合格したら終了 / 上限なら人間へ
```

Anthropic が実用的なエージェント設計として紹介している **Evaluator-Optimizer**
（生成した成果物を別の評価プロセスが検査し、そのフィードバックで改善する）の実装です。

## なぜ「もう一度見直して」では足りないのか

最初に間違えた Claude が、同じ文脈・同じ前提・同じ評価基準で見直しても、同じ盲点を
もう一度見逃します。

```
Claude: A社の月額料金は9,800円です。
Claude: 見直しました。問題ありません。
```

公式料金ページが12,800円なら、両方とも間違いです。**AI が自分の回答に同意したことと、
現実に正しいことは別です。** だからこのプラグインは、

1. **生成と評価を分離する** — 別コンテキスト・別ツール権限のサブエージェントにする
2. **評価に成果物の外の根拠（Ground Truth）を持たせる** — 元資料・テスト結果・公式ページ
3. **停止条件を機械で持つ** — 最大回数・同じ FAIL の連続・人間へ戻す条件

の3点を型にしています。

## 収録物

### スキル3種

| スキル | 起動 | 役割 |
|--------|------|------|
| **self-correct** | `/self-correct`・自然文 | 中核のループ。Define → Build → Judge → Decide → Retry → Stop |
| **judge-eval** | `/judge-eval`・自然文 | **Judge 自身**を正解つきサンプルで採点し、本番投入の可否を決める |
| **self-correct-setup** | `/self-correct-setup` のみ（明示専用） | 対象リポジトリを実測して導入。Ground Truth の候補・評価基準の雛形・フック配線 |

### サブエージェント3種

| エージェント | ツール | 役割 |
|-------------|--------|------|
| **loop-builder** | Read, Grep, Glob, Edit, Write, Bash | 作る・直す。**合否は宣言しない** |
| **loop-judge** | Read, Grep, Glob, Bash, WebFetch | 検査して PASS / FAIL / UNVERIFIED を判定。**Edit / Write を持たない** |
| **judge-auditor** | Read, Grep, Glob | Judge の判定を採点する（見逃し・過検出・重大度誤り・根拠欠落） |

**検査する人と直す人を、プロンプトの約束ではなくツール権限で分離**しているのが要点です。
Judge は書き込みツールを持っていないため、指摘した箇所を自分で直して合格させることが
構造的にできません。

### フック2種（プラグイン導入で自動配線・ループ稼働中だけ効く）

| フック | イベント | 効果 |
|--------|---------|------|
| **loop-stop-check** | Stop | 状態ファイルを読み、ループが未完了なら停止を止めて次の一手を促す。**上限到達・進捗なし2ラウンド連続では引き継ぎ（ESCALATE）を、リグレッション検出時は指摘外の変更の差し戻しを促す** |
| **guard-ground-truth** | PreToolUse（Edit/Write/NotebookEdit） | 判定の根拠（元資料・仕様・fixture）への書き込みを `exit 2` で拒否する |

どちらも `.claude/self-correct/state.json` が無いか `status` が `ACTIVE` でなければ**素通り**
します。ループを回していないときの通常作業には影響しません。

## 導入

```
/plugin marketplace add mrkxlia/claude-code-workbench-ja
/plugin install self-correct@workbench-ja
```

導入したら、対象リポジトリで `/self-correct-setup` を実行してください（Ground Truth の実測と
評価基準の雛形づくり、CLAUDE.md への行動ルール追記まで案内します）。

コピー導入する場合は `skills/`・`agents/` を `.claude/` 配下へ、`hooks/*.sh` を
`.claude/hooks/` へコピーし、`setup/settings.json` を `.claude/settings.json` にマージします
（フックは bash 系のため Windows は Git Bash / WSL が必要。`jq` は不要）。

## 使い方（最短）

```
/self-correct drafts/article.md を references/ と突き合わせて仕上げて
```

Phase 0 で目的・評価基準・Ground Truth・変更禁止範囲・最大回数を確定して承認を取り、
そのあと Builder → Judge → 判断 → 修正 → 再検査を回します。

## 本体機能との関係（再実装していないもの）

| 本体機能 | このプラグインでの扱い |
|---------|----------------------|
| `/goal` | **再実装しない。ループ外側の完了判定として併用する。** `/goal` の評価器はツールを持たず、判定材料は会話に出た内容だけなので、実ファイル・テスト結果に基づく検査は `loop-judge` が担当する |
| prompt 型 Stop フック | 同じ理由でファイルを開けない（`/goal` 自体が session スコープの prompt 型 Stop フックのラッパー）。本プラグインは**状態ファイルを読む command 型**で決定的に判定する |
| agent 型フック（`type: "agent"`） | **採らない。** ファイルを読みコマンドを実行できるフックだが、公式ドキュメントが「実験的。本番ワークフローでは command フックを推奨」と明記している。根拠に基づく検査は `loop-judge`（Task）、停止ゲートは command 型に分ける |
| Task サブエージェント | そのまま使う。役割・ツール権限・戻り値契約を定義したのがこのプラグイン |
| Permissions | そのまま使う。`/goal` を設定しても権限は広がらないため、危険操作の制限は従来どおり permissions で行う |

## 他プラグインとの住み分け

| やりたいこと | 使うもの |
|-------------|---------|
| 完了したか**1回だけ**確かめたい | `verify-fresh`（model-setup）— ループも修正もしない |
| 複数視点で**批評・討論**させたい | `review-panel`（agent-review-panel）— 合否ではなく論点を出す |
| 機能開発を**工程連鎖**で通したい | `feature-pipeline` / `task-pipeline`（pipeline）— 人間承認チェックポイント付き |
| 別 AI に**セカンドオピニオン**を求めたい | `codex-review`（codex-bridge）・`kiro-review`（kiro-bridge） |
| **作る→検査→直す→再検査**を自動で回したい | **self-correct** |

pipeline の中で使うこともできます（成果物を作るフェーズの内側で `/self-correct` を回し、
パイプラインの承認チェックポイントには合格した成果物だけを載せる）。

## 限界（過信しないこと）

- **状態ファイルを書くのは、判定される側の Claude 自身です。** `loop-stop-check.sh` は
  `.claude/self-correct/state.json` を読んで停止を判定しますが、その block 理由文は
  判定される側に向けて「`status` を `PASS` にする」「`ESCALATED` に更新してください」と
  指示しています。**解除キーを判定対象が握る**構造なので、このゲートは**善意を前提とした
  進行の矯正**であって、セキュリティ境界ではありません。第三者は Stop フックの品質ゲートに
  対して、(a) ゲートを実行せず合格マーカーだけを出力する、(b)「すでに実行済み」と主張して
  スキップする、(c) ブロック後に短い返事だけを返して上限まで回す、(d) 状態ファイルを
  書き換えてループから抜ける、の4類型を報告しています
  （[Stop Hook でsimplifyを強制したら、Claude がズルを覚えた話](https://zenn.dev/kok1eeeee/articles/claude-code-stop-hook-quality-gate-gaming)、2026-09-06 取得）。
  迂回が起きていないかは、`verdict` と `status` の整合を人が見る／`/judge-eval` で Judge
  そのものを検定する、の2つで確かめてください。
- **Stop フックは「別のターンを起動する」仕組みではありません。** 公式ドキュメントは
  「ネストされた Stop フックは無視されるため、Stop 内で別のターンをトリガーすることは
  できません」「フックが同じ条件に対して永続的に `decision: "block"` を返す場合、Claude は
  永遠にループ状態に陥る可能性があります」と明記しています
  （[Hooks](https://code.claude.com/docs/ja/hooks)、2026-09-06 取得）。実害の報告もあります
  （anthropics/claude-code [#55754](https://github.com/anthropics/claude-code/issues/55754) は
  Stop フックが返し続けたブロックで約50分・100回超のループになりセッション配分を消費）。
  本プラグインの `loop-stop-check.sh` は、同じ `updated` 値に対する block を
  `.claude/self-correct/.stop-nudge` で1回に制限しており、ループが前進しない限り2度目は
  素通りします。**この「1状態1ナッジ」は上記を構造的に避けるための設計**であり、外さないでください。
- **ゲートが効くのはループ稼働中だけです。** 状態ファイルが無い・`status` が `ACTIVE` でない・
  `attempt` / `max_attempts` が壊れている場合は、いずれも素通り（exit 0）します。
  作業を止めないことを優先した設計で、検知漏れは仕様です。

## 本番投入前チェックリスト

- [ ] Builder と Judge を分離した
- [ ] Judge が成果物を編集できない（ツール権限で確認した）
- [ ] PASS / FAIL / UNVERIFIED の基準を明文化した
- [ ] 公式資料・テストなど**確認できる根拠**がある
- [ ] 機械で判定できることを Claude の感想に任せていない
- [ ] FAIL 理由を Builder へ具体的に返している（場所・証拠・最小修正指示）
- [ ] 問題がない箇所を再生成しない運用になっている
- [ ] 最大修正回数・最大ターン数がある
- [ ] **リグレッション**（前ラウンド PASS の基準が FAIL に転じた）と**進捗なし**（未解決件数が
      減らない）を毎ラウンド計算し、状態ファイルに書いている
- [ ] 高リスク操作（送信・公開・削除・課金）は人間確認を残している
- [ ] **`/judge-eval` で Judge そのものを検定した**

## リスク別の完了のさせ方

| リスク | 例 | 完了のさせ方 |
|--------|-----|-------------|
| 低 | 誤字・体裁・ファイル形式・テストを通す修正 | ループ完了で自動終了 |
| 中 | 記事・調査レポート・提案資料 | ループ完了後に人間の最終確認 |
| 高 | 契約・返金・送金・本番データ削除・対外連絡 | 実行前に人間の承認。ループは草案までで止める |

自己修正できることと、人間を外してよいことは別です。目的は**人間が確認すべき場所だけを
残す**ことであって、人間をゼロにすることではありません。

## ファイル構成

```
plugins/self-correct/
├── README.md                 このファイル
├── CLAUDE.md                 導入先へコピーする CLAUDE.md 雛形（行動ルール）
├── .claude-plugin/plugin.json
├── skills/
│   ├── self-correct/                  中核ループ
│   │   ├── SKILL.md
│   │   └── references/{ground-truth,criteria,handoff}.md
│   ├── judge-eval/SKILL.md            Judge の検定
│   └── self-correct-setup/SKILL.md    導入（明示専用）
├── agents/{loop-builder,loop-judge,judge-auditor}.md
├── hooks/{loop-stop-check.sh,guard-ground-truth.sh,hooks.json}
└── setup/settings.json       コピー導入用のフック配線サンプル
```

## 出典

- Anthropic「Building effective agents」の Evaluator-Optimizer パターン
- [Claude Code 公式ドキュメント `/goal`](https://code.claude.com/docs/en/goal)（2026-09-06 取得）
  — 「The evaluator ... does not call tools, so it can only judge what Claude has already
  surfaced in the conversation.」「The condition can be up to 4,000 characters.」
  「A goal doesn't change your permission mode.」
- [Claude Code 公式ドキュメント Hooks guide](https://code.claude.com/docs/en/hooks-guide)（2026-09-06 取得）
  — agent 型フックについて「Agent hooks are experimental. ... For production workflows,
  prefer command hooks.」
- Claude Code 公式ドキュメント（Subagents・Permissions）
