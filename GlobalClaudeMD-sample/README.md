# GlobalClaudeMD-sample — グローバルスコープ用 CLAUDE.md サンプル

すべてのプロジェクトに共通して効かせたい「行動原則」を定義した、グローバル `CLAUDE.md` のサンプルです。
`~/.claude/CLAUDE.md` に置くと、どのリポジトリで Claude Code を起動してもセッション開始時に読み込まれます。

## 何が入っているか

[`CLAUDE.md`](CLAUDE.md) に、プロジェクト非依存で効く行動原則をまとめています。

- **Core Coding Principles** — Think Before Coding / Simplicity First / Surgical Changes / Goal-Driven Execution
- **Verification & Safety Rules** — 読んでいないコードを推測しない / 検証できないときは理由と手動手順を出す / 勝手な破壊的・Git 操作をしない
- **Collaboration & Scope Rules** — 依存を勝手に追加しない / 機密をコミット・出力しない / 既存編集を優先し不要な新規作成をしない

冒頭に「グローバルに書くもの／書かないもの」の運用ガイダンス（プロジェクト固有設定は各 `CLAUDE.md` へ・
高シグナルを保つため 80〜120 行目安・`/memory` で棚卸し）を記載しています。

## インストール方法

グローバルスコープ（全プロジェクト共通）として配置します。

```bash
# 既存のグローバル CLAUDE.md がある場合は上書きされます。先にバックアップ推奨
cp GlobalClaudeMD-sample/CLAUDE.md ~/.claude/CLAUDE.md
```

すでに `~/.claude/CLAUDE.md` を使っている場合は、丸ごと上書きせず、必要な原則だけを追記してください。

## カスタマイズの指針

- **プロジェクト固有のことは書かない。** ビルド/テスト/リント コマンド・ディレクトリ構成・技術スタックは、
  各プロジェクトの `CLAUDE.md`（リポジトリルート）に書きます。グローバルは「どこでも効く安定ルール」に絞ります。
- **肥大化させない。** 高シグナルを保つため本文は 80〜120 行程度を目安にし、`/memory` で定期的に棚卸しします。
- フォーマッタ/リンタが機械的に保証するスタイル規則は書きません（重複になるため）。

## 出典・ライセンス

詳細な権利関係は [`CLAUDE.md`](CLAUDE.md) 末尾の「出典・ライセンス」表に記載しています。

- Core Coding Principles: [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills)（MIT License）に由来。
- Verification & Safety Rules: [Qiita 記事（4q_sano 氏）](https://qiita.com/4q_sano/items/f313eed59628273b8026)を参照・要約。
- 運用ガイダンス: [Claude Code 公式 memory ドキュメント](https://code.claude.com/docs/en/memory)・
  [CLAUDE.md Best Practices 2026](https://dev.to/nishilbhave/claudemd-best-practices-the-complete-2026-guide-435j)を参考。
