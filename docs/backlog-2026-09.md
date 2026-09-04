# backlog-2026-09 — Fable 5.1 セッション（2026-09-03/04）からの引き継ぎブリーフ

Fable 5.1 が本リポジトリを監査した際に「今日やる価値が高いもの」（`docs/decisions/` の2記録）を
片付けた後、**Sonnet 5 / Opus 5 が単独で実行できる形**に落とした残作業。1項目 = 1ブリーフ
（`plugins/model-setup/PROMPTS.md` #0 の型）。着手は `/backlog-loop docs/backlog-2026-09.md` か、
ブリーフを1つ貼って Plan モードで依頼する。完了したら「完了記録」に日付と PR を書いて残す
（`backlog-loop` の運用）。

優先度の付け方: **高** = 決定記録で採用済みの実装（設計判断は済んでいる）、**中** = 品質・保守性、
**低** = 機械的。上から順に着手する。

---

## B-1（高）model-setup: ブリーフ再注入フック（序盤制約の保持・決定1の実装）

- **ゴール**: `/long-run` で固定したブリーフファイルを、コンパクション直後に自動で文脈へ再注入する（`resume` は
  二重注入になるので対象外）。
- **背景**: 決定記録 `docs/decisions/2026-09-03-long-run-constraints-and-spec-load.md` 決定1。プロンプト依存だった
  「区切りごとに再読」を、フックで決定論的にする。
- **完了条件**:
  - [ ] `plugins/model-setup/hooks/reinject-brief.sh` と `.ps1`（UTF-8 BOM 付き）が存在し（規約6 の標準レイアウト。
        `hooks.json` は置かない＝自動配線しない・pipeline と同じ「コピーする資材」）、`docs/long-run/brief.md`
        （無ければ `.claude/long-run-brief.md`）があるときだけ、その内容を `hookSpecificOutput.additionalContext`
        で返す（無ければ何も出力せず exit 0）
  - [ ] `plugins/model-setup/setup/settings.json` に `SessionStart`（`matcher: "compact"`）の配線サンプルがある
  - [ ] `plugins/model-setup/README.md` に手動マージ手順（`~/.claude/settings.json` または対象リポジトリの
        `.claude/settings.json`。マージ前にバックアップ、マージ後に `python3 -c "import json;json.load(open(...))"`
        等で構文検証）と、既存導入者向けの再取得手順（差分コピー）を追記
  - [ ] `skills/long-run/SKILL.md` ルール5 の「未実装（backlog B-1）」注記を外し、導入手順への参照に置き換える
  - [ ] ルート README「自動フック一覧」の注記「他のプラグインは常駐フックなし」に「model-setup はコピー導入の
        opt-in フックを1つ持つ（自動発火はしない）」を追記。ルート CLAUDE.md のディレクトリ構成に `hooks/` を追加
  - [ ] `plugin.json` を 3.3.0 に
- **スコープ**: 対象 = 上記ファイル。非対象 = pipeline プラグイン、`hooks/hooks.json` による自動配線（方針: model-setup は
  自動発火するフックを持たない — ルート README「自動フック一覧」）、setup スキルの新設（手動マージ手順で足りるか B-1 の
  結果で判断し、必要なら別ブリーフにする）
- **制約**: bash / PowerShell 5.1 の両対応（`plugins/pipeline/skills/pipeline-setup/references/windows.md` の規約に従う）。
  `jq` に依存しない。注入は 10,000 字上限に収める（超える場合は先頭を切らず「以下 brief.md を読め」とパスを返す）
- **検証方法**: 手元の Claude Code で `settings.json` に配線し、`/compact` 実行後の最初の応答でブリーフの内容に
  言及できることを確認。`claude plugin validate plugins/model-setup` が通る。`bash -n` / `pwsh -NoProfile -Command`
  で構文チェック
- **報告形式**: 検証の証拠（実行コマンド・出力）つき。確信度 中・低 の箇所を明記

## B-2（高）pipeline: SPEC.md 要約注入フック（必須ロード保証・決定2の実装）

- **ゴール**: `SPEC.md` の所在・更新日・`[確定]` 要件 ID 一覧を、セッション先頭と主要エージェントの先頭に自動注入する。
- **背景**: 決定記録 決定2。提案資料の穴②（規約層が任意のポインタ）をフックで塞ぐ。
- **完了条件**:
  - [ ] `plugins/pipeline/hooks/inject-spec-summary.sh` / `.ps1` が、`SPEC.md`（または `SPEC-recovered.md`）を
        読み、「パス・最終更新日・`[確定]` 行の ID と見出し」＋「これは目次であり本文ではない。判断の前に本文を
        読むこと」を `additionalContext` で返す。無ければ「SPEC.md なし。cc-rsg 等での作成を推奨」を1行返す
  - [ ] `SessionStart`（`matcher: "startup|compact"`。`resume` は二重注入になるので対象外）と `SubagentStart`
        （pipeline の全エージェント名を `^researcher$|^requirements-writer$|…` のようにアンカーした matcher。
        ハイフン入り名は Claude Code 2.1.195 未満で部分一致し得るため）の両方で使えることを確認
  - [ ] `pipeline-setup` の Step（フック配線）と `setup/settings.json` に追加され、非git モード・Windows の
        分岐（`.ps1` 振り分け）が既存4フックと同じ扱いになっている
  - [ ] `plugins/pipeline/README.md`・`CLAUDE.md`・ルート README・ルート CLAUDE.md の「フック4種」を
        「5種」に更新（1スクリプトを2イベントで使う）
  - [ ] `plugin.json` を 2.1.0 に
- **スコープ**: 非対象 = SPEC.md の生成（外部ツール委譲のまま）、`spec-sync-reminder` の変更
- **制約**: 注入は要件 ID 一覧まで（本文全体は入れない・10,000 字上限）。`[確定]` 行が無い SPEC.md でも壊れない。
  ID 抽出の正規表現は `skills/pipeline-setup/references/` に1か所で定義し、`.sh`/`.ps1` はそれを写す（片方だけ
  更新される事故を防ぐ）。PowerShell 5.1 での起動レイテンシを実測し、無視できなければ `compact` のみに絞る。
  headless（`claude -p`）で stdout が出力を汚さないことを確認
- **検証方法**: サンプルの SPEC.md を置いたテストリポジトリで `pipeline-setup` を実行し、
  (1) セッション開始直後に SPEC の所在を答えられる、(2) `researcher` サブエージェントの最初の出力が
  SPEC の要件 ID に言及する、ことを確認。`bash -n` / PowerShell 構文チェック
- **報告形式**: B-1 と同じ

## B-3（中）pipeline: ビルダーの担当外パス書き込みガード（README の「発展課題」）

- **ゴール**: `backend-builder` / `frontend-builder` / `deliverable-builder` が担当外フォルダへ書き込むのを機械的に止める。
- **背景**: `plugins/pipeline/README.md` の「厳密に強制したい場合は Edit/Write のパスを検査する PreToolUse フックを
  追加するのが発展課題」。2026-09-03 に公式 hooks 仕様で、(a) `PreToolUse` 入力に `agent_type` が入る、
  (b) サブエージェントの frontmatter に `hooks:` を宣言でき、そのエージェント実行中だけ有効、を確認済み。
  **推奨は (b)**（エージェント定義に閉じるため、setup の配線が増えない）。
- **完了条件**:
  - [ ] 各ビルダーの frontmatter に `hooks: PreToolUse (matcher: "Edit|Write|MultiEdit")` で
        `hooks/guard-builder-paths.sh` を宣言。許可パスは pipeline-setup が Step 5 で差し替える
        `<!-- 差し替え -->` 値から生成
  - [ ] 既存 `guard-builder-writes.sh`（共有ファイル衝突）との役割分担を README に明記
  - [ ] `.ps1` 対、`plugin.json` 2.x bump、README「発展課題」の記述を「実装済み」に更新
- **制約**: 実装ノート（`docs/pipeline/<slug>/implementation-notes.md`）への書き込みは全ビルダーに許可
- **検証方法**: テストリポジトリで `backend-builder` に frontend パスへの Edit を指示し、フックが exit 2 で拒否すること

## B-4（中）評価基準: 主要スキルの「期待挙動」シナリオ

- **ゴール**: `task-brief` / `verify-fresh` / `long-run` / `review-panel` について、「この入力に対して
  上位モデルはこう振る舞う」を評価シナリオとして残し、Sonnet 5 / Opus 5 でのパリティを実測できるようにする。
- **背景**: 現状テスト・eval はゼロ（CI は JSON 構文と SKILL.md 形式のみ）。追補ルール14 の分岐
  （Sonnet: 自動検証／Opus 5: 1回）が実際に効くかを測る物差しが要る。
- **完了条件**:
  - [ ] `claude plugin eval` の利用可否を確認し、使えるならその形式、使えなければ `docs/evals/<skill>.md` に
        「入力／期待する行動（する・しない）／判定基準」を各スキル3シナリオ以上
  - [ ] Opus 5 実行時に verify-fresh を反射的に呼ばないことを検出するシナリオを含む
- **検証方法**: Sonnet 5 と Opus 5 で各シナリオを1回ずつ流し、結果表を `docs/evals/README.md` に記録

## B-5（中）教訓メモリのブートストラップ

- **ゴール**: 58 PR 分の履歴（OSS 差別化レビュー2回の削除判断、sonnet-setup → model-setup 改名、
  software/task-pipeline 統合）から「このリポジトリで繰り返さない判断」を1教訓1項目で残す。
- **背景**: Fable ガイド「Reflect on previous sessions… store lessons」。§8 行8 は本体自動メモリに委ねているが、
  リポジトリ横断で共有できる教訓はファイルに置く方が引き継げる。
- **完了条件**: `docs/lessons.md` に、各教訓「1行要約／なぜ問題だったか／根拠の PR 番号」。
  `git log` から根拠を引けるものだけ書く（推測で書かない）
- **検証方法**: 各教訓の PR 番号が `git log --oneline` に存在する

## B-6（低）CI 拡張

- **ゴール**: `.github/workflows/ci.yml` に次を追加: agent `.md` frontmatter 検査（name / description / tools /
  model の存在と型）、`shellcheck`（`plugins/**/*.sh`）、`.ps1` の UTF-8 BOM 検査、`skills/agents/hooks` 変更時の
  plugin.json version 差分検査、内部リンク切れ検査
- **完了条件**: 現状の main で全チェックが緑（既存の違反があれば同 PR で直す）。`plugin-validate` ジョブは
  引き続き non-blocking
- **検証方法**: PR の CI が緑。故意に BOM を外した `.ps1` を置いたブランチで赤になること

## B-7（低）skills-guide の再検証

- **ゴール**: `docs/skills-guide/README.md` の外部リンク・star 数・「使えないことが確認されたもの」を再検証し、
  「2026年6月時点」を更新日で置き換える
- **完了条件**: 全リンクが 200 を返す（またはリンク切れ表へ移動）、typo `mattpoecraft` → `mattpocock` 修正済み
  （B1 監査で修正済みなら確認のみ）

---

## 完了記録

| 日付 | 項目 | PR / コミット |
|---|---|---|
| | | |
