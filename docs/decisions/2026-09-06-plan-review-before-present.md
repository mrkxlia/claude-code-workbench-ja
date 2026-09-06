# 2026-09-06 — 「プラン提示前の Codex レビュー」の採用可否（取り込みは opt-in フック1本に限定）

## 対象と想定用途

- **対象**: X ポスト（2026-08-11・本文は画像／URL は t.co 短縮のみ）。主張は「Claude Code が
  実装計画をユーザーに提示する**前に**、自動で Codex にレビューさせるルールを CLAUDE.md に書く」。
  付随して ①必ず `-m` でモデルを指定（gpt-5.3-codex が最適）②`resume --last` を付けないと
  初回レビューの文脈が失われる ③「瑣末な点へのクソリプするな。致命的な点のみ指摘しろ」を必ず入れる
- **想定用途**: **このリポジトリの `plugins/codex-bridge/` に、提示前レビューの入口を足すか**

`/adoption-review` の手順（Step 0 → Step 7）で評価した。証拠収集は一次情報（Codex 公式ドキュメント・
Claude Code 公式ドキュメント）と外部評価（先行事例3件・公式プラグイン）に分け、暫定結論が肯定寄りに
なったため敵対役（`adoption-challenger` 相当・fresh context）を1回当てている。

## 結論: 条件付きで有用 — 「時点」の着想だけを採り、コード例3点はいずれも採らない

既存資産で埋まっていない残余は「**人が頼まなくても、提示前に自動で走る**」の1点だけだった。
その1点を **opt-in フック1本**（`plugins/codex-bridge/hooks/plan-review-codex.sh`）として実装し、
手動の入口は既存 `/codex-ask` の分岐として書き足した（新規スキルは作らない）。

## 一次情報で検証したポストの事実主張（2026-09-06 取得）

| ポストの主張 | 検証結果 |
|---|---|
| `-m` でモデルを指定せよ・`gpt-5.3-codex` が最適 | **公式と矛盾** — 「The `gpt-5.2` and `gpt-5.3-codex` models are already deprecated in Codex when you sign in with ChatGPT. Update scripts, configuration files, and `codex exec --model` commands that still reference those models.」（[Models](https://learn.chatgpt.com/docs/models)）。現行の推奨は gpt-6-astra / gpt-5.6-sol / gpt-5.6-terra / gpt-5.6-luna / gpt-5.3-codex-spark / gpt-5.5 / gpt-5.4（5.4 系は 2026-08-31 リタイア） |
| `codex exec resume --last` が使える | **実在する** — `--last` は "Resume the most recent chat **from the current working directory**"（[Developer commands](https://learn.chatgpt.com/docs/developer-commands?surface=cli)、[Non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode)）。ただし**同じ cwd の最後のセッション**であり、`/codex-review`・`/codex-implement` と混在すると無関係なセッションに継ぎ足しうる |
| `resume` と `-m` を併用してモデルを指定できる | **確認できなかった** — 公式ドキュメントに継承・上書きの記載が無い（[openai/codex の docs/exec.md](https://raw.githubusercontent.com/openai/codex/main/docs/exec.md) は外部ドキュメントへのリンクのみ）。第三者記事は「resume ではモデルを指定できず元セッションの設定を引き継ぐ」とするが一次情報なし |
| resume を付けないと文脈が失われる | **根拠が示されていない**。更新後のプラン全文を heredoc で渡し直せば文脈は復元でき、それが既存エージェントの正準（README「コンテキストの渡し方」） |
| CLAUDE.md のルールで「提示前」を保証できる | **保証できない** — このリポジトリ自身、より強い `additionalContext` について「強い誘導であって厳密な強制ではない」と README に明記している。機構としてタイミングを決められるのは `PreToolUse` + `permissionDecision:"deny"` のほう（[Hooks reference](https://code.claude.com/docs/en/hooks)。`PreToolUse` の matcher は任意のツール名を取り、`ExitPlanMode` にもマッチする） |
| ExitPlanMode の PreToolUse はプラン提示より前に走る | **確認できなかった** — フック実行と UI 提示の前後関係は公式に記載が無い。**だからこそ `deny`** を選んだ（allow で通すと提示されうるが、deny なら ExitPlanMode 自体が成立しない） |

## 代替可能性の照合（教訓1 の3点確認）

| 求める機能 | 既存の代替 | 代替度 |
|---|---|---|
| A. プラン本文を Codex に read-only で渡してレビューさせる | `/codex-ask`（`codex-advisor`・heredoc 全文同梱・`--sandbox read-only` 固定・戻り値契約あり） | **完全に代替可能** |
| B. 指摘を重大度で絞る | `codex-reviewer` の P1–P4 | **上位互換で代替可能** |
| C. 更新プランの再レビューで文脈を保つ | 毎回プラン全文を heredoc で渡す（`resume` 不要・誤セッションのリスクも回避） | **代替可能** |
| D. 複数視点で叩く | `/review-panel codex`（匿名化・追従的収束の検出・全員一致警告つき） | **上位互換で代替可能** |
| E. **人が頼まなくても提示前に自動で走る** | `plan-to-codex.sh` は `PostToolUse`＝**承認後**の実装委譲で時点が違う。内蔵 Task サブエージェントも自動起動しない。公式 [openai/codex-plugin-cc](https://github.com/openai/codex-plugin-cc) のレビューゲートは **Stop フック**（Claude の応答に対するレビュー）であり提示前ゲートではない | **代替できない唯一の残余** |

## 取り込んだもの（1点）

**`hooks/plan-review-codex.sh`（opt-in・`PreToolUse` matcher `ExitPlanMode`）** — `deny` と
固定文字列の `permissionDecisionReason` を返し、`/codex-ask` でのレビューへ誘導する。

設計判断:

- **フック自身は codex を呼ばない** — 呼ぶと (a) フックが数十秒ブロックする (b) Codex 出力を
  JSON に埋めるため `jq` とエスケープが要る (c) **外部モデルの出力を無検証で文脈へ注入する経路**が
  できる。このリポジトリの正準は「フックはユーザー入力を含まない定数 JSON だけを出す」
  （`plan-to-codex.sh` と同じ）。実行は `codex-advisor` に委譲する
- **deny は1セッション1回まで** — 状態ファイル `.claude/codex-bridge/plan-reviewed-<session_id>` を
  deny と同時に作成し、以後は素通り。改訂→再提示は必ず通るので**構造的にループしない**
  （プロンプト上の約束に依存しない）。`session_id` は `grep`/`sed` で取り出し英数字にサニタイズする
  （`jq` 不要）。7日超の状態ファイルは掃除する
- **異常系は素通り** — `session_id` が取れない・状態ファイルを作れないときは deny しない。
  codex 未導入・未認証ならレビューを飛ばして再提示してよい旨を理由文に含める（詰まらせない）
- **opt-in（`hooks.json` に入れない）** — プラン提示のたびに課金とレイテンシが発生するため。
  実運用報告（[DevelopersIO 2026-05-28](https://dev.classmethod.jp/articles/claude-code-codex-cross-review/)）も
  「2つ目の AI の利用料がかかる。無料ではない」として**影響の大きい対象だけに選択適用**へ着地している

あわせて、`/codex-ask` に「実装計画のレビューに使う場合」の分岐（プラン全文を毎回渡す・`resume` を
使わない・指摘を抑制させず提示側で落とす）と、3エージェントに**モデル名を焼き込まない**規約を書いた。

## 取り込まなかったもの（と理由）

| ポストの要素 | 理由 |
|---|---|
| `-m gpt-5.3-codex` の固定 | 公式が非推奨と明記。テンプレートにモデル名を焼き込むと陳腐化する（教訓5、および 2026-09-06 の決定「未確認のバージョン番号は書かない」と同じ理由）。**「モデルは利用者が明示する」だけを規約として書いた** |
| `codex exec resume --last` | `--last` は cwd スコープで**無関係なセッションを掴みうる**。セッション ID を保持する設計にしない限り成立しない。プラン全文の再送で代替できる |
| 「瑣末な点へのクソリプするな。致命的な点のみ」 | 否定形の抑制指示は**偽陰性（見落とし）**を増やす方向。全部出させて提示側で落とす（P1–P4）ほうが安全で、既存実装の下位互換 |
| CLAUDE.md にルールとして書く方式 | 「提示前」というタイミングを保証できない。機構（`deny`）に置き換えた |
| 新規スキル `/codex-plan-review` | `/codex-ask` と重複する（教訓1 の削除対象パターン）。既存スキルの分岐として書き足した |

## 外部評価（Step 1・外部評価スコープ）

| 調べたもの | 分かったこと | 本決定との関係 |
|---|---|---|
| [Qiita「自動レビューで Claude Code の Plan Mode をブラッシュアップするツール」（2026-03-01）](https://qiita.com/yuu1ch13/items/509991bbfe1fb5982afc) | `PreToolUse` matcher `ExitPlanMode` で codex を実行し、`permissionDecision:"deny"` ＋レビュー内容の注入でプラン改訂を強制。最大レビュー回数は既定2回 | **機構の選択（deny）と回数上限の必要性**を裏づける先行事例。ただしフック内で codex を実行する点は採らなかった |
| littlemight.com の Codex second-opinion skill | ExitPlanMode に相乗りして承認前にプランを Codex へ回す（本文は 403 で取得できず、検索結果の要約のみ＝**確認できなかった**） | 同種の運用が複数あることの傍証 |
| [DevelopersIO「Claude Code × Codex のクロスレビュー運用」（2026-05-28）](https://dev.classmethod.jp/articles/claude-code-codex-cross-review/) | `codex exec -m … --sandbox read-only --skip-git-repo-check … 2>/dev/null`。コストを明示し、**影響の大きい PR と重要な設計文書だけに選択適用**。両モデルとも誤りうるので裏取り必須 | **opt-in にする根拠**。README に適用条件として書いた |
| [openai/codex-plugin-cc](https://github.com/openai/codex-plugin-cc) | `/codex:review`・`/codex:adversarial-review` 等。レビューゲートは **Stop フック** | 提示前ゲートは公式プラグインにも無い＝重複ではない（教訓1） |

## 確認できなかったこと

- ポストの原文・投稿者・反応（X はログイン必須、URL は t.co 短縮のみ）
- `codex exec resume --last` と `-m` を併用したときのモデル指定/継承の一次情報
- ExitPlanMode に対する `PreToolUse` 実行と、UI へのプラン提示の前後関係の公式記載
- この手法の効果（プランの欠陥検出率・手戻り削減）を測った定量報告 — 先行事例3件のいずれにも無い。
  **これは調査の限界ではなく「立証されていない」という状態**であり、既定を opt-in にした理由の一つ
