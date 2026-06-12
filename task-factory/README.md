# task-factory — 5人のAI社員で成果物を出荷する「タスク工場」テンプレート

[`software-factory/`](../software-factory/) の工場パターンを、**コード以外のあらゆる成果物**に
使えるよう汎用化したテンプレートです。drawio の図・設計ドキュメント・手順書・調査レポート・
スライド構成案などの作成を

**調査 → 成果物要件 → 作業ブリーフ → 成果物作成 → レビュー**

の流れ作業に変えます。人間が判断するのは3つの承認チェックポイントだけで、
その間の工程は5つの専門エージェントが自走します。

> 本セクションは @sairahul1 氏の記事
> [How to Build a Software Factory with Claude Code That Ships Features While You Sleep](https://x.com/sairahul1/status/2058832033628241931)
> のコンセプト（専門エージェントの連鎖・人間承認チェックポイント）を、
> コード以外の成果物向けに汎用化した独自実装です（記事のコピーではありません）。

---

## software-factory との使い分け

| | software-factory | task-factory |
|---|---|---|
| 対象 | コードの機能開発 | 図・ドキュメント・レポートなどコード以外の成果物 |
| エージェント数 | 7（バックエンド/フロントエンド/テストに分業） | 5（ビルダー1人に集約） |
| 合格条件 | テスト緑・型チェック通過 | 受け入れ基準のセルフチェック + レビュアーの突き合わせ |
| 起動コマンド | `/feature-factory` | `/task-factory` |
| チェックポイント | 3つ（ストーリー・ブリーフ・最終） | 3つ（要件・ブリーフ・最終） |

迷ったら: **コード開発（実装ノート・仕様逆引きを含む）→ software-factory、コード以外の成果物 → task-factory**。
[`implementation-skills/`](../implementation-skills/) の notes / spec-extract スキルの工場統合は
software-factory 側のみです。task-factory のプロジェクトで単体利用したい場合は
implementation-skills/ から直接コピーしてください。

2つの工場は**同じプロジェクトに併存できます**。エージェント名・スキル名・中間成果物の
保存先（`docs/factory/` と `docs/taskfactory/`）が重ならないように設計してあります。
task-factory は出力ディレクトリ外への書き込みを確認するフック
（[`guard-deliverable-writes.sh`](.claude/hooks/guard-deliverable-writes.sh)）を同梱しています。
コードリポジトリに導入する場合は、software-factory の機密コミット防止フック
（[`block-secrets-commit.sh`](../software-factory/.claude/hooks/block-secrets-commit.sh)）を
併用するのがおすすめです。

---

## なぜ「工場」にするのか

1つのセッションに「この図を描いて」と頼むと、そのセッションは調査係・要件定義係・
構成設計係・作成係・レビュアーの全役割を、**同じ散らかった1本の会話**の中で兼任することに
なります。序盤の間違った前提（誰のための図か、何を載せるべきか）がコンテキストに残り続け、
間違った構成 → 間違った成果物へと増幅されていく。

工場はこれを構造で解決します。

- **役割ごとにクリーンなコンテキスト** — 各エージェントは自分の仕事に必要な中間成果物だけを受け取るため、間違いが他工程に漏れない
- **権限の最小化** — 各エージェント定義の `tools` で使えるツール自体を制限。調査・執筆系のエージェントは Read/Grep/Glob しか持たないので、**物理的に**ファイルを壊せない
- **早い段階の人間チェックポイント** — 間違った前提は「要件承認」「ブリーフ承認」で捕まえる。成果物が出来上がった後ではなく

---

## 5人のAI社員 早見表

| # | エージェント | 役割 | 許可ツール | モデル | 書き込み範囲 | 主な成果物 |
|---|-------------|------|-----------|--------|-------------|-----------|
| 1 | `source-researcher` | 作る前に素材・規約をマッピングする | Read, Grep, Glob | sonnet | なし | 調査レポート（research.md） |
| 2 | `requirements-writer` | 依頼を受け入れ基準つき要件にする | Read | sonnet | なし | 成果物要件（requirements.md）🛑承認1 |
| 3 | `brief-writer` | 要件を作業ブリーフにする | Read, Grep, Glob | opus | なし | 作業ブリーフ（brief.md）🛑承認2 |
| 4 | `deliverable-builder` | 成果物の作成（スキル利用可） | Read, Grep, Glob, Edit, Write, Bash, Skill | inherit | 出力ディレクトリのみ | 成果物 + セルフチェックつきサマリー |
| 5 | `deliverable-reviewer` | 成果物と要件/ブリーフのギャップ報告 | Read, Grep, Glob | sonnet | なし | Critical/Important/Minor レポート 🛑承認3 |

モデルは工程ごとにコストと品質のバランスで階層化しています。
構成ミスが最も高くつく `brief-writer` には opus、作成系はメインセッションと同じモデル（inherit）、
調査・検証系は sonnet が既定です。各エージェント定義の frontmatter の `model:` を書き換えれば変更できます
（opus を使わない環境では `brief-writer` を `inherit` に）。

## 連鎖の流れ

```
あなた:「認証システムのアーキテクチャ図を drawio で作って」（/task-factory）
  │
  ├─ Phase 1  source-researcher      関連資料・流用できる既存成果物・表記規約を調査
  ├─ Phase 2  requirements-writer    目的・読者・受け入れ基準つきの要件を作成
  │     🛑 チェックポイント1: あなたが要件を承認
  ├─ Phase 3  brief-writer           構成案・作成手順・使用スキルのブリーフを作成
  │     🛑 チェックポイント2: あなたがブリーフを承認 ←構成ミスはここで捕まえる
  ├─ Phase 4  deliverable-builder    drawio スキルで成果物を作成 + セルフチェック
  ├─ Phase 5  deliverable-reviewer   要件・ブリーフと突き合わせて検査
  │     ↺ Critical/Important はビルダーへ差し戻し（上限3回）。レビュアーは直さない
  │     🛑 チェックポイント3: あなたが最終レビュー
  └─ コミットの提案
```

人間のチェックポイントは3つだけ。あとは全部、自走します。
進行状況は `docs/taskfactory/<slug>/status.md` に永続化されるため、
セッションが中断してもコンテキストが圧縮されても、`/task-factory 再開 <slug>` で続きから再開できます。

---

## drawio スキルとの連携例

1. drawio スキルを導入する（`~/.claude/skills/` または対象プロジェクトの `.claude/skills/`）
2. CLAUDE.md の「利用可能なスキル」表に drawio を載せる（`/task-factory-setup` なら自動検出される）
3. 依頼を流す:

```
/task-factory 認証システムのアーキテクチャ図を drawio で作って
```

すると、brief-writer が「描く要素・関係・凡例」と「drawio スキルを使う」ことをブリーフに明記し、
あなたの承認後に deliverable-builder が drawio スキルを呼び出して `.drawio` ファイルを
出力ディレクトリに生成します。最後に deliverable-reviewer が「要件の受け入れ基準
（例: トークン失効時の分岐が図に含まれている）」を満たしているかを検査します。

drawio に限らず、スライド・ドキュメント系など**成果物を作るスキルなら同じ仕組みで使えます**。
ビルダーが使ってよいスキルは CLAUDE.md の表で管理し、表にないスキルは勝手に使わない
ルールになっています。

---

## ファイル構成

```
task-factory/
├── README.md                                # このファイル
├── CLAUDE.md                                # コピーして使う CLAUDE.md のサンプル
└── .claude/
    ├── agents/                              # 5人のAI社員の定義
    │   ├── source-researcher.md
    │   ├── requirements-writer.md
    │   ├── brief-writer.md
    │   ├── deliverable-builder.md
    │   └── deliverable-reviewer.md
    ├── skills/
    │   ├── task-factory/SKILL.md            # 5エージェントを連鎖させるオーケストレーター
    │   └── task-factory-setup/SKILL.md      # 工場一式を対象プロジェクトへ自動導入するスキル
    ├── hooks/
    │   └── guard-deliverable-writes.sh      # 出力ディレクトリ外への書き込みを確認するフック
    └── settings.json                        # 上記フックを配線する設定サンプル
```

---

## セットアップ

### 推奨: `/task-factory-setup` で自動セットアップ（2ステップ）

**ステップ1**: `task-factory-setup` スキルをパーソナルスキルとして1回だけインストールします
（以後どのプロジェクトでも使えます）:

```bash
mkdir -p ~/.claude/skills
cp -r <このリポジトリ>/task-factory/.claude/skills/task-factory-setup ~/.claude/skills/
```

**ステップ2**: 導入したいプロジェクトで Claude Code を開き、実行します:

```
/task-factory-setup
```

スキルが成果物の出力ディレクトリを既存構成から推定し、主な成果物の種類をヒアリングし、
`~/.claude/skills/` と `.claude/skills/` から利用可能なスキル（drawio 等）を検出して、
CLAUDE.md・エージェント5種（ビルダーの「担当範囲」も自動差し替え）・スキル・フック・
settings.json をまとめて導入します。
**CLAUDE.md の出力先・ビルダーの担当範囲・フックの許可リストを同じ検出結果から生成する**ため、
三者の不一致が構造的に起きません。

工場本体と同じ思想で、書き込む前に**解析結果の承認**を求めて停止します。検出ミスはそこで直せます。
既存の CLAUDE.md は上書きせず、マージを提案します。git 管理されていないプロジェクトにも
対応します（`git init` の提案、または非gitモードでの導入）。
導入後は新しいセッションを開始してから（エージェント定義はセッション開始時に読み込まれるため）、
下の「試運転」へ進んでください。

<details>
<summary><b>フォールバック: 手動セットアップ（4ステップ）</b> — オフライン環境や、仕組みを理解しながら導入したい場合</summary>

#### 1. CLAUDE.md をコピーして差し替える

[`CLAUDE.md`](CLAUDE.md) を自分のプロジェクトのルートにコピーし、
`<!-- 差し替え -->` とマークされた箇所（成果物の種類と出力先・利用可能なスキル・表記規約）を
自分のプロジェクトに合わせて書き換えます。

#### 2. エージェント定義をコピーする

```bash
mkdir -p .claude/agents
cp <このリポジトリ>/task-factory/.claude/agents/*.md .claude/agents/
```

#### 3. スキルをコピーし、ビルダーの担当範囲を合わせる

```bash
mkdir -p .claude/skills
cp -r <このリポジトリ>/task-factory/.claude/skills/task-factory .claude/skills/
```

（`task-factory-setup` は自動セットアップ用のパーソナルスキルなので、プロジェクトにはコピーしません）

最後に `.claude/agents/deliverable-builder.md` の「担当範囲」セクションのフォルダパス
（`deliverables/`）を、自分のプロジェクトの出力ディレクトリに書き換えます。
**この出力先が CLAUDE.md の「成果物の種類と出力先」と一致していることを確認してください。**

#### 4. フックを設定する

```bash
mkdir -p .claude/hooks
cp <このリポジトリ>/task-factory/.claude/hooks/guard-deliverable-writes.sh .claude/hooks/
chmod +x .claude/hooks/guard-deliverable-writes.sh
```

コピー後、スクリプト冒頭の `ALLOWED_PREFIXES` を自分の出力ディレクトリに合わせて書き換えます
（手順1の CLAUDE.md・手順3のビルダー担当範囲と同じ値にすること）。

**⚠️ すでに `.claude/settings.json` がある場合は、上書きせず `hooks` キーをマージしてください。**
ない場合はそのままコピーで構いません:

```bash
cp <このリポジトリ>/task-factory/.claude/settings.json .claude/settings.json
```

</details>

## 試運転とチューニング

### 1. 小さな依頼で試運転する

```
/task-factory このリポジトリのディレクトリ構成図を drawio で作って
```

のような小さい依頼を流し、どこでつまずくか観察します。

### 2. 3つのチェックポイントを体験する

- **要件承認**: 受け入れ基準が「レビューで検証できる文」になっているか確認し、「承認」または修正指示を返す
- **ブリーフ承認**: 構成案と使用スキルを読み、ズレた構成（例: 読者に不要な詳細）をここで捕まえる
- **最終レビュー**: レビュアーのレポートを確認し、承認後に納品・コミットへ

中止したいときは、どのチェックポイントでも「中止」と伝えれば工場は止まります。

### 3. ルールを足してチューニングする

AIが「えっ」と驚くミスをするたびに自問します——**「CLAUDE.md にルールがあれば、これは防げたか？」**
防げたなら、表記規約やハードルールを足す。差し戻しが多かったエージェントの「ルール」セクションも
調整します。3〜4タスクも流せば、工場はあなたのプロジェクトに馴染んでいきます。

このチューニングは半自動化されています。ビルダーが作業中に気づいた「このルールがあれば助かった」は
`docs/taskfactory/LEARNINGS.md` に自動で蓄積され、最終レビューのチェックポイントで
「CLAUDE.md に昇格させるか」を確認されます。承認したものだけがルールになります。

---

## フックについての補足

`guard-deliverable-writes.sh` は Claude Code の `PreToolUse` フックとして動き、
Claude が Edit / Write でファイルに書き込む直前に対象パスを検査します。判定は2層です:

1. **機密パターンはハードブロック** — `.env`（`.env.example` / `.env.sample` / `.env.template` は許可）・
   `*.key`・`*.pem`・`secrets.json` への書き込みは exit 2 で拒否し、理由を Claude に伝えます
2. **許可リスト外は人間に確認** — 出力ディレクトリ（`ALLOWED_PREFIXES`）の外への書き込みは、
   即拒否ではなく `permissionDecision: "ask"` の JSON を返してユーザーに確認を求めます。
   即拒否にしないのは、工場長（メインセッション）の正当な書き込み（CLAUDE.md のチューニング等）まで
   止めてしまうのを防ぐためです

`jq` が無い環境（Windows の Git Bash 等）でも動くフォールバックを持ち、
バックスラッシュ区切りのパスも正規化して判定します。動作確認は stdin に JSON を流すだけです:

```bash
echo '{"tool_name":"Write","tool_input":{"file_path":"src/main.py"}}' \
  | bash .claude/hooks/guard-deliverable-writes.sh   # → ask の JSON が出力される
```

## 制限事項（知っておくべきこと）

- **`tools` 制限はツール単位であり、フォルダ単位ではありません。** 「ビルダーは出力ディレクトリのみ」という境界は、エージェント定義のプロンプトによる制約と、それを補強する `guard-deliverable-writes.sh`（出力ディレクトリ外への Edit/Write を検知してユーザーに確認を求める PreToolUse フック）の2段構えです。フックは Edit / Write ツールのパスを検査するもので、Bash 経由の書き込み（リダイレクト等）までは検査しません
- **サブエージェントからのスキル利用には `tools` に `Skill` が必要です。** `deliverable-builder` の許可ツールには `Skill` を含めてありますが、Claude Code のバージョンや実行環境によってサブエージェントから利用できるスキルの範囲は変わりえます。ビルダーがスキルを呼べない場合は、スキルの手順をビルダー定義やブリーフに直接書き写すのがフォールバックです
- **スキルは文字どおりには「一時停止」できません。** チェックポイントは「明示的承認まで次フェーズ進行禁止」という強い指示で実現しています。承認の言葉（「承認」「OK」「進めて」）は明確に伝えてください
- **サブエージェントはサブエージェントを呼べません。** そのため task-factory はメインセッションのスキルとして動き、そこから5エージェントを順番に起動する設計です
- **自動テストに相当する機械的な検証はありません。** コードと違い、成果物の品質はビルダーのセルフチェックとレビュアーの突き合わせ（いずれも受け入れ基準ベース)で担保します。だからこそ、要件承認の段階で受け入れ基準を「検証できる文」に磨くことが最重要です

---

## 参考リンク

- [サブエージェント（公式ドキュメント）](https://code.claude.com/docs/en/sub-agents) — frontmatter の全フィールド（model / color / memory / maxTurns など）
- [Agent Skills のベストプラクティス（公式ドキュメント）](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) — description の書き方・チェックリストパターン・本文500行ルール
- [フック（公式ドキュメント）](https://code.claude.com/docs/en/hooks) — PreToolUse ほかのイベント一覧
- [`software-factory/`](../software-factory/) — コード機能開発向けの7エージェント版。本テンプレートの元になったパターン

---

## ライセンス・出典

このセクションは [@sairahul1 氏の記事](https://x.com/sairahul1/status/2058832033628241931)
「How to Build a Software Factory with Claude Code That Ships Features While You Sleep」の
コンセプト（専門エージェントの連鎖・人間承認チェックポイント・CLAUDE.md の育て方）を、
コード以外の成果物向けに汎用化した独自実装です。
ファイルの内容はこのリポジトリで書き起こしたものであり、リポジトリの [LICENSE](../LICENSE)（MIT）に従います。
