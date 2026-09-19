# 2026-09-19 — codex-bridge の廃止と cli-bridge への統合（棚卸しの示唆1〜6の適用）

2026-09-13 の `skill-duplication-check` は**記録だけ**で終わっていた（リポジトリは1バイトも
変わっていない）。この記録は、その「示唆」1〜6を実際の変更に落としたもの。

方針はユーザーとの確認で確定した:

- **codex-bridge はプラグインごと廃止**し、レビュー・実装の委譲は公式
  [`openai/codex-plugin-cc`](https://github.com/openai/codex-plugin-cc) へ渡す
- 公式に無い2つ（`codex-ask`・`codex-agents`）は残し、`kiro-bridge` に合流させて
  **`cli-bridge` へ改名**する
- プラグインは **10 → 9**、スキルは **33 → 31** になった
- `docs/evals/` の `claude plugin eval` 移行は**今回やらない**（別の決定として残す）

---

## 1. 何を消し、何を残したか

| 対象 | 判断 | 理由 |
|---|---|---|
| `codex-review` スキル・`codex-reviewer` エージェント | **削除** | 公式の `/codex:review`・`/codex:adversarial-review` |
| `codex-implement` スキル・`codex-implementer` エージェント | **削除** | 公式の `/codex:rescue`・`/codex:transfer`（＋ `status`/`result`/`cancel` のジョブ管理） |
| `plan-to-codex.sh`（プラン承認→実装委譲） | **削除** | `codex-implement` に依存していたため道連れ |
| `codex-ask` スキル・`codex-advisor` エージェント | **残す** | 公式は review / rescue / transfer の3系統で、**read-only の自由相談の入口が無い** |
| `codex-agents` スキル・`gen-agents-md.sh`・`hooks.json` | **残す** | 公式プラグインは既存の AGENTS.md を Codex CLI が読むことに依存し、**生成はしない** |
| `plan-review-codex.sh`（プラン提示前レビュー・opt-in） | **残す** | 委譲先が `codex-ask` なので生き残る |
| `kiro-review`・`kiro-ask` と2エージェント | **残す** | 公式相当が見つかっていない（2026-09-13 の D 判定） |

`plugins/kiro-bridge/` → `plugins/cli-bridge/` に改名し、上の「残す」資材を合流させた。
名前から特定ツール名を外したのは教訓5（実装の詳細・特定ツール名を名前に埋めない）に従ったため。

## 2. 敵対的検証で変わった判断

計画を「このリポジトリ自身の基準」で攻めた結果、**5件の欠陥が見つかり、実装前に直した**。

### F1. 「未読の README を根拠に削除」を一度やりかけた

2026-09-07 の記録は「README の一致は実装の一致ではない。未読を根拠に削除しない」と明記して
判断を先送りしている。初版の計画はその禁を破り、「機能的に下位互換だから削除」と書いていた。

一次情報（公式リポジトリの構成・README・`commands/review.md`）まで降りた結果、**結論は維持
できたが、理由が間違っていた**:

- 公式は Claude Code プラグインとして配布（`/plugin marketplace add openai/codex-plugin-cc` →
  `/plugin install codex@openai-codex`）。実体は `plugins/codex/` に
  `skills/ commands/ agents/ hooks/ prompts/ schemas/ scripts/`
- コマンドは8種。背景ジョブ管理まで含めると**機能面積は明確に広い**
- **ただし `/codex:review` は「Codex の出力を verbatim で返す」設計**で、要約も重大度づけも
  意図的にしない。当方の `/codex-review` は生出力を隔離して P1–P4 で要約していた。
  これは優劣ではなく**設計差**である

→ 削除の理由は「下位互換だから」ではなく、**「同じ用途を公式がより広くカバーしており、
当方の差分は要約の作法だけ。それは公式を入れた利用者が自分で指示すれば得られる」**である。

### F2. 改名・削除の移行手段（`renames`）を知らなかった

marketplace.json には **`renames`** がある（Claude Code v2.1.193+）。旧名を新名に写像でき、
`null` は削除として扱われ、`enabledPlugins`・`pluginConfigs` のキーが user / project / local の
各設定で書き換わる。初版は「再インストールしてください」と書くだけで、**既存利用者の設定に
死んだキーを残す**ところだった。

```json
"renames": { "kiro-bridge": "cli-bridge", "codex-bridge": null }
```

リモートソースでは改名後に `plugin-cache-miss` になるため、`/plugin install` を1回だけ走らせる
必要がある点も README に明記した。`renames` は追記のみ（将来さらに改名しても古い行を消さない）。
出典: [Plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)（2026-09-19 取得）。

### F3. AGENTS.md のセンチネルにプラグイン名が埋まっていた

`gen-agents-md.sh` は生成物の所有判定に `<!-- codex-bridge:generated v1 DO NOT EDIT -->` を使い、
**センチネルが無いファイルは手書きとみなして上書きしない**。改名でこの文字列を変えると、
既存利用者の `AGENTS.md` が手書き扱いになり、**再生成が無言で止まる**ところだった。

→ 所有判定は旧センチネルも受け付け、書き出しは新センチネルにする（次の再生成で自動移行）。
同じ理由で `plan-review-codex.sh` の状態ディレクトリ `.claude/codex-bridge/` は**意図的に
旧名のまま**にした（改名すると、進行中セッションで1セッション1回のゲートが二重に開く）。
どちらもスクリプト内にコメントで理由を残した。

### F4. 「追記のみ」の決定記録を書き換える計画だった

`2026-09-06-claude-code-dev-flow-adoption.md` は `../../plugins/codex-bridge/...` への相対リンクを
2本持ち、移動すると **CI の内部リンク検査が落ちる**。

→ 本文の主張は1文字も変えず、**リンク先のパスだけ**現存先へ更新し、行き先が消えたものは
リンクを外してコードスパンに落とし、末尾に「リンクだけ更新した」旨を**追記**した。

### F5. 他人のコマンド名を31スキルの description に散らすところだった

初版は各スキルの `/codex-review` を `/codex:review` に置換する計画だった。教訓9（外部仕様に
追随する記述は値ではなく**出典**を残せ）にそのまま反する。

→ description には固有のコマンド名を書かず（「外部 CLI へのレビュー委譲」「公式の Codex
プラグイン」まで）、**コマンド名と URL は `plugins/cli-bridge/README.md` に取得日つきで
1箇所だけ**置いた。

### 検証して「問題なし」と確認したもの

- `agent-review-panel` の codex 混成は壊れない（`panel-codex.md` は `codex exec` を自分で叩いており、
  削除した `codex-reviewer` に依存していない）
- CI の version 差分検査は削除・改名でも通る（削除された plugin.json も差分に出るため `bumped` に入る）
- `--auto` の SessionStart フックは Kiro だけの利用者に実害が無い（再生成のみ・新規作成しないため
  `AGENTS.md` が無ければ no-op）。ただし「Kiro 目的で入れても Codex 向けフックが1本動く」ことは
  README に明記した

## 3. 示唆2〜6（削除はせず、線引きを書いた）

| 対象 | 書いたこと |
|---|---|
| `fan-out` | worktree 隔離と PR 作成まで要るなら**本体 `/batch`**。本スキルはセッション内で完結する分担 |
| `long-run` | 完了条件の充足判定は**本体 `/goal`**。本スキルはその外側の実行プロトコル（併用可） |
| `backlog-loop` | タスク管理そのものは [`Backlog.md`](https://github.com/MrLesk/Backlog.md)。本スキルはステップ承認の規律 |
| `review-panel` | 存在理由を **codex/kiro の異種モデル混成**に絞る（`wan-huiyan/agent-review-panel` は Claude 専用だが機構は厚い） |
| `self-correct` | 存在理由を **`judge-eval`（Judge 自身の検定）**に絞る（`sdsrss/loop_eng` はループの作りが同等以上） |
| `build-with-tests`・`clarify` | `superpowers` の TDD・`spec-kit` の `/speckit.clarify` との線引き |
| `context-audit` | 差分は**レイヤー横断の棚卸し**。1ファイルの短縮は本体 `/doctor`（v2.1.206+）、CLAUDE.md 単体は公式 `claude-md-management` |
| `deep-understand` | `rodbv/socratic-skills`・公式 output style との差分3点（3層チェックリスト・AskUserQuestion クイズ・日本語の粒度指定） |

### 示唆4（`build-with-tests`・`clarify` を畳む案）を見送った理由

`clarify` は feature-pipeline / task-pipeline の Phase 2・3 から呼ばれる部品であると同時に、
`/clarify` で手動起動できる入口でもある。references に落とすと**呼べなくなる**ため、今回は
線引きを書くに留めた。削除の是非は次回の棚卸しに送る。

## 4. version と検証

`cli-bridge 1.0.0`（改名＋合流の破壊的変更）・`agent-review-panel 0.5.1`・`adoption-review 0.1.1`・
`learning-coach 0.1.2`・`model-setup 3.6.0`・`pipeline 2.4.2`・`codebase-setup 0.5.0`。
`self-correct` は README しか変えておらず、配信対象ファイル（`skills/`・`agents/`・`hooks/`）が
無変更なので規約5 に従い**上げていない**。

CI と同じ検査をローカルで通した（JSON 19件・SKILL.md 31件・agent 29件／description 合計 6,616字・
`.ps1`/`.sh` の BOM・内部リンク）。加えて移行の実挙動を確認した:

- 旧センチネル入りの `AGENTS.md` → `更新` して新センチネルに置き換わる（F3 の回帰テスト）
- 手書き（センチネル無し）の `AGENTS.md` → `スキップ（手書き / センチネル無し）`
- `plan-review-codex.sh` → `session_id` 無しは出力なしで素通り、1回目は deny、2回目は素通り

## 5. 確認できなかったこと

- 公式プラグインの**実装本体**（`prompts/`・`scripts/`）。読んだのは README・リポジトリ構成・
  `commands/review.md` まで。「公式で置き換わる」は**利用者の環境で1回試すまでは仮説**
- 削除した2スキルを現に使っている利用者は、公式プラグインの前提（Node.js 18.18 以降、
  ChatGPT サブスクリプションまたは OpenAI API キー）を別途踏む必要がある
- Kiro 側に公式相当のプラグインが本当に無いか（複数クエリで見つからなかった、までしか言えない）

これらは中核ルール11 に従い、判定を下げる根拠には使っていない。
