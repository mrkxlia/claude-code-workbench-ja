# skill-sync — リポジトリ内の複製スキル/フックを原本から機械生成する

このリポジトリには、同じ内容を複数箇所に配布する必要があるスキル/フックがあります
（例: `notes`・`spec-extract` は単体利用向け原本と software-pipeline・task-pipeline
両方のパイプライン連携版に存在する）。以前は「手動 diff で一致を確認する」という
運用規約だけで管理していましたが、片方だけ編集して原本と乖離する事故を防ぐため、
`sync.py` による生成 + `--check` の機械検証に置き換えています。

## 使い方

```bash
python3 tools/skill-sync/sync.py          # 原本 → 派生ファイルを再生成（差分が無ければ書き込まない）
python3 tools/skill-sync/sync.py --check  # 派生が原本から生成される内容と一致するかだけ検証する（CI用・非破壊）
```

**原本または `fragments/*.md` のみを編集し、必ず `sync.py` を実行してから commit すること。**
派生ファイルを直接編集しても、次の sync 実行で上書きされます（先頭の
`SYNCED by tools/skill-sync — DO NOT EDIT` 注記がその旨を示します）。

## 同期対象

| 原本 | 派生 | 備考 |
|------|------|------|
| `templates/implementation-skills/.claude/skills/notes/SKILL.md` | `plugins/software-pipeline/skills/notes/SKILL.md`<br/>`plugins/task-pipeline/skills/notes/SKILL.md` | `fragments/notes-pipeline-integration.md` を末尾に合成 |
| `templates/implementation-skills/.claude/skills/spec-extract/SKILL.md` | `plugins/software-pipeline/skills/spec-extract/SKILL.md`<br/>`plugins/task-pipeline/skills/spec-extract/SKILL.md` | `fragments/spec-extract-pipeline-integration.md` を末尾に合成 |
| `plugins/software-pipeline/skills/clarify/SKILL.md` | `plugins/task-pipeline/skills/clarify/SKILL.md` | 全文コピー |
| `templates/plan-mode/.claude/skills/create-plan/{SKILL.md,SPEC.md}` | `.claude/skills/create-plan/{SKILL.md,SPEC.md}`（リポジトリ自身の dogfooding 用） | 全文コピー・一方向 |
| `templates/plan-mode/.claude/skills/create-plan-calibrate/SKILL.md` | `.claude/skills/create-plan-calibrate/SKILL.md` | 全文コピー・一方向 |
| `plugins/software-pipeline/hooks/spec-sync-reminder.{sh,ps1}` | `plugins/task-pipeline/hooks/spec-sync-reminder.{sh,ps1}` | 全文コピー（`.ps1` の UTF-8 BOM を保持） |

## fragments/

`notes` と `spec-extract` の「パイプライン連携セクション」（`PIPELINE-INTEGRATION`
マーカー以降の本文）は、software-pipeline 版・task-pipeline 版で常にバイト同一である
必要があります。この本文自体を単一ソース化するため、`fragments/` にそれぞれ1ファイルだけ
置いています。連携セクションの内容を変えたいときは `fragments/*.md` を編集して
`sync.py` を実行してください。

## 生成ルールの追加・変更

`sync.py` の `build_rules()` に `Rule(source=..., dest=..., fragment=..., style=...)` を
追加します。`style="md"` は frontmatter 直後にセンチネルコメントを挿入し、`style="hash"`
は1行目（シェバン等）の直後に `#` コメントを挿入します。

## CI

`.github/workflows/ci.yml` の `required-checks` ジョブが `sync.py --check` を実行し、
派生ファイルが stale なまま PR がマージされることを防ぎます。
