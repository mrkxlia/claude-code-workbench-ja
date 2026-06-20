---
name: task-factory-setup
description: >-
  task-factory テンプレート（5エージェント・スキル・フック・settings.json・CLAUDE.md）を
  対象プロジェクトに自動セットアップするスキル。成果物の出力ディレクトリ・主な成果物の
  種類をヒアリングし、~/.claude/skills/ と .claude/skills/ から利用可能なスキル（drawio 等）を
  検出して、CLAUDE.md の差し替え箇所・ビルダーの「担当範囲」・書き込みガードフックの
  許可リストを同じ承認済みデータから自動で充填する。既存の CLAUDE.md や
  .claude/settings.json は上書きせずマージを提案する。git 管理されていないプロジェクトにも対応する
  （git init の提案、または非gitモードでの導入）。
  多数のファイルを書き込むワンショットのブートストラップであるため、
  自動発動はせず /task-factory-setup での手動起動でのみ実行する。
disable-model-invocation: true
---

# task-factory-setup — タスク工場ワンコマンドセットアップ

あなたは「セットアップ技師」です。対象プロジェクトを解析・ヒアリングし、task-factory
テンプレートをそのプロジェクトに適合させて導入します。推測で空欄を埋めず、書き込む前に必ず確認します。

このスキルは `~/.claude/skills/task-factory-setup/` にパーソナルスキルとして置かれ、
**導入したいプロジェクトの中で** 実行されることを想定しています。

## セットアップ全体の流れ

```
Step 0  前提チェック
Step 1  テンプレートの入手（ローカル workbench または GitHub から一時取得）
Step 2  対象プロジェクトの解析とヒアリング（出力先・成果物の種類・利用可能スキル・既存設定）
Step 3  🛑 チェックポイント1: 解析結果の承認（ここまで1ファイルも書かない）
Step 4  CLAUDE.md の生成（既存があればマージ提案）
Step 5  エージェント5種の配置 + ビルダーの「担当範囲」差し替え
Step 6  スキル・フック・settings.json の配置とマージ
Step 7  検証チェックリスト
Step 8  🛑 チェックポイント2: 導入結果のレビューと試運転の提案
```

以下のチェックリストをコピーして、進行に合わせてチェックを付けながら進めること:

```
セットアップ進行状況:
- [ ] Step 0: 前提チェック
- [ ] Step 1: テンプレート入手
- [ ] Step 2: 解析とヒアリング
- [ ] Step 3: 🛑 解析結果の承認
- [ ] Step 4: CLAUDE.md 生成
- [ ] Step 5: エージェント配置 + 担当範囲差し替え
- [ ] Step 6: スキル・フック・settings.json
- [ ] Step 7: 検証チェックリスト
- [ ] Step 8: 🛑 導入結果レビュー + 試運転提案
```

## Step 0: 前提チェック

1. カレントディレクトリが git リポジトリかを確認する（`git rev-parse --is-inside-work-tree`）。
   **git リポジトリでない場合は停止せず**、次の2択をユーザーに提示して選んでもらう:
   - **(a) `git init` してから導入する（推奨）** — 失敗時の巻き戻し・履歴管理が有効になる。
     承認されたら `git init` を実行し、以降は通常どおり進める
   - **(b) git なしのまま導入する（非gitモード）** — 以降のステップで「🔓 非gitモード」と
     記された分岐に従う。違い（巻き戻しがバックアップ頼みになる・task-factory の最終工程が
     コミット提案ではなくファイル一覧提示になる）をここで伝えておく
2. **workbench リポジトリ自身の中で実行していないこと**を確認する。
   ルートに `task-factory/` ディレクトリと `WindowsSplitTerminalSample/` がある場合は
   workbench 本体なので、「導入先のプロジェクトで実行してください」と案内して停止する
3. （git 管理下の場合のみ）作業ツリーがクリーンか確認する（`git status --porcelain`）。
   未コミットの変更があれば「セットアップ全体を `git checkout` / `git revert` で巻き戻せるよう、
   先にコミットを推奨」と伝える（強制はしない）

## Step 1: テンプレートの入手

### 1-a. ローカルの workbench を使う（推奨）

ユーザーに claude-code-workbench-ja をローカルに clone 済みか質問し、
パスを教えてもらう。パス直下に `task-factory/.claude/agents/` が存在することを確認して
テンプレートソース `$SRC=<パス>/task-factory` とする。

### 1-b. GitHub から一時取得する（フォールバック）

ローカルに無い場合は一時ディレクトリへ shallow clone する:

```bash
TMP=$(mktemp -d)
git clone --depth 1 https://github.com/mrkxlia/claude-code-workbench-ja "$TMP/workbench"
# $SRC="$TMP/workbench/task-factory"
```

git コマンド自体が使えない環境では、tarball で取得する:

```bash
TMP=$(mktemp -d)
curl -L https://github.com/mrkxlia/claude-code-workbench-ja/archive/refs/heads/main.tar.gz | tar -xz -C "$TMP"
# $SRC="$TMP/claude-code-workbench-ja-main/task-factory"
```

**コピー完了後（Step 6 の後）、`rm -rf "$TMP"` で必ず削除すること。**
エラーで中断する場合も削除してから停止する。

## Step 2: 対象プロジェクトの解析とヒアリング

書き込みはまだ行わない。Read / Grep / Glob と読み取り専用コマンドだけで以下を調べ、
検出できない項目はユーザーに質問する。

### 2-1. 出力ディレクトリの推定

| 兆候 | 推定 |
|---|---|
| `deliverables/`, `output/`, `成果物/` | 成果物の出力ディレクトリ候補 |
| `docs/`, `documents/`, `ドキュメント/` | ドキュメント類の出力先候補 |
| `diagrams/`, `figures/`, `images/` | 図の出力先候補 |
| いずれも無い | 新設する `deliverables/` を既定の提案にする |

候補が複数ある・既存資料と混ざる懸念がある場合は、Step 3 でユーザーに選んでもらう。

### 2-2. 主な成果物の種類のヒアリング

このプロジェクトで工場に流す予定の成果物をユーザーに質問する
（例: drawio 図・設計ドキュメント・調査レポート・議事録・スライド構成案）。
回答は CLAUDE.md の「成果物の種類と出力先」表に使う。

### 2-3. 利用可能スキルの検出

`~/.claude/skills/` と `.claude/skills/` のディレクトリを列挙し、各 `SKILL.md` の
frontmatter（name / description）から、成果物作成に使えそうなスキル（drawio・スライド・
ドキュメント系など）をリストアップする。Step 3 で「ブリーフで使用候補にしてよいか」を
ユーザーに確認し、承認されたものを CLAUDE.md の「利用可能なスキル」表に載せる。

### 2-4. 既存設定の棚卸し

- ルートの `CLAUDE.md` の有無
- `.claude/agents/` `.claude/skills/` `.claude/hooks/` の既存ファイル
  （テンプレートと同名のものは「衝突」としてリスト化）
- `.claude/settings.json` の有無と、既存の `hooks` キーの中身

## Step 3: 🛑 チェックポイント1 — 解析結果の承認

解析結果を以下の形式でユーザーに提示する:

1. **出力ディレクトリ** — 成果物本体の保存先（検出元も併記。不明は「❓ 要確認」）
2. **成果物の種類** — ヒアリング結果の一覧
3. **利用可能なスキル表** — スキル名と用途（検出場所も併記）
4. **中間成果物の保存先** — `docs/taskfactory/<slug>/`（固定。変更したい場合はここで）
5. **既存設定との衝突** — 上書きせずマージ・スキップする対象の一覧

❓ の項目はここで質問して埋める。

**STOP. ユーザーの明示的な承認（「承認」「OK」「進めて」等）があるまで、
1ファイルも作成・変更してはならない。** 修正指示があれば解析結果を直してから再提示する。

## Step 4: CLAUDE.md の生成

### 4-a. 既存の CLAUDE.md が無い場合

`$SRC/CLAUDE.md` をベースに、`<!-- 差し替え -->` とコメントされた3箇所を
Step 3 で承認済みの値で充填して、対象プロジェクトのルートに書き出す:

1. **成果物の種類と出力先** → 承認済みの出力ディレクトリと成果物の種類
2. **利用可能なスキル** → 承認済みのスキル表（無ければ表ごと削除し、
   「ビルダーは標準ツール（Write / Edit）だけで成果物を作る」と1行残す）
3. **表記・スタイル規約** → 既存資料から読み取れた規約。読み取れなければ
   サンプルの規約を残すか削るかをユーザーに確認する

生成物からは `<!-- 差し替え -->` コメントと冒頭の差し替え案内文を取り除く。

### 4-b. 既存の CLAUDE.md がある場合

**上書き禁止。** 工場に必要なセクション（ハードルール・5エージェント表・利用可能なスキル表・
`docs/taskfactory/` ポインタ）を既存の末尾に追記する案を diff 形式で提示し、
承認を得てから適用する。既存の記述と重複・矛盾する項目は追記から除く。

🔓 非gitモード: 追記を適用する**前に**、既存の CLAUDE.md を `.claude/factory-backup/CLAUDE.md`
としてコピーしておく（git の巻き戻しの代替）。

## Step 5: エージェントの配置と担当範囲の差し替え

1. `mkdir -p .claude/agents` して `$SRC/.claude/agents/*.md` の5ファイルをコピーする
2. `deliverable-builder.md` の「担当範囲」セクションの箇条書きを、
   **Step 3 で承認済みの出力ディレクトリ**で書き換える。
   `<!-- ↓ 自分のプロジェクトの〜に書き換える -->` コメントは削除する

CLAUDE.md の「成果物の種類と出力先」とビルダーの担当範囲は、**同じ承認済みデータ**から
生成すること。これにより両者の不一致（出力先の混乱の原因）が構造的に発生しなくなる。

衝突（既存の同名エージェント）がある場合は、そのファイルをスキップして報告する。

## Step 6: スキル・フック・settings.json

### 6-1. スキルのコピー

`mkdir -p .claude/skills` して `task-factory/` と `clarify/` をコピーする。
**task-factory-setup 自身は対象プロジェクトにコピーしない**（ワンショットのブートストラップであり、
プロジェクトのスラッシュコマンド一覧を汚さないため）。

### 6-2. フックのコピーと担当範囲の差し替え

```bash
mkdir -p .claude/hooks
cp "$SRC/.claude/hooks/guard-deliverable-writes.sh" .claude/hooks/
chmod +x .claude/hooks/guard-deliverable-writes.sh
```

コピー後、スクリプト冒頭の設定変数 `ALLOWED_PREFIXES` を、**Step 3 で承認済みの
出力ディレクトリ**（+ `docs/taskfactory/` と `.claude/`）で書き換える。
CLAUDE.md の「成果物の種類と出力先」・deliverable-builder の「担当範囲」・このフックの
許可リストは、**同じ承認済みデータ**から生成すること（三者の不一致を構造的に防ぐ）。

### 6-3. settings.json のマージ

- `.claude/settings.json` が**無い**場合: `$SRC/.claude/settings.json` をそのままコピーする
- **ある**場合: 既存 JSON の `hooks.PreToolUse` 配列にテンプレートのフックエントリを
  **追記**する。既存のキー・エントリは削除も上書きもしない。
  同一の `command` がすでに登録済みなら追記しない。
  🔓 非gitモード: マージする前に、既存の settings.json を
  `.claude/factory-backup/settings.json` としてコピーしておく

マージ後、`node -e 'JSON.parse(...)'` または `jq .` で JSON として妥当なことを検証する。

## Step 7: 検証チェックリスト

以下を実際に確認し、結果をチェックリストで報告する:

```
導入検証:
- [ ] .claude/agents/ にエージェント定義5ファイルがある
- [ ] 各エージェントの frontmatter が妥当な YAML である
- [ ] .claude/skills/task-factory/SKILL.md と .claude/skills/clarify/SKILL.md がある
- [ ] guard-deliverable-writes.sh に実行権限がある（ls -l で確認）
- [ ] .claude/settings.json が妥当な JSON で、既存キーが失われていない
- [ ] CLAUDE.md の出力ディレクトリ・deliverable-builder の「担当範囲」・フックの
      ALLOWED_PREFIXES が一致している
- [ ] CLAUDE.md の「利用可能なスキル」表のスキルが実在する（~/.claude/skills/ または .claude/skills/）
- [ ] フックのドライラン: echo '{"tool_name":"Write","tool_input":{"file_path":"<出力ディレクトリ>/test.md"}}' を
      スクリプトの stdin に流して exit 0（出力なし）、出力ディレクトリ外のパスで ask の JSON が
      出力されることを確認する
- [ ] 🔓 非gitモードのみ: 既存ファイルを変更した場合、変更前のコピーが .claude/factory-backup/ にある
```

Step 1-b で一時ディレクトリを使った場合は、ここで `rm -rf "$TMP"` を実行したことも報告する。

## Step 8: 🛑 チェックポイント2 — 導入結果のレビューと試運転

1. 作成・変更した全ファイルの一覧（新規／編集／マージの別つき）を提示する
2. **STOP. ユーザーがレビューして承認するまで完了扱いにしない。**
   修正指示があれば該当 Step に戻る
3. 承認後、次を案内する:
   - エージェント定義はセッション開始時に読み込まれるため、**新しいセッションを開始**
     （または再起動）してから使うこと
   - 試運転: `/task-factory このリポジトリのディレクトリ構成図を drawio で作って`
     のような小さい依頼を流し、3つのチェックポイントを体験すること
   - 🔓 非gitモード: 巻き戻しが必要なときは `.claude/factory-backup/` のコピーを元の場所に戻し、
     1で提示した新規作成ファイルを削除すればよいこと
4. チューニングの心得として「AIが驚くミスをするたびに『CLAUDE.md にルールがあれば防げたか？』と
   自問してルールを足す」（テンプレート README 参照）を案内する

## セットアップ技師のルール

- 検出できなかった出力先やスキルを、それらしい値で**捏造しない**。空欄にして質問する
- 既存の CLAUDE.md・エージェント定義を**上書きしない**。マージ提案か、スキップ+報告
- 🔓 非gitモードでは、既存ファイルを変更する前に必ず `.claude/factory-backup/` へコピーを取る
- チェックポイント1の承認前に1ファイルも書かない。チェックポイント2の承認前に完了と言わない
- 一時ディレクトリは成功時も失敗時も必ず削除する
- 途中で失敗したら、どこまで適用済みかを正確に報告して停止する（中途半端な状態を隠さない）
