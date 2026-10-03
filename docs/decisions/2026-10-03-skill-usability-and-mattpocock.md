# 2026-10-03 — mattpocock/skills の精読と「スキルを使いこなせない」問題の整理

## 経緯

同日の[積読インデックス16件の採用可否レビュー](2026-10-03-tsundoku-claude-code-16-items-adoption.md)に、
ユーザーから3点の指摘を受けた。

- Grilling は**本体（mattpocock/skills）の中身を確認してから**判断すべき。車輪の再発明は避けたい
- 進捗ダッシュボードは取り入れたい
- 各スキルを上手く使えていない。症状は「何を呼べばいいか分からない／自動で発火しない／重複が多く中途半端／
  進み具合が見えない」の4つすべて

この記録は、前回の記録の **#1（Grilling 分岐）と #3（進捗ダッシュボード）の判断を覆す**。
前回の記録は追記のみの規約に従い書き換えず、覆す理由をここに書く。

## 新しく確認できた事実（2026-10-03 取得）

1. **`mattpocock-skills` は Claude Code 公式マーケットプレイスに登録済み**（v1.2.3・MIT・27スキル）。
   [`anthropics/claude-plugins-official` の marketplace.json](https://github.com/anthropics/claude-plugins-official)
   と上流の `.claude-plugin/plugin.json` で確認した。2026-09-13 の
   [重複チェック](2026-09-13-skill-duplication-check.md)では、中身は「確認できなかった」側にあった。今回27件の SKILL.md をすべて読んだ
2. 上流の `teach`・`to-questionnaire`・`handoff`・`ask-matt`・`grill-me` などは **`disable-model-invocation: true`**
   （ユーザーが打つスキル）である。公式仕様では、このスキルは Claude からは呼べない
   （[Skills](https://code.claude.com/docs/en/skills) のアクセス制御表で「Claude can invoke: No」）。
   したがって「clarify から上流スキルへ委譲する」設計は成り立たない
3. 上流の現行 `grilling` は「前提が揃った質問をラウンドごとにまとめて出す」方式で、事実確認はサブエージェントに投げる。
   本リポジトリの `clarify`（一問ずつ）とは方式が分かれた。両者はどちらも「grill」でモデルから発火しうるので、
   **両方を入れると発火を取り合う**
4. 上流の `/ask-matt` は、上流スキルだけを案内するルーターである
5. 公式仕様では、スキル一覧の description に**コンテキストの1%という予算**があり、超えると一部の description が落とされる。
   1スキルの description と when_to_use の合計は 1,536 字で切られる（[Skills](https://code.claude.com/docs/en/skills)）。
   本リポジトリの自動発火スキルは26件・合計 10,022 字ある。「自動で発火しない」の原因候補として、実測は別記録で扱う

## 前回の判断をどう変えたか

| 前回の記録 | 前回の判断 | 今回 | 理由 |
|---|---|---|---|
| #1 Grilling 分岐 | clarify に3分岐を追加。受け皿は既存 | **3分岐は維持**し、出典行と冒頭注記を直した | 委譲は事実2で成立しない。分岐の中身（推測で埋めず理由別に扱う）は有効。上流のコマンド名は skills-guide の1節にだけ置いた |
| #3 進捗ダッシュボード | 情報収集に留める（ルール2と矛盾） | **採用。形を変える** | ユーザーの判断。原典の「判断待ちを既定で進める」は採らず、表示だけにする。LLM を使わない決定的スクリプトで、statusline と HTML を作る。実装は別ブランチ `claude/skill-usability` |

## 今回入れた変更（このブランチ）

- `plugins/pipeline/skills/clarify/SKILL.md`
  - 冒頭注記に事実3を1行足し、「両方を入れるならどちらか一方」と書いた
  - 3分岐の出典行を事実2に合わせて直した
  - pipeline の version は、このブランチですでに 2.5.1 に上げているため据え置く
- `docs/skills-guide/README.md` に「mattpocock-skills と本リポジトリの関係」節を新設した
  - 状況ごとに本リポジトリと上流のどちらを使うかを示す表を置いた
  - clarify↔grill 系、build-with-tests↔tdd は「どちらか一方」とした
  - 本リポジトリに無いもの（to-questionnaire・prototype・diagnosing-bugs・domain-modeling・wayfinder）は上流を使う
  - 上流のコマンド名はこの節に集約した（[2026-09-19](2026-09-19-retire-codex-bridge-and-cli-bridge.md) F5・教訓9）
- `README.md` の早見表の前に2行足した。内容は、本体の `/skills` で一覧できること、自然文で「どのスキル？」と聞くこと、
  入れるプラグインを絞ること。症状「何を呼べばいいか分からない」に、新しいスキルを作らずに応える

## 敵対的検証（初版計画への指摘24件）の処理

初版の計画は fresh context の敵対レビューにかけた。Critical 4件・Major 15件・Minor 5件の指摘が出た。

| 指摘 | 処理 |
|---|---|
| clarify から上流を呼ぶ委譲は、`disable-model-invocation` のため成立しない（Critical） | 採用。委譲型にせず、案内に留めた |
| `/which-skill` は本体 `/skills` と文脈上のスキル一覧の再発明になる（Major） | 採用。作らない。README に2行足すだけにした |
| `/which-skill` の「一覧に無ければ未導入」は誤案内になる（Critical） | 採用（作らないため解消） |
| README の表を地図へのリンクに置き換えると、導入前の人間向けの案内が消える | 採用。表は残す |
| model-setup に置く根拠（両プロファイルが入れる）が半分しか正しくない。会社 PC は5スキルを列挙してコピーしている | 採用。新しいスキルは置かない。進捗表示は `tools/` に置く |
| ダッシュボードの置き場所はユーザーが「未定」と言ったのに、計画が独断で決めている | 採用。ユーザーに聞き、「HTML も作る」の回答を得た |
| HTML を LLM サブエージェントに書かせる案は、本体機能との重複・書き込み先を強制できない・自律ブロックを初回質問で止める | 採用。LLM を使わないスクリプトにし、質問はせず `prefers-color-scheme` で切り替える |
| 生成物が利用者のリポジトリを汚す | 採用。`.dashboard/.gitignore` を自動で置く |
| meta refresh 10秒は、区切りでしか更新されないファイルでは誤解を招く | 採用。statusline の呼び出しごとに作り直し、生成時刻を大きく表示する |
| 状態ファイルの一部はパスが決まっていない（long-run のブリーフは「例」） | 採用。決まっているものだけを読み、ブリーフは環境変数で上書きできるようにする |
| `--eval-dir` はプラグイン配下だけを指せる／プラグインをまたぐ衝突は測れない（Critical） | 採用。同一プラグイン内の組に絞り、scratchpad のコピーで実行する |
| 実行回数の既定は3、HTML レポートは公開される。コスト見積もりが過小 | 採用。`--ablation none --runs 1 --no-publish --max-cost-usd` を指定し、費用上限は実行前にユーザーへ示す |
| `docs/evals/README.md` に「`claude plugin eval` は存在しない」という誤りが残っている | 採用。別ブランチで直す |
| 「発火しない」の原因を確かめないまま対策を決めている | 採用。事実5を確認し、まず実測する |
| 上流を併用すると grill・tdd で発火を取り合う（Critical） | 採用。「どちらか一方」を明記した |
| 重複に「スキル+2」で答えるのは教訓2に反する | 採用。スキル・エージェントは増やさない |
| 住み分けの注記で上流のコマンド名を散らす | 採用。注記は足さず、skills-guide の1節に集約した |
| learning-coach の version 漏れ・pipeline の二重 bump | 解消。learning-coach には触れず、pipeline は 2.5.1 のまま |
| 索引の更新漏れ | 採用。別ブランチで tools/ 追加時に一括で直す |
| 1つの変更として大きすぎる | 採用。このブランチは A（整理）だけにし、進捗表示と description 予算は `claude/skill-usability` に分けた |
| 「本リポジトリに無い」8件のうち2件を、理由なく落としている | 採用。wait-what・wizard を載せない理由を skills-guide に書いた |
| 検証が対象そのものを試していない | 採用。進捗スクリプトは実ファイルで動かし、HTML はブラウザでスクリーンショットを撮って確かめる |
| 前回の記録の #1 を覆すことを明記していない | 採用。本記録の表に書いた |

## 積み残し

- 「自動で発火しない」: description の予算を実測し、短縮と CI 検査を加えたうえで前後比較の eval を行う。結果は別記録に残す
- 「進み具合が見えない」: `tools/progress/` の statusline と HTML（別ブランチ）
- 2026-09-13 の示唆4（clarify・build-with-tests を畳む案）は今回も見送る。どちらも pipeline の部品で手動起動の入口でもあり、
  上流とは「どちらか一方」で住み分けられるため
