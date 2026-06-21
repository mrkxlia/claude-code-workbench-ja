---
name: spec-extract
description: >-
  Reverse-engineer a specification (SPEC.md) from existing code, tests, and
  documents, with every statement labeled by confidence and anchored to
  evidence. Trigger whenever the user wants to document, understand, or hand
  off existing code: phrases like "仕様書を作って", "仕様をまとめて",
  "このコードは何をしている", "ドキュメント化", "リバースエンジニアリング",
  "write a spec for this", "document this codebase/module/script", "handoff
  docs", or when preparing to refactor / rewrite / migrate legacy code and no
  written spec exists. Also trigger before large refactors when the user wants
  to pin down current behavior first. Can be invoked manually as /spec-extract
  [target path].
---

# Spec Extraction (/spec-extract)

Recover a written specification from an existing implementation. The output is
a `SPEC.md` where **every requirement is traceable to evidence** (a file:line,
a test, a doc) and **labeled by confidence**. The cardinal rule: never present
a guess as a fact. 推測ではなく物証。

## Core principle: three confidence levels

Every statement in the recovered spec carries exactly one label:

| Label | Meaning | Backed by |
|---|---|---|
| `[確定]` | Verified behavior | Code that demonstrably does it, or a passing test asserting it |
| `[推定]` | Inferred intent | Comments, docs, naming, commit messages, implementation-notes.md — plausible but not proven by code/tests |
| `[不明]` | Open question | Could not determine; needs the user or original author |

A spec with honest `[不明]` entries is more useful than a confident-sounding
spec that's wrong. The open-questions list is a deliverable, not an apology.

A test counts as `[確定]` evidence only if it passes. Run the test suite when
feasible; if you didn't run it, say so on the 凡例 line (e.g. 「テスト未実行」).
Never cite a failing test as `[確定]` evidence — a failing test is itself an
open question for section 8.

## Workflow

### 1. Scope (keep it light)

Determine: target (which code/dir/module), depth (overview vs. full behavioral
spec), and audience (next maintainer? reviewer? a rewrite in another stack?).
If the user's request makes these obvious, don't ask — state your assumption in
one line and proceed. If genuinely ambiguous, ask **one** question, not a list.

### 2. Evidence inventory

Before reading code in depth, map the evidence sources. Cheap, high-yield first:

1. `implementation-notes.md` / `docs/` / `README` / design docs — intent and decisions
2. **Tests** — each test is a spec assertion someone cared enough to write
3. Entry points — `main`, CLI definitions, route tables, exported API surface
4. Configs, schemas, type definitions, constants — constraints and data model
5. The implementation itself
6. Commit history (if available) — for "why" on suspicious spots only; don't read it all

Note what's *missing* too (no tests for module X) — that becomes spec risk later.

### 3. Extraction passes

Work through these lenses; each produces requirement candidates:

- **Behavior**: inputs → outputs → side effects, per entry point. What does it
  read, write, call, mutate?
- **Contracts**: translate each meaningful test into a requirement sentence.
  Test name + assertion = `[確定]` requirement with the test as evidence.
- **Data**: structures, formats, schemas, units, encodings, valid ranges.
- **Errors & edges**: what is caught, retried, validated, rejected; what happens
  on bad input; idempotency; ordering assumptions.
- **Constraints**: versions, OS/environment assumptions, external services,
  performance-relevant choices (timeouts, batch sizes, limits).
- **Intent**: from comments/docs/notes — record as `[推定]` unless code confirms.

While reading, when code and docs disagree, **the code wins for behavior** —
record the doc's claim as a `[推定]` intent and the discrepancy as an open
question (was the doc aspirational, or is this a bug?).

### 4. Write SPEC.md

Use this structure; omit sections that genuinely don't apply:

```markdown
# <Target> 仕様書（逆引き）
生成日: YYYY-MM-DD ／ 対象: <path, commit hash if available>
凡例: [確定]=コード/テストで実証 [推定]=意図の推測 [不明]=未確認

## 1. 概要
<3–6 lines: what this is, who calls it, why it exists>

## 2. スコープ
含む: … ／ 含まない: …

## 3. 機能要件
| ID | 要件 | 確度 | 根拠 |
|----|------|------|------|
| F-01 | <one-sentence requirement> | 確定 | `src/x.py:42`, `test_x.py::test_y` |

## 4. データ / インターフェース
<schemas, file formats, API/CLI/DSL surface — with evidence refs>

## 5. エラー処理・エッジケース
<validated/rejected inputs, retries, failure behavior>

## 6. 制約・前提
<versions, environment, external dependencies, limits>

## 7. テストカバレッジとの突合
- テストに裏付けられた要件: F-01, F-03, …
- テストのない挙動（仕様リスク）: F-02 …
- 仕様に現れないテスト（見落とし候補）: test_z — 何を守っている？

## 8. 未解決の質問（[不明] 一覧）
- Q1: <question> — 確認先: <user / author / experiment>

## 9. 改訂履歴
- YYYY-MM-DD 初版（逆引き生成）
- YYYY-MM-DD F-03 変更 — 〜の挙動が〜に変わったため（根拠: `src/x.py:88`）
```

Requirement IDs (`F-01`…) exist so the user can answer open questions by ID and
so a later rewrite can check itself off against the list.

### 5. Cross-check before delivering

This pass is what makes the spec trustworthy:

1. **Tests → spec**: every meaningful test maps to some requirement. Orphan
   tests go to section 7 as "見落とし候補".
2. **Spec → tests**: every `[確定]` requirement cites real evidence — actually
   open the file/line you cite; don't cite from memory.
3. **Untested behavior**: `[確定]` requirements backed only by code (no test)
   get flagged in section 7 — these are exactly the behaviors a refactor will
   silently break.
4. Anything you couldn't verify gets demoted to `[推定]` or `[不明]`. When in
   doubt, demote.

### 6. clarify パス（対話時のみ — 読むだけで終わらせない）

Reading evidence alone leaves `[不明]` and shaky `[推定]` entries. In an
interactive session, **resolve them with the user before delivering** — gently
and thoroughly. This is the `clarify` *protocol embedded here* (not a separate
skill invocation):

1. Take the `[不明]` list (section 8) and the weakest `[推定]` items.
2. Ask **one question at a time**, each with a **recommended answer and why**.
   Wait for the reply before the next — don't batch. Push back on vague answers.
3. Turn each confirmed answer into a `[確定]`/`[推定]` requirement, citing the
   user as evidence (`確認: user, YYYY-MM-DD`).
4. End with one **catch-all** question to cover what the code can't show:
   「証拠に現れていないが、確認しておくべき暗黙の要望・前提・将来意図は
   ありますか？」 — surface tacit needs, not just labeled gaps.
5. Update section 8: promote resolved items to requirements; keep the rest with
   their 確認先.

**Headless / batch（`claude -p` など対話できない場合）はこのパスをスキップ**し、
`[不明]` を section 8 の成果物としてそのまま残す（推測を `[確定]` にしない＝物証主義）。

### 7. Deliver

Present the SPEC.md, then summarize in a few lines: how many requirements,
the confidence breakdown (e.g. 確定 18 / 推定 5 / 不明 3), and the top 1–2 open
questions worth answering first. Don't restate the whole spec in chat.

## Where the file lives

- Default: `SPEC.md` next to the target (repo root or the module's folder).
- If a spec already exists, do **not** overwrite it — write
  `SPEC-recovered.md` and note discrepancies against the original as open
  questions.

## 生きた仕様として維持する（増分更新・変更管理）

A recovered `SPEC.md` is not a one-shot artifact — keep it as the **living spec
of record**. After the first reverse pass, update it incrementally as the code
changes (a spec rots the moment a decision lands without updating it):

- **追加** — new behavior → a new `F-NN` row with evidence.
- **変更** — behavior changed → **keep the same `F-NN` id**, rewrite the
  requirement sentence, and record what changed and why. Don't silently overwrite.
- **廃止** — behavior removed → mark the row `[廃止]`（superseded）with the date
  and the replacing `F-NN` if any. Keep the history; don't delete the row.
- Every change appends one line to **section 9 改訂履歴**:
  `YYYY-MM-DD F-NN 追加/変更/廃止 — 理由`.

A small, out-of-band edit only needs the affected `F-NN` row touched — not a
full re-extraction. This keeps the spec a contract that evolves with the code.

## Scaling to large targets

For anything beyond a few thousand lines, don't read linearly. Spec one entry
point / module at a time, deepest-value first (the part the user wants to
refactor or hand off). It's fine to deliver a complete spec for one module with
section 2 explicitly listing the rest as out of scope — better than a shallow
spec of everything.

## Style

Write the spec in the user's language (Japanese if they write Japanese).
For a Japanese spec use the labels as written ([確定]/[推定]/[不明]); for an
English spec map them to [Verified]/[Inferred]/[Unknown] and adjust the legend
line to match.
Requirements are single testable sentences — "〜の場合、〜する" — not paragraphs.
Concrete identifiers (file, function, test, error message) beat description.
<!-- PIPELINE-INTEGRATION: この行より上は implementation-skills/.claude/skills/spec-extract/SKILL.md の原本と同一に保つ。
     原本を更新したら、この行より上をまるごと新しい原本で差し替え、この行以降は維持すること。
     一致確認: diff <(awk '/PIPELINE-INTEGRATION/{exit} {print}' このファイル) 原本 -->

## パイプライン連携（task-pipeline 統合時の追加ルール）

このコピーは task-pipeline（コード以外の成果物パイプライン）と連携して動くパイプライン連携版。
単体利用の原本は `implementation-skills/.claude/skills/spec-extract/` にある。

### 位置づけ: 成果物パイプラインの「入口」

仕様書のない既存成果物・規約から「**成果物仕様（SPEC）**」を逆引きし、`source-researcher` が
一次資料として読む。レガシー成果物群に task-pipeline を導入するときの推奨フロー:

1. `/spec-extract <対象>` で既存成果物・表記規約の現状を SPEC.md に固定する
2. 人間が SPEC.md をレビューし、`[不明]` に答えられる範囲で答える
3. `/task-pipeline <依頼>` を開始 — source-researcher が SPEC.md を一次資料として読む

### コード前提語の読み替え（非コード成果物向け）

原本本文はコード前提で書かれている。task-pipeline では次のように読み替える:

| 原本（コード前提） | task-pipeline 版（成果物前提） |
|---|---|
| tests／test name アンカー | 受け入れ基準・レビュー観点・参照素材のパス |
| `F-NN` 機能要件 | `D-NN` 成果物要件（章・節・図要素の単位） |
| 「挙動を変えた」 | 「成果物の内容・構成・表記規約を変えた」 |
| コード `file:line` 物証 | 成果物ファイルのパス・見出し・図ノードID |
| `docs/pipeline/<slug>/` | `docs/task-pipeline/<slug>/` |

`[確定]/[推定]/[不明]` ラベルと「物証主義」、clarify パス、変更管理（追加/変更/廃止・改訂履歴）は
そのまま流用する（変更管理は `F-NN` を `D-NN` に読み替える）。

### 出力場所

SPEC.md はリポジトリルートまたは対象成果物群の隣に置く（原本どおり）。`docs/task-pipeline/<slug>/`
配下には置かない — SPEC.md は依頼単位ではなく成果物コードベース単位の成果物のため。
