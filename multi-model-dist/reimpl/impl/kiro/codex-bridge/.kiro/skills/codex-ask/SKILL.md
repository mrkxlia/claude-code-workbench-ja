---
name: codex-ask
description: >-
  設計相談・セカンドオピニオンを OpenAI Codex に依頼する Kiro スキル。ユーザーは Codex を操作せず、Kiro が
  Codex CLI を非対話モード(read-only)で駆動し、自由形式の質問に Codex を答えさせて要約する。コードは書き換えない。
  「Codex に相談して」「codex の意見を聞いて」「セカンドオピニオン」や、codex-ask <相談内容> で発動する。
---

# codex-ask — Codex に相談する（コードは書かない）

設計相談・セカンドオピニオンを **OpenAI Codex** に答えさせる Kiro スキル。実際の codex 実行は
**`codex-advisor` サブエージェント**（`.kiro/agents/codex-advisor.json`）に委譲する。
共有仕様は `multi-model-dist/reimpl/SPEC/codex-bridge.md`。

## 前提

`codex` CLI が導入・認証済みであること。未導入・未認証ならサブエージェントが前段ガードで案内して終了する。

## フロー

1. **相談内容を整理する**: 設計の是非・代替案・デバッグ方針・トレードオフなど、聞きたいことを明確にする。
2. **判断に必要な文脈を用意する**: 関連コード/設計メモの**内容そのもの**を同梱用に揃える（パス名指しに頼らない）。
3. **`codex-advisor` サブエージェントを起動する**: 相談内容と文脈を渡す。サブエージェントが Codex を `read-only` で実行する。
4. **結果を提示する**: 結論・根拠・代替案/トレードオフ・生ログ保存先。**コードは書き換えない**（助言のみ）。
