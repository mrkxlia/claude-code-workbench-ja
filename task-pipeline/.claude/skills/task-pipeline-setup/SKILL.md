---
name: task-pipeline-setup
description: >-
  task-pipeline テンプレート（5エージェント・スキル・フック・settings.json・CLAUDE.md）を
  対象プロジェクトに自動セットアップするスキル。成果物の出力ディレクトリ・主な成果物の
  種類をヒアリングし、~/.claude/skills/ と .claude/skills/ から利用可能なスキル（drawio 等）を
  検出して、CLAUDE.md の差し替え箇所・ビルダーの「担当範囲」・書き込みガードフックの
  許可リストを同じ承認済みデータから自動で充填する。既存の CLAUDE.md や
  .claude/settings.json は上書きせずマージを提案する。git 管理されていないプロジェクトにも対応する
  （git init の提案、または非gitモードでの導入）。
  多数のファイルを書き込むワンショットのブートストラップであるため、
  自動発動はせず /task-pipeline-setup での手動起動でのみ実行する。
disable-model-invocation: true
---

# task-pipeline-setup — タスクパイプラインワンコマンドセットアップ

あなたは「セットアップ技師」です。対象プロジェクトを解析・ヒアリングし、task-pipeline
テンプレートをそのプロジェクトに適合させて導入します。推測で空欄を埋めず、書き込む前に必ず確認します。

このスキルは `~/.claude/skills/task-pipeline-setup/` にパーソナルスキルとして置かれ、
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
     記された分岐に従う。違い（巻き戻しがバックアップ頼みになる・task-pipeline の最終工程が
     コミット提案ではなくファイル一覧提示になる）をここで伝えておく
2. **workbench リポジトリ自身の中で実行していないこと**を確認する。
   ルートに `task-pipeline/` ディレクトリと `WindowsSplitTerminalSample/` がある場合は
   workbench 本体なので、「導入先のプロジェクトで実行してください」と案内して停止する
3. （git 管理下の場合のみ）作業ツリーがクリーンか確認する（`git status --porcelain`）。
   未コミットの変更があれば「セットアップ全体を `git checkout` / `git revert` で巻き戻せるよう、
   先にコミットを推奨」と伝える（強制はしない）

## Step 1: テンプレートの入手

### 1-a. ローカルの workbench を使う（推奨）

ユーザーに claude-code-workbench-ja をローカルに clone 済みか質問し、
パスを教えてもらう。パス直下に `task-pipeline/.claude/agents/` が存在することを確認して
テンプレートソース `$SRC=<パス>/task-pipeline` とする。

### 1-b. GitHub から一時取得する（フォールバック）

ローカルに無い場合は一時ディレクトリへ shallow clone する:

```bash
TMP=$(mktemp -d)
git clone --depth 1 https://github.com/mrkxlia/claude-code-workbench-ja "$TMP/workbench"
# $SRC="$TMP/workbench/task-pipeline"
```

git コマンド自体が使えない環境では、tarball で取得する:

```bash
TMP=$(mktemp -d)
curl -L https://github.com/mrkxlia/claude-code-workbench-ja/archive/refs/heads/main.tar.gz | tar -xz -C "$TMP"
# $SRC="$TMP/claude-code-workbench-ja-main/task-pipeline"
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

このプロジェクトでパイプラインに流す予定の成果物をユーザーに質問する
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

### 2-5. 既存仕様（成果物仕様 SPEC.md）の棚卸しと空リポ判定

整合性を担保するため、**既存仕様の状態**を3パターンに分類する（読み取りのみ・書き込みはしない）:

- **空プロジェクト（既存成果物がほぼ無い）**: Step 3 で前向きにヒアリングする材料にする。
- **既存あり・SPEC.md あり**（`SPEC.md` / `SPEC-recovered.md` の成果物仕様）: spec of record として読み、
  Step 3 で「これから作る成果物が既存仕様・表記規約と整合するか」を確認する材料にする。
- **既存あり・SPEC.md なし**: 既存成果物・規約が文書化されていない。Step 3 で**先に `/spec-extract` を実行して
  成果物仕様 SPEC.md を作ることを推奨**する（setup 自身は SPEC.md を書かない＝書き込みは spec-extract に委ねる）。

## Step 3: 🛑 チェックポイント1 — 解析結果の承認

解析結果を以下の形式でユーザーに提示する:

1. **出力ディレクトリ** — 成果物本体の保存先（検出元も併記。不明は「❓ 要確認」）
2. **成果物の種類** — ヒアリング結果の一覧
3. **利用可能なスキル表** — スキル名と用途（検出場所も併記）
4. **中間成果物の保存先** — `docs/task-pipeline/<slug>/`（固定。変更したい場合はここで）
5. **既存設定との衝突** — 上書きせずマージ・スキップする対象の一覧
6. **既存仕様の状態（2-5）** — 空／SPEC.md あり／SPEC.md なし のどれか。
   - **SPEC.md なし＆既存成果物あり**: 「整合性を効かせるため、先に `/spec-extract` で成果物仕様 SPEC.md を
     作ることを推奨します（任意・後からでも可）」と添える。setup はここで spec-extract を勝手に走らせない
   - **SPEC.md あり**: 「これを既存仕様として source-researcher / deliverable-reviewer が参照します」と伝える

❓ の項目はここで質問して埋める。

**空プロジェクトの初期ヒアリング（空と判定した場合のみ）**: 受け身で待たず、`clarify` のプロトコル
（一問ずつ・推奨回答つき）で「主に作る成果物の種類」「読者・目的」「最初に固定したい表記規約・受け入れ基準」を
前向きに聞き出す。**ここで聞いた初期仕様は、承認後の書き込みフェーズ（Step 4 以降）で初期 SPEC.md
（成果物仕様）として作成する**（承認前には書かない）。

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

**上書き禁止。** パイプラインに必要なセクション（ハードルール・5エージェント表・利用可能なスキル表・
`docs/task-pipeline/` ポインタ）を既存の末尾に追記する案を diff 形式で提示し、
承認を得てから適用する。既存の記述と重複・矛盾する項目は追記から除く。

🔓 非gitモード: 追記を適用する**前に**、既存の CLAUDE.md を `.claude/pipeline-backup/CLAUDE.md`
としてコピーしておく（git の巻き戻しの代替）。

### 4-c. 空プロジェクトの初期 SPEC.md（空と判定し、Step 3 で初期仕様を聞いた場合のみ）

Step 3 の「空プロジェクトの初期ヒアリング」で聞いた初期仕様・表記規約・受け入れ基準を、リポジトリ直下の
`SPEC.md`（成果物仕様）に書き出す（spec-extract の SPEC.md 構造・確度ラベルに従う。まだ成果物が無いので
大半は `[推定]`、ユーザーが断言した項目のみ `[確定]`）。これが以降の source-researcher /
deliverable-reviewer の spec of record になる。既存あり（SPEC.md なし）の場合はここでは作らず `/spec-extract` に委ねる。

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

`mkdir -p .claude/skills` して `task-pipeline/`・`clarify/`・`notes/`・`spec-extract/` をコピーする。
**task-pipeline-setup 自身は対象プロジェクトにコピーしない**（ワンショットのブートストラップであり、
プロジェクトのスラッシュコマンド一覧を汚さないため）。
`notes` / `spec-extract` は implementation-skills 原本のパイプライン連携版（成果物仕様向けに読み替え）で、
既存同名スキルがあれば衝突として報告しスキップする。

### 6-2. フックのコピーと担当範囲の差し替え

```bash
mkdir -p .claude/hooks
cp "$SRC/.claude/hooks/guard-deliverable-writes.sh" .claude/hooks/
cp "$SRC/.claude/hooks/spec-sync-reminder.sh" .claude/hooks/
chmod +x .claude/hooks/guard-deliverable-writes.sh .claude/hooks/spec-sync-reminder.sh
```

（Windows ネイティブ＝bash が無い環境では `.sh` の代わりに同梱の `.ps1` を配置し `chmod` は skip する。
詳細は後述「Windows 対応」。bash が使える Git Bash / WSL では上記どおり `.sh` を使う。）
`spec-sync-reminder.sh` は SessionStart/Stop で成果物仕様 SPEC.md の未同期をやさしく知らせる非ブロッキング
通知フック（git 管理外・SPEC.md 不在なら静かに何もしない）。

コピー後、`guard-deliverable-writes.sh` のスクリプト冒頭の設定変数 `ALLOWED_PREFIXES` を、**Step 3 で承認済みの
出力ディレクトリ**（+ `docs/task-pipeline/` と `.claude/`）で書き換える。
CLAUDE.md の「成果物の種類と出力先」・deliverable-builder の「担当範囲」・このフックの
許可リストは、**同じ承認済みデータ**から生成すること（三者の不一致を構造的に防ぐ）。

### 6-3. settings.json のマージ

- `.claude/settings.json` が**無い**場合: `$SRC/.claude/settings.json` をそのままコピーする
- **ある**場合: 既存 JSON の **`hooks.PreToolUse`・`hooks.SessionStart`・`hooks.Stop`** 各配列に、
  テンプレートの対応エントリを**追記**する（イベントキーが無ければ新設する）。既存のキー・エントリは
  削除も上書きもしない。同一の `command` がすでに登録済みなら追記しない。
  さらに、**同じフックの `.sh`/`.ps1` ペアは「同じフック」とみなし、片方が既に登録済みならもう片方は
  追記しない**（環境を変えて再 setup したとき bash 版と pwsh 版が二重発火するのを防ぐ）。
  🔓 非gitモード: マージする前に、既存の settings.json を
  `.claude/pipeline-backup/settings.json` としてコピーしておく

マージ後、`node -e 'JSON.parse(...)'` または `jq .` で JSON として妥当なことを検証する。

## Step 7: 検証チェックリスト

以下を実際に確認し、結果をチェックリストで報告する:

```
導入検証:
- [ ] .claude/agents/ にエージェント定義5ファイルがある
- [ ] 各エージェントの frontmatter が妥当な YAML である
- [ ] .claude/skills/ に task-pipeline / clarify / notes / spec-extract がある（既存同名でスキップしたものは報告済み）
- [ ] guard-deliverable-writes.sh と spec-sync-reminder.sh に実行権限がある（ls -l で確認）
- [ ] spec-sync-reminder.sh のドライラン: `echo '{"hook_event_name":"SessionStart"}' | bash .claude/hooks/spec-sync-reminder.sh; echo $?` → 0（SPEC.md が無ければ無出力）
- [ ] .claude/settings.json が妥当な JSON で、既存キーが失われていない（PreToolUse の Edit|Write、SessionStart と Stop に spec-sync-reminder の各エントリがある）
- [ ] CLAUDE.md の出力ディレクトリ・deliverable-builder の「担当範囲」・フックの
      ALLOWED_PREFIXES が一致している
- [ ] CLAUDE.md の「利用可能なスキル」表のスキルが実在する（~/.claude/skills/ または .claude/skills/）
- [ ] フックのドライラン: echo '{"tool_name":"Write","tool_input":{"file_path":"<出力ディレクトリ>/test.md"}}' を
      スクリプトの stdin に流して exit 0（出力なし）、出力ディレクトリ外のパスで ask の JSON が
      出力されることを確認する
- [ ] 🔓 非gitモードのみ: 既存ファイルを変更した場合、変更前のコピーが .claude/pipeline-backup/ にある
```

Step 1-b で一時ディレクトリを使った場合は、ここで `rm -rf "$TMP"` を実行したことも報告する。

## Step 8: 🛑 チェックポイント2 — 導入結果のレビューと試運転

1. 作成・変更した全ファイルの一覧（新規／編集／マージの別つき）を提示する
2. **STOP. ユーザーがレビューして承認するまで完了扱いにしない。**
   修正指示があれば該当 Step に戻る
3. 承認後、次を案内する:
   - エージェント定義はセッション開始時に読み込まれるため、**新しいセッションを開始**
     （または再起動）してから使うこと
   - 試運転: `/task-pipeline このリポジトリのディレクトリ構成図を drawio で作って`
     のような小さい依頼を流し、3つのチェックポイントを体験すること
   - 🔓 非gitモード: 巻き戻しが必要なときは `.claude/pipeline-backup/` のコピーを元の場所に戻し、
     1で提示した新規作成ファイルを削除すればよいこと
4. チューニングの心得として「AIが驚くミスをするたびに『CLAUDE.md にルールがあれば防げたか？』と
   自問してルールを足す」（テンプレート README 参照）を案内する

## Windows 対応（bash が使えるかでフックを振り分ける）

フックは `.sh`（baseline）と `.ps1`（PowerShell 同等版）の二種を同梱している。導入環境で**どちらを配るかは
「OS 名」ではなく「bash が使えるか」で判定する**（Git Bash は Windows 上でも `.sh` が動くため）:

- **bash が使える**（Git Bash / WSL / Mac / Linux。`command -v bash` が成功）→ Step 6 のとおり `.sh` をコピーして
  `chmod +x`。settings.json の command は `bash "$CLAUDE_PROJECT_DIR"/.claude/hooks/xxx.sh`。
- **bash が無い純 PowerShell** → 代わりに `.ps1` をコピーし（`chmod` は skip）、command は
  `pwsh -NoProfile -ExecutionPolicy Bypass -File "<repo>/.claude/hooks/xxx.ps1"`。
  **`pwsh`（PowerShell 7）が無ければ Windows 標準の `powershell`（5.1）にフォールバック**する。
  対象は `guard-deliverable-writes.ps1` と `spec-sync-reminder.ps1`。
  例: `"command": "powershell -NoProfile -ExecutionPolicy Bypass -File .claude/hooks/spec-sync-reminder.ps1"`。
  `-ExecutionPolicy Bypass` は 5.1 の既定ポリシーでフックがブロックされるのを防ぐ。`.ps1` は **UTF-8 BOM 付き**で配る
  （5.1 が日本語を文字化けさせないため）。`$CLAUDE_PROJECT_DIR` はそのまま使え、パス区切りは `/` で統一。

注意:
- settings.json は条件分岐を持てないため、**導入時の環境で確定した1つの command** だけを書く。再 setup で
  環境が変わったら 6-3 の「`.sh`/`.ps1` ペアは同一フック」ルールで二重登録を防ぐ。
- ドライランも環境に合わせる: PowerShell 版は `powershell -NoProfile -ExecutionPolicy Bypass -File .claude/hooks/xxx.ps1`（PS7 なら pwsh）に同じ JSON を stdin で渡す。

## セットアップ技師のルール

- 検出できなかった出力先やスキルを、それらしい値で**捏造しない**。空欄にして質問する
- 既存の CLAUDE.md・エージェント定義を**上書きしない**。マージ提案か、スキップ+報告
- 🔓 非gitモードでは、既存ファイルを変更する前に必ず `.claude/pipeline-backup/` へコピーを取る
- チェックポイント1の承認前に1ファイルも書かない。チェックポイント2の承認前に完了と言わない
- 一時ディレクトリは成功時も失敗時も必ず削除する
- 途中で失敗したら、どこまで適用済みかを正確に報告して停止する（中途半端な状態を隠さない）
