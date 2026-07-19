# SPEC: パイプライン系フック（T2h・ガード／通知）

Track B（T2h）の共有仕様。**原本 `software-pipeline/.claude/hooks/*` ・ `task-pipeline/.claude/hooks/*` を一次根拠**に
起こした派生ドキュメント。フックは「`.sh` 本体は tool-agnostic に見えても、**起動契機・入力契約・ブロック手段が CC 専用**」
のため素コピーでは機能等価にならない（MAPPING T2h）。確度ラベル: `[確定]` / `[推定]` / `[要確認]`。

## H0. 対象フックと意味論 `[確定]`

| フック | 起動契機(CC) | 条件 | 反応 |
|---|---|---|---|
| block-secrets-commit | PreToolUse(Bash `git commit`) | ステージに `.env`/`*.key`/`*.pem`/`secrets.json`（`*.env.example` 等は除外） | **ハードブロック**（exit 2・stderr を伝える） |
| guard-builder-writes | PreToolUse(Edit/Write) | 並列中（`.parallel-active` マーカー）∧ 共有ファイル（schema/migration/lockfile/型バレル等） | **人間確認（ask）** |
| guard-deliverable-writes | PreToolUse(Edit/Write) | ①機密パターン→**ブロック** ②出力ディレクトリ許可リスト外→**ask** | ブロック／ask の2層 |
| spec-sync-reminder | SessionStart / Stop | SPEC.md 最終更新コミット以降にソース/成果物が変更（中間成果物・notes は除外） | **非ブロッキング通知**（常に exit 0） |

## H1. ツール非依存／依存の分離

- **非依存（SPEC＝共有）**: H0 の「何を・いつ・どう守るか」（機密パターン・共有ファイルパターン・出力ディレクトリ許可リスト・
  SPEC 同期検査ロジック＝`git diff --cached`／`git log`／許可リスト照合）。
- **依存（実装ごと）**:
  - **起動契機**: CC は PreToolUse/SessionStart/Stop。**Kiro は `.kiro/hooks/*.json` の `trigger`**（PreToolUse/PostToolUse/
    SessionStart 等）＋`matcher`。**Codex はフック機構が貧弱でほぼ非対応**（H4）。
  - **入力契約**: CC は stdin JSON（`tool_input.command` / `tool_input.file_path`）。`[要確認]` **Kiro が hook コマンドへ
    渡す変数（対象パス・コマンド）の正確な受け渡しはバージョン依存**。実装は path を引数/環境変数で受ける形にし、導入時に確認する。
  - **ブロック手段**: CC は `exit 2`＝拒否、`permissionDecision: "ask"` の JSON＝人間確認。`[要確認]` **Kiro の `action` が
    ツール実行を拒否/確認に回せるか（exit code / 出力契約）はバージョン依存**。`block` 相当が無い場合は「通知＋中止依頼」へ degrade。

## H2. Kiro 実装 `[推定]`

各パイプラインの `.kiro/hooks/<name>.json`（`{version, hooks:[{name, trigger, matcher, action:{type:"command", command}, enabled}]}`）。
`action.command` は本 SPEC のロジックを実装した**同梱シェル**（tool-agnostic な検査本体）を呼ぶ。対象パスは Kiro の
hook 入力（`[要確認]`）から受け取り、無ければ環境変数/引数で代替する。

- software-pipeline: `block-secrets-commit.json`（PreToolUse/コミット系）・`guard-shared-writes.json`（PreToolUse/Edit・Write）・`spec-sync-reminder.json`（SessionStart）。
- task-pipeline: `guard-deliverable-writes.json`（PreToolUse/Edit・Write）・`spec-sync-reminder.json`（SessionStart）。

## H3. degrade 方針 `[確定]`

Kiro でブロック/ask の意味論が完全再現できない場合でも、**検査ロジックと通知は再現**する（「危険を表面化させる」価値は保つ）。
ハードブロックが無ければ「中止を強く促す通知」に、ask が無ければ「確認を促す通知」に落とす。spec-sync-reminder は元から通知のみで完全再現可。

## H4. Codex `[確定]`

Codex はフック機構が貧弱なため、本 SPEC のガードは**ほぼ非対応**。代替として、相当のルールを各エージェントの
`developer_instructions`／`AGENTS.md`（機密非コミット・出力ディレクトリ限定・SPEC 同期）に**規範として明記**することで補う
（強制ではなく規範）。Codex 用フック JSON は出力しない。
