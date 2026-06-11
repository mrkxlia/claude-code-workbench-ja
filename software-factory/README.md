# software-factory — 7人のAI社員で機能を出荷する「ソフトウェア工場」テンプレート

Claude Code のサブエージェント・スキル・フックを組み合わせて、機能開発を
**調査 → ストーリー → 技術ブリーフ → バックエンド → フロントエンド → 受け入れテスト → 最終検証**
の流れ作業に変えるテンプレートです。人間が判断するのは3つの承認チェックポイントだけで、
その間の工程は7つの専門エージェントが自走します。

> 本セクションは @sairahul1 氏の記事
> [How to Build a Software Factory with Claude Code That Ships Features While You Sleep](https://x.com/sairahul1/status/2058832033628241931)
> のコンセプトに基づく独自実装です（記事のコピーではありません）。

---

## なぜ「工場」にするのか

1つのセッションに「この機能を作って」と頼むと、そのセッションはアナリスト・アーキテクト・
バックエンド・フロントエンド・テスター・レビュアーの全役割を、**同じ散らかった1本の会話**の中で
兼任することになります。序盤の間違った仮定がコンテキストに残り続け、間違ったDB設計 → 間違ったAPI →
間違ったUIへと増幅されていく。これが「作っては壊れ、直してはまた壊れ」の正体です。

工場はこれを構造で解決します。

- **役割ごとにクリーンなコンテキスト** — 各エージェントは自分の仕事に必要な成果物だけを受け取るため、間違いが他工程に漏れない
- **権限の最小化** — 各エージェント定義の `tools` で使えるツール自体を制限。調査・執筆系のエージェントは Read/Grep/Glob しか持たないので、**物理的に**コードを壊せない
- **早い段階の人間チェックポイント** — 間違った仮定は「ブリーフ承認」で捕まえる。10ファイル書き換えられた後ではなく

---

## 7人のAI社員 早見表

| # | エージェント | 役割 | 許可ツール | モデル | 書き込み範囲 | 主な成果物 |
|---|-------------|------|-----------|--------|-------------|-----------|
| 1 | `codebase-researcher` | 作る前にコードをマッピングする | Read, Grep, Glob | sonnet | なし | 調査レポート（research.md） |
| 2 | `story-writer` | アイデアを受け入れ基準つきストーリーにする | Read | sonnet | なし | ユーザーストーリー（story.md）🛑承認1 |
| 3 | `spec-writer` | ストーリーを技術ブリーフにする | Read, Grep, Glob | opus | なし | 技術ブリーフ（brief.md）🛑承認2 |
| 4 | `backend-builder` | API・サービス・ジョブ・ユニットテスト | Read, Grep, Glob, Edit, Write, Bash | inherit | バックエンドのフォルダのみ | 実装 + API契約（api-contract.md） |
| 5 | `frontend-builder` | コンポーネント・ページ・フック・UIテスト | Read, Grep, Glob, Edit, Write, Bash | inherit | フロントエンドのフォルダのみ | 実装 + サマリー |
| 6 | `test-verifier` | ストーリーに対する受け入れテスト | Read, Grep, Glob, Edit, Write, Bash | sonnet | テストファイルのみ | 受け入れテスト + 検証レポート |
| 7 | `implementation-validator` | 実装とストーリー/ブリーフのギャップ報告 | Read, Grep, Glob | sonnet | なし | Critical/Important/Minor レポート 🛑承認3 |

モデルは工程ごとにコストと品質のバランスで階層化しています（公式ドキュメントの推奨プラクティス）。
設計ミスが最も高くつく `spec-writer` には opus、実装系はメインセッションと同じモデル（inherit）、
調査・検証系は sonnet が既定です。各エージェント定義の frontmatter の `model:` を書き換えれば変更できます
（opus を使わない環境では `spec-writer` を `inherit` に）。

## 連鎖の流れ

```
あなた:「7日以上未払いの請求書に支払いリマインダーを作って」（/feature-factory）
  │
  ├─ Phase 1  codebase-researcher   関連コード・既存パターン・リスクを調査
  ├─ Phase 2  story-writer          ユーザーストーリー + 受け入れ基準を作成
  │     🛑 チェックポイント1: あなたがストーリーを承認
  ├─ Phase 3  spec-writer           技術ブリーフ（設計図）を作成
  │     🛑 チェックポイント2: あなたがブリーフを承認 ←設計ミスはここで捕まえる
  ├─ Phase 4  backend-builder       API・サービス・ジョブ + ユニットテスト + API契約
  ├─ Phase 5  frontend-builder      API契約どおりにUI + コンポーネントテスト
  ├─ Phase 6  test-verifier         受け入れ基準を外側から検証
  │     ↺ 失敗したら担当ビルダーへ差し戻し（上限3回）。テスターは直さない
  ├─ Phase 7  implementation-validator  全員の見落としを file:line つきで報告
  │     🛑 チェックポイント3: あなたが最終レビュー
  └─ コミット / PR
```

人間のチェックポイントは3つだけ。あとは全部、自走します。
進行状況は `docs/factory/<slug>/status.md` に永続化されるため、
セッションが中断してもコンテキストが圧縮されても、`/feature-factory 再開 <slug>` で続きから再開できます。

---

## ファイル構成

```
software-factory/
├── README.md                                # このファイル
├── CLAUDE.md                                # コピーして使う CLAUDE.md のサンプル
└── .claude/
    ├── agents/                              # 7人のAI社員の定義
    │   ├── codebase-researcher.md
    │   ├── story-writer.md
    │   ├── spec-writer.md
    │   ├── backend-builder.md
    │   ├── frontend-builder.md
    │   ├── test-verifier.md
    │   └── implementation-validator.md
    ├── skills/
    │   ├── feature-factory/SKILL.md         # 7エージェントを連鎖させるオーケストレーター
    │   ├── build-with-tests/SKILL.md        # 小さな実装をテスト並行で行うスキル
    │   └── factory-setup/SKILL.md           # 工場一式を対象リポジトリへ自動導入するスキル
    ├── hooks/
    │   └── block-secrets-commit.sh          # 機密ファイルのコミットをブロックするフック
    └── settings.json                        # 上記フックを配線する設定サンプル
```

---

## セットアップ

### 推奨: `/factory-setup` で自動セットアップ（2ステップ）

**ステップ1**: `factory-setup` スキルをパーソナルスキルとして1回だけインストールします
（以後どのリポジトリでも使えます）:

```bash
mkdir -p ~/.claude/skills
cp -r <このリポジトリ>/software-factory/.claude/skills/factory-setup ~/.claude/skills/
```

**ステップ2**: 導入したいリポジトリで Claude Code を開き、実行します:

```
/factory-setup
```

スキルが `package.json` / `pyproject.toml` / `go.mod` などからスタックと
test / lint / typecheck コマンドを検出し、ディレクトリ構成からバックエンド／フロントエンドの
境界を推定して、CLAUDE.md・エージェント7種（「担当範囲」も自動差し替え）・スキル・フック・
settings.json をまとめて導入します。手動セットアップで一番ズレやすかった
**「CLAUDE.md の境界とビルダーの担当範囲の不一致」が、同じ検出結果から両方を生成することで
構造的に起きなくなる**のがポイントです。

工場本体と同じ思想で、書き込む前に**解析結果の承認**を求めて停止します。検出ミスはそこで直せます。
既存の CLAUDE.md / settings.json は上書きせず、マージを提案します。
導入後は新しいセッションを開始してから（エージェント定義はセッション開始時に読み込まれるため）、
下の「試運転」へ進んでください。

<details>
<summary><b>フォールバック: 手動セットアップ（5ステップ）</b> — オフライン環境や、仕組みを理解しながら導入したい場合</summary>

#### 1. CLAUDE.md をコピーして差し替える

[`CLAUDE.md`](CLAUDE.md) を自分のプロジェクトのルートにコピーし、
`<!-- 差し替え -->` とマークされた箇所（スタック・コマンド・フォルダ構成）を自分のプロジェクトに合わせて書き換えます。
100〜300行に保つのがコツです。

#### 2. エージェント定義をコピーする

```bash
mkdir -p .claude/agents
cp <このリポジトリ>/software-factory/.claude/agents/*.md .claude/agents/
```

#### 3. スキルをコピーする

```bash
mkdir -p .claude/skills
cp -r <このリポジトリ>/software-factory/.claude/skills/feature-factory .claude/skills/
cp -r <このリポジトリ>/software-factory/.claude/skills/build-with-tests .claude/skills/
```

（`factory-setup` は自動セットアップ用のパーソナルスキルなので、プロジェクトにはコピーしません）

#### 4. フックを設定する

```bash
mkdir -p .claude/hooks
cp <このリポジトリ>/software-factory/.claude/hooks/block-secrets-commit.sh .claude/hooks/
chmod +x .claude/hooks/block-secrets-commit.sh
```

**⚠️ すでに `.claude/settings.json` がある場合は、上書きせず `hooks` キーをマージしてください。**
ない場合はそのままコピーで構いません:

```bash
cp <このリポジトリ>/software-factory/.claude/settings.json .claude/settings.json
```

#### 5. ビルダーの担当範囲を自分のプロジェクトに合わせる

`.claude/agents/backend-builder.md`・`frontend-builder.md`・`test-verifier.md` の
「担当範囲」セクションのフォルダパス（`src/server/` など）を、自分のプロジェクトの構成に書き換えます。
**この境界が CLAUDE.md のアーキテクチャルールと一致していることを確認してください。**
ここがズレていると、ビルダー同士が互いの領域を踏みます。

</details>

### Git 管理されていないプロジェクトへの導入

導入先が git リポジトリでなくても、工場は導入・運用できます。対応は2通りです。

#### 選択肢A: `git init` してから導入する（推奨）

```bash
git init
```

の1コマンドで、機密コミット防止フック・セットアップ失敗時の巻き戻し・履歴管理が
すべてそのまま有効になります。リモート（GitHub 等）への push は必須ではありません。

#### 選択肢B: git なしのまま導入する（非gitモード）

`/factory-setup` が git の有無を自動判定し、非 git なら「`git init` の提案 → 断られたら
非gitモードで続行」と案内します。コマンドは通常と同じ `/factory-setup` の1つだけです。
7エージェントの連鎖（調査 → ストーリー → ブリーフ → 実装 → 検証）は git に依存しないため
そのまま動きますが、以下の3点が通常モードと異なります:

| 項目 | 通常モード | 非gitモード |
|------|-----------|------------|
| 機密コミット防止フック | `git commit` 直前にステージを検査 | 待機状態（コミット自体が無いため何もしない） |
| セットアップの巻き戻し | `git checkout` / `git revert` | 変更前ファイルを `.claude/factory-backup/` にバックアップ |
| feature-factory の最終工程 | コミット・PR の提案 | 変更ファイル一覧の提示 |

フックは非gitモードでもそのまま配置されます（git の無い環境では何もせず素通りする
作りになっています）。後から `git init` すれば、フックを含む全機能がその時点から有効になります。

## 試運転とチューニング

### 1. 小さな機能で試運転する

```
/feature-factory ヘルスチェック用の GET /api/health エンドポイントとステータス表示を作って
```

のような小さい機能を流し、どこでつまずくか観察します。

### 2. 3つのチェックポイントを体験する

- **ストーリー承認**: 受け入れ基準が「テストで検証できる文」になっているか確認し、「承認」または修正指示を返す
- **ブリーフ承認**: 変更ファイル一覧と設計を読み、危険な設計（例:「IDをメモリ上に保持」）をここで捕まえる
- **最終レビュー**: validator のレポートを確認し、承認後にコミット・PRへ

中止したいときは、どのチェックポイントでも「中止」と伝えれば工場は止まります。

### 3. ルールを足してチューニングする

AIが「えっ」と驚くミスをするたびに自問します——**「CLAUDE.md にルールがあれば、これは防げたか？」**
防げたならルールを足す。差し戻しが多かったエージェントの「ルール」セクションも調整します。
3〜4機能も流せば、工場はあなたのコードベースに馴染んでいきます。

このチューニングは半自動化されています。ビルダーが実装中に気づいた「このルールがあれば助かった」は
`docs/factory/LEARNINGS.md` に自動で蓄積され、最終レビューのチェックポイントで
「CLAUDE.md に昇格させるか」を確認されます。承認したものだけがルールになります。

---

## フックについての補足

`block-secrets-commit.sh` は Claude Code の `PreToolUse` フックとして動き、
Claude が `git commit` を実行する直前にステージ内容を検査します。
`.env`（`.env.example` / `.env.sample` / `.env.template` は許可）・`*.key`・`*.pem`・`secrets.json`
が含まれていると exit 2 でコミットをブロックし、理由と対処法を Claude に伝えます。

このフックが守るのは **Claude 経由のコミットだけ**です。人間の手コミットも守りたい場合は、
同じスクリプトを `.git/hooks/pre-commit` にコピーすれば動きます
（stdin が JSON でない場合は自動でコマンド判定をスキップする作りになっています）。
git 管理されていないリポジトリでは、このフックは何もせず素通りします
（`git diff` が失敗した時点で exit 0 するため、置いたままで無害です）。

## 制限事項（知っておくべきこと）

- **`tools` 制限はツール単位であり、フォルダ単位ではありません。** 「backend-builder はバックエンドのフォルダのみ」という境界は、エージェント定義のプロンプトによる制約です。実用上はよく守られますが、厳密に強制したい場合は Edit/Write のパスを検査する PreToolUse フックを追加するのが発展課題です（task-factory の [`guard-deliverable-writes.sh`](../task-factory/.claude/hooks/guard-deliverable-writes.sh) が参考実装になります。BE/FE の境界はプロジェクト依存なので、許可リストを自分の構成に合わせて調整してください）
- **スキルは文字どおりには「一時停止」できません。** チェックポイントは「明示的承認まで次フェーズ進行禁止」という強い指示で実現しています。承認の言葉（「承認」「OK」「進めて」）は明確に伝えてください
- **サブエージェントはサブエージェントを呼べません。** そのため feature-factory はメインセッションのスキルとして動き、そこから7エージェントを順番に起動する設計です

---

## コラム: サブエージェント方式と Agent Teams の使い分け

Claude Code には本テンプレートが使う**サブエージェント**のほかに、実験的機能の
**Agent Teams**（`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` で有効化）があります。

| | サブエージェント | Agent Teams |
|---|---|---|
| 形態 | 1セッション内で起動される働き手 | 相互にメッセージし合う複数の独立セッション |
| 連携 | 結果をメインセッションに報告するだけ | 共有タスクリスト + エージェント間の直接対話 |
| 向くタスク | 結果だけが必要な逐次・決定的なパイプライン | 並列調査・競合仮説のデバッグ・相互レビュー |
| トークンコスト | 低い（要約だけが親に戻る） | 高い（各メンバーが独立セッション） |

ソフトウェア工場は「調査 → ストーリー → ブリーフ → 実装 → 検証」という**逐次パイプライン**で、
各工程は前工程の成果物（`docs/factory/<slug>/` のファイル）だけを入力に動きます。
エージェント同士が議論する必要はなく、間違いの伝播を防ぐにはむしろ**会話させない**ほうが安全です。
そのため本テンプレートはサブエージェント方式を採用しています。
「複数の仮説を並列に立てて議論させたい」探索型のタスクには Agent Teams を検討してください。

## 発展設定

テンプレートの既定はシンプルに保っていますが、エージェント定義の frontmatter には
さらに以下のフィールドを足せます（[公式ドキュメント](https://code.claude.com/docs/en/sub-agents)参照）:

- **`memory: project`** — セッションを跨いでエージェントが学習内容を持ち越す。
  `codebase-researcher` に付けると、調査のたびにリポジトリの土地勘が蓄積されていきます
- **`maxTurns: <数>`** — エージェントの最大ターン数を制限。暴走時の安全弁として
- **Edit/Write のパス検査フック** — 「担当範囲」をプロンプトによる約束ではなく機械的に補強したい場合、
  ビルダーの書き込みパスを検査する `PreToolUse` フックを追加できます。task-factory の
  [`guard-deliverable-writes.sh`](../task-factory/.claude/hooks/guard-deliverable-writes.sh)
  （許可リスト外への書き込みを `permissionDecision: "ask"` でユーザー確認に回す方式）が参考実装です
- **PostToolUse の自動フォーマット** — Edit/Write の直後にフォーマッタ（prettier / ruff format 等）を
  走らせるフックも定番です。スタック依存のためテンプレートには含めていません
  （[フックのドキュメント](https://code.claude.com/docs/en/hooks)参照）

## 参考リンク

- [サブエージェント（公式ドキュメント）](https://code.claude.com/docs/en/sub-agents) — frontmatter の全フィールド（model / color / memory / maxTurns など）
- [Agent Skills のベストプラクティス（公式ドキュメント）](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) — description の書き方・チェックリストパターン・本文500行ルール
- [Agent Teams（公式ドキュメント）](https://code.claude.com/docs/en/agent-teams) — 実験的機能。上記コラム参照
- [フック（公式ドキュメント）](https://code.claude.com/docs/en/hooks) — PreToolUse ほかのイベント一覧

---

## ライセンス・出典

このセクションは [@sairahul1 氏の記事](https://x.com/sairahul1/status/2058832033628241931)
「How to Build a Software Factory with Claude Code That Ships Features While You Sleep」の
コンセプト（7エージェント構成・3チェックポイント・CLAUDE.md の育て方）に基づく独自実装です。
ファイルの内容はこのリポジトリで書き起こしたものであり、リポジトリの [LICENSE](../LICENSE)（MIT）に従います。
