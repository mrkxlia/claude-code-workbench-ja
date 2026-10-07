# evals — 主要スキルの「期待挙動」シナリオ

5スキルについて、**「この入力に対してこう振る舞う」**を評価シナリオとして固定したもの。
走らせるのは本体の `claude plugin eval`（出典: [Plugin evals](https://code.claude.com/docs/en/plugin-evals)、
2026-10-06 取得）。スキル有りとスキル無し（baseline）を同時に走らせて差（Δ）を出し、各ケースを3回ずつ採点する。

## 形式

**人が読む正は Markdown**。生成物は手で編集しない。

| 正本 | 中身 | 生成されるケース |
|---|---|---|
| `<skill>.md` | シナリオ（入力／期待する行動〔する・しない〕／判定基準） | 1節 = 1ケース。入力がプロンプト、判定基準が `llm` グレーダーのルーブリックになる |
| [`triggers.md`](triggers.md) | 同一プラグイン内の衝突組の発火ケース（should / not） | 1行 = 1ケース。`tool_used: Skill` グレーダーで、どのスキルを呼んだかだけを見る |

`gen-eval-cases.py` が両方をまとめて `claude plugin eval` の形式（`prompt.md` と `graders/*.md`）へ生成する。
**前提の状態が要るシナリオ**（「〜の状態を観察する」「2セッションに分けて実施する」）は単独のプロンプトでは
再現できないので生成しない。生成しなかった節はスクリプトが名前を出力する — それらは手で流して採点する。

## 走らせ方

リポジトリのプラグインに `evals/` を置かないため、一時ディレクトリへコピーして実行する:

```bash
P=model-setup                       # 対象プラグイン
T=$(mktemp -d); cp -r plugins/$P "$T/"
python3 docs/evals/gen-eval-cases.py $P "$T/$P/evals"
claude plugin eval "$T/$P" --trust-plugin --no-publish --max-cost-usd 5 \
  --model claude-sonnet-5-5 --judge-model sonnet -j 4 --threshold 0.8
```

- 発火だけを安く測るなら `--tag trigger --ablation none --runs 1`、シナリオだけなら `--tag scenario`
- adoption-review のシナリオは Web と workflow を使うので `--allow-tools WebFetch` を足す（WebFetch は既定で許可されない）。`/deep-research` が走るぶん費用も大きいので、`--case 'adoption-review-s-8'` のように絞って流す
- **Opus と Sonnet の差を見る**ときは `--model` を変えて2回走らせ、`report.html` を並べる
- シナリオのプロンプトが存在しないファイル（例: `docs/pipeline/login/brief.md`）に触れるものは、空の作業ディレクトリでは
  「ファイルが無い」ことへの反応も採点に入る。気になる節は `case.yaml` の `context.scaffold_script` で用意する
- `Δ` が出なかった項目は、そのスキルが担っていない。スキル本文からその指示を削るか、基準のほうを見直す
  （差が出ない指示はトークンを食い続けるだけ）
- 発火ケースで隣のスキルとトリガー句が衝突していたら、[`../skill-authoring.md`](../skill-authoring.md) の
  「発動の調整」に従い否定トリガーを足す。`claude plugin eval` は1回に1プラグインしか載せないので、
  プラグインをまたぐ衝突はここでは測れない

## シナリオ一覧

| ファイル | 対象スキル | 主に測るもの |
|---|---|---|
| [`verify-fresh.md`](verify-fresh.md) | `verify-fresh` | 反証フレーミング・網羅指示・**Opus 5 で反射的に呼ばない** |
| [`review-panel.md`](review-panel.md) | `review-panel` | ブラインド並列・単独レビューへの切り分け・deep の裁定・反証テスト |
| [`adoption-review.md`](adoption-review.md) | `adoption-review` | 一次情報の収集・自分の成果物のレビューを横取りしない・推測で埋めない・検証ゲートの分岐・スコアの根拠 |
| [`feedback-rule.md`](feedback-rule.md) | `feedback-rule` | count を自動で上げない・いきなり禁止にしない・既存を探す |
| [`deep-understand.md`](deep-understand.md) | `deep-understand` | 講義から始めない・クイズで実証する・曖昧な回答で通さない |

シナリオを足すときは、判定基準を**番号つきの箇条書き**で書く（生成スクリプトがそれをルーブリックにする）。
公式チェックリストの目安は**1スキルにつき最低3件**。

## 結果記録

`report.html` の Suite score と Ablation Δ を書く。**未実施は空欄のままにする**（推測で埋めない）。

| 日付 | プラグイン | モデル | Suite score | Ablation Δ | 備考 |
|---|---|---|---|---|---|
| | | | | | |

## 追補ルール6 との関係

`CLAUDE.private.md` の追補ルール6 は「Opus 計画・Sonnet 実行」を既定にし、`MODEL-GUIDE.md` §2 は
**Opus 5 では検証指示を足さない**（自己検証が既定動作なので過剰検証になる）と定めている。
この分岐が実際に効いているかを測るのが [`verify-fresh.md`](verify-fresh.md) の S-3 / S-4。
ここが両モデルで同じ挙動になるなら、分岐は文面上のもので実効が無いということになる。
ただし追補は CLAUDE.md 側の資材でプラグインに含まれないので、`--model` を変えて走らせる前に、
`prompt.md` の `append_system_prompt` に追補の本文を入れるか、手元の CLAUDE.md に追記しておく。
