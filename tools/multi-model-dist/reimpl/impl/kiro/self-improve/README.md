# self-improve（Kiro 版） — git 不要の自己改善ループ

`self-improve` の **Kiro 向け再実装**（Track B・低忠実度）。CC のトランスクリプト走査・SessionStart/End フック・
昇格先（CLAUDE.md/rules/skill/hook/agent）を、Kiro のセッションログ・hooks・Kiro 資産（steering/skills/agents/hooks）に写像する。
共有仕様 `multi-model-dist/reimpl/SPEC/self-improve-and-knowledge-share.md` に追従する。

## 構成

```
.kiro/
├── skills/
│   ├── improve-scan/SKILL.md    # ログから改善の種を発見し backlog へ（編集しない）
│   └── improve-apply/SKILL.md   # backlog を品質ゲート＋1件ずつ承認で適用（.bak ロールバック）
└── hooks/
    ├── si-session.json          # SessionStart 通知 / SessionEnd キュー（enabled:false・要確認）
    ├── si-session-start.sh
    └── si-session-end.sh
```

## 忠実度の差分（SPEC K2/K3）

- **ストア**: `~/.claude/self-improve/<project>/` → `~/.kiro/self-improve/<project>/`（project キーは cksum で同一アルゴリズム）。
- **走査ログ**: CC の `~/.claude/projects/*.jsonl` → **Kiro セッションログ（形式・場所は `[要確認]`）**。確認できるまで `improve-scan --days`/パス指定が一次手段、SessionEnd 自動キューは `enabled:false`。
- **昇格先**: CLAUDE.md/`.claude/rules`/skill/hook/agent → **steering/`.kiro/skills`/`.kiro/hooks`/`.kiro/agents`**。
- **kb 連携**: `~/.kiro/knowledge/` と閉ループ（`#promote`→`#promoted`・`- 昇格:` 書き戻し）。

## 検証

`python3 multi-model-dist/reimpl/test_reimpl.py`（skills frontmatter・hooks JSON・SPEC 必須節）。
