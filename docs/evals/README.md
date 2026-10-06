# evals — 主要スキルの「期待挙動」シナリオ

7スキルについて、**「この入力に対して上位モデルはこう振る舞う」**を評価シナリオとして固定したもの。
Sonnet 5 と Opus 5 のパリティを実測するための物差し。

## 形式について

**人が読む正は `docs/evals/<skill>.md`**（入力／期待する行動〔する・しない〕／判定基準）。
以前はここから `gen-evals.py` が `evals.json`（skill-creator 形式）を生成していたが、読み込む仕組みが
どこにも無かったため 2026-10-06 に削除した（[整理の記録](../decisions/2026-10-06-repo-cleanup.md)）。

> **以前ここには「`claude plugin eval` が early access なので Markdown を使う」と書いてあった。**
> 2026-09-07 に確認したところ、`claude plugin eval` は公式ドキュメント（plugins-reference・
> cli-reference）に存在しない。実在するのは公式マーケットプレイスの `skill-creator` プラグインで、
> `evals/evals.json` にテストケース、`grading.json` に採点結果、`benchmark.json` に pass rate を
> 出す。前提が誤っていたので記述を差し替えた。
>
> **訂正（2026-10-03）。** 上の「`claude plugin eval` は存在しない」も誤りだった。Claude Code 2.1.288 には
> `claude plugin eval` があり、`prompt.md` と `graders/*.md` のケースを1プラグインに対して実行できる
> （出典: [Plugin evals](https://code.claude.com/docs/en/plugin-evals)、2026-10-03 取得。2026-09-13 の
> [重複チェック](../decisions/2026-09-13-skill-duplication-check.md)でも実在を確認済み）。
> 本ディレクトリでは、発火の有無を測るケースだけを [`triggers.md`](triggers.md) に置き、
> `gen-trigger-cases.py` で `claude plugin eval` の形式へ生成している。上のシナリオ（応答の中身の採点）は
> 従来どおり手動で行う。

## 走らせ方（手動）

1. 対象プロファイルのモデルでセッションを開く（`/model` で Sonnet 5 または Opus 5 を選ぶ）
2. シナリオの「入力」をそのまま貼る。**前置きを足さない**（足すと何を測っているか分からなくなる）
3. 最初の応答だけを見て「判定基準」の各項目を ○/× で採点する。往復を続けない
4. 結果を下の表に追記する

**1シナリオ = 1セッション**。同じセッションで複数シナリオを流すと、前のやりとりが次の挙動を
汚染する（特に「反射的に呼ばない」系の判定が無効になる）。

### baseline と比べる（公式 skill-creator のやり方）

スキルが効いているかは、**スキル有りの実行だけを見ても分からない**。公式 skill-creator は
**with-skill 実行と baseline（スキル無し）実行を同時に起動して比較**する。ここでも同じにする:

1. 同じ入力を2セッションに投げる — 片方はスキルを有効化、片方は無効化（`/plugin` で当該
   プラグインを disable するか、スキルを導入していない環境を使う）
2. 両方を同じ判定基準で採点する
3. **差が出なかった項目は、そのスキルが担っていない**。スキル本文からその指示を削るか、
   基準のほうを見直す

差が出ない項目を放置すると、効いていない指示がトークンを食い続ける。

### トリガー精度は別に測る（20クエリ）

「発動すべきときに発動するか」は上のシナリオでは測れない。公式 skill-creator は
**発火すべきクエリと発火すべきでないクエリを混ぜた20件のセット**で description を評価する。
各スキルの `docs/evals/<skill>.md` には代表的な入力しか置いていないので、トリガーを調整する
ときは次を用意する:

- **should（10件）** — そのスキルが出るべき言い回し。`description` のトリガー句をそのまま
  使わず、**ユーザーが実際に言いそうな言い換え**にする
- **should NOT（10件）** — 隣接スキルが出るべきもの、本体機能で足りるもの、無関係なもの

同じプラグイン内の衝突組は [`triggers.md`](triggers.md) にケース化してあり、次のように走らせる
（リポジトリのプラグインに `evals/` を置かないため、一時ディレクトリへコピーして実行する）:

```bash
T=$(mktemp -d); cp -r plugins/model-setup "$T/"
python3 docs/evals/gen-trigger-cases.py model-setup "$T/model-setup/evals"
claude plugin eval "$T/model-setup" --trust-plugin --ablation none --runs 1 --no-publish \
  --max-cost-usd 5 --model claude-sonnet-5-5 -j 4 --threshold 0
```

隣接スキルとトリガー句が衝突していると、ここで両方が出る。衝突したら
[`../skill-authoring.md`](../skill-authoring.md) の「発動の調整」に従い、否定トリガーを足す。

## シナリオ一覧

| ファイル | 対象スキル | 主に測るもの |
|---|---|---|
| [`verify-fresh.md`](verify-fresh.md) | `verify-fresh` | 反証フレーミング・網羅指示・**Opus 5 で反射的に呼ばない** |
| [`review-panel.md`](review-panel.md) | `review-panel` | ブラインド並列・単独レビューへの切り分け・deep の裁定 |
| [`adoption-review.md`](adoption-review.md) | `adoption-review` | 一次情報の収集・自分の成果物のレビューを横取りしない・推測で埋めない・検証ゲートの分岐・スコアの根拠 |
| [`self-correct.md`](self-correct.md) | `self-correct` | Ground Truth の無い基準で回さない・Judge に修正させない・停止条件で止まる |
| [`feature-pipeline.md`](feature-pipeline.md) | `feature-pipeline` | 自分で実装しない・チェックポイントで止まる・差し戻し上限 |
| [`feedback-rule.md`](feedback-rule.md) | `feedback-rule` | count を自動で上げない・いきなり禁止にしない・既存を探す |
| [`deep-understand.md`](deep-understand.md) | `deep-understand` | 講義から始めない・クイズで実証する・曖昧な回答で通さない |

公式チェックリストの目安は**1スキルにつき最低3件**。

## 結果記録

採点は「判定基準の項目のうち何個を満たしたか」。**未実施は空欄のままにする**（推測で埋めない）。

| 日付 | シナリオ | モデル | effort | スキル有り | baseline | 備考 |
|---|---|---|---|---|---|---|
| | | | | | | |

## 追補ルール6 との関係

`CLAUDE.private.md` の追補ルール6 は「Opus 計画・Sonnet 実行」を既定にし、`MODEL-GUIDE.md` §2 は
**Opus 5 では検証指示を足さない**（自己検証が既定動作なので過剰検証になる）と定めている。
この分岐が実際に効いているかを測るのが [`verify-fresh.md`](verify-fresh.md) の S-3 / S-4。
ここが両モデルで同じ挙動になるなら、分岐は文面上のもので実効が無いということになる。
