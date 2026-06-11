---
name: factory-setup
description: >-
  software-factory テンプレート（7エージェント・スキル・フック・CLAUDE.md）を
  対象リポジトリに自動セットアップするスキル。package.json / pyproject.toml /
  go.mod / Cargo.toml などからスタックと test / lint / typecheck / build コマンドを検出し、
  ディレクトリ構成からバックエンド／フロントエンドの境界を推定して、CLAUDE.md の
  差し替え箇所とビルダー3種の「担当範囲」を自動で充填する。既存の CLAUDE.md や
  .claude/settings.json は上書きせずマージを提案する。
  「ソフトウェア工場をセットアップして」「software-factory を導入して」「工場を導入して」
  といった依頼や、/factory-setup での手動起動で発動する。
---

# factory-setup — ソフトウェア工場ワンコマンドセットアップ

あなたは「セットアップ技師」です。対象リポジトリを解析し、software-factory テンプレートを
そのリポジトリに適合させて導入します。推測で空欄を埋めず、書き込む前に必ず確認します。

このスキルは `~/.claude/skills/factory-setup/` にパーソナルスキルとして置かれ、
**導入したいリポジトリの中で** 実行されることを想定しています。

## セットアップ全体の流れ

```
Step 0  前提チェック
Step 1  テンプレートの入手（ローカル workbench または GitHub から一時取得）
Step 2  対象リポジトリの解析（スタック・コマンド・境界・モノレポ・既存設定）
Step 3  🛑 チェックポイント1: 解析結果の承認（ここまで1ファイルも書かない）
Step 4  CLAUDE.md の生成（既存があればマージ提案）
Step 5  エージェント7種の配置 + ビルダー3種の「担当範囲」差し替え
Step 6  スキル・フック・settings.json の配置とマージ
Step 7  検証チェックリスト
Step 8  🛑 チェックポイント2: 導入結果のレビューと試運転の提案
```

以下のチェックリストをコピーして、進行に合わせてチェックを付けながら進めること:

```
セットアップ進行状況:
- [ ] Step 0: 前提チェック
- [ ] Step 1: テンプレート入手
- [ ] Step 2: リポジトリ解析
- [ ] Step 3: 🛑 解析結果の承認
- [ ] Step 4: CLAUDE.md 生成
- [ ] Step 5: エージェント配置 + 担当範囲差し替え
- [ ] Step 6: スキル・フック・settings.json
- [ ] Step 7: 検証チェックリスト
- [ ] Step 8: 🛑 導入結果レビュー + 試運転提案
```

## Step 0: 前提チェック

1. カレントディレクトリが git リポジトリであることを確認する（`git rev-parse --is-inside-work-tree`）。
   違う場合は停止して報告する
2. **workbench リポジトリ自身の中で実行していないこと**を確認する。
   ルートに `software-factory/` ディレクトリと `WindowsSplitTerminalSample/` がある場合は
   workbench 本体なので、「導入先のリポジトリで実行してください」と案内して停止する
3. 作業ツリーがクリーンか確認する（`git status --porcelain`）。未コミットの変更があれば
   「セットアップ全体を `git checkout` / `git revert` で巻き戻せるよう、先にコミットを推奨」と
   伝える（強制はしない）

## Step 1: テンプレートの入手

### 1-a. ローカルの workbench を使う（推奨）

ユーザーに claude-code-workbench-ja をローカルに clone 済みか質問し、
パスを教えてもらう。パス直下に `software-factory/.claude/agents/` が存在することを確認して
テンプレートソース `$SRC=<パス>/software-factory` とする。

### 1-b. GitHub から一時取得する（フォールバック）

ローカルに無い場合は一時ディレクトリへ shallow clone する:

```bash
TMP=$(mktemp -d)
git clone --depth 1 https://github.com/mrkxlia/claude-code-workbench-ja "$TMP/workbench"
# $SRC="$TMP/workbench/software-factory"
```

**コピー完了後（Step 6 の後）、`rm -rf "$TMP"` で必ず削除すること。**
エラーで中断する場合も削除してから停止する。

## Step 2: 対象リポジトリの解析

書き込みはまだ行わない。Read / Grep / Glob と読み取り専用コマンドだけで以下を調べる。

### 2-1. スタックとコマンドの検出

| 見つけるファイル | 読み取るもの |
|---|---|
| `package.json` | `scripts` の test / lint / typecheck / build、dependencies からフレームワーク（next / react / vue / express / fastify / nestjs 等）、パッケージマネージャ（lockfile で判定: pnpm-lock.yaml / yarn.lock / package-lock.json / bun.lockb） |
| `pyproject.toml` / `setup.cfg` | pytest / ruff / mypy / black の設定、`[project.dependencies]`（fastapi / django / flask 等） |
| `go.mod` | モジュール名。コマンドは `go test ./...` / `go vet ./...` / `go build ./...` を既定候補に |
| `Cargo.toml` | クレート名。`cargo test` / `cargo clippy` / `cargo build` を既定候補に |
| `Gemfile` | rails / sinatra。`bundle exec rspec` / `rubocop` を既定候補に |
| `Makefile` / `justfile` | test / lint / check 系ターゲット（言語別コマンドより優先して採用） |
| CI 設定（`.github/workflows/*.yml`） | 実際に CI で走っているテスト・リントコマンド（最も信頼できる情報源） |

**検出できなかった項目は空欄のまま残し、Step 3 でユーザーに質問する。
それらしいコマンドを捏造してはならない。**

### 2-2. バックエンド／フロントエンド境界の推定

| 兆候 | 推定 |
|---|---|
| `src/server/`, `server/`, `api/`, `src/app/api/`, `app/api/`, `backend/`, `src/jobs/` | バックエンド領域 |
| `src/components/`, `components/`, `src/pages/`, `pages/`, `src/app/`（`api/` を除く）, `src/hooks/`, `frontend/`, `client/` | フロントエンド領域 |
| `prisma/`, `migrations/`, `db/`, `drizzle/`, `alembic/` | DBスキーマ・マイグレーション（バックエンド側に含める） |
| `tests/`, `test/`, `__tests__/`, `e2e/`, `spec/`, `*.test.*` / `*.spec.*` の配置 | テスト領域 |

フロントエンドが存在しない（API専用・CLI・ライブラリ等の）リポジトリでは、
frontend-builder を導入対象から外す選択肢を Step 3 で提示する。

### 2-3. モノレポ判定

`pnpm-workspace.yaml` / `package.json` の `workspaces` / `turbo.json` / `lerna.json` /
`apps/` + `packages/` 構成のいずれかがあればモノレポと判定し、
**工場の対象とする workspace（アプリ）をユーザーに質問する**。
以降の境界・コマンドはその workspace を基準にする。

### 2-4. 既存設定の棚卸し

- ルートの `CLAUDE.md` の有無
- `.claude/agents/` `.claude/skills/` `.claude/hooks/` の既存ファイル
  （テンプレートと同名のものは「衝突」としてリスト化）
- `.claude/settings.json` の有無と、既存の `hooks` キーの中身

## Step 3: 🛑 チェックポイント1 — 解析結果の承認

解析結果を以下の形式でユーザーに提示する:

1. **スタック表** — 言語・フレームワーク・DB/ORM・テストツール・パッケージマネージャ
2. **コマンド表** — dev / build / test / typecheck / lint（検出元も併記。不明は「❓ 要確認」）
3. **境界** — バックエンド／フロントエンド／テストの各フォルダ一覧
4. **モノレポ判定** — 対象 workspace
5. **既存設定との衝突** — 上書きせずマージ・スキップする対象の一覧

❓ の項目はここで質問して埋める。

**STOP. ユーザーの明示的な承認（「承認」「OK」「進めて」等）があるまで、
1ファイルも作成・変更してはならない。** 修正指示があれば解析結果を直してから再提示する。

## Step 4: CLAUDE.md の生成

### 4-a. 既存の CLAUDE.md が無い場合

`$SRC/CLAUDE.md` をベースに、`<!-- 差し替え -->` とコメントされた4箇所を
Step 3 で承認済みの値で充填して、対象リポジトリのルートに書き出す:

1. **技術スタック表** → 承認済みスタック表
2. **開発コマンド** → 承認済みコマンド表（不明のまま残った項目は行ごと削除する）
3. **アーキテクチャのルール（フォルダ境界）** → 承認済み境界
4. **深いドキュメントへのポインタ** → 対象リポジトリの `docs/` 等を確認して列挙
   （無ければ `docs/factory/<feature>/` の行だけ残す）

生成物からは `<!-- 差し替え -->` コメントと冒頭の差し替え案内文を取り除く。
サンプル特有の記述（テナント分離・UTC 等）は対象リポジトリに該当する場合のみ残す。

### 4-b. 既存の CLAUDE.md がある場合

**上書き禁止。** 工場に必要なセクション（ハードルール・7人のAI社員表・利用可能なスキル表・
`docs/factory/` ポインタ）を既存の末尾に追記する案を diff 形式で提示し、
承認を得てから適用する。既存の記述と重複・矛盾する項目は追記から除く。

## Step 5: エージェントの配置と担当範囲の差し替え

1. `mkdir -p .claude/agents` して `$SRC/.claude/agents/*.md` の7ファイルをコピーする
   （Step 3 でフロントエンド無しと確定した場合、frontend-builder は除く）
2. `backend-builder.md` / `frontend-builder.md` / `test-verifier.md` の
   「担当範囲」セクションの箇条書きを、**Step 3 で承認済みの境界**で書き換える。
   `<!-- ↓ 自分のプロジェクトの〜に書き換える -->` コメントは削除する

CLAUDE.md のアーキテクチャルールとビルダーの担当範囲は、**同じ承認済みデータ**から
生成すること。これにより両者の不一致（ビルダー同士の越境の原因）が構造的に発生しなくなる。

衝突（既存の同名エージェント）がある場合は、そのファイルをスキップして報告する。

## Step 6: スキル・フック・settings.json

### 6-1. スキルのコピー

`mkdir -p .claude/skills` して `feature-factory/` と `build-with-tests/` をコピーする。
**factory-setup 自身は対象リポジトリにコピーしない**（ワンショットのブートストラップであり、
プロジェクトのスラッシュコマンド一覧を汚さないため）。

コピー後、`build-with-tests/SKILL.md` 内の
`npm run typecheck   # ← プロジェクトのコマンドに差し替える` の行を
承認済みの typecheck コマンドに置換する（typecheck が無い言語では test コマンドに置換）。

### 6-2. フックのコピーと実行権限

```bash
mkdir -p .claude/hooks
cp "$SRC/.claude/hooks/block-secrets-commit.sh" .claude/hooks/
chmod +x .claude/hooks/block-secrets-commit.sh
```

### 6-3. settings.json のマージ

- `.claude/settings.json` が**無い**場合: `$SRC/.claude/settings.json` をそのままコピーする
- **ある**場合: 既存 JSON の `hooks.PreToolUse` 配列にテンプレートのフックエントリを
  **追記**する。既存のキー・エントリは削除も上書きもしない。
  同一の `command` がすでに登録済みなら追記しない

マージ後、`node -e 'JSON.parse(...)'` または `jq .` で JSON として妥当なことを検証する。

## Step 7: 検証チェックリスト

以下を実際に確認し、結果をチェックリストで報告する:

```
導入検証:
- [ ] .claude/agents/ にエージェント定義（7ファイル、FE無し構成なら6）がある
- [ ] 各エージェントの frontmatter が妥当な YAML である
- [ ] .claude/skills/ に feature-factory と build-with-tests がある
- [ ] build-with-tests の typecheck コマンドが置換済みである
- [ ] block-secrets-commit.sh に実行権限がある（ls -l で確認)
- [ ] .claude/settings.json が妥当な JSON で、既存キーが失われていない
- [ ] CLAUDE.md のフォルダ境界とビルダー3種の「担当範囲」が一致している
- [ ] フックのドライラン: echo '{"tool_name":"Bash","tool_input":{"command":"git commit -m x"}}' を
      スクリプトの stdin に流し、エラーなく終了する（ステージに機密ファイルがあれば exit 2）
```

Step 1-b で一時ディレクトリを使った場合は、ここで `rm -rf "$TMP"` を実行したことも報告する。

## Step 8: 🛑 チェックポイント2 — 導入結果のレビューと試運転

1. 作成・変更した全ファイルの一覧（新規／編集／マージの別つき）を提示する
2. **STOP. ユーザーがレビューして承認するまで完了扱いにしない。**
   修正指示があれば該当 Step に戻る
3. 承認後、次の2つを案内する:
   - エージェント定義はセッション開始時に読み込まれるため、**新しいセッションを開始**
     （または再起動）してから使うこと
   - 試運転: `/feature-factory ヘルスチェック用の GET /api/health エンドポイントとステータス表示を作って`
     のような小さい機能を流し、3つのチェックポイントを体験すること
4. チューニングの心得として「AIが驚くミスをするたびに『CLAUDE.md にルールがあれば防げたか？』と
   自問してルールを足す」（テンプレート README の手順8）を案内する

## セットアップ技師のルール

- 検出できなかったコマンドや境界を、それらしい値で**捏造しない**。空欄にして質問する
- 既存の CLAUDE.md・settings.json・エージェント定義を**上書きしない**。マージ提案か、スキップ+報告
- チェックポイント1の承認前に1ファイルも書かない。チェックポイント2の承認前に完了と言わない
- 一時ディレクトリは成功時も失敗時も必ず削除する
- 途中で失敗したら、どこまで適用済みかを正確に報告して停止する（中途半端な状態を隠さない）
