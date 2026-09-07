# 2026-09-06 — グローバル CLAUDE.md 6項目（X ポスト）の採用可否レビュー: 6項目は不採用、副産物の1点だけ反映

## 対象と想定用途

- **対象**: X ポスト（@rmanzoku・2026-08-11・本文の貼り付けで受領）。プロジェクト非依存の
  グローバル CLAUDE.md（`~/.claude/CLAUDE.md`）に置く恒久ルールとして次の6項目を挙げている。
  ①MCP禁止（MCP を使わず CLI を使え）②Memory管理（Worktree ベースなのでセッションを跨いだ
  Memory は使えない、git 管理しろ）③一時ファイル（Subagent や別 Agent が読むので `.context`
  以下に作れ。`/tmp/` に作るな）④ADR（大きめの変更は常に ADR を作って保存しろ）
  ⑤Plan Review（Plan を人間に出す前に AI レビューして Issue を潰してから出せ）
  ⑥Auto memory（Auto memory の内容は適切にドキュメント化しろ）
- **想定用途**: 「このリポジトリに、6項目のうち既存資産で埋まっていない要素があれば取り込む」
  （ユーザーの依頼が「必要であれば取り入れて」であり、仮置きではない）

`/adoption-review` の手順（Step 0 → Step 7）で評価した。証拠収集は「公式ドキュメント（一次情報）」と
「外部評価」の2スコープに分けて並列実行した。種別「X ポスト1件」の既定は外部評価1体だが、
6項目すべてが Claude Code の製品仕様を前提にしているため一次情報に1体を足している（上限3体の範囲内）。
暫定結論が肯定寄りになったため、敵対役（`adoption-challenger`・fresh context）を1回当てて反論を処理した。

## 結論: 面白いが実務採用は弱い / 採用判断: 採用しない

**6項目は1つも取り込まない。** 2項目は前提が現行仕様と食い違い、1項目は既存設計と衝突し、
1項目は既存運用の劣化版、1項目は取り込み済み、1項目は処方そのものが遵守率に逆行する。

取り込んだのは、調査の副産物として見つかった**既存スキル `context-audit` の定義漏れ1点**だけ。
これはポストの処方を採ったのではなく、ポストの項目⑥が指している**問題設定**（auto memory が
誰にもレビューされない）が実在すると確認できたため、既存スキルの対象一覧の抜けを埋めたもの。

## 6項目の判定（一次情報の検証つき・2026-09-06 取得）

| 項目 | 判定 | 根拠 |
|---|---|---|
| ①MCP禁止 | **不採用（前提が現行仕様で崩れている）** | `.mcp.json` について「Tool schemas are **deferred by default** and load on demand via tool search」（[MCP](https://code.claude.com/docs/en/mcp)）。「**Tool search is on by default**」「tool definitions are **withheld from the context window**」（[Tool search](https://code.claude.com/docs/en/agent-sdk/tool-search)）。引用元の「50 tools can use 10-20K tokens」はこの機構が**無い前提**の説明文 |
| ②Memory を git 管理 | **不採用（前提が公式仕様と逆）** | auto memory の保存先 `<project>` は **git リポジトリから導出**され「all worktrees and subdirectories within the same repo **share one auto memory directory**」（[Memory](https://code.claude.com/docs/en/memory)）。worktree 単位で分かれるのは transcript のほう（[Sessions](https://code.claude.com/docs/en/sessions)）。教訓のファイル化という趣旨自体は `docs/lessons.md` で実装済み（backlog B-5） |
| ③`.context/` に一時ファイル | **不採用（既存設計と衝突）** | `.context`・スクラッチパッドの概念は公式に無い（[Sub-agents](https://code.claude.com/docs/en/sub-agents)）。このリポジトリは**二層の規約を実装済み** — 捨てる生ログは `${TMPDIR:-/tmp}/<name>-<id>.txt`（codex/kiro/panel の7エージェントで「正準形」として明記）、残す中間成果物は `docs/pipeline/<slug>/`・`docs/task-pipeline/<slug>/`・`docs/long-run/brief.md`。一律 `.context` はこの区別を壊す |
| ④ADR を常に作る | **不採用** | 公式の採否基準「Would removing this cause Claude to make mistakes? If not, cut it.」＋「Longer files … **reduce adherence**」（[Memory](https://code.claude.com/docs/en/memory)）。`docs/decisions/` は既に**閾値つき**運用（削除・統合の判断を下したら記録する）で、「大きめの変更は常に」はその劣化版 |
| ⑤Plan Review | **取り込み済み** | 2026-09-06 の[決定](2026-09-06-plan-review-before-present.md)で `plugins/codex-bridge/hooks/plan-review-codex.sh`（opt-in）として実装済み |
| ⑥Auto memory をドキュメント化 | **処方は不採用・問題設定だけ採る** | 公式「Claude **skips anything your CLAUDE.md files already say**」— ドキュメント化した分だけ CLAUDE.md が太り、遵守率低下（公式の明示的な警告）に直撃する。一方、問題設定そのものは実在する（下記） |

## 取り込んだもの（1点）

`context-audit` は「**毎セッション必ずコンテキストに載る指示**を棚卸しする」スキルなのに、
Step 1 の洗い出し対象が CLAUDE.md 階層・`CLAUDE.local.md`・`.claude/rules/`・スキル/プラグインの
4種だけで、**`MEMORY.md` が入っていなかった**（変更前の grep で `memory` の言及0件）。

`MEMORY.md` は**セッション開始時に先頭200行（または 25KB）までがロードされる**（[Memory](https://code.claude.com/docs/en/memory)）ため、
定義上このスキルの対象である。加えて **git 管理外なので差分に出ず**、既存の手順では構造的に見つからない。

反映内容（`plugins/codebase-setup/skills/context-audit/SKILL.md`・codebase-setup 0.3.1 → 0.3.2）:

- 冒頭と frontmatter の対象説明に auto memory を追加
- Step 1 の洗い出しに `~/.claude/projects/<project>/memory/`（`/memory` で開ける）を追加
- Step 3（矛盾の突き合わせ）に、CLAUDE.md・`.claude/rules/`・スキルとの横断照合を明記
- Step 5（適用）で、消した内容を **CLAUDE.md へ書き写さない**ことを明記
- 「使いどころ」に、いま困っているなら棚卸しを待たず `/memory` で消す・`autoMemoryEnabled: false` で
  切る、という分岐を追加
- 「やらないこと」に「auto memory の内容を CLAUDE.md へ丸ごと書き写す」「auto memory の**分量**を
  論点にする」を追加

5分類（A〜E）・報告テンプレート・`instruction-auditor` への委譲手順は**変えていない**。
既存の A（陳腐化）・B（矛盾）でそのまま扱えるため、新しい分類も新しいエージェントも作っていない。

### なぜ「量」を見ないのか

公式が `MEMORY.md` の 200行 / 25KB のロード上限を保証し、上限に近づくと Claude Code 自身が
短縮を促し、超過すると書き込み時にインデックスの書き直しを要求する。起動時にロードされない
トピック別ファイルもある。**分量の監視は本体が持っている**ので、このスキルが足せるのは
内容の正しさ、特に**指示ファイルとの横断照合**だけ。`/memory` は閲覧と削除はできるが照合はしない。

## 取り込まなかったもの（敵対役の反論で落としたもの）

**MCP のツール定義をコンテキスト予算の棚卸し対象に加える案** — 暫定案に入れていたが落とした。

- tool search が**既定で有効**で定義が withheld される以上、既定環境では「MCP を減らせ」が
  **誤った提案**になる。`context-audit` 自身が禁じている「根拠のない A 判定」を、スキル本体が
  構造として抱え込むことになる
- 外部評価の数値（4サーバで 67,000 トークン／GitHub MCP 初期化 55,000 トークン／CLI は 4〜32倍安い）は、
  **`/context` が MCP のトークン消費を過大報告する**という実測反証（[async-let.com](https://async-let.com)：
  XcodeBuildMCP 60ツールで `/context` 表示 45,018 vs 単一 API 呼び出しでの実測 15,282）を踏まえると、
  そのままでは判断に使えない
- 正しく書こうとすると `ENABLE_TOOL_SEARCH` の値・接続先・バージョン境界を SKILL.md に抱え込む。
  これは `.claudeignore` の件（[2026-09-05](2026-09-05-large-codebase-harness.md)）で一度回避した
  「字面と現行仕様のずれ」を、今度は自分の側に作り込むことになる

**グローバル CLAUDE.md のサンプルを作り直す案** — 検討していない。`templates/global-claude-md-sample` は
#55 で、`plugins/knowledge-share`（削除理由＝「本体の auto memory ＋ `claude-mem`」）は #57 で
削除済みであり、[教訓1・4](../lessons.md) に正面から当たる。

## 敵対役の反論と処理

| 反論 | 処理 |
|---|---|
| MCP 棚卸しは公式既定（tool search on by default）に照らして誤診断を生む | **採用。案を落とした**（上記） |
| auto memory は製品側の自動上限・`/memory`・3系統の無効化で埋まっており、証拠が指す処方は周期棚卸しではない | **部分的に採用。** 量の監視を落とし、緊急時は棚卸しを待たず `/memory`・`autoMemoryEnabled: false` へ誘導する分岐を足した。**残したのは横断照合だけ** — `/memory` は指示ファイルとの突き合わせをしないため、ここだけは代替が無い |
| 実質的に足りないのは find コマンド1行なのに、説明の分量が釣り合わない（教訓4） | **採用。** 新しい分類・新しいエージェント・新しい対象カテゴリは作らず、既存の A〜E と既存の Step に差し込む形に縮めた |
| 教訓1 に二度目の抵触（#55 の題材で #57 の対象領域） | **不採用。** #57 で削除した `knowledge-share` は auto memory を**再実装する**プラグインだった。今回は auto memory の内容を**指示ファイルと突き合わせる**もので、本体の `/memory` にも公式プラグインにも無い。ただし住み分けを README の表に明記した |
| ポストの前提は1か月弱で2項目が失効しており、3〜6か月周期のスキル本文に固定すべきでない | **採用。** 失効した前提（①②）は取り込んでいない。書いたのは「`MEMORY.md` は起動時にロードされる」「git 差分に出ない」という、機構そのものに属する2点だけ |
| ⑥を素直にやると CLAUDE.md が太り遵守率に直撃する | **採用。** 「消した内容を CLAUDE.md へ書き写さない」を Step 5 と「やらないこと」の両方に明記した |

## 確認できなかったこと

- ポストの原文・リプライ欄・宣伝表示の有無 — x.com が HTTP 402（ログイン必須）。**貼り付け本文だけで評価した**
- 6項目の運用そのものに対する第三者の追試・検証（0件）、`.context/` 運用への言及（0件）、
  「auto memory をドキュメント化して改善した」報告（0件）、ADR 常時生成が「N 日で破綻した」という
  日数つきの一次体験談（0件）
- worktree のメモリ共有が「v2.1.63 以降」であることの一次ソース。GitHub Issue #39920（2026-03-27）は
  worktree 間のメモリ混線を報告して **Closed as not planned**。現行の公式ドキュメントは「共有される」と書く
- CLI を Bash 経由で使うことの推奨/非推奨についての公式記載
- 2026-09-06 の[`plan-review-before-present`](2026-09-06-plan-review-before-present.md)が評価した X ポストと
  同一投稿かどうか。どちらも 2026-08-11 だが内容が異なり、双方とも原文を取得できていないため同定できない

**中核ルール11 に従い、これらの「0件」は減点材料にしていない。** 不採用の根拠はすべて、公式
ドキュメントの記述と、このリポジトリ内で実測した既存資産である。
