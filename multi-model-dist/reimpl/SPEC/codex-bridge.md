# SPEC: codex-bridge（ホストエージェントから Codex CLI を駆動する）

Track B の共有仕様。**原本 `codex-bridge/.claude/{skills,agents}` を一次根拠**に起こした派生ドキュメント
（複製ではない）。原本の挙動が変わったらこの SPEC を手動追従し、各ツール実装（`../impl/<tool>/codex-bridge`）を更新する。
確度ラベル: `[確定]`＝原本に明記 / `[推定]`＝原本から合理的に補完 / `[要確認]`＝ツール/バージョン依存。

## S0. 目的

ホストエージェント（Claude Code / **Kiro** / 他）から **OpenAI Codex CLI を非対話モード（`codex exec`）で駆動**し、
レビュー・実装・相談を代行させる。ユーザーは Codex を直接操作しない。**Codex の冗長な出力は隔離し、要約だけ**をホストに返す。

## S1. 機能（3種）と既定サンドボックス

| 機能 | 役割 | サンドボックス | 委譲先エージェント |
|---|---|---|---|
| review | 差分/指定ファイルをレビューし重大度 P1–P4＋`file:line`＋推奨対応で要約 | `read-only` | codex-reviewer |
| implement | Codex にファイルを直接編集させ、ホストが差分・テストを検証 | `workspace-write` | codex-implementer |
| ask | 設計相談・セカンドオピニオン（コードは書かない） | `read-only` | codex-advisor |

`[確定]` 危険フラグ（`--yolo` / `--dangerously-bypass-approvals-and-sandbox` / `danger-full-access` / 非推奨 `--full-auto`）は**使わない**。

## S2. 前段ガード（必須・最初に実行）`[確定]`

1. `command -v codex` を実行。見つからなければ **raw stderr を出さず**、日本語で「codex CLI が見つかりません（未導入）。
   導入・認証を確認してください」と要約して終了。
2. 実行後に認証エラー文言（`not logged in` / `unauthorized` / `OPENAI_API_KEY` / `Please run codex login` 等）を検知したら、
   同様に「codex が未認証です」と要約して終了。
   → **未導入・未認証のまま実行を強行しない。** この前段ガードは各ツール実装の必須要件であり、検証対象（計画 検証4）。

## S3. コンテキストの渡し方 `[確定]`

- 正準手段は **stdin / heredoc**（`codex exec [flags] - <<'EOF' … EOF`）。`/tmp` のファイルはサンドボックス下で読めない場合があるため既定にしない。
- 対象ファイルの**内容そのもの**を同梱する（パス名指しだけに頼らない）。
- 大きすぎる場合の降格順: **全文 → 関連抜粋 → `git diff` → パス名指しのみ**（バイト数上限を意識）。

## S4. 出力の捕捉 `[確定]`

`> "${TMPDIR:-/tmp}/codex-<kind>-<id>.txt" 2>/dev/null` で **stdout（最終メッセージ）をファイルへ**、stderr のバナー/進捗は破棄。
`-o <file>` は併用しない。生出力はエージェント内に隔離し、メインには**要約のみ**返す。

## S5. review の構造化/plain 二経路 `[確定]`

- git 配下: `codex exec review --uncommitted` / `--base <branch>`（ベストエフォート）。
- git 外 / 差分なし / パス指定: `codex exec --sandbox read-only --skip-git-repo-check -` にレビュープロンプト＋ファイル内容を heredoc で渡す（保証パス）。
- `[要確認]` `codex exec review` のフラグ・P1–P4 形式・`--skip-git-repo-check` 可否はバージョン依存。`codex exec review --help` で確認し、使えなければ plain へフォールバック。
- **plain パスの重大度は「Codex（モデル）の判断」であり codex 構造化出力ではない**旨を要約に明記。

## S6. 要約契約（戻り値）`[確定]`

- review: ①P1〜P4 の指摘（`file:line`＋一行要約＋推奨対応）②総評・マージ可否目安 ③生ログ保存先 ④実行経路（構造化/plain）。
- implement: ①Codex が行った編集の差分要約 ②テスト/型チェック結果 ③ホスト側の検証所見 ④生ログ保存先。`workspace-write` でも**ネットワークは既定無効**`[確定]`。
- ask: ①結論 ②根拠 ③代替案/トレードオフ ④生ログ保存先（コードは書き換えない）。

## S7. ホスト非依存／依存の分離

- **ツール非依存（SPEC＝共有）**: S0–S6（codex exec 駆動・前段ガード・heredoc・出力隔離・サンドボックス既定・要約契約）。
- **ツール依存（実装ごと）**: ラッパーの形（CC=skill+subagent / Kiro=skill+subagent(JSON) / Codex 自身=対象外）、起動表記、サブエージェント定義形式。

## S8. 各ツール実装

- **Claude Code（原本）**: `codex-bridge/.claude/{skills,agents}`（参照元）。
- **Kiro**: `../impl/kiro/codex-bridge/`（本 SPEC からの再実装）。`.kiro/agents/*.json`＋`.kiro/skills/*/SKILL.md`。Kiro Power 同梱。
- **Codex 自身**: 対象外（Codex から Codex を駆動する意味がない）。
- **codex-agents スキル**（原本4種のうちの1つ・AGENTS.md ジェネレータ）: 各ツール実装では**意図的に非対応**。
  AGENTS.md は Codex 固有機構であり、その生成ロジックは Track A（`gen-agents-md` → AGENTS.md 生成）に流用済みのため
  （MAPPING ① フック表参照）。impl に codex-ask / codex-implement / codex-review の3スキルしか無いのは仕様どおり。
