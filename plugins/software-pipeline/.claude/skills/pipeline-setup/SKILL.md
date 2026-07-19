---
name: pipeline-setup
description: >-
  software-pipeline テンプレート（7エージェント・スキル・フック・CLAUDE.md）を
  対象リポジトリに自動セットアップするスキル。package.json / pyproject.toml /
  go.mod / Cargo.toml などからスタックと test / lint / typecheck / build コマンドを検出し、
  ディレクトリ構成からバックエンド／フロントエンドの境界を推定して、CLAUDE.md の
  差し替え箇所とビルダー3種の「担当範囲」を自動で充填する。既存の CLAUDE.md や
  .claude/settings.json は上書きせずマージを提案する。git 管理されていないリポジトリにも
  対応する（git init の提案、または非gitモードでの導入）。
  多数のファイルを書き込むワンショットのブートストラップであるため、
  自動発動はせず /pipeline-setup での手動起動でのみ実行する。
disable-model-invocation: true
---

# pipeline-setup — ソフトウェアパイプラインワンコマンドセットアップ

あなたは「セットアップ技師」です。対象リポジトリを解析し、software-pipeline テンプレートを
そのリポジトリに適合させて導入します。推測で空欄を埋めず、書き込む前に必ず確認します。

このスキルは `~/.claude/skills/pipeline-setup/` にパーソナルスキルとして置かれ、
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

1. カレントディレクトリが git リポジトリかを確認する（`git rev-parse --is-inside-work-tree`）。
   **git リポジトリでない場合は停止せず**、次の2択をユーザーに提示して選んでもらう:
   - **(a) `git init` してから導入する（推奨）** — 機密コミット防止フック・失敗時の巻き戻し・
     履歴管理がすべて有効になる。承認されたら `git init` を実行し、以降は通常どおり進める
   - **(b) git なしのまま導入する（非gitモード）** — 以降のステップで「🔓 非gitモード」と
     記された分岐に従う。通常モードとの違い（フックが待機状態になる・巻き戻しがバックアップ
     頼みになる・最終工程がコミット提案ではなくファイル一覧提示になる）をここで伝えておく
2. **workbench リポジトリ自身の中で実行していないこと**を確認する。
   ルートに `software-pipeline/` ディレクトリと `task-pipeline/` ディレクトリ（または
   `.claude-plugin/marketplace.json`）がある場合は workbench 本体なので、「導入先のリポジトリで
   実行してください」と案内して停止する
3. （git 管理下の場合のみ）作業ツリーがクリーンか確認する（`git status --porcelain`）。
   未コミットの変更があれば「セットアップ全体を `git checkout` / `git revert` で巻き戻せるよう、
   先にコミットを推奨」と伝える（強制はしない）
4. **opus が使える環境かを確認する。** `spec-writer` エージェントは既定で `model: opus` を使う
   （設計ミスが最も高くつく工程のため）。Sonnet のみの環境（会社 PC 等）ではこの指定のまま導入すると
   Phase 3 で失敗・意図しないフォールバックが起きうる。ユーザーに「opus は使えますか？」と確認し、
   使えない場合は Step 5 で `spec-writer.md` の `model: opus` を `model: inherit` に書き換える。

## Step 1: テンプレートの入手

### 1-0. スキル自身の場所から見つける（最優先・確認不要）

このスキル（pipeline-setup）が `<どこか>/.claude/skills/pipeline-setup/` という配置にあり、
その **3階層上**のディレクトリに `.claude/agents/` と `CLAUDE.md` が存在する場合、
そこがテンプレート一式である。`$SRC=<3階層上のディレクトリ>` として Step 2 へ進む。
clone もユーザーへの質問も不要。

該当するのは次の2ケース:
- **プラグインとしてインストールされている**（`/plugin install software-pipeline@workbench-ja`）—
  プラグインのキャッシュに software-pipeline 一式が入っており、このスキルはその中にいる
- workbench リポジトリの clone 内の `software-pipeline/.claude/skills/pipeline-setup/` から
  直接読み込まれている

`~/.claude/skills/pipeline-setup/` にパーソナルスキルとして単体コピーされている場合は
3階層上にテンプレートが無いため、この方法は使えない。次の 1-a 以降へ。

### 1-a. ローカルの workbench を使う

ユーザーに claude-code-workbench-ja をローカルに clone 済みか質問し、
パスを教えてもらう。パス直下に `software-pipeline/.claude/agents/` が存在することを確認して
テンプレートソース `$SRC=<パス>/software-pipeline` とする。

### 1-b. GitHub から一時取得する（フォールバック）

ローカルに無い場合は一時ディレクトリへ shallow clone する:

```bash
TMP=$(mktemp -d)
git clone --depth 1 https://github.com/mrkxlia/claude-code-workbench-ja "$TMP/workbench"
# $SRC="$TMP/workbench/software-pipeline"
```

git コマンド自体が使えない環境では、tarball で取得する:

```bash
TMP=$(mktemp -d)
curl -L https://github.com/mrkxlia/claude-code-workbench-ja/archive/refs/heads/main.tar.gz | tar -xz -C "$TMP"
# $SRC="$TMP/claude-code-workbench-ja-main/software-pipeline"
```

（リポジトリが private の場合は認証が必要:
`curl -L -H "Authorization: Bearer <token>" https://api.github.com/repos/mrkxlia/claude-code-workbench-ja/tarball/main`）

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
**パイプラインの対象とする workspace（アプリ）をユーザーに質問する**。
以降の境界・コマンドはその workspace を基準にする。

### 2-4. 既存設定の棚卸し

- ルートの `CLAUDE.md` の有無
- `.claude/agents/` `.claude/skills/` `.claude/hooks/` の既存ファイル
  （テンプレートと同名のものは「衝突」としてリスト化）
- `.claude/settings.json` の有無と、既存の `hooks` キーの中身

### 2-5. 既存仕様（SPEC.md）の棚卸しと空リポ判定

整合性を担保するため、**既存仕様の状態**を3パターンに分類する（書き込みはしない・読み取りのみ）:

- **空リポ（ソースがほぼ無い）**: 追跡ファイル・ソースがほとんど無い新規プロジェクト。
  Step 3 で**前向きにヒアリング**する材料にする（下記 Step 3 の「空リポの初期ヒアリング」）。
- **既存リポ・SPEC.md あり**（`SPEC.md` / `SPEC-recovered.md`）: これを spec of record として読み、
  Step 3 で「これから入れるパイプラインが既存仕様と整合するか」を確認する材料にする。
- **既存リポ・SPEC.md なし**: 既存挙動が文書化されていない。Step 3 で**先に `/spec-extract` を実行して
  SPEC.md を作ることを推奨**する（setup 自身は SPEC.md を書かない＝書き込みは spec-extract に委ねる）。

**種別ルーティング**: 解析でコードのスタックが一切検出されず、成果物が図・ドキュメント中心だと判明した
場合は、「このプロジェクトはコード以外の成果物が中心のようです。`task-pipeline-setup` の方が適合します」と
案内する（software-pipeline を無理に入れない）。

## Step 3: 🛑 チェックポイント1 — 解析結果の承認

解析結果を以下の形式でユーザーに提示する:

1. **スタック表** — 言語・フレームワーク・DB/ORM・テストツール・パッケージマネージャ
2. **コマンド表** — dev / build / test / typecheck / lint（検出元も併記。不明は「❓ 要確認」）
3. **境界** — バックエンド／フロントエンド／テストの各フォルダ一覧
4. **モノレポ判定** — 対象 workspace
5. **既存設定との衝突** — 上書きせずマージ・スキップする対象の一覧
6. **既存仕様の状態（2-5）** — 空リポ／SPEC.md あり／SPEC.md なし のどれか。
   - **SPEC.md なし＆ソースあり**: 「整合性を効かせるため、先に `/spec-extract` で SPEC.md を作ることを
     推奨します（任意・後からでも可）」と添える。setup はここで spec-extract を勝手に走らせない
   - **SPEC.md あり**: 「これを既存仕様として researcher / validator が参照します」と伝える
7. **opus 可用性（Step 0-4）** — 使える／使えない。使えない場合は「`spec-writer` を `inherit` に
   書き換えて導入します」と伝える

❓ の項目はここで質問して埋める。

**空リポの初期ヒアリング（空リポと判定した場合のみ）**: 受け身で待たず、`clarify` のプロトコル
（一問ずつ・推奨回答つき）で「プロジェクト種別（ソフト開発／ドキュメント／その他）」「主要言語・スタック」
「最初に固定したい仕様・受け入れ基準」を前向きに聞き出す。種別がコード以外なら種別ルーティング（2-5）で
`task-pipeline-setup` を案内する。**ここで聞いた初期仕様は、承認後の書き込みフェーズ（Step 4 以降）で
初期 SPEC.md として作成する**（承認前には書かない）。

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
   （無ければ `docs/pipeline/<feature>/` の行だけ残す）

生成物からは `<!-- 差し替え -->` コメントと冒頭の差し替え案内文を取り除く。
サンプル特有の記述（テナント分離・UTC 等）は対象リポジトリに該当する場合のみ残す。

🔓 非gitモード: ハードルール1「機密ファイルは絶対にコミットしない」は、コミットの概念が
無いため「機密ファイル（`.env`・`*.key`・`*.pem`・`secrets.json`）の内容をコード・
ドキュメント・ログに書き出さない」という趣旨の文言に差し替える。同様にハードルール7
「1 Todo = 1 Commit = 1 Spec Update（`spec-sync-reminder` フックが更新漏れを促す）」も、
git が無い環境では「Commit」の単位とフックの実発火が成立しないため、
「1 Todo = 1 Spec Update（`spec-sync-reminder` フックは git 環境でのみ有効。非gitモードでは
Todo の区切りごとに手動で SPEC.md を確認・更新すること）」に差し替える。

### 4-b. 既存の CLAUDE.md がある場合

**上書き禁止。** パイプラインに必要なセクション（ハードルール・7人の専門エージェント表・利用可能なスキル表・
`docs/pipeline/` ポインタ）を既存の末尾に追記する案を diff 形式で提示し、
承認を得てから適用する。既存の記述と重複・矛盾する項目は追記から除く。

🔓 非gitモード: 追記を適用する**前に**、既存の CLAUDE.md を `.claude/pipeline-backup/CLAUDE.md`
としてコピーしておく（git の巻き戻しの代替）。

### 4-c. 空リポの初期 SPEC.md（空リポと判定し、Step 3 で初期仕様を聞いた場合のみ）

Step 3 の「空リポの初期ヒアリング」で聞いた初期仕様・受け入れ基準を、リポジトリ直下の `SPEC.md` に
書き出す（spec-extract の SPEC.md 構造・確度ラベルに従う。まだ実装が無いので大半は `[推定]`、
ユーザーが断言した項目のみ `[確定]`）。これが以降の researcher / validator の spec of record になる。
既存リポ（SPEC.md なし）の場合はここでは作らない — Step 3 で案内したとおり `/spec-extract` に委ねる。

## Step 5: エージェントの配置と担当範囲の差し替え

1. `mkdir -p .claude/agents` して `$SRC/.claude/agents/*.md` の7ファイルをコピーする
   （Step 3 でフロントエンド無しと確定した場合、frontend-builder は除く）
2. `backend-builder.md` / `frontend-builder.md` / `test-verifier.md` の
   「担当範囲」セクションの箇条書きを、**Step 3 で承認済みの境界**で書き換える。
   `<!-- ↓ 自分のプロジェクトの〜に書き換える -->` コメントは削除する。
   **「上記に加えて〜（差し替え対象外）」以降の `docs/pipeline/<slug>/implementation-notes.md` の
   行はプロジェクト境界に依存しないため、必ずそのまま残す**（消すと導入先で実装ノートの
   記録先が担当範囲外になり、ビルダーが記録できなくなる）

CLAUDE.md のアーキテクチャルールとビルダーの担当範囲は、**同じ承認済みデータ**から
生成すること。これにより両者の不一致（ビルダー同士の越境の原因）が構造的に発生しなくなる。

衝突（既存の同名エージェント）がある場合は、そのファイルをスキップして報告する。

**opus が使えない環境の場合**（Step 0-4 で確認済み）: コピー後、`spec-writer.md` の
frontmatter の `model: opus` を `model: inherit` に書き換える（末尾の推奨コメントも
「opus を使わない環境のため inherit を採用」に更新する）。

## Step 6: スキル・フック・settings.json

### 6-1. スキルのコピー

`mkdir -p .claude/skills` して `feature-pipeline/`・`build-with-tests/`・`notes/`・
`spec-extract/`・`pipeline-improve/`・`clarify/` の6つをコピーする。
**pipeline-setup 自身は対象リポジトリにコピーしない**（ワンショットのブートストラップであり、
プロジェクトのスラッシュコマンド一覧を汚さないため）。

プラグイン経由（Step 1-0）で実行している場合も、プロジェクトへのスキルコピーは行う。
プロジェクト側のスキルが優先されるため衝突せず、後でプラグインを無効化してもパイプラインが動き続ける。

`notes/` と `spec-extract/` は implementation-skills 由来のパイプライン連携版。対象リポジトリに
既に同名スキル（原本を単体導入済みのケース）がある場合は上書きせず、スキップして
「パイプライン連携版に差し替えるか」をユーザーに確認する。

コピー後、`build-with-tests/SKILL.md` 内の
`npm run typecheck   # ← プロジェクトのコマンドに差し替える` の行を
承認済みの typecheck コマンドに置換する（typecheck が無い言語では test コマンドに置換）。

### 6-2. フックのコピーと実行権限

```bash
mkdir -p .claude/hooks
cp "$SRC/.claude/hooks/block-secrets-commit.sh" .claude/hooks/
cp "$SRC/.claude/hooks/guard-builder-writes.sh" .claude/hooks/
cp "$SRC/.claude/hooks/spec-sync-reminder.sh" .claude/hooks/
chmod +x .claude/hooks/block-secrets-commit.sh .claude/hooks/guard-builder-writes.sh .claude/hooks/spec-sync-reminder.sh
```

（Windows ネイティブ＝bash が無い環境では、`.sh` の代わりに同梱の `.ps1` を配置し `chmod` は skip する。
詳細は後述「Windows 対応」。bash が使える Git Bash / WSL では上記どおり `.sh` を使う。）

`spec-sync-reminder.sh` は SessionStart/Stop で SPEC.md の未同期をやさしく知らせる非ブロッキング通知フック
（git 管理外・SPEC.md 不在なら静かに何もしない）。`guard-builder-writes.sh` は並列実装フェーズ中の共有ファイル衝突だけを `ask` に回すフック。
共有ファイル禁止リスト（`SHARED_PATTERNS`）を、承認済みのスタック（Prisma/型バレル/ルーティング等）に
合わせて差し替える。

🔓 非gitモード: フックはそのままコピーしてよい。git の無い環境でも、`guard-builder-writes.sh` は
`.parallel-active` マーカーが無ければ素通りするため無害。`block-secrets-commit.sh` も
（`git diff` が失敗した時点で exit 0）後から `git init` した時点で自動的に有効になる。

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
- [ ] .claude/agents/ にエージェント定義（7ファイル、FE無し構成なら6）がある
- [ ] 各エージェントの frontmatter が妥当な YAML である
- [ ] opus が使えない環境と確認した場合、spec-writer.md の model が inherit に書き換わっている
- [ ] .claude/skills/ に feature-pipeline / build-with-tests / notes / spec-extract / pipeline-improve / clarify がある
      （既存同名スキルでスキップしたものは報告済みである）
- [ ] build-with-tests の typecheck コマンドが置換済みである
- [ ] block-secrets-commit.sh / guard-builder-writes.sh / spec-sync-reminder.sh に実行権限がある（ls -l で確認）
- [ ] guard-builder-writes.sh のドライラン: マーカー無しで共有ファイルへの Write を流すと exit 0
      （`echo '{"tool_name":"Write","tool_input":{"file_path":"prisma/schema.prisma"}}' | bash .claude/hooks/guard-builder-writes.sh; echo $?` → 0）
- [ ] spec-sync-reminder.sh のドライラン: `echo '{"hook_event_name":"SessionStart"}' | bash .claude/hooks/spec-sync-reminder.sh; echo $?` → 0
      （SPEC.md が無ければ無出力で exit 0。実発火の確認は新セッション開始/終了時）
- [ ] .claude/settings.json が妥当な JSON で、既存キーが失われていない（PreToolUse に Bash と Edit|Write、SessionStart と Stop に spec-sync-reminder の各エントリがある）
- [ ] CLAUDE.md のフォルダ境界とビルダー3種の「担当範囲」が一致している
- [ ] ビルダー3種の「担当範囲」に `docs/pipeline/<slug>/implementation-notes.md` の行が残っている
- [ ] フックのドライラン: echo '{"tool_name":"Bash","tool_input":{"command":"git commit -m x"}}' を
      スクリプトの stdin に流し、エラーなく終了する（ステージに機密ファイルがあれば exit 2。
      非 git リポジトリでは常に exit 0）
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
   - 試運転: `/feature-pipeline ヘルスチェック用の GET /api/health エンドポイントとステータス表示を作って`
     のような小さい機能を流し、3つのチェックポイントを体験すること
   - 🔓 非gitモード: 巻き戻しが必要なときは `.claude/pipeline-backup/` のコピーを元の場所に戻し、
     1で提示した新規作成ファイルを削除すればよいこと。また、後から `git init` すれば
     機密コミット防止フックを含む全機能がその時点から有効になること
4. チューニングの心得として「AIが驚くミスをするたびに『CLAUDE.md にルールがあれば防げたか？』と
   自問してルールを足す」（テンプレート README の手順8）を案内する

## Windows 対応（bash が使えるかでフックを振り分ける）

フックは `.sh`（baseline）と `.ps1`（PowerShell 同等版）の二種を同梱している。導入環境で**どちらを配るかは
「OS 名」ではなく「bash が使えるか」で判定する**（Git Bash は Windows 上でも `.sh` が動くため、`$env:OS` や
uname の OS 名で判定すると誤る）:

- **bash が使える**（Git Bash / WSL / Mac / Linux。`command -v bash` が成功）→ Step 6 のとおり `.sh` をコピーして
  `chmod +x`。settings.json の command は `bash "$CLAUDE_PROJECT_DIR"/.claude/hooks/xxx.sh`。
- **bash が無い純 PowerShell** → 代わりに `.ps1` をコピーし（`chmod` は skip）、command は
  `pwsh -NoProfile -ExecutionPolicy Bypass -File "<repo>/.claude/hooks/xxx.ps1"`。
  **`pwsh`（PowerShell 7）が無ければ Windows 標準の `powershell`（5.1）にフォールバック**する。
  例: `"command": "powershell -NoProfile -ExecutionPolicy Bypass -File .claude/hooks/spec-sync-reminder.ps1"`。
  `-ExecutionPolicy Bypass` は 5.1 の既定ポリシー（Restricted/RemoteSigned）でフックがブロックされるのを防ぐ。
  `$CLAUDE_PROJECT_DIR` はそのまま使え、パス区切りは `/` で統一（PowerShell も許容）。
  `.ps1` は **UTF-8 BOM 付き**で配る（5.1 が日本語を文字化けさせないため。BOM を外さないこと）。

注意:
- `block-secrets-commit` の `.git/hooks/pre-commit` 用途は `.sh` のまま（git は Windows でも sh で pre-commit を
  実行し、`.ps1` は pre-commit として起動しない）。`.ps1` は PreToolUse の command 経由のみ。
- settings.json は条件分岐を持てないため、**導入時の環境で確定した1つの command** だけを書く。再 setup で
  環境が変わったら 6-3 の「`.sh`/`.ps1` ペアは同一フック」ルールで二重登録を防ぐ。
- ドライランも環境に合わせる: PowerShell 版は `powershell -NoProfile -ExecutionPolicy Bypass -File .claude/hooks/xxx.ps1`（PS7 なら pwsh）に同じ JSON を stdin で渡す。

## セットアップ技師のルール

- 検出できなかったコマンドや境界を、それらしい値で**捏造しない**。空欄にして質問する
- 既存の CLAUDE.md・settings.json・エージェント定義を**上書きしない**。マージ提案か、スキップ+報告
- 🔓 非gitモードでは、既存ファイルを変更する前に必ず `.claude/pipeline-backup/` へコピーを取る
- チェックポイント1の承認前に1ファイルも書かない。チェックポイント2の承認前に完了と言わない
- 一時ディレクトリは成功時も失敗時も必ず削除する
- 途中で失敗したら、どこまで適用済みかを正確に報告して停止する（中途半端な状態を隠さない）
