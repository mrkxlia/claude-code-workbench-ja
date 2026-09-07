# 2026-09-06 — compact-plus の採用可否レビュー（プラグインは不採用・公式事実4件だけ取り込み）

## 対象と想定用途

- **対象**: [u-ichi/compact-plus](https://github.com/u-ichi/compact-plus)（MIT・v1.3.2）—
  Claude Code / Codex の `/compact`（コンテキスト圧縮）を挟んでも作業状態を失わないようにするプラグイン
- **想定用途（仮置き）**: 「Claude Code を長時間1セッションで使う開発者が、`/compact` を通過するときに
  失われる作業状態（計画・制約・参照ファイル・使用中スキル）を、フック経由で保存・再注入して維持する」。
  ユーザーが用途を書いていないため最も自然な用途を仮置きした

この領域は本リポジトリが [2026-09-03 の決定記録](2026-09-03-long-run-constraints-and-spec-load.md)（決定1）で
構造解を出し、`plugins/model-setup/hooks/reinject-brief.{sh,ps1}` ＋ `long-run` 中核ルール5 として
実装済みである。したがって本件の判断は「新規プラグインを作るか」ではなく
**「既存実装に対する差分があるか」**になる（[2026-09-06 の記事レビュー](2026-09-06-self-correct-article-adoption.md)と同じ型）。

`/adoption-review` の手順（Step 0 → Step 7）で評価した。証拠収集は一次情報・運用情報・外部評価の
3スコープに分けて並列委譲した。結論が否定寄りに落ちたため `adoption-challenger` は起動していない
（Step 6 の分岐）。

## 結論: 試す価値はあるが常用は微妙 / 採用判断: 情報収集に留める

実装とドキュメントは誠実で、公式フックの範囲内に収まった設計になっている。しかし想定用途の中核に
当たる不具合が未解決のまま放置され、保守が止まっており、圧縮のたびに既定で追加の LLM 呼び出しが走る。
**自分が金・時間・保守責任を負う立場なら、この状態のツールに作業状態を預けない。**

## 結論の根拠になった確認できた事実（2026-09-06 取得）

否定側の根拠は、すべて**確認できた事実**である（「確認できなかった」を減点に使っていない。
`adoption-review` 中核ルール11）。

| # | 事実 | 出典 |
|---|---|---|
| 1 | **想定用途の中核が壊れたまま** — `/compact-plus` で手動保存した state が、セッション最初の `/compact` で自動生成サマリに上書きされる。報告者は 291 行の state が 80 行になったと記載。2026-08-01 起票、約5週間コメント0・ラベルなし・open | [Issue #16](https://github.com/u-ichi/compact-plus/issues/16) |
| 2 | **保守が止まっている** — 最終コミットは 2026-07-27。以後 2026-09-06 まで main へのコミット 0 件 | [commits/main](https://github.com/u-ichi/compact-plus/commits/main) |
| 3 | **テスト付き PR が放置** — 「Claude Code の transcript で squash が発火しない（0 lines squashed, 316,244 bytes in and out）」の修正が 2026-07-28 からレビューなしで open。#14 も同日から open | [PR #15](https://github.com/u-ichi/compact-plus/pull/15) |
| 4 | **実質バス係数1** — main の 22 コミット中 u-ichi が 17 件。人間の外部コミット作者は2名（各1件）と dependabot | [commits/main](https://github.com/u-ichi/compact-plus/commits/main) |
| 5 | **圧縮のたびに LLM 課金が乗る** — 既定 primary backend が `claude -p --model claude-sonnet-5 --effort medium`。two-pass が既定 ON、`MAX_OUTPUT_TOKENS=4096`、transcript のスライスと前回 state 全文を入力に送る | [precompact-state-summary.sh](https://github.com/u-ichi/compact-plus/blob/main/hooks/precompact-state-summary.sh) |
| 6 | **圧縮時に最大3分待ちうる** — backend timeout 80 秒 × primary/fallback 直列、`hooks.json` の PreCompact timeout は 180 秒 | [hooks.json](https://github.com/u-ichi/compact-plus/blob/main/hooks/hooks.json) |
| 7 | **データの送信先が SECURITY.md に無い** — transcript のスライス・前回 state 全文・`/compact` の custom_instructions を外部プロセスへ渡す。既定 fallback は `codex exec`（ChatGPT Pro 前提）。環境変数を空にすれば無効化できる | [SECURITY.md](https://github.com/u-ichi/compact-plus/blob/main/SECURITY.md) / [README.md](https://github.com/u-ichi/compact-plus/blob/main/README.md) |
| 8 | **プラグイン単体では警告が発火しない** — Claude 側の warn 閾値の producer は作者の dotfiles にある `home/hooks/claude/statusline.sh`。README・docs とも "base repository setting" とのみ記載 | [docs/architecture.md](https://github.com/u-ichi/compact-plus/blob/main/docs/architecture.md) |

一方、**肯定側で確認できた事実**も同じ強さで記録する。

| 事実 | 出典 |
|---|---|
| 公式フックの範囲を出ていない — Non-Goals 4項目（圧縮アルゴリズムは変えない／`/compact` を自動実行しない／terminal 入力を注入しない／statusline 閾値フックは所有しない）を明示 | [docs/architecture.md](https://github.com/u-ichi/compact-plus/blob/main/docs/architecture.md) |
| 全フックが fail-open（`jq` 不在・transcript 欠損・backend 失敗でも exit 0）。テストが「部分 state を残さない」ことまで検証している | [tests/test-runtime.sh](https://github.com/u-ichi/compact-plus/blob/main/tests/test-runtime.sh) |
| テスト関数19個・アサーション71箇所。CI は JSON検証・`bash -n`・テスト実行・symlink 禁止・6箇所の version 一致・見出し宣言の5ステップ | [.github/workflows/test.yml](https://github.com/u-ichi/compact-plus/blob/main/.github/workflows/test.yml) |
| 生成 prompt が「検証できない項目は `Not verified` と書く」を規定している | [prompts/state-summary.md](https://github.com/u-ichi/compact-plus/blob/main/prompts/state-summary.md) |

**なぜ良く見えるのかの代替仮説**: README と `docs/architecture.md` の質が高く、実際の保守状態より
良い印象を作る。唯一見つかった第三者記事も、根拠として README を挙げている
（[dev.to / kenimo49](https://dev.to/kenimo49/the-compaction-plugin-i-was-releasing-warned-me-mid-release-2f25)）。
**「ドキュメントの良さ」を「動作の確からしさ」と読み替えていないか**が争点だった。

## 既存実装との対比（代替のすり替えをしない）

`reinject-brief` ＋ `long-run` 中核ルール5 は compact-plus と**重なるが同一ではない**。
比較対象をすり替えないため、満たさない範囲も書く。

| | reinject-brief（本リポジトリ） | compact-plus |
|---|---|---|
| 戻すもの | 人間が承認したブリーフ（完了条件・スコープ・制約）の全文 | transcript から LLM が生成した10セクションの state |
| セッション中に生まれた決定・失敗履歴・編集中ファイル | **戻さない** | 戻す |
| LLM 呼び出し | なし | 圧縮ごとに1〜2回 |
| 依存 | bash または PowerShell のみ | `jq` 必須・全フックが bash・別モデル CLI |
| 発火条件 | `/long-run` を起動したときだけ武装（frontmatter 宣言） | プラグイン導入で常時 |
| 内容の正しさ | 人間が承認した文面がそのまま戻る | 生成物なので保証はない（`Not verified` 規約で緩和） |

**compact-plus のほうが広い範囲を戻す**のは事実である。それでも採らないのは、その広さが
上の事実1〜8（中核機能の不具合・保守停止・圧縮ごとの課金）と釣り合わないため。

## 取り込んだ差分（公式ドキュメントで確認した4件）

compact-plus 自体からコードや設計を取り込んだものは無い。取り込んだのは、**レビューの過程で
代替手段（本体機能）を検証した際に確認できた公式仕様**であり、本リポジトリの既存記述がこれを
反映していなかった。出典は
[What survives compaction](https://code.claude.com/docs/en/context-window#what-survives-compaction)
と [Manage costs effectively](https://code.claude.com/docs/en/costs#manage-context-proactively)（ともに 2026-09-06 取得）。

| # | 確認した事実 | 反映先 |
|---|---|---|
| 1 | Plan モードで書いた計画ファイルは圧縮後に disk から**再注入される** | `long-run` 中核ルール5・model-setup README |
| 2 | 起動済みスキル本体は再注入されるが**1スキル 5,000 トークン・合計 25,000 トークン上限**、超過は古い順に脱落。切り詰めはファイル先頭を残す | `long-run` 中核ルール5・`docs/skill-authoring.md` |
| 3 | `/autocompact <トークン数>` で**自動圧縮の発火点を前倒しできる** | `long-run` 中核ルール5・model-setup README |
| 4 | CLAUDE.md に `# Compact instructions` 節を置くと**圧縮の焦点を指定できる** | `long-run` 中核ルール5・model-setup README |

事実3は、compact-plus の warn 閾値機能に相当することを**本体が既に持っている**という意味で、
教訓1（作る前に本体・公式プラグイン・著名 OSS を確認する）の直接の適用例にあたる。

事実2は `docs/skill-authoring.md` の執筆規約に落とした — 長時間セッションでは
**スキル本体が先頭 5,000 トークンまでしか戻らない**ため、重要な指示・停止条件は SKILL.md の
先頭寄りに置く必要がある。これは本リポジトリの全スキルに効く。

**書かなかったこと**: `# Compact instructions` が**自動圧縮にも効くか**は公式ドキュメントに明記が無い。
推測で「自動圧縮にも効く」とは書かず、ドキュメントの記述どおり「圧縮の焦点を指定できる」に留めた
（中核ルール6）。

## 取り込まなかったもの（と理由）

| compact-plus の要素 | 理由 |
|---|---|
| PreCompact での transcript バックアップ（20世代） | 本体の `/rewind` と `~/.claude/projects/**/*.jsonl` が既にある。教訓1（本体でできることを再実装しない） |
| LLM に state を生成させる仕組み | 圧縮ごとの課金と最大180秒の待ちを、モデル運用テンプレートに持ち込まない。`reinject-brief` の「LLM 呼び出しなし・依存なし」を壊す |
| `Not verified` を書かせる規約 | `adoption-review` 中核ルール6 と `long-run` 中核ルール3（証拠を指させない項目は「未検証」と明記）に上位互換が実装済み |
| 閾値超過時の `/compact` 提案・3行 recitation | 提案の producer が作者の dotfiles にあり、プラグイン単体で完結しない（事実8）。本体の `/autocompact` を案内するほうが確実 |
| Codex 側のレイヤ | 本リポジトリの codex-bridge は Codex を**レビュー・実装の委譲先**として使っており、圧縮の対象ではない |

## 外部評価（Step 1・外部評価スコープ）

| 調べたもの | 分かったこと |
|---|---|
| Hacker News・Reddit | compact-plus への言及 **0件**（Algolia 全文検索、`site:reddit.com` 検索とも） |
| Zenn・Qiita・note・はてなブログ | 言及 **0件** |
| [dev.to / kenimo49](https://dev.to/kenimo49/the-compaction-plugin-i-was-releasing-warned-me-mid-release-2f25) と [compact-ops](https://github.com/kenimo49/compact-ops) | 唯一の第三者言及（同一人物なので出所1件）。派生実装を作った理由として3点の不一致を挙げる — 警告が作者の dotfiles に依存する／state を `$TMPDIR` に置くため再起動をまたがない／復旧範囲が `--resume` をまたがない。使用期間・規模の記載は無い |
| [magic-compact](https://github.com/aerovato/magic-compact) | 同じ問題領域の別 OSS（147 stars）。今回は評価対象外 |
| 実運用報告（期間・規模を明記したもの） | **0件**。撤退報告も0件 |

## 確認できなかったこと

- **作者の X 記事**（`https://x.com/u1/article/2073289543948923153`）— HTTP 402（ログイン/課金壁）で本文未取得
- **第三者の実運用報告** — 0件
- **Claude 側 `COMPACT_WARN_THRESHOLD` の既定値** — producer とされる `home/hooks/claude/statusline.sh` がリポジトリに含まれない
- **Codex のバージョン要件（数値）** — README は「plugin compaction hooks を持つ版」とのみ記載
- **closed Issue #2 / #5 / #6 のクローズ理由** — 本文から特定できず（#6・#2 は同日に対応コミットあり）
- **Contributors ページの正式な集計** — 非同期描画と API の403で取得できず、commits ページの作者内訳で代替した

**上記はいずれも減点の根拠にしていない。** 情報が無いことは対象の欠陥ではなく調査の限界であり、
良い材料にも悪い材料にもしない（中核ルール11）。結論は事実1〜8だけで組んでいる。

## 積み残し（今回は実装しない）

- `long-run` 中核ルール5 は依然として「ブリーフファイルを人間が更新する」運用に依存している。
  compact-plus が解こうとした「セッション中に自然発生した決定・失敗履歴を自動で拾う」部分は、
  本リポジトリでは**本体の auto memory に委ねたまま**である（`long-run`「連携」節の方針）。
  これを構造で埋めるなら別途の判断になる
- `docs/evals/long-run.md` に、圧縮をまたいだときの挙動を測るシナリオは無い。追加するなら
  `/autocompact` で圧縮を意図的に起こす手順が要る
