---
name: improve-apply
description: >-
  improve-scan が貯めたローカル backlog を判定し、品質ゲートを通したうえで、ユーザー承認のもとに
  スキル・steering・ルール・hook・エージェントの改善を「1件ずつ」適用する Kiro 版スキル。git も使わず
  ローカル完結し、適用前に .bak 退避（JSON マージ系はエントリ差分記録）でロールバック可能にする。
  「改善候補を適用して」「backlog をレビューして反映して」や、SessionStart の通知（未処理 N 件）で発動する。
  承認なしには1ファイルも変更しない。共有仕様は
  multi-model-dist/reimpl/SPEC/self-improve-and-knowledge-share.md を正本とする。
disable-model-invocation: true
---

# improve-apply（Kiro 版）— backlog を承認制で適用する

`improve-scan` が貯めた改善候補を**判定 → 品質ゲート → 1件ずつ承認 → 適用 → 記録**まで通す。
**git も使わずローカル完結**し、**承認なしには1ファイルも変更しない**。

## 使い方

- `improve-apply` — `~/.kiro/self-improve/<project>/improvement-backlog.md` を開いて判定を始める（`<project>` キーは improve-scan と同一）。

## フロー

### 1. triage（steering / ルールを最優先）

backlog をレバレッジの高い順に並べる。**プロジェクト指示（steering）とルールを最優先**（崩れると全スキルの品質が落ちる）。価値の低い候補・却下済みは外す。

### 2. 改善アクションを成果物種別ごとに提案（Kiro 資産に読み替え）

- **スキル** — 既存 `.kiro/skills/*/SKILL.md` の改善 / 新規スキル作成（下記6フェーズ）。
- **steering** — 追記だけでなく曖昧/誤りの補強・修正（CC の CLAUDE.md/rules 相当）。**パス条件（`inclusion: fileMatch`）付き**を優先。
- **hook** — 新規 `.kiro/hooks/*.json` 雛形＋誤発火/抜けの修正（trigger/matcher/action）。**全文を提示して明示承認**。
- **エージェント** — 既存 `.kiro/agents/*.json` の改善（prompt/`tools`/`model`）＋新規サブエージェント作成。
- **kb エントリの昇格** — 常用メモを上記いずれかへ恒久化。

#### 新規スキル作成の6フェーズ

1. WHAT/HOW/FLOW 抽出 → 2. 既存スキルと照合（重複除外・トリガー語抽出）→ 3. ユーザーと仕様確認 →
4. SKILL.md 生成（生ログ除外）→ 5. **公式スキルガイドのチェックリストで品質検証**（frontmatter `name`/`description`/トリガー語・見出し構成・自己完結性）→ 6. 配置確認。

### 3. 品質ゲート

1. self-review（自分で見直す）
2. 任意で独立レビュー（Kiro 内のレビュー、または codex-bridge の codex-ask）
3. 生成/編集した SKILL.md を公式スキルガイドで検証
4. **秘密情報・公開可否チェック**（kb のサニタイズ規律を流用）

### 4. 1件ずつ承認（Accept / Reject / Modify）

候補を**1件ずつ**提示し、Accept / Reject / Modify を選ばせる。**承認なしには適用しない**。

### 5. 適用とロールバック準備

- 各編集の前に対象を **`<file>.bak`** へ退避し、backlog に復元手順を記録（git なしでも復旧可能に）。
- **JSON マージ系（hook の追加等）は粒度を変える**: 追加したエントリだけ記録し、復元はそのエントリを remove（差分単位）。新規ファイル/全文置換は `.bak` でよい。

### 6. 記録（ループを閉じる）

- 採用履歴を backlog に記録し、要点を **kb に書き戻す**。却下/見送りは「合法的例外」として記録し再提案を防ぐ。`~/.kiro/self-improve/<project>/last-apply` を更新。

#### kb エントリ昇格時の書き戻し（knowledge-share 連携）

backlog の「昇格候補」を Kiro 資産へ昇格・適用したら、当該 kb エントリに書き戻す:
1. index 行のタグを `#promote` → `#promoted` に置換（`~/.kiro/knowledge/index.md`）。
2. 本体の `- タグ:` 行直後に `- 昇格: <成果物パス>` を1行追記（例: `- 昇格: .kiro/steering/backend-retry.md`）。
`~/.kiro/knowledge/` が無い/対象が見つからなければスキップ（self-improve は単体でも成立）。

## やらないこと

- 承認なしにファイルを変更する／ロールバック手段なしで適用する／秘密情報を成果物に書く／git・GitHub を使う。
