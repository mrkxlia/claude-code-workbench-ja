---
name: improve-scan
description: >-
  直近セッションのログ（と、あれば横断ナレッジ ~/.kiro/knowledge/）から「改善の種」を発見して、
  プロジェクト単位のローカル backlog に書き出す Kiro 版スキル。git も使わずローカル完結する。
  成功ルート（ツール呼び出し履歴 vs SKILL.md の客観突合）と失敗ルート（訂正・繰り返し・行き詰まり・
  自力回避・外部レビュー）の2系統で分類し、各候補に根拠を添える。「改善の種を集めて」「最近のセッションを
  振り返って改善候補を出して」や、SessionStart の通知（未処理 N 件）、improve-scan [--days N] で発動する。
  ファイルは編集せず候補を backlog に貯めるだけ。共有仕様は
  multi-model-dist/reimpl/SPEC/self-improve-and-knowledge-share.md を正本とする。
---

# improve-scan（Kiro 版）— 改善の種を発見して backlog に貯める

単発セッションの**訂正・繰り返し・行き詰まり**や、**実態とスキル定義のズレ**を拾い、改善候補（backlog）として記録する。
**ここではファイルを一切変更しない**（適用は improve-apply）。git も使わずローカル完結。

## 使い方

- `improve-scan`（既定・回収キュー対象）／`--queue`（明示）／`--days N`（直近 N 日のログ・フォールバック）。

> **[要確認] Kiro のセッションログ形式・場所はバージョン依存。**確認できるまで `--days`/パス指定を一次手段にする（SPEC K3）。

## 入力ソース

- **基本は回収キュー**: SessionEnd フック（`si-session-end`）が transcript パスを `~/.kiro/self-improve/<project>/queue.tsv` に積む。
- **kb のキューも一級ソース（連携）**: `~/.kiro/knowledge/queue/pending-sessions.tsv` があれば併せて読む。両キューとも
  2列目が `session_id`・4列目が `transcript_path` の同型なので `session_id` で union・dedup。
- **`--days N` のときだけ** Kiro のログ保管場所を期間で走査（`[要確認]`）。
- **横断ナレッジ（あれば）**: `~/.kiro/knowledge/` のエントリも読む（昇格候補）。

## 2系統で分類する

- **skills-evolve（成功ルート＝客観突合）**: ログを Skill 起動でセグメント分割し、各セグメントのツール呼び出し列を
  当該スキルの SKILL.md「フロー」と突合。スキップされた手順（条件付き化候補）／文書に無い手順（新フェーズ追記候補）を拾う。
- **skills-learn（失敗ルート）**: 訂正（「そうじゃなくて」「やり直して」）/ 繰り返し指示 / 行き詰まり / エラー自力回避 / 外部レビューの指摘。

## シグナルと構造化

- 種別: 訂正 / 繰り返し / 摩擦 / 機能ギャップ（→新スキル候補）/ 成功技法（→定着候補）/ ワークフロー選好（→steering/ルール候補）。
- 各候補に 頻度・一貫性（HIGH/MED/LOW）・定型ステップ割合 と WHAT/HOW/FLOW、**根拠（どのセッション/位置で何が起きたか）**。

## 昇格候補（kb 連携・あれば）

- `#promote` 付きの kb エントリ（`~/.kiro/knowledge/index.md`）。
- ログ上で再発しているのに kb に既存エントリがあるもの（**再発回数は improve-scan がログから数える**・kb は書き換えない）。
- backlog に「昇格候補: KB-… を steering/skill/agent へ昇格（根拠: N 回再発 / `#promote`）」として記録。`#promoted`・`- 昇格:` 済みは候補にしない。

## 出力先

```
~/.kiro/self-improve/<project>/improvement-backlog.md
```

- `<project>` キーはフック・スキル共通: cwd を `.kiro/`/`CLAUDE.md` を持つ最近接上位へ正規化 → `printf '%s' "$root" | cksum | cut -d' ' -f1`。
- **リポジトリ外に置く**ためコミット混入なし。**サニタイズ必須**（生ログ・絶対パス・秘密を書かない）。却下済み/合法的例外を読み、同じ候補を再提案しない。

## やらないこと

- ファイルを編集する（発見のみ・適用は improve-apply）／生ログ・秘密を backlog に書く／git・GitHub を使う。
