# 2026-10-08 — 積読インデックスの AI 関連項目の再走査と stuck-watch（mod）の追加

## 対象と想定用途

- 対象: 「積読 — 公開インデックス」（https://tsundoku-public.pages.dev 、2026-10-08 13:22 生成・全74件）のうち、
  タグが claude / 生成ai / aiエージェント / llm / ai / プロンプト / マルチエージェント / rag / ai開発 / claudecode の **32件**
- 想定用途: このリポジトリの利用者（Claude Code の個人利用者）の作業に効くものを、Claude Code の **mod
  （function hooks のプラグイン）** として取り込めるか判定する
- 手順: `/adoption-review`。`/deep-research` workflow はこのセッションで使えなかったため、メインが WebFetch・
  fxtwitter API（X ポストの本文）・`git clone --depth`（GitHub）で証拠を集めた（照合なし・単独経路）

## 走査の結果

32件のうち **30件は [2026-10-03](2026-10-03-tsundoku-claude-code-16-items-adoption.md)・
[2026-10-06](2026-10-06-tsundoku-agent-14-items-adoption.md) で評価済み**、または Claude Code の使い方から外れる
（Langfuse のセルフホスト・Nx Plugin for AWS・NVIDIA PAIR・Data Formulator・VibeVoice・STORM・OpenResearch・
DynamoDB のベクトル検索・LINE ヤフーの AIOps・LLM 入門スライド・機械学習の教材集・AI インフラ動向）。
評価済みのものは結論を変える新しい事実が無いので再評価しなかった。例外は次の2件。

| # | 対象（原典） | 結論 | 採用判断 |
|---|---|---|---|
| 1 | [html-plan](https://github.com/anthropics/claude-plugins-community/tree/main/html-plan)（anthropics/claude-plugins-community・2026-10-01 追加） | 試す価値はあるが常用は微妙 | 小さく検証する（**mod 化しない**） |
| 2 | [進捗ダッシュボード構築プロンプト](https://x.com/voxyz_ai/status/2103946635831050740)（前回 #3 の再検討） | 条件付きで有用（**「詰まり」の信号だけ**） | 小さく検証する → **stuck-watch として取り込み** |

### 1. html-plan を mod 化しない理由

すでにプラグインなので、mod にする作業が無い。使うならそのまま入れればよい。敵対役（`adoption-challenger`）の
反論のうち根拠が確認できたもの:

- SKILL.md が計画の文章を **ASD-STE100（英語の Simplified Technical English）に固定**し、`pack.mjs` の lint も
  英語だけを検査する。日本語の読み手に「1分で読める」は成り立たない（最も効く1件）
- 公開から1週間で画面構造と執筆規則が2回大きく変わったが、`version` は 1.0.0 のまま（2026-10-08 の clone で確認）
- 計画1件ごとに SKILL.md（約12KB）・blocks.md・例（約15KB）を読み、ランタイム約200KBを埋め込んだ HTML を作る。
  Plan モードのテキストより重い。回答の戻しはクリップボードへのコピーだけ
- 効果（1分で確認できる・誤解が減る）を裏付ける計測や第三者評価は確認できなかった

試すなら、UI がある複数ファイルの変更で Plan モードと並べ、手戻りの数を比べる。

### 2. 進捗ダッシュボードから「詰まり」だけを mod にした理由

前回は「判断待ちを既定で進める」がルール2と矛盾するとして、表示だけの `tools/progress/` を作った
（[2026-10-03 skill-usability](2026-10-03-skill-usability-and-mattpocock.md)）。ただしそれは task-pipeline の
`status.md` しか読まないので、**普通のセッションでは何も出ない**。

敵対役の最も効く反論は「mod が観測できるのは本体がすでに出している情報（タスクリスト・質問ダイアログ）だけで、
出し直しにしかならない」。これは**ペインやダッシュボードを作るならその通り**なので、作らなかった。
本体に無いのは次の2つの信号だけで、ここに絞った:

- **ツールが3回続けてエラーを返した**（同じところで空回りしている）
- **未完了タスクがあるのに15分どのタスクも完了しない**

本体のステータスラインに渡る JSON にタスクの進捗も失敗の回数も無いこと（[公式 Docs: status line](https://code.claude.com/docs/en/statusline)、
2026-10-08 取得）、近い既存品は everything-claude-code の agent-introspection-debugging スキルだが**指示で動くもので
ツール呼び出しを観測しない**こと（[claudepluginhub](https://www.claudepluginhub.com/skills/centaurioun-everything-claude-code/agent-introspection-debugging)、
2026-10-08 取得）を確認した。

| 原典の要素 | stuck-watch での扱い |
|---|---|
| opus のサブエージェントが HTML を作り直す | 採らない。フックがタスクリストとツール結果から決定的に数える（トークン0） |
| タスクと状態の一覧 | 本体のタスクリストに任せる。ステータスラインには `進捗 n/m` と実行中の1件だけ |
| 詰まり | **採る**（上の2信号） |
| 自分への質問と既定動作 | 採らない。本体のダイアログに出ており、既定で進めるのはルール2と矛盾する |
| 最新の成果物 | 採らない。LLM の要約が要り、トークン0の範囲で作れない |

## 取り込んだ差分

- `plugins/stuck-watch/`（0.1.0）を追加し、marketplace に登録した（8プラグイン目）。
  `claude plugin validate`・`claude plugin test`（3件）・`tsc` が通ることを確認した
- function hooks は early access の API で、版によって変わりうる（2.1.294 で確認）。動くのはローカルの端末と
  デスクトップで、壊れても `.catch` で素通りするため**作業は止まらないが、表示が出なくなるだけで気付きにくい**。
  これは撤退コストが小さい代わりの弱点として受け入れた

## 確認できなかったこと

- 原典 X ポストの本文は x.com が HTTP 402 を返したため、fxtwitter API 経由の本文で評価した（x.com の原文とは照合していない）
- 進捗ダッシュボード・html-plan とも、効果の数値と第三者の実運用報告
- 閾値（3回・15分）が妥当か。実際の長時間タスクで誤報と見逃しの数を数えてから見直す
- 証拠は単独の経路で集めた（`/deep-research` の照合なし）
