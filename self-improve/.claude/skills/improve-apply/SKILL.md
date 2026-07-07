---
name: improve-apply
description: >-
  improve-scan が貯めたローカル backlog を判定し、品質ゲートを通したうえで、ユーザー承認のもとに
  スキル・CLAUDE.md・.claude/rules・hook・エージェントの改善を「1件ずつ」適用するスキル。git も
  GitHub も使わずローカル完結し、適用前に .bak 退避（JSON マージ系はエントリ差分記録）でロールバック
  可能にする。「改善候補を適用して」「backlog をレビューして反映して」「self-improve apply」
  「improve-apply」といった依頼や、SessionStart の通知（未処理 N 件／前回適用から X 日）を見たときに発動する。
  承認なしには1ファイルも変更しない。新規スキル作成・CLAUDE.md/rules/hook の新規追加と既存修正の両方を扱う。
  対象は improve-scan が貯める改善提案の backlog（`~/.claude/self-improve/<project>/improvement-backlog.md`）
  のみ。プロジェクトのタスク backlog.md（例: docs/backlog.md）は対象外 — そちらは
  model-setup の backlog-loop に任せる。
argument-hint: ""
---

# improve-apply — backlog を承認制で適用する（/improve-apply）

`improve-scan` が貯めた改善候補（backlog）を**判定 → 品質ゲート → 1件ずつ承認 → 適用 → 記録**まで
通すスキルです。**git も GitHub も使わずローカル完結**し、`pipeline-improve` 同様
**承認なしには1ファイルも変更しません**。

## 使い方

- `/improve-apply` — `~/.claude/self-improve/<project>/improvement-backlog.md` を開いて判定を始める
  （`<project>` キーは improve-scan と同一アルゴリズム）。

「改善候補を適用して」「backlog を反映して」のような自然文でも発動します。

## フロー

### 1. triage（CLAUDE.md / rules を最優先）

backlog を読み、レバレッジの高い順に並べる。**CLAUDE.md と rules を最優先**する
（CLAUDE.md が崩れると全スキルの品質が落ちるため）。明らかに価値の低い候補・却下済みは外す。

### 2. 改善アクションを成果物種別ごとに提案（新規追加も既存修正も扱う）

- **スキル** — 既存 SKILL.md の改善 / **新規スキルの作成**（下記6フェーズ）。
- **CLAUDE.md** — 追記だけでなく**曖昧/誤りの記述の補強・修正**。
- **rules（`.claude/rules/`）** — 小ルール追加＋**違反されがちな既存ルールの厳格化/明確化**。
  **パス条件付き**を優先（`backend/**` などスコープを絞ってトークン節約・関心分離）。
- **hook** — 新規フック雛形＋**誤発火/抜けのある既存 hook の修正**（`settings.json` 配線含む）。
  物理ガード型（PreToolUse でブロック等）も提案範囲。**フックは全文＋settings 差分を提示して明示承認**。
- **エージェント** — 既存定義の改善（プロンプト/`tools`/**モデル階層**）＋**新規サブエージェント作成**
  （反復・並列化できる委譲パターンから）。機械的チェックは軽量モデル、設計/セキュリティは上位モデル、を提案。
- **エージェント永続メモリ** — 該当エージェント用 `MEMORY.md`（既知パターン・合法的例外）の新設/更新で
  「同じ指摘を2回しない」を成果物側にも定着。
- **kb エントリの昇格** — 常用メモを上記いずれかへ恒久化。

#### 新規スキル作成の6フェーズ

1. WHAT/HOW/FLOW を抽出 → 2. 既存スキルと照合（重複除外・トリガーキーワード抽出）→
3. ユーザーと仕様確認 → 4. SKILL.md 生成（**生ログ除外**）→
5. **公式スキルガイドのチェックリストで品質検証**（不合格は自動修正・再検証）→ 6. 配置確認。
- 検証チェックリスト（固定）: frontmatter（`name`/`description`/トリガー語）・見出し構成・記述の自己完結性。
  参照は公式ドキュメント `https://code.claude.com/docs/en/skills`（常に最新に追従）。

### 3. 品質ゲート（ai-peer と連携）

1. **self-review**（自分で見直す）
2. 任意で **`/peer`（依存ゼロ）** または **`/ask-claude`** に独立レビューを依頼
3. 生成/編集した SKILL.md を**公式スキルガイドで検証**（frontmatter・トリガー・構成）
4. **秘密情報・公開可否チェック**（kb のサニタイズ規律を流用：トークン/内部ホスト名/顧客データを残さない）

### 4. 1件ずつ承認（Accept / Reject / Modify）

候補を**1件ずつ**提示し、ユーザーに Accept / Reject / Modify を選ばせる。**承認なしには適用しない**。

### 5. 適用とロールバック準備

- 各 Edit の前に対象を **`<file>.bak`** へ退避（または backlog 隣にタイムスタンプ退避）し、backlog に
  「復元: `<file>.bak` を戻す」手順を記録。**git なしでも復旧可能**にする。
- **JSON マージ系（`settings.json` の hook 追加）は粒度を変える**: ファイル全体 `.bak` だと他設定の変更まで
  巻き戻るため、**追加した hook エントリだけを記録し、復元はそのエントリを remove**（差分単位）。
  新規ファイル/全文置換系は `.bak` 退避でよい。
- サブスキル/サブエージェントを使う場合、**最終出力を JSON 終端**にして「完成応答」の誤発火を防ぐ。
  作業ファイルは `.claude/` の外に置く。

### 6. 記録（ループを閉じる）

- 採用履歴を backlog に記録し、要点を **kb に書き戻す**（何を恒久化したか）。
- **却下/見送りした候補は「合法的例外」として記録**し、次回 `improve-scan` で再提案しない。
- `~/.claude/self-improve/<project>/last-apply` のタイムスタンプを更新（擬似定期実行の基準）。

#### kb エントリを昇格したときの書き戻し（knowledge-share 連携）

backlog の「昇格候補」（`#promote` 付き kb エントリ等）を恒久成果物へ昇格・適用したら、
**当該 kb エントリに次の2点を書き戻す**（kb との閉ループを閉じる・再提案を防ぐ）:

1. **index 行のタグを `#promote` → `#promoted` に置換**（`~/.claude/knowledge/index.md`）。
2. **本体（`topics/<topic>.md`）の当該エントリの `- タグ:` 行の直後に `- 昇格: <成果物パス>` を1行追記**
   （例: `- 昇格: .claude/rules/backend-retry.md`）。

- knowledge-share の書式・サニタイズ規律（トークン/内部ホスト名/顧客データを書かない）に従う。
- `~/.claude/knowledge/` が無い／対象エントリが見つからない場合は、この書き戻しはスキップする
  （self-improve は単体でも成立する）。

## 既存の自己改善系との住み分け

- **pipeline-improve（software/task-pipeline）** … パイプライン運用が前提（`docs/pipeline/` の産物を読む）。
- **kb-harvest（knowledge-share）** … 知見メモを `~/.claude/knowledge/` に貯めるだけ（スキルは直さない）。
- **improve-apply（本スキル）** … パイプライン不要・git 不要で、**任意リポジトリの恒久成果物を直す/作る**。

## このスキルがやらないこと

- 承認なしにファイルを変更する（1件ずつ承認が必須）
- ロールバック手段を用意せずに適用する（`.bak`／エントリ差分を必ず残す）
- 秘密情報を成果物に書く（サニタイズ必須）
- git / GitHub を使う（ローカル完結）
