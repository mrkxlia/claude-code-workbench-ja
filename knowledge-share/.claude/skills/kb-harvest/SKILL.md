---
name: kb-harvest
description: >-
  過去のセッション（トランスクリプト jsonl）からナレッジ候補を掘り起こし、横断ナレッジ
  ベース（~/.claude/knowledge/）に記録する。セッション開始時に「未回収のセッションが N 件
  あります」と注入されたとき、または「過去の会話からナレッジ化して」「溜まったセッションを
  振り返って知見にして」「jsonl から学びを拾って」などで発動する。手動では
  /kb-harvest（既定は --queue）、/kb-harvest --queue（回収キュー）、/kb-harvest --days N
  （直近 N 日のトランスクリプト）、/kb-harvest <path.jsonl>（指定ファイル）。
  抽出スクリプトで候補を絞り、エラー→解決のペアに束ねて採否を判定し、/kb と同じ形式・
  同じサニタイズで記録する。
---

# ナレッジ採掘 (/kb-harvest)

SessionEnd フックが「エラー痕跡あり」と判断したセッションは
`~/.claude/knowledge/queue/pending-sessions.tsv` に積まれている。
このスキルは、それら（または任意の jsonl）を振り返って `/kb` と同じ形式で
ナレッジ化する。jsonl を全文読むのではなく、まず抽出スクリプトで候補を絞るのが肝。

引数:

- `--queue`（既定）— キューに積まれたセッションを処理する
- `--days N` — `~/.claude/projects/` の直近 N 日の jsonl を処理する
  （SessionEnd を取りこぼした分の補完。`cleanupPeriodDays`＝既定30日で消える前に回収）
- `<path.jsonl>` — 指定した1本だけを処理する

---

## ワークフロー

1. **候補抽出**: 抽出スクリプトを実行する（jsonl 全文は読まない）。

   ```bash
   bash ~/.claude/knowledge/bin/kb-extract-candidates.sh --queue
   # または: ... --days 7   /   ... <path.jsonl>
   ```

   出力は `[ERROR] / [FIX] / [USER]` ラベル付きの行番号入り抜粋（ファイルごと最大40件）。

2. **ペアに束ねる**: 同じファイル内で `[ERROR]`（問題）と、その後の `[FIX]` / `[USER]`
   （解決・修正指示）を時系列で結びつけ、1つの「問題→解決」の塊にする。
   文脈が足りないときだけ、近傍をピンポイントで覗く（jsonl 全読みは禁止）:

   ```bash
   sed -n '120,145p' <path.jsonl>   # 抽出で出た行番号の前後だけ
   ```

3. **採否を判定**: 次の両方を満たすものだけ記録する。
   - **再発性**: 他のリポジトリ／別のセッションでも起こり得る一般的な問題か
     （そのプロジェクト固有の一回限りの事情なら捨てる）。
   - **解決確認**: 実際に解決した／回避できたことが読み取れるか
     （未解決・途中放棄は記録しない）。
   迷う候補はユーザーに「これは記録する価値がありますか？」と確認する。

4. **記録**: 採用したものを `/kb` と**完全に同じ形式・同じサニタイズ**で
   `~/.claude/knowledge/topics/<topic>.md` に追記し、`index.md` に1行足す。
   - 機密（トークン・内部ホスト名・顧客データ）は写さない。エラーは核心1行のみ。
   - 出典の session は jsonl のファイル名（session-id）先頭8桁を使う。
   - index.md の予算（200行 / 25KB）を超えたら古い行を index-archive.md へ退避。

5. **キューを更新**: 処理し終えた session_id の行を
   `queue/pending-sessions.tsv` から削除する（`--queue` 実行時のみ）。

   ```bash
   # session_id は TSV の2列目（データ契約）。部分一致 grep だと別行の cwd や
   # transcript_path に偶然含まれる未処理行まで消すため、必ず2列目で厳密一致させる
   Q="$HOME/.claude/knowledge/queue/pending-sessions.tsv"
   awk -F'\t' -v sid="<session_id>" '$2 != sid' "$Q" > "$Q.tmp" && mv "$Q.tmp" "$Q"
   ```

6. **昇格候補フラグ（self-improve 連携・任意）**: 記録した知見のうち、**反復して出る・
   ワークフロー級**（毎回同じ手順、特定パターンの繰り返し、ルール化すると効くもの）は、
   index 行のタグに **`#promote`** を付ける（例: `… topics/git.md #git #promote`）。
   `self-improve` を入れていれば `/improve-scan` がこれを「昇格候補」として拾い、`/improve-apply` で
   `.claude/rules`・skill・CLAUDE.md へ昇格できる（昇格の確定は improve-apply 側が行う）。
   self-improve が無い環境では単なるタグなので無害。

7. **報告**: 記録 N 件 / スキップ M 件（うち `#promote` 付与 K 件）と、その内訳を簡潔に伝える。
   判断に迷ってユーザー確認に回した候補があればここで挙げる。

---

## 注意

- jsonl にはユーザーの生の入力・ログ・出力がそのまま含まれる。**機密はナレッジに
  写経しない**。記録するのは一般化した問題・原因・対処と、核心1行の物証だけ。
- 1回の採掘で大量に記録しない。質の高い再利用可能な知見に絞る。
- `--days` は SessionEnd の取りこぼし救済用。トランスクリプトは既定30日で消えるので、
  気づいたら早めに回収する。
