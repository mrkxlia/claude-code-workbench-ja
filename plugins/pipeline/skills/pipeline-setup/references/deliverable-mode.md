# 成果物モード固有の手順（pipeline-setup 別冊）

本冊子は SKILL.md の各 Step から参照される。**成果物モード**（`/task-pipeline` を導入する）の
モード固有の解析・配置内容だけをここに置く。共通の骨格・順序・ルールは SKILL.md 本体に従う。

## Step 2: 解析とヒアリング（成果物モード）

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

## Step 3: CP1 の提示項目（成果物モード固有分）

1. **出力ディレクトリ** — 成果物本体の保存先（検出元も併記。不明は「❓ 要確認」）
2. **成果物の種類** — ヒアリング結果の一覧
3. **利用可能なスキル表** — スキル名と用途（検出場所も併記）
4. **中間成果物の保存先** — `docs/task-pipeline/<slug>/`（固定。変更したい場合はここで）

空プロジェクトの初期ヒアリングで聞く項目: 「主に作る成果物の種類」「読者・目的」
「最初に固定したい表記規約・受け入れ基準」。

## Step 4: CLAUDE.md の生成（成果物モード）

ベースは **`$SRC/CLAUDE.task.md`**（成果物モード用サンプル）。生成先のファイル名は通常どおり
`CLAUDE.md`。`<!-- 差し替え -->` とコメントされた3箇所を承認済みの値で充填する:

1. **成果物の種類と出力先** → 承認済みの出力ディレクトリと成果物の種類
2. **利用可能なスキル** → 承認済みのスキル表（無ければ表ごと削除し、
   「ビルダーは標準ツール（Write / Edit）だけで成果物を作る」と1行残す）
3. **表記・スタイル規約** → 既存資料から読み取れた規約。読み取れなければ
   サンプルの規約を残すか削るかをユーザーに確認する

## Step 5: エージェントの配置（成果物モード）

コピーするのは次の**5ファイル**:
`researcher` / `requirements-writer` / `brief-writer` / `deliverable-builder` / `final-reviewer`
（`backend-builder` / `frontend-builder` / `test-verifier` はコピーしない — コードモード用）。

`deliverable-builder.md` の「担当範囲」セクションの箇条書きを、
**Step 3 で承認済みの出力ディレクトリ**で書き換える。
`<!-- ↓ 自分のプロジェクトの〜に書き換える -->` コメントは削除する。

CLAUDE.md の「成果物の種類と出力先」とビルダーの担当範囲は、**同じ承認済みデータ**から
生成すること（両者の不一致＝出力先の混乱の原因を構造的に防ぐ）。

## Step 6: スキル・フックの配置（成果物モード）

### スキル（4つ）

`task-pipeline/`・`clarify/`・`notes/`・`spec-extract/`。

### フック（3本）

```bash
mkdir -p .claude/hooks
cp "$SRC/hooks/block-secrets-commit.sh" .claude/hooks/
cp "$SRC/hooks/guard-deliverable-writes.sh" .claude/hooks/
cp "$SRC/hooks/spec-sync-reminder.sh" .claude/hooks/
chmod +x .claude/hooks/block-secrets-commit.sh .claude/hooks/guard-deliverable-writes.sh .claude/hooks/spec-sync-reminder.sh
```

（`block-secrets-commit.sh` は成果物プロジェクトでも無害・有益: git を使っていれば機密ファイルの
コミットを防ぎ、非 git なら素通りする。）

コピー後、`guard-deliverable-writes.sh` のスクリプト冒頭の設定変数 `ALLOWED_PREFIXES` を、
**Step 3 で承認済みの出力ディレクトリ**（+ `docs/task-pipeline/` と `.claude/`）で書き換える。
CLAUDE.md の「成果物の種類と出力先」・deliverable-builder の「担当範囲」・このフックの
許可リストは、**同じ承認済みデータ**から生成すること（三者の不一致を構造的に防ぐ）。

settings.json のマージでは、テンプレートの `guard-builder-writes` エントリ（コードモード用）を
**追記対象から除く**。

## Step 7: 検証チェックリスト（成果物モード固有分）

```
- [ ] .claude/agents/ にエージェント定義5ファイルがある
- [ ] .claude/skills/ に task-pipeline / clarify / notes / spec-extract がある
- [ ] block-secrets-commit.sh / guard-deliverable-writes.sh / spec-sync-reminder.sh に実行権限がある
- [ ] settings.json の PreToolUse に Bash（block-secrets）と Edit|Write（guard-deliverable）のエントリがある
- [ ] CLAUDE.md の出力ディレクトリ・deliverable-builder の「担当範囲」・フックの
      ALLOWED_PREFIXES が一致している
- [ ] CLAUDE.md の「利用可能なスキル」表のスキルが実在する（~/.claude/skills/ または .claude/skills/）
- [ ] guard-deliverable のドライラン: echo '{"tool_name":"Write","tool_input":{"file_path":"<出力ディレクトリ>/test.md"}}' を
      stdin に流して exit 0（出力なし）、出力ディレクトリ外のパスで ask の JSON が出力される
```

## Step 8: 試運転の例（成果物モード）

`/task-pipeline このリポジトリのディレクトリ構成図を drawio で作って`
のような小さい依頼を流し、3つのチェックポイントを体験する。
