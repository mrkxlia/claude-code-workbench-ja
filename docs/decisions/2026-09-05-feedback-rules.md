# 2026-09-05 — 指摘の永続化と段階的強制を feedback-rules プラグインとして実装した決定

## 背景

「Claude Code を使っていて一番消耗するのは、実装の質そのものより **先週も言ったことを今日も
言っている** ことだ」という問題提起（[zenn: Claude Code に「同じ指摘を二度させない」仕組みを
hook で作った](https://zenn.dev/nozomi720/articles/claude_code_hooks_feedback)）を起点に、
同種の仕組みが既に無いか、あるとすればこれを上回るものかを調査した。

その記事の設計の核は次の3点である。

1. 指摘を `~/.claude/feedback/[topic].md` に1指摘1ファイルで永続化する
2. frontmatter の `count`（人間が同じ指摘をした回数）から severity を自動決定する
   （1〜2 → warn、3〜4 → ask/block、5以上 → deny）
3. 3つのフック（UserPromptSubmit で読ませる・PreToolUse でやらせない・Stop で直させる）で効かせる

## 教訓1（作る前に本体・公式・OSS を確認する）の適用

`docs/lessons.md` の教訓1に従い、本体機能と既存 OSS を調査した。

| 調べたもの | できること | 記事の設計と比べて |
|---|---|---|
| [公式 `hookify` プラグイン](https://github.com/anthropics/claude-code/tree/main/plugins/hookify) | `.claude/hookify.[name].local.md` に frontmatter（`event`・`pattern`・`action`・`conditions`）でフックルールを書き、`/hookify` が自然文から生成。ホットリロード | **最も近い先行事例**。ただし `action` は `warn` / `block` の2値で、**`ask` が無く、指摘回数による段階的な昇格もない**。文脈注入も違反ログも持たない |
| [claude-reflect](https://github.com/BayramAnnakov/claude-reflect) | UserPromptSubmit フックで訂正パターン（"no, use X"・"actually…"）を検知してキューに溜め、`/reflect` で人間がレビューし CLAUDE.md / AGENTS.md に反映。重複排除つき | **捕捉（capture）は記事より上**。一方で強制力は無く、反映先は CLAUDE.md＝お願いベース |
| [agentmemory](https://github.com/jayzeng/agentmemory) | 記憶を階層化し、SessionStart / UserPromptSubmit で**優先度つき 16,000 字予算**で注入。`Status: expired / superseded` で失効管理 | 予算つき注入は記事と同発想（記事は 3000 字）。**失効管理は記事に無い** |
| [claude-meta](https://github.com/aviadr1/claude-meta) ほか自己改善プロンプト系 | 会話の反省からルール／SKILL.md を自己更新 | プロンプト層のみ。強制力なし |
| 本体ネイティブ [`.claude/rules/`](https://claudelog.com/faqs/what-are-claude-rules/)（v2.0.64）・[`InstructionsLoaded`](https://code.claude.com/docs/en/hooks) イベント | `.claude/rules/*.md` は自動ロードされ、frontmatter `paths:` で**対象ファイルに触るときだけ**効かせられる | **毎ターン注入の一部は本体機能で置換可能**＝コンテキスト圧迫を減らせる |
| [prompt / agent 型フック](https://code.claude.com/docs/en/hooks) | フックの判定をモデルに委ねられる（`type: "prompt"` 既定30秒／`type: "agent"` は Read・Grep を使えて既定60秒） | **記事の最大の弱点（47ルール中 `enforce` を書けたのは14個。正規表現で表現できないルールは注入頼み）に対する解**。記事には無い |
| [フックで強制できないことの整理](https://dev.to/boucle2026/what-claude-code-hooks-can-and-cannot-enforce-148o) | サブエージェント・MCP・`-p` 実行ではフックが発火しない／無視される。モデルは塞がれたコマンドを迂回する | 記事は限界に触れていない。**過信を防ぐため README に明記すべき** |

## 決定1: 「count による段階的昇格」は他に見当たらないので取り込む

調査範囲で、**指摘回数を強制力に直結させ、`warn → ask → deny` と自動で昇格させる実装は他に
無かった**。公式 hookify ですら2値である。この一点が記事の設計の独自性であり、価値がある。

さらに次の設計判断も、そのまま採用する価値があると判断した。

- **`count` はフックが自動インクリメントしない。** 違反ログ（`.violations.jsonl`）に記録する
  だけ。「Claude がルールを破ろうとした」ことと「人間がもう一度指摘した」ことは別であり、
  ルールの重み付けの権限は人間に残す。
- **本文に「言い訳」の節を書かせる。** ルールを破りたくなる場面では「今回は特別だから」という
  理屈が先に立つ。その理屈を先に潰した文章が同じファイルにあると逃げ道が塞がれる。
- **hook 自身は絶対に事故らせない。** 例外はすべて握り潰して exit 0。検知できないことより、
  hook のバグで作業が止まるほうが害が大きい。

## 決定2: 先行事例が持っていて記事に無い4点を上乗せする

1. **訂正の自動捕捉**（claude-reflect 由来）— UserPromptSubmit フックがユーザーの訂正らしき
   発言（日本語「前も言った」「そうじゃない」「〜しないで」／英語 "no, use X" 等）を
   `.candidates.jsonl` に溜める。**ルール化と count 更新は人間が `/feedback-rule` で行う**
   （自動でルールを生やさない）。
2. **失効・無効化**（agentmemory・hookify 由来）— `enabled: false` と `expires: YYYY-MM-DD`。
   誤検知したルールを削除せずに止められる（削除すると「なぜあったか」の記録も消える）。
3. **`.claude/rules/` への書き出し**（本体ネイティブ）— `sync-rules` サブコマンドで、count 3
   以上かつ `paths` を持つルールを `.claude/rules/feedback-[name].md` として生成する。本体が
   パス条件で読むため、毎ターンの注入予算を消費しない。
4. **モデルに判定させるフック**（`type: "agent"`）— 正規表現で書けないルール向けの opt-in。
   **既定では配線しない**（毎ターンの LLM 呼び出しが増えるため）。設定例を `/feedback-setup`
   の Step 6 に置き、コストと遅延を説明したうえでユーザーに選ばせる。

加えて、記事が「次にやりたいこと」として挙げていた **`.violations.jsonl` の集計**を `stats`
サブコマンドとして実装した。発火ゼロの形骸化ルール・暫定のまま多発している昇格候補を提示する
（**昇格の実行は人間が判断する**という原則は保つ）。

## 決定3: 既存プラグインと統合せず、独立したプラグインにする

| 既存 | 目的 | 違い |
|---|---|---|
| `self-correct` | **1つのタスク**を合格まで回すループの停止ゲート（状態ファイルが ACTIVE のときだけ発火） | feedback-rules は**セッションを跨いだ恒久ルール**。ループの有無に関係なく効く |
| `pipeline` | 役割（builder/judge）ごとの担当範囲を守らせるガード | feedback-rules は**役割に依らない個人・チームの作法** |
| `codebase-setup` の `context-audit` | 常時ロードされる指示の棚卸し | 対象が CLAUDE.md 等の**既存の指示文**。feedback-rules は**指摘の記録そのもの**を管理する |

いずれもフックを持つが、目的・発火条件・状態が独立しているため、1プラグインに束ねると
「入れると何が起きるか」が説明できなくなる。規約1に従い独立ディレクトリとした。

## 実装しなかったもの（線引き）

- **`count` の自動更新** — 発火頻度から count を上げる案は却下。フックが自分でルールを重く
  できてしまい、「人間の指摘回数」という指標の意味が壊れる。`stats` は提案までに留める。
- **会話ログからのルール自動生成** — 候補の捕捉までは行うが、ルールファイルの生成は人間の
  承認を挟む。誤検出したルールが deny まで自動昇格すると作業不能に直結するため。
- **AGENTS.md への同期** — 既に `codex-bridge` の `gen-agents-md` フックが CLAUDE.md 等から
  AGENTS.md を生成している。二重実装は避け、必要なら確定ルールを `.claude/rules/` へ
  書き出したうえで既存フックに拾わせる。
- **セキュリティ目的の遮断** — フックは発火しない経路（サブエージェント・MCP・`-p` 実行）が
  あり、モデルは別の書き方で迂回する。危険操作の遮断は `permissions.deny`・OS 権限・CI の
  役割であることを README に明記した。

## 検証

- ルール置き場を `CLAUDE_FEEDBACK_DIR` で差し替えて、count 6（deny）・count 3（block）・
  count 1（warn）の3種と、壊れた frontmatter のファイルを混ぜた状態で全サブコマンドを実行。
  期待どおりの `permissionDecision` / `decision: block` を返し、壊れたファイルでも落ちないことを確認。
- PyYAML を import 不能にした状態（自前 mini パーサ経路）で `doctor` と `guard` が同じ判定を
  返すことを確認。
- 壊れた標準入力・ルール置き場なし・python3 なしのいずれでも exit 0 で素通りすることを確認。
- Stop フックが同一セッションで3回連続ブロックしたのち打ち切ることを確認。
