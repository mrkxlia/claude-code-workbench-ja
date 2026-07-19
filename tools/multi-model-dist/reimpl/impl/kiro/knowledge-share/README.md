# knowledge-share（Kiro 版） — 横断ナレッジの記録・検索・採掘

`knowledge-share` の **Kiro 向け再実装**（Track B・低忠実度）。CC の `~/.claude/knowledge/` ＋ `@import` 自動読込・
transcript jsonl 採掘・SessionEnd フックを、Kiro の `~/.kiro/knowledge/` ＋ steering(`inclusion: always`) ＋ Kiro hooks に写像する。
共有仕様 `multi-model-dist/reimpl/SPEC/self-improve-and-knowledge-share.md` に追従する。

## 構成

```
.kiro/
├── skills/
│   ├── kb/SKILL.md             # 記録/検索/昇格（~/.kiro/knowledge/）
│   └── kb-harvest/SKILL.md     # セッションログから採掘
├── steering/kb-index.md        # @import 自動読込の相当物（inclusion: always）
└── hooks/
    ├── kb-session-end.json     # 採掘キュー積み（enabled:false・要確認）
    └── kb-session-end.sh
```

## 忠実度の差分（SPEC K2/K3）

- **自動読込**: CC の `@import` → Kiro **steering `kb-index.md`（`inclusion: always`）**。
- **ストア**: `~/.claude/knowledge/` → `~/.kiro/knowledge/`。
- **採掘ログ**: CC の `~/.claude/projects/*.jsonl` → **Kiro セッションログ（形式・場所は `[要確認]`）**。
  確認できるまで `kb-harvest --days N`/パス指定を一次手段にし、SessionEnd 自動キュー（hook）は `enabled:false`。
- 昇格先（self-improve 連携）は Kiro 資産（steering/skills/agents/hooks）に読み替える。

## 検証

`python3 multi-model-dist/reimpl/test_reimpl.py`（skills frontmatter・hooks JSON・SPEC 必須節）。
