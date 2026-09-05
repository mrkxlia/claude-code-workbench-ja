# コードモード固有の手順（pipeline-setup 別冊）

本冊子は SKILL.md の各 Step から参照される。**コードモード**（`/feature-pipeline` を導入する）の
モード固有の解析・配置内容だけをここに置く。共通の骨格・順序・ルールは SKILL.md 本体に従う。

## Step 2: 解析（コードモード）

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

## Step 3: CP1 の提示項目（コードモード固有分）

1. **スタック表** — 言語・フレームワーク・DB/ORM・テストツール・パッケージマネージャ
2. **コマンド表** — dev / build / test / typecheck / lint（検出元も併記。不明は「❓ 要確認」）
3. **境界** — バックエンド／フロントエンド／テストの各フォルダ一覧
4. **モノレポ判定** — 対象 workspace

空リポの初期ヒアリングで聞く項目: 「プロジェクト種別（ソフト開発／ドキュメント／その他）」
「主要言語・スタック」「最初に固定したい仕様・受け入れ基準」。
種別がコード以外なら成果物モードへ切り替えを提案する。

## Step 4: CLAUDE.md の生成（コードモード）

ベースは `$SRC/CLAUDE.md`。`<!-- 差し替え -->` とコメントされた4箇所を承認済みの値で充填する:

1. **技術スタック表** → 承認済みスタック表
2. **開発コマンド** → 承認済みコマンド表（不明のまま残った項目は行ごと削除する）
3. **アーキテクチャのルール（フォルダ境界）** → 承認済み境界
4. **深いドキュメントへのポインタ** → 対象リポジトリの `docs/` 等を確認して列挙
   （無ければ `docs/pipeline/<feature>/` の行だけ残す）

サンプル特有の記述（テナント分離・UTC 等）は対象リポジトリに該当する場合のみ残す。

🔓 非gitモード: ハードルール1「機密ファイルは絶対にコミットしない」は、コミットの概念が
無いため「機密ファイル（`.env`・`*.key`・`*.pem`・`secrets.json`）の内容をコード・
ドキュメント・ログに書き出さない」という趣旨の文言に差し替える。

## Step 5: エージェントの配置（コードモード）

コピーするのは次の**7ファイル**（Step 3 でフロントエンド無しと確定した場合、frontend-builder を除く6）:
`researcher` / `requirements-writer` / `brief-writer` / `backend-builder` / `frontend-builder` /
`test-verifier` / `final-reviewer`（`deliverable-builder` / `design-doc-checker` はコピーしない — 成果物モード用）。

`backend-builder.md` / `frontend-builder.md` / `test-verifier.md` の
「担当範囲」セクションの箇条書きを、**Step 3 で承認済みの境界**で書き換える。
`<!-- ↓ 自分のプロジェクトの〜に書き換える -->` コメントは削除する。
**「上記に加えて〜（差し替え対象外）」以降の `docs/pipeline/<slug>/implementation-notes.md` の
行はプロジェクト境界に依存しないため、必ずそのまま残す**（消すと導入先で実装ノートの
記録先が担当範囲外になり、ビルダーが記録できなくなる）。

CLAUDE.md のアーキテクチャルールとビルダーの担当範囲は、**同じ承認済みデータ**から
生成すること（両者の不一致＝ビルダー同士の越境の原因を構造的に防ぐ）。

## Step 6: スキル・フックの配置（コードモード）

### スキル（5つ）

`feature-pipeline/`・`build-with-tests/`・`notes/`・`pipeline-improve/`・`clarify/`。
コピー後、`build-with-tests/SKILL.md` 内の
`npm run typecheck   # ← プロジェクトのコマンドに差し替える` の行を
承認済みの typecheck コマンドに置換する（typecheck が無い言語では test コマンドに置換）。

### フック（5本）

```bash
mkdir -p .claude/hooks
cp "$SRC/hooks/block-secrets-commit.sh" .claude/hooks/
cp "$SRC/hooks/guard-builder-writes.sh" .claude/hooks/
cp "$SRC/hooks/guard-builder-paths.sh" .claude/hooks/
cp "$SRC/hooks/inject-spec-summary.sh" .claude/hooks/
cp "$SRC/hooks/spec-sync-reminder.sh" .claude/hooks/
chmod +x .claude/hooks/block-secrets-commit.sh .claude/hooks/guard-builder-writes.sh .claude/hooks/guard-builder-paths.sh .claude/hooks/inject-spec-summary.sh .claude/hooks/spec-sync-reminder.sh
```

`guard-builder-paths.sh` は各ビルダーの frontmatter から呼ばれ、担当範囲外への書き込みを
exit 2 で拒否する（settings.json には登録しない）。許可プレフィックスは Step 5 の
「担当範囲」書き換えと**同じ承認済みデータ**で揃える。

`inject-spec-summary.sh` は SessionStart と SubagentStart の両方から呼ばれ、SPEC.md の
`[確定]` 要件の目次を注入する（1スクリプトを2イベントで使う）。抽出規則は
[`spec-summary.md`](spec-summary.md)。

`guard-builder-writes.sh` は並列実装フェーズ中の共有ファイル衝突だけを `ask` に回すフック。
共有ファイル禁止リスト（`SHARED_PATTERNS`）を、承認済みのスタック（Prisma/型バレル/ルーティング等）に
合わせて差し替える。

settings.json のマージでは、テンプレートの `guard-deliverable-writes` エントリ（成果物モード用）を
**追記対象から除く**。

🔓 非gitモード: フックはそのままコピーしてよい。`guard-builder-writes.sh` は
`.parallel-active` マーカーが無ければ素通りするため無害。`block-secrets-commit.sh` も
（`git diff` が失敗した時点で exit 0）後から `git init` した時点で自動的に有効になる。

## Step 7: 検証チェックリスト（コードモード固有分）

```
- [ ] .claude/agents/ にエージェント定義（7ファイル、FE無し構成なら6）がある
- [ ] .claude/skills/ に feature-pipeline / build-with-tests / notes / pipeline-improve / clarify がある
- [ ] build-with-tests の typecheck コマンドが置換済みである
- [ ] block-secrets-commit.sh / guard-builder-writes.sh / guard-builder-paths.sh / inject-spec-summary.sh / spec-sync-reminder.sh に実行権限がある
- [ ] guard-builder-writes.sh のドライラン: マーカー無しで共有ファイルへの Write を流すと exit 0
      （`echo '{"tool_name":"Write","tool_input":{"file_path":"prisma/schema.prisma"}}' | bash .claude/hooks/guard-builder-writes.sh; echo $?` → 0）
- [ ] settings.json の PreToolUse に Bash（block-secrets）と Edit|Write（guard-builder）のエントリがある
- [ ] settings.json の SessionStart / SubagentStart に inject-spec-summary のエントリがある
- [ ] inject-spec-summary のドライラン: `echo '{"hook_event_name":"SessionStart"}' | bash .claude/hooks/inject-spec-summary.sh`
      で SPEC の目次（または「SPEC.md なし」の1行）が出る。`"hook_event_name":"SubagentStart"` では JSON 1行になる
- [ ] guard-builder-paths のドライラン: 担当外パスで exit 2、担当内で exit 0
      （`echo '{"tool_input":{"file_path":"src/components/A.tsx"}}' | bash .claude/hooks/guard-builder-paths.sh "src/server/"; echo $?` → 2）
- [ ] ビルダー3種の frontmatter の許可プレフィックスが「担当範囲」セクションと一致している
- [ ] CLAUDE.md のフォルダ境界とビルダー3種の「担当範囲」が一致している
- [ ] ビルダー3種の「担当範囲」に `docs/pipeline/<slug>/implementation-notes.md` の行が残っている
- [ ] block-secrets のドライラン: echo '{"tool_name":"Bash","tool_input":{"command":"git commit -m x"}}' を
      stdin に流し、エラーなく終了する（ステージに機密ファイルがあれば exit 2。非 git では常に exit 0）
```

## Step 8: 試運転の例（コードモード）

`/feature-pipeline ヘルスチェック用の GET /api/health エンドポイントとステータス表示を作って`
のような小さい機能を流し、3つのチェックポイントを体験する。
