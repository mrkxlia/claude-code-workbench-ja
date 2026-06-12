# claude-code-workbench-ja — Claude Code リソース・テンプレート集

Claude Code をより快適に使うためのスクリプト、テンプレート、ベストプラクティスをまとめたリポジトリです。

## 導入方法（クイックスタート）

### 方法1: プラグインで導入する（software-factory のみ・最も簡単）

Claude Code でそのまま実行します（clone 不要）:

```
/plugin marketplace add mrkxlia/claude-code-workbench-ja
/plugin install software-factory@workbench-ja
```

新しいセッションで `/software-factory:factory-setup` を実行すると、対象リポジトリに
工場一式（エージェント7種・CLAUDE.md・フック）が導入されます。
詳しくは [software-factory/README.md](software-factory/) を参照してください。

### 方法2: git clone してコピーする（全セクション共通）

clone を1回して、使いたいセクションだけコピーします:

```bash
git clone --depth 1 https://github.com/mrkxlia/claude-code-workbench-ja /tmp/workbench
```

```bash
# software-factory — factory-setup をパーソナルスキル化（以後どのリポジトリでも /factory-setup が使える）
mkdir -p ~/.claude/skills && cp -r /tmp/workbench/software-factory/.claude/skills/factory-setup ~/.claude/skills/

# task-factory — task-factory-setup をパーソナルスキル化
mkdir -p ~/.claude/skills && cp -r /tmp/workbench/task-factory/.claude/skills/task-factory-setup ~/.claude/skills/

# implementation-skills — notes / spec-extract をプロジェクト（または ~/.claude/skills/）へ
mkdir -p .claude/skills && cp -r /tmp/workbench/implementation-skills/.claude/skills/* .claude/skills/

# data-science — CLAUDE.md とスキル一式をプロジェクトへ
cp /tmp/workbench/data-science/CLAUDE.md ./CLAUDE.md && cp -r /tmp/workbench/data-science/.claude ./.claude

# GlobalClaudeMD-sample — グローバル CLAUDE.md として配置
cp /tmp/workbench/GlobalClaudeMD-sample/CLAUDE.md ~/.claude/CLAUDE.md
```

各セクションのカスタマイズ方法は、それぞれの README を参照してください。

## 収録セクション

### [`WindowsSplitTerminalSample/`](WindowsSplitTerminalSample/)
Windows Terminal でのマルチインスタンス起動スクリプト。
横3列×縦2行（6ペイン）をワンコマンドで開くスクリプトと、ペイン操作のキーバインド一覧を収録しています。

### [`skills-guide/`](skills-guide/)
おすすめSkillsガイド（2026年6月動作確認済み）。
72個紹介された記事から「今すぐ使えるもの」に絞り込み、優先度別・業務タイプ別に整理しています。

### [`data-science/`](data-science/)
データサイエンスプロジェクト用 CLAUDE.md テンプレート + Skills。
Polars・uv・Jupyter を前提にした CLAUDE.md と、分析業務向け10種のスキルファイルをそのままコピーして使えます。

### [`implementation-skills/`](implementation-skills/)
実装の文脈を残す・取り戻すスキル2種。
実装しながら判断・逸脱・ハマりどころを implementation-notes.md に記録する **notes** と、既存コードから確度ラベル付きの仕様書を逆引き生成する **spec-extract** を収録しています。このディレクトリは単体利用向けの原本で、software-factory には工場連携版が統合済みです。

### [`GlobalClaudeMD-sample/`](GlobalClaudeMD-sample/)
グローバルスコープ用 CLAUDE.md サンプル（`~/.claude/CLAUDE.md`）。
Think Before Coding・Simplicity First・Surgical Changes など、すべてのプロジェクトに共通する行動原則を定義したファイルです。

### [`software-factory/`](software-factory/)
7つの専門エージェントで機能開発を流れ作業化する「ソフトウェア工場」テンプレート。
調査 → ストーリー → 技術ブリーフ → バックエンド → フロントエンド → 受け入れテスト → 最終検証を feature-factory スキルが連鎖実行し、3つの人間承認チェックポイントで停止します。**プラグイン2コマンドで導入可能**（上の「導入方法」参照）。対象リポジトリを解析して工場一式を自動導入する **factory-setup** スキル、運用実績から定義を改善する **factory-improve** スキル（自己改善ループ）を含むスキル6種（implementation-skills 由来の notes / spec-extract 工場連携版を含む）・エージェント定義7種・機密コミットブロックフック・CLAUDE.md サンプルを収録しています。ビルダーが実装中の判断を `docs/factory/<slug>/implementation-notes.md` に記録し、レガシーコードには `/spec-extract` で仕様を固めてから導入できます。

### [`task-factory/`](task-factory/)
software-factory の工場パターンをコード以外の成果物（drawio 図・ドキュメント・レポートなど）向けに汎用化した「タスク工場」テンプレート。
調査 → 成果物要件 → 作業ブリーフ → 成果物作成 → レビューを task-factory スキルが連鎖実行し、3つの人間承認チェックポイントで停止します。ビルダーは drawio などユーザー導入スキルを呼び出せます。出力先・成果物の種類・利用可能スキルを検出して自動導入する **task-factory-setup** スキル、エージェント定義5種・出力ディレクトリ外への書き込みを確認するフック・CLAUDE.md サンプルを収録しています。

## ライセンス・出典

このリポジトリは [MIT License](LICENSE) で公開しています。

一部のセクションは外部の成果物を参考にしており、それぞれ以下のとおり権利関係を明記しています。

| セクション | 参考元 | ライセンス・扱い |
|-----------|--------|----------------|
| [`GlobalClaudeMD-sample/`](GlobalClaudeMD-sample/) | [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) | MIT License — 由来部分の帰属と MIT 全文をファイル内に記載 |
| [`GlobalClaudeMD-sample/`](GlobalClaudeMD-sample/) | [Qiita 記事（4q_sano 氏）](https://qiita.com/4q_sano/items/f313eed59628273b8026) | 著作権は 4q_sano 氏に帰属 — 著作権法第32条に基づく引用・要約 |
| [`data-science/`](data-science/) | [Zenn 記事](https://zenn.dev/green_tea/articles/d310e5cf809190)・[atsushi-green/ds-ai-coding-skills](https://github.com/atsushi-green/ds-ai-coding-skills) | 記事のコンセプトに基づく独自実装（コピーではない）— 帰属を README に記載 |
| [`skills-guide/`](skills-guide/) | [anthropics/skills](https://github.com/anthropics/skills)・[obra/superpowers](https://github.com/obra/superpowers)・[mattpocock/skills](https://github.com/mattpocock/skills) | リンクと独自解説のみ収録。各スキル本体は各リポジトリのライセンス（anthropics/skills は Apache 2.0 + 一部 source-available）に従う |
| [`software-factory/`](software-factory/) | [How to Build a Software Factory with Claude Code（@sairahul1 氏）](https://x.com/sairahul1/status/2058832033628241931) | 記事のコンセプトに基づく独自実装（コピーではない）— 帰属を README に記載 |
| [`task-factory/`](task-factory/) | [How to Build a Software Factory with Claude Code（@sairahul1 氏）](https://x.com/sairahul1/status/2058832033628241931) | 記事のコンセプトをコード以外の成果物向けに汎用化した独自実装（コピーではない）— 帰属を README に記載 |
