# knowledge-share（Codex 版・部分） — 横断ナレッジの記録・検索

`knowledge-share` の **Codex 向け再実装**（Track B・低忠実度・部分）。Codex はセッションログのフック機構が貧弱なため、
**kb（記録/検索/昇格）のみ**を移植する。共有仕様 `multi-model-dist/reimpl/SPEC/self-improve-and-knowledge-share.md` に追従。

## 構成

```
.agents/skills/kb/SKILL.md   # 記録/検索/昇格（~/.codex/knowledge/）
```

## 忠実度の差分（SPEC K2/K3）

- **ストア**: `~/.claude/knowledge/` → `~/.codex/knowledge/`。
- **自動読込**: CC の `@import` は無い → 主要索引を `AGENTS.md`（repo 直下）の断片に置く限定的代替。
- **非対応**: `kb-harvest`（過去ログ採掘）・`improve-scan`/`improve-apply`（自己改善）はセッションログ＋フック依存のため本増分では非対応。
  規範（機密非コミット・サニタイズ等）は AGENTS.md に明記して補う。Codex のセッションログ仕様が確認できたら追加する。

## 検証

`python3 multi-model-dist/reimpl/test_reimpl.py`（skill frontmatter）。
