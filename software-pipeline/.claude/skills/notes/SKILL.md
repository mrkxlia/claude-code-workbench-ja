---
name: notes
description: >-
  Maintain a running implementation-notes.md that records decisions, deviations,
  tradeoffs, and gotchas while implementing. Auto-triggers whenever the user asks
  Claude to implement a spec, build a feature, refactor, fix a bug, or carry out
  any multi-step coding task — even if they don't explicitly ask for notes.
  Trigger on phrases like "implement", "build", "add", "refactor", "fix",
  "according to the spec/design", or whenever following a SPEC/design doc, and
  especially for work handed off to another session, another agent, or a
  zip/merge workflow. Also trigger at session start whenever the working
  directory already contains an implementation-notes.md — read it before doing
  anything else. Can be invoked manually as /notes to start or update the notes
  file on demand.
---

# Implementation Notes (/notes)

While implementing, keep a running `implementation-notes.md` so that the
*reasoning behind the code* survives the session. Code shows what was built;
this file shows why, and what the next person (or the next session) needs to know.

This skill works two ways:

- **Automatically** during implementation tasks (no need to ask).
- **Manually** via `/notes`:
  - `/notes` — create the file or catch up on missed entries.
  - `/notes <text>` — record that text as a decision/note right now.
  - `/notes status` — refresh only the Status block (see below).

## When to maintain the file

Maintain it during any implementation task. Do **not** wait for the user to ask.
If the task is a one-line trivial change, skip it. Otherwise, keep the notes.

If a session starts in a repo that already has `implementation-notes.md`,
read the Status block (and skim the latest session entry) **before** writing
any code. That is the whole point of the file.

## Where the file lives

- Default: `implementation-notes.md` at the repo root (or the feature's folder).
- If the project uses a docs folder (`docs/`, `notes/`), put it there instead.
- **Append, never overwrite** — with two exceptions: the Status block at the
  top (overwritten each session) and moving the oldest entries out to the
  archive file (see Size management).
- If the file already exists, read it first, then continue from where it left off.

## Status block (the handoff header)

Keep this block at the very top of the file and **overwrite it** each session.
Everything below it is append-only history (touched only when old entries are
moved to the archive). The goal: the next session understands the current state
in ten seconds without reading the whole history.

```markdown
<!-- STATUS: overwrite this block; everything below is append-only -->
## Status (updated 2026-06-10)
- State: <one line — what works right now>
- Next: <the single most important next step>
- Watch out: <the one gotcha most likely to bite the next session>
```

Update it at minimum at the end of each session, and whenever the answer to
"what's the current state?" changes materially.

## When to record an entry

Record an entry the moment any of these happen — not in a batch at the end:

1. **Decision not in the spec** — anything you had to decide that the spec/design
   left open. State the choice AND the alternative you rejected, with one line on why.
2. **Deviation from the spec** — where the implementation differs from what was
   written, and the reason it had to differ.
3. **Tradeoff** — what you optimized for and what you gave up (performance vs.
   readability, speed vs. completeness, etc.).
4. **Gotcha / surprise** — environment quirks, API differences, version
   constraints, anything that wasted time and would waste the next person's too.
   A test failing for an unexpected reason is almost always a gotcha — record it.
5. **Deferred / TODO** — things intentionally left undone, with enough context
   to resume.

Natural checkpoints that should prompt a quick "anything to record?" check:
completing a todo item, just before a commit, and just before handing off
(zip/merge, end of session).

Before appending, glance at the current session's entries — don't record the
same decision twice. If an earlier decision got reversed, add a new entry that
says so and why; don't edit the old one.

Do **not** record: routine code that matches the spec, obvious choices, or a
play-by-play of every edit. Signal, not a changelog.

## Entry format

Append entries under a dated session heading. Keep each entry to 1–4 lines.
**Anchor every entry to evidence**: a file path (ideally `file:line` or a
function name), a test name, an error message, or a commit hash. A note that
can't be located in the code is half a note.

```markdown
## 2026-06-10 — <short task name>

### Decisions
- Chose <X> over <Y> because <reason>. (Spec was silent.) → `src/layout.py:120`

### Deviations
- Spec said <A>; implemented <B> instead because <reason>. → `test_render.py::test_b`

### Tradeoffs
- Optimized for <X> at the cost of <Y>. Revisit if <condition>.

### Gotchas
- <surprise + resolution>. Error was: `<exact message>`.

### Deferred
- <not done yet> — needs <what> before it can be finished.
```

Omit any section that has nothing to record this session. Don't write empty headings.

## At the end of the task

1. Close the session entry with a 1–2 line summary of the current state and the
   single most important thing the next session should know.
2. Refresh the Status block at the top to match.

## Size management

When the file exceeds roughly 400 lines, move the oldest session entries into
`implementation-notes-archive.md` (same folder), keeping the Status block and
the most recent few sessions in the main file. Mention the archive in the
Status block so it stays discoverable.

## Relationship to spec extraction

This file is a first-class evidence source for the `spec-extract` skill
(reverse-engineering a spec from existing code). Well-kept notes turn
"推定" into "確定" in a recovered spec — one more reason to anchor entries
to files and tests.

### Keeping a living SPEC.md in sync (small / out-of-band changes)

If the repo already has a `SPEC.md` (the spec of record) and your change
**alters behavior it describes**, don't wait for a full re-extraction: in the
same session, do a **lightweight incremental update of the affected `F-NN`
row(s) only** (rewrite the requirement, append a 改訂履歴 line — see the
spec-extract skill's 変更管理). Recording the deviation here and touching the
one `F-NN` row keeps the spec from rotting, without running the whole pipeline.

This stays **signal, not a changelog**: only sync rows whose described behavior
actually changed — routine edits that match the existing spec need no SPEC touch.

## Style

Match the surrounding project's language. If the user writes in Japanese or the
existing notes are in Japanese, write the notes in Japanese. Be terse: this is a
working document, not prose. Concrete facts (file names, function names, version
numbers, error messages) beat vague description.
<!-- PIPELINE-INTEGRATION: この行より上は implementation-skills/.claude/skills/notes/SKILL.md の原本と同一に保つ。
     原本を更新したら、この行より上をまるごと新しい原本で差し替え、この行以降は維持すること。
     この行以降は統合連携版（software-pipeline / task-pipeline 共通）であり、両プラグインのコピーを
     常にファイル全体でバイト同一に保つこと（片方だけ編集しない）。
     一致確認: diff <(awk '/PIPELINE-INTEGRATION/{exit} {print}' このファイル) 原本
     全体一致確認: diff software-pipeline/.claude/skills/notes/SKILL.md task-pipeline/.claude/skills/notes/SKILL.md -->

## パイプライン連携（software-pipeline / task-pipeline 統合連携版）

このコピーは software-pipeline（feature-pipeline）と task-pipeline の**両方で同一内容**の
統合連携版。単体利用の原本は `implementation-skills/.claude/skills/notes/` にある。
パイプラインで使うとき、上記の原本ルールに以下が**優先して**加わる。

### モード判定（成果物がプログラムかそれ以外か）

次の優先順で**コードモード**か**成果物モード**かを決める:

1. オーケストレーター・エージェント定義から記録先パスやモードの指示があればそれに従う
2. `docs/pipeline/<slug>/` が進行中 → コードモード、`docs/task-pipeline/<slug>/` が進行中 → 成果物モード
3. どちらも無ければ、作っているものの種類で判定する: プログラム（ソースコード・テスト・API）なら
   コードモード、それ以外（図・ドキュメント・レポート等）なら成果物モード

パイプライン外の単体作業では、この節は適用されず原本どおりに振る舞う。

### モード別の読み替え表

| 項目 | コードモード（feature-pipeline） | 成果物モード（task-pipeline） |
|---|---|---|
| 記録先（1件=1ファイル） | `docs/pipeline/<slug>/implementation-notes.md` | `docs/task-pipeline/<slug>/implementation-notes.md` |
| 書き手 | ビルダー3種（backend-builder / frontend-builder / test-verifier）が共有 | deliverable-builder |
| 再開時に Status を読む | `/feature-pipeline 再開 <slug>` | `/task-pipeline 再開 <slug>` |
| 物証アンカー | `file:line`・テスト名 | 成果物ファイルのパス・見出し・図ノードID |
| 語彙 | 原本どおり | 「コード」→「成果物」、tests → 受け入れ基準・レビュー観点 |

### 共通ルール（両モード）

- パイプラインの `docs/.../<slug>/` が存在する作業中は、リポジトリルートに
  `implementation-notes.md` を新規作成しない（指示されたパスへ書く）
- **status.md と混ぜない**: `docs/.../<slug>/status.md` は**進行管理**（フェーズ・承認・差し戻し
  カウンタ）、`implementation-notes.md` は**実装判断の記録**（Decisions / Deviations / Tradeoffs /
  Gotchas / Deferred）。進行状況を notes に、判断を status に書かない
- 複数エージェントが同じファイルに追記する場合、セッション見出しに**必ずエージェント名
  （または main session）を含める**: `## YYYY-MM-DD — backend-builder: <作業名>`。
  Status ブロックは「最後に書いた者が上書き」でよい（最新状態が勝つ）
- **生きた SPEC.md との同期**: リポジトリに SPEC.md があり、変更がその記述する挙動・内容・構成を
  変えた場合は、逸脱記録と同時に該当要件行だけを軽量に増分更新する（要件IDはコードモード `F-NN`、
  成果物モード `D-NN`）

### 最終フェーズでの回収（コードモードのみ）

Phase 7（最終検証）後、Decisions / Deferred のうち他機能にも一般化できるものは
`docs/pipeline/LEARNINGS.md` の候補としてオーケストレーターが回収し、
チェックポイント3でユーザーに提示する。
