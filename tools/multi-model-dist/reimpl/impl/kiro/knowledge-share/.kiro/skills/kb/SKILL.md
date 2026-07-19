---
name: kb
description: >-
  リポジトリ横断のナレッジベース（~/.kiro/knowledge/）に知見を記録・検索する Kiro 版スキル。
  記録は「ナレッジに残して」「これ知見化して」、検索は「前にも見たエラー？」「これ既知の問題？」で発動し、
  エラー再解決の前に index と topics を grep する。手動では kb（記録）、kb search <語>（2段 grep）、
  kb promote（プロジェクト固有の知見を横断へ昇格）。記録時はトークン・内部ホスト名・顧客データを必ず
  サニタイズし、本文は他リポジトリで再利用できる一般形にする。共有仕様は
  multi-model-dist/reimpl/SPEC/self-improve-and-knowledge-share.md を正本とする。
---

# ナレッジベース（kb・Kiro 版）

複数セッション・複数リポジトリで解決した知見を `~/.kiro/knowledge/` に貯め、次に同じ問題へぶつかったとき即座に引く。

- **インデックス** `~/.kiro/knowledge/index.md` … 1エントリ＝1行。
  **Kiro では `@import` の代わりに steering `kb-index.md`（`inclusion: always`）が自動読込の役割**を果たす
  （index の要約を steering 側に置く、または steering から index を参照する運用）。
- **トピック本体** `~/.kiro/knowledge/topics/<topic>.md` … エントリの中身（kebab-case・オンデマンドで開く）。
- インデックスは **200行 / 25KB 以内**に保つ。

> CC 版（`~/.claude/knowledge/` ＋ `@import`）との差分は SPEC K2 の対応表を参照。中核の書式・3モード・サニタイズは同一。

## モード1: 記録（既定）

1. **重複チェック**: `~/.kiro/knowledge/index.md` を読む。同じ問題があれば新規追加せず更新する。
2. **トピック選定**: `topics/<topic>.md`（git / docker / python / kiro など）。無ければ新規 kebab-case。
3. **本体を追記**（下記フォーマット）。
4. **index に1行**: `- [KB-YYYYMMDD-NN] <タイトル> — topics/<topic>.md #タグ`（`NN` は同日連番）。
5. **予算チェック**: index が 200行/25KB 超なら最古の行を `index-archive.md` へ移す（本体は消さない）。
6. **steering 同期**: `kb-index.md`（steering）が index の要約を持つ運用なら、追加分を反映する。

### エントリ・フォーマット（topics/*.md）

```
## KB-20260612-01: <一行タイトル>
- 日付 / 出典: <リポジトリ名 or プロジェクト>（session: <id 先頭8桁>）
- 環境: <ツール・バージョン>
- 問題: <他リポジトリでも起こり得る一般形で>
- 原因: <なぜ起きたか>
- 対処: <コピペで再現できる手順・コマンド>
- 物証: <エラーメッセージの核心1行 / 確認コマンド>
- タグ: #git #docker
- 昇格: <成果物パス>   # 任意。self-improve(improve-apply) が昇格時に一度だけ追記
```

## モード2: 検索（kb search <語>・読み取り専用）

1. **1段目**: `grep -i "<語>" ~/.kiro/knowledge/index.md`
2. **2段目**: ヒットした topic、または `grep -rin "<語>" ~/.kiro/knowledge/topics/`
3. 見つかれば対処を要約提示（「過去に KB-… で解決済み」）。無ければ「既存ナレッジには無し」と伝えて通常調査。

> エラー直面時は、明示されなくてもまず黙ってこの検索を走らせて既知かを確認してよい。

## モード3: 昇格（kb promote）

プロジェクトに閉じた知見を横断ナレッジへ一般化して引き上げる。Kiro の自動メモリ/プロジェクト指示があれば候補元として読み、
**他リポジトリでも役立つものだけ**を一般形に書き換えてモード1で記録する（固有の規約・ディレクトリ名・ビジネスルールは昇格しない）。

## self-improve 連携（昇格ライフサイクル）

- index 行のタグに `#promote`（候補）/`#promoted`（昇格済み）を付けてよい。
- `kb-harvest` が反復・ワークフロー級の知見に `#promote` を付け、`improve-scan` に拾わせる。
- 昇格の確定（`#promote→#promoted`・`- 昇格:` 追記）は **self-improve 側（improve-apply）**が行う。昇格先は Kiro 資産（steering/skills/agents/hooks）。

## ハードルール（記録時に必ず守る）

- **機密サニタイズ**: APIキー・トークン・内部ホスト名・IP・顧客データ・個人情報を記録しない。エラーは核心1行のみ。
- **一般化**: 本文は他リポジトリで再利用できる形。固有情報は「日付 / 出典」欄に隔離。
- **小さく保つ / 重複させない**: index は予算内。記録前に必ず index を確認し、既存があれば更新で済ませる。
