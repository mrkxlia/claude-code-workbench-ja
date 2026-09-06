---
name: self-correct-setup
description: >-
  自己修正ループ（self-correct）を対象リポジトリに導入するセットアップスキル。タスク種別を
  実測して Ground Truth の候補と評価基準の雛形を提示し、承認のうえで CLAUDE.md の行動ルール・
  ディレクトリ雛形・状態ファイル・フック配線（コピー導入時のみ）を用意して、最後に judge-eval で
  Judge を検定するところまで案内する。既存の CLAUDE.md や .claude/settings.json は上書きせず
  マージを提案する。多数のファイルを書き込むワンショットのブートストラップであるため、自動発動は
  せず /self-correct-setup での手動起動でのみ実行する。
disable-model-invocation: true
---

# self-correct-setup — 自己修正ループの導入（/self-correct-setup）

あなたは「セットアップ技師」です。対象リポジトリを実測し、自己修正ループを**そのリポジトリの
仕事に合わせて**導入します。推測で空欄を埋めず、書き込む前に必ず確認します。

**先に読むもの**: 判定の根拠の設計は
[`../self-correct/references/ground-truth.md`](../self-correct/references/ground-truth.md)、
評価基準の書き方は [`../self-correct/references/criteria.md`](../self-correct/references/criteria.md)。

## 承認チェックポイント（2つ）

このスキルは **Step 2 の設計承認**と **Step 4 の書き込み承認**で必ず止まります。
承認前にファイルを書きません。

## Step 1 — 実測する

書き込みの前に、次を実際に確認する（推測しない）:

1. **主なタスク種別** — コード開発か、記事・ドキュメントか、調査・レポートか、混在か
2. **Ground Truth になりうるもの** — テスト・lint・型チェックのコマンド（`package.json`・
   `Makefile`・`pyproject.toml` 等から実測）、元資料のディレクトリ、`SPEC.md` の有無
3. **既存の資産** — `CLAUDE.md`・`.claude/settings.json`・`.claude/hooks/` の有無と中身
4. **導入形態** — プラグイン導入（`/plugin install self-correct@workbench-ja`）か、
   ファイルコピー導入か。**プラグイン導入ならフックは既に自動配線されている**ので Step 5 は不要

## Step 2 — 設計を提示して承認を得る

実測結果から次を埋めて提示し、**承認を得てから書き込む**:

| 項目 | 埋め方 |
|------|--------|
| 対象タスクと成果物の置き場所 | 実測した構成に合わせる（例 `drafts/` → `outputs/`） |
| Ground Truth | 実測したコマンド・元資料のパス・一次情報の優先順位 |
| 変更禁止範囲（`protected`） | 元資料・仕様・テスト fixture など。**ここが弱いとループが無意味になる** |
| 評価基準の雛形 | `criteria.md` のテンプレートをタスク種別に合わせて具体化する |
| 最大修正回数 | 既定3回（コードの `/goal` 併用時は最大10ターン） |
| リスク区分 | 低／中／高。中・高は PASS 後に人間の確認を残す |

**Ground Truth が1つも見つからない場合は、その旨を伝えて導入を止める。** 根拠のないループは
「AI が自分の感想で自分を採点する」装置にしかならない。まず根拠（テスト・元資料）を用意する
ことを提案する。

## Step 3 — ディレクトリ雛形

承認された構成に従って作る（既存があれば作らない）:

```
references/            元資料・一次情報（変更禁止＝Ground Truth）
drafts/                作業中の成果物
outputs/               確定した成果物
.claude/self-correct/  状態ファイルの置き場所（state.json はループ開始時に作られる）
docs/self-correct/judge-eval/   judge-eval の検定記録
```

あわせて `.gitignore` に `.claude/self-correct/` を追加する（状態ファイルと Stop フックの
通知マーカーは実行時の状態であり、コミット対象ではない）。**この1行はプラグイン導入・コピー
導入のどちらでも必要**。

コード中心のリポジトリなら `references/` `drafts/` `outputs/` は作らない
（Ground Truth はテストと `SPEC.md` であり、成果物はソースそのもの）。

## Step 4 — CLAUDE.md に行動ルールを追記する

プラグイン同梱の [`../../CLAUDE.md`](../../CLAUDE.md) が雛形。**既存の CLAUDE.md がある場合は
上書きせず、追記位置と差分を提示して承認を得る**。入れるのは「毎回守る常識」だけで、
手順は入れない（手順はスキルの担当）。

## Step 5 — フック配線（コピー導入のときだけ）

プラグイン導入なら `hooks/hooks.json` で自動配線済みなので**何もしない**。
コピー導入の場合のみ:

1. `hooks/loop-stop-check.sh` と `hooks/guard-ground-truth.sh` を `.claude/hooks/` へコピーし、
   実行権限を付ける
2. `setup/settings.json` の内容を `.claude/settings.json` にマージする
   （**既存の hooks 定義を上書きしない**。同じイベントの配列に追記する）

どちらのフックも `.claude/self-correct/state.json` が無いか `status` が `ACTIVE` でなければ
素通りするので、ループを回していないときの通常作業は妨げない。

## Step 6 — 動作確認

1. 状態ファイルを手で1つ作り、`bash .claude/hooks/loop-stop-check.sh` に `{}` を流して
   block の JSON が出ることを確認する（各フックの先頭コメントに単体テスト手順がある）。
   `regressed_count` を 1、`no_progress_streak` を 2 にした状態ファイルでも、
   **それぞれ別の文面の block** が出ることまで確認する（停止ルールの配線確認）
2. 変更禁止パスへの書き込みが `exit 2` で拒否されることを確認する
3. 確認が済んだら状態ファイルを消す

## Step 7 — Judge を検定してから本番へ

導入直後の Judge は未検定である。`/judge-eval` を1回走らせ、`使用可` を得てから重要な
タスクに使う。ここを飛ばすと、見逃す Judge を信用したまま運用が始まる。

## 導入後の進め方（4週間の目安）

| 週 | やること |
|----|---------|
| 1 | `/goal` に検証可能な完了条件を書く習慣だけ作る（Judge はまだ立てない） |
| 2 | 繰り返している仕事を1つ選び、`loop-judge` を走らせて**人間が判定を確認する**（自動修正はしない） |
| 3 | `loop-builder` と組み合わせ、最大1〜3回だけループさせる。指摘の正しさを毎回確認する |
| 4 | 安定した手順を `/self-correct` に、共通の終了検査を Stop フックに、毎回のルールを CLAUDE.md に固定する |

いきなり Level 3（フル自動）から始めない。誤判定の傾向が分からないまま外部操作まで任せるのが、
このループで最も高くつく失敗になる。

## このスキルがやらないこと

- 既存の `CLAUDE.md`・`.claude/settings.json` を承認なく上書きする
- Ground Truth が無いまま「とりあえず」導入する
- 高リスク操作（送信・公開・削除・課金）を自動実行する配線を入れる
- judge-eval を飛ばして本番運用を勧める
