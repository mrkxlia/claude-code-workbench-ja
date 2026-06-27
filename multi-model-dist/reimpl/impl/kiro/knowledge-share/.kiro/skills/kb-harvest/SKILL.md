---
name: kb-harvest
description: >-
  過去のセッションログからナレッジ候補を掘り起こし、横断ナレッジベース（~/.kiro/knowledge/）に記録する
  Kiro 版スキル。SessionStart の通知（未回収 N 件）を見たとき、または「過去の会話からナレッジ化して」
  「溜まったセッションを振り返って知見にして」などで発動。手動では kb-harvest（既定 --queue）、
  kb-harvest --days N、kb-harvest <path>。候補を抽出スクリプトで絞り、エラー→解決のペアに束ねて
  採否を判定し、kb と同じ形式・同じサニタイズで記録する。共有仕様は
  multi-model-dist/reimpl/SPEC/self-improve-and-knowledge-share.md を正本とする。
---

# ナレッジ採掘（kb-harvest・Kiro 版）

SessionEnd フックが「エラー痕跡あり」と判断したセッションは `~/.kiro/knowledge/queue/pending-sessions.tsv` に積まれている。
このスキルはそれら（または任意のセッションログ）を振り返って `kb` と同じ形式でナレッジ化する。ログ全文は読まず、まず候補を絞るのが肝。

> **[要確認] Kiro のセッションログの形式・場所はバージョン依存。**確認できるまでは `--days`/パス指定を一次手段にし、
> フック自動キューは形式確認後に有効化する（SPEC K3）。CC の `~/.claude/projects/*.jsonl` 相当を Kiro 側で特定する。

引数: `--queue`（既定・キュー処理）／`--days N`（直近 N 日のログ）／`<path>`（指定1本）。

## ワークフロー

1. **候補抽出**: 抽出スクリプトでログから `[ERROR]/[FIX]/[USER]` ラベル付きの行番号入り抜粋を得る（全文は読まない）。
   Kiro のログ形式に合わせた抽出（`~/.kiro/knowledge/bin/kb-extract-candidates.sh` 相当）を使う。`[要確認]`
2. **ペアに束ねる**: 同じログ内で `[ERROR]`（問題）とその後の `[FIX]`/`[USER]`（解決・修正指示）を時系列で結ぶ。
   文脈不足のときだけ近傍を覗く（`sed -n '120,145p'` 等・全読み禁止）。
3. **採否を判定**: **再発性**（他リポジトリでも起こり得る）∧ **解決確認**（実際に解決）の両方を満たすものだけ記録。迷う候補はユーザーに確認。
4. **記録**: `kb` と完全に同じ形式・同じサニタイズで `topics/<topic>.md` に追記し index に1行。出典 session はログのファイル名先頭8桁。予算超過は archive へ。
5. **キュー更新**: 処理済み session_id を `queue/pending-sessions.tsv` から削除（`--queue` 時）。
6. **昇格候補フラグ（self-improve 連携・任意）**: 反復・ワークフロー級の知見は index 行のタグに `#promote` を付ける。`improve-scan` が拾う。
7. **報告**: 記録 N 件 / スキップ M 件（うち `#promote` K 件）を簡潔に。

## 注意

- ログにはユーザーの生入力・ログ・出力が含まれる。**機密はナレッジに写経しない**（一般化＋核心1行の物証のみ）。
- 1回で大量に記録しない。質の高い再利用可能な知見に絞る。
- `--days` は SessionEnd の取りこぼし救済。ログが消える前に早めに回収する。
