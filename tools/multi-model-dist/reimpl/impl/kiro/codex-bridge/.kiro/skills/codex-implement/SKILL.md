---
name: codex-implement
description: >-
  実装を OpenAI Codex に依頼する Kiro スキル。ユーザーは Codex を操作せず、Kiro が Codex CLI を非対話モード
  (workspace-write)で駆動し、Codex にファイルを直接編集させてから Kiro が差分とテストを検証する。
  「Codex に実装させて」「codex で実装して」や、codex-implement <タスク> で発動する。
---

# codex-implement — Codex に実装を依頼する

実装を **OpenAI Codex** に委譲する Kiro スキル。実際の codex 実行は **`codex-implementer` サブエージェント**
（`.kiro/agents/codex-implementer.json`）に委譲する。共有仕様は `multi-model-dist/reimpl/SPEC/codex-bridge.md`。

## 前提

`codex` CLI が導入・認証済みであること。未導入・未認証ならサブエージェントが前段ガードで案内して終了する。

## フロー

1. **タスクを整理する**: 実装内容・受け入れ条件・制約を明確にする。
2. **必要なファイルを用意する**: 変更対象・関連する型定義/呼び出し元の**内容そのもの**を同梱用に揃える。
3. **`codex-implementer` サブエージェントを起動する**: タスクと同梱ファイルを渡す。サブエージェントが Codex を
   `workspace-write` で実行（**ネットワークは既定無効**）し、編集後に差分・テストを検証する。
4. **結果を提示する**: Codex の編集差分の要約、テスト/型チェック結果、ホスト側の検証所見、生ログ保存先。
5. **採否を確認する**: 追加修正やロールバックの判断はユーザー/ホストが行う。
