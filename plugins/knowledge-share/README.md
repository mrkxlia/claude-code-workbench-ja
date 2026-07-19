# knowledge-share — セッション/リポジトリ横断ナレッジ共有

複数のセッション・複数のリポジトリで開発していると、**あるセッションで解決した問題
（エラー対処・ハマりどころ）が、別のセッションや別のリポジトリに引き継がれず揮発する**。
同じエラーを毎回ゼロから調べ直すことになる。

このセクションは、その問題を **Claude Code の公式機能の組み合わせだけ**で解決する汎用
テンプレートです。独自の常駐プロセスや外部サービスは使わず、各コンポーネントを公式機能に
1対1で対応させています。他のセクションには依存せず、これ単体で完結します。

> **位置づけ**: Claude Code の自動メモリは「プロジェクト単位」
> （`~/.claude/projects/<project>/memory/`）です。本テンプレートはそれを
> **リポジトリ横断**に広げたもので、構造（インデックス＋トピック分割、200行/25KB の
> サイズ予算）も公式の自動メモリに揃えています。

---

## Claude Code の仕様でどう解くか

| やりたいこと | 使う公式機能 | 出典 |
|---|---|---|
| 全リポジトリ・全セッションで知見インデックスを自動読み込み | **ユーザーメモリ** `~/.claude/CLAUDE.md` ＋ **@import 構文**（`@~/.claude/knowledge/index.md`） | [memory](https://code.claude.com/docs/en/memory) |
| 知見ベースの構造 | **自動メモリの構造を踏襲**：インデックス（先頭 200行 / 25KB の予算）＋トピック別ファイルのオンデマンド読み込み | [memory](https://code.claude.com/docs/en/memory) |
| 記録・検索・採掘の操作 | **ユーザーレベル skills** `~/.claude/skills/<name>/SKILL.md`（全プロジェクトで自動発見・発動） | [skills](https://code.claude.com/docs/en/skills) |
| セッション終了時の回収キュー | **SessionEnd フック**（`~/.claude/settings.json` ＝ 全プロジェクト適用。stdin に `session_id` / `transcript_path` / `cwd`） | [hooks](https://code.claude.com/docs/en/hooks) |
| 未回収の通知 | **SessionStart フック**（matcher: `startup\|resume`、stdout がコンテキストに注入される） | [hooks](https://code.claude.com/docs/en/hooks) |
| 過去会話の採掘元 | **トランスクリプト** `~/.claude/projects/<project>/<session-id>.jsonl`（保持期間は `cleanupPeriodDays`、既定30日） | [sessions](https://code.claude.com/docs/en/sessions) |

**ポイント**: インデックスの常時読み込みは、**install.sh 導入なら @import**（メモリ機能
そのもの）が担当します。**プラグイン導入では SessionStart フック**が index を注入します
（プラグインは `~/.claude/CLAUDE.md` を編集できないため）。フックは `@import` の有無を
自動判定し、両方ある環境でも二重注入しません。

---

## 仕組みの全体像

```
読込:  ~/.claude/CLAUDE.md ──@~/.claude/knowledge/index.md──▶ 全リポジトリ・全セッションに注入
記録:  会話中の知見 ──/kb──▶ knowledge/topics/<topic>.md に追記 ＋ index.md に1行
回収:  SessionEnd フック ──エラー痕跡を grep──▶ knowledge/queue/pending-sessions.tsv
通知:  SessionStart フック ──キューに残あり──▶「未回収 N 件 → /kb-harvest」だけ注入（無ければ無音）
採掘:  /kb-harvest ──▶ bin/kb-extract-candidates.sh が jsonl から候補抽出 ──▶ Claude が要約・記録
昇格:  /kb promote ──▶ プロジェクトの自動メモリ / CLAUDE.md から横断で役立つ知見を一般化して登録
```

### `~/.claude/knowledge/` の構造（install.sh が構築）

| パス | 内容 |
|---|---|
| `knowledge/index.md` | 1エントリ＝1行＋topics リンク。**200行 / 25KB を上限**とし、超過分は `index-archive.md` へ退避。`@import` で常時読み込まれる |
| `knowledge/topics/<topic>.md` | エントリ本体（kebab-case：`git.md` / `docker.md` / `claude-code.md` …）。必要時にオンデマンドで開く |
| `knowledge/queue/pending-sessions.tsv` | 未回収セッション（日時 / session_id / cwd / transcript_path / ヒット数）。直近50件に切り詰め |
| `knowledge/bin/kb-extract-candidates.sh` | jsonl 採掘スクリプトの実体 |

### エントリ形式（topics/*.md）

```
## KB-20260612-01: <一行タイトル>
- 日付 / 出典: <リポジトリ名>（session: <id 先頭8桁>）
- 環境: <ツール・バージョン>
- 問題 / 原因 / 対処（他リポジトリで再利用できる一般化した形で）
- 物証: エラーメッセージの核心1行・確認したコマンド
- タグ: #git #docker
- 昇格: <成果物パス>   # 任意。self-improve が昇格させたら記入される（無くてよい）
```

---

## self-improve との密連携（昇格ライフサイクル・任意）

[`self-improve`](../self-improve/) を併せて入れると、「**捕捉（kb）→ 再発検知 → 恒久成果物へ昇格
（self-improve）→ リンク戻し（kb）**」の閉ループになります。**両プラグインは別のまま**で、共有データ
契約だけで連携し、**片方だけでも単体動作**します。kb 側の関与は次の**追加のみ・後方互換**です:

- **昇格候補マーク**: index 行のタグに `#promote`（昇格候補）/`#promoted`（昇格済み）を付けてよい。
  `/kb-harvest` は反復・ワークフロー級の知見に `#promote` を付け、`/improve-scan` に拾わせます。
- **キュー共有**: `~/.claude/knowledge/queue/pending-sessions.tsv` を self-improve の `improve-scan` が
  自前キューと `session_id` で union して読みます（同じセッションを二重処理しない）。
- **リンク戻し**: 昇格が確定すると、self-improve 側が index タグを `#promoted` 化し、本体に
  `- 昇格: <成果物パス>` を1行追記します（kb 自身は書き換えません）。
- **`/kb search` は読み取り専用のまま**（検索が副作用を持たない）。再発の検知は self-improve が
  ログから行います。

self-improve を入れていない環境では `#promote`/`#promoted`/`- 昇格:` は単なる任意メタデータで無害です。

---

## 使い方

| コマンド | 動作 |
|---|---|
| `/kb` | 直近で解決した問題を1エントリ記録する（重複チェック→トピック追記→index 1行） |
| `/kb search <語>` | index → topics の2段 grep で既存の知見を検索する |
| `/kb promote` | プロジェクトの自動メモリ（`MEMORY.md`）や `CLAUDE.md` から横断で役立つ知見を一般化して登録する |
| `/kb-harvest [--queue \| --days N \| <path>]` | 過去のトランスクリプトから候補を採掘して記録する |

スキルは自動でも発動します。たとえば「また同じエラーで困らないようにメモして」で記録、
「これ前にも見たエラーかも」でエラー再解決の前に既存ナレッジを検索します。

### 実例

```
# 記録
> npm ci が EINTEGRITY で落ちる件、解決したのでナレッジに残して
  → topics/node.md に KB エントリを追記、index.md に1行追加

# 検索（再解決の前に既知か確認）
> /kb search EINTEGRITY
  → index → topics を grep し「KB-… で解決済み: lockfile 再生成」を提示

# 採掘（セッション開始時に「未回収 3 件」と出ていたとき）
> /kb-harvest --queue
  → 抽出スクリプトで候補を絞り、エラー→解決ペアを記録、処理済みをキューから削除

# 昇格
> /kb promote
  → このプロジェクトの MEMORY.md から、他リポジトリでも役立つ知見だけを一般化して登録
```

---

## セットアップ

導入方法は3つあります。**プラグイン**が最も簡単（clone 不要・フック配線も自動）、
**install.sh** は `@import` ベースで導入したい場合、**手動**は中身を把握して入れたい場合。

### 方法1: プラグインで導入する（推奨・最も簡単）

Claude Code でそのまま実行します（clone 不要）:

```
/plugin marketplace add mrkxlia/claude-code-workbench-ja
/plugin install knowledge-share@workbench-ja
```

これだけで完了です。スキルは `/knowledge-share:kb` `/knowledge-share:kb-harvest` として
全プロジェクトで使え、SessionStart/SessionEnd フックも自動で全セッションに適用されます
（`~/.claude/settings.json` を手で編集する必要はありません）。

> プラグインは導入時にスクリプトを実行できず `~/.claude/CLAUDE.md` も編集できないため、
> **インデックスの読み込みは @import ではなく SessionStart フックが担当**します
> （フックの stdout がコンテキストに注入される公式仕様）。`~/.claude/knowledge/` の
> 足場とテンプレート index・採掘スクリプトは、初回セッションでフックが自動的に用意します。
> install.sh で `@import` を入れている環境では、フックは二重注入を避けて index 注入を
> スキップします（自動判定）。

### 方法2: install.sh で導入する（@import ベース）

```bash
git clone --depth 1 https://github.com/mrkxlia/claude-code-workbench-ja /tmp/workbench
bash /tmp/workbench/plugins/knowledge-share/install.sh
```

何度実行しても安全（冪等）です。既存のナレッジ・`CLAUDE.md`・他のフックは壊しません。
`~/.claude/CLAUDE.md` に `@import` を1行足し、`settings.json` のマージには `jq` を使います
（無い場合は手動マージ用のサンプルを表示して終了します）。スキルは `/kb` `/kb-harvest` の
名前で使えます。

### 方法3: 手動セットアップ

1. **@import を1行追記** — `~/.claude/CLAUDE.md` に次を足す（これだけで読み込みは有効）:

   ```
   @~/.claude/knowledge/index.md
   ```

2. **スキルとフックをコピー**:

   ```bash
   mkdir -p ~/.claude/skills ~/.claude/hooks ~/.claude/knowledge/{topics,queue,bin}
   cp -R plugins/knowledge-share/skills/kb ~/.claude/skills/
   cp -R plugins/knowledge-share/skills/kb-harvest ~/.claude/skills/
   cp plugins/knowledge-share/hooks/kb-session-*.sh ~/.claude/hooks/
   cp plugins/knowledge-share/bin/kb-extract-candidates.sh ~/.claude/knowledge/bin/
   cp plugins/knowledge-share/templates/index.md ~/.claude/knowledge/index.md   # 既存があれば実行しない
   chmod +x ~/.claude/hooks/kb-session-*.sh ~/.claude/knowledge/bin/kb-extract-candidates.sh
   ```

3. **フックを `~/.claude/settings.json` に追記マージ** — `plugins/knowledge-share/setup/settings.json` の
   サンプルを参考に、`hooks.SessionStart` / `hooks.SessionEnd` の**配列に要素を足す**。
   既存の settings がある場合の jq マージ例（配列を上書きしない）:

   ```bash
   jq '.hooks.SessionEnd = ((.hooks.SessionEnd // []) + [
         { "hooks": [ { "type":"command",
           "command":"bash \"$HOME\"/.claude/hooks/kb-session-end.sh" } ] } ])' \
      ~/.claude/settings.json > /tmp/s.json && mv /tmp/s.json ~/.claude/settings.json
   ```

   > ⚠️ **`jq -s '.[0] * .[1]'` は使わないでください**。`*`（再帰マージ）は配列を
   > **上書き**するため、既存の SessionStart / SessionEnd フックを消してしまいます。
   > 必ず `((.hooks.X // []) + [新要素])` の形で**追記**してください。

---

## 動作確認

```bash
# 1. @import が効いているか: 新しいセッションを開き、index.md の内容を尋ねる
#    （まだ空ならテンプレートの説明文が見えるはず）
# 2. 記録: /kb で1件記録 → ~/.claude/knowledge/topics/ と index.md に反映されるか
# 3. 検索: /kb search <記録した語> → 該当エントリが引けるか
# 4. 回収→通知: エラーの出たセッションを終了 → 次のセッション開始時に
#    「未回収 N 件」が出るか（queue/pending-sessions.tsv に行が増えているか）
# 5. 採掘: /kb-harvest --queue → 候補が抽出され、記録後にキューから消えるか
```

---

## 制限事項

- **SessionEnd はクラッシュ時には走りません**。取りこぼしたセッションは
  `/kb-harvest --days N` でトランスクリプトから補完回収できます。
- **トランスクリプトは既定30日（`cleanupPeriodDays`）で消えます**。それより前に回収を。
- **jsonl の機密はナレッジに写経しないこと**。記録するのは一般化した問題・原因・対処と、
  核心1行の物証だけです（スキルのハードルールにも明記）。
- **`knowledge/` は git 共有しない前提**です（個人の作業ログ・社内情報を含み得るため）。
  チームで共有したい場合は、サニタイズ済みのエントリだけを別途切り出してください。
- **フック本体は jq 無しでも動作します**（grep フォールバック）。jq が必須なのは
  `install.sh` の settings.json マージのみです。
- **Windows は Git Bash または WSL が必要です**（フック・install.sh・採掘スクリプトが
  bash のため）。@import・スキル・ナレッジ構造そのものは OS 非依存でそのまま動作します。

---

## Windows での使い方

- フック・スクリプトは bash 1系統のみ（PowerShell 版はありません）。**Git Bash か WSL**
  の bash で実行してください。既存の software-pipeline / task-pipeline のフックと同じ方針です。
- `~/.claude/` は Windows では `%USERPROFILE%\.claude` に解決されます。
- `settings.json` のフックは `bash "$HOME"/.claude/hooks/...` の形で配線します
  （Git Bash があれば Claude Code は `sh -c` でこの形を実行できます）。
- `install.sh` も Git Bash / WSL から `bash plugins/knowledge-share/install.sh` で実行します。
