---
inclusion: always
---

# 横断ナレッジ・インデックス（kb・auto-load）

このファイルは CC の `@import` による index 常時読み込みの **Kiro 相当物**（`inclusion: always`）です。
`kb` スキルが記録した横断ナレッジの索引を、全 Kiro セッションへ自動で読み込ませます。

- 実体ストア: `~/.kiro/knowledge/index.md`（エントリ一覧）・`~/.kiro/knowledge/topics/<topic>.md`（本体）。
- このファイルには **index の要約（最新の主要エントリ行）** を置くか、または「`~/.kiro/knowledge/index.md` を参照せよ」と
  指示するだけにする（運用はプロジェクトの好みで選ぶ）。**200行 / 25KB 以内**に保つ。
- 記録・更新は `kb` スキルが行う。エラー直面時は、まず `kb search <語>` で既知かを確認する。

<!-- エントリ一覧（kb スキルがここ、または ~/.kiro/knowledge/index.md を更新する）
- [KB-YYYYMMDD-NN] <タイトル> — topics/<topic>.md #タグ
-->
