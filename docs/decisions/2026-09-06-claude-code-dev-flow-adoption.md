# 2026-09-06 — 「2026年6月現在の Claude Code 開発フロー」記事の採用可否レビュー（取り込みは1点）

## 対象と想定用途

- **対象**: [2026年6月現在の Claude Code 開発フロー](https://zenn.dev/arm_techblog/articles/7712cde19988c8)
  （Zenn・Publication「ARMテックブログ」・著者表示名 umetsu・2026/06/16 公開・2026/06/17 更新・
  2026-09-06 取得。本文の貼り付けで受領し、原典は外部評価の調査で特定した）
- **想定用途**: **このリポジトリのプラグインに、まだ入っていない要素があれば取り込む**（仮置き）。
  新規プラグインは作らない
- 先例: [PM 業務の Skill 化記事](2026-09-06-pm-skill-article-adoption.md)・
  [プラン提示前の Codex レビュー](2026-09-06-plan-review-before-present.md)

`/adoption-review` の手順（Step 0 → Step 7）で評価した。証拠収集は外部評価スコープ1体
（記事1本のため一次情報は本文で代替）、暫定結論が肯定寄りになったため `adoption-challenger` を1回当てた。

## 結論: 条件付きで有用。取り込みは1点＋この記録

記事が紹介する開発フロー（Plan モード既定 → 計画レビュー → 実装 → Stop フックの5フェーズ自動ゲート →
ブラウザ動作確認）の構成要素は、**ほぼ全部が本体機能・公式プラグイン・このリポジトリの既存資材で埋まっていた**。

当初立てた取り込み候補2件（`permissions.defaultMode: "plan"` の設定サンプル追加／
`browser-check` の思想を `task-brief` の完了条件へ）は、**challenger の反論でいずれも崩れた**。

残ったのは記事そのものではなく、**記事の中核（Stop フックの自動品質ゲート）を検証する過程で集めた
第三者の失敗事例が、このリポジトリが既に出荷している [`self-correct`](../../plugins/self-correct/README.md) の
停止ゲートに直接当たる**という発見だった。その1点だけを取り込んだ。

## 既存カバレッジの実測

| 記事の要素 | 既存実装・本体機能 | 差分 |
|---|---|---|
| `permissions.defaultMode` を `plan` にする | [`CLAUDE.private.md`](../../plugins/model-setup/CLAUDE.private.md) 追補ルール14「エンドユーザの基本操作は『Plan モードで依頼 → 計画を承認』の2つ」／[`MODEL-GUIDE.md`](../../plugins/model-setup/MODEL-GUIDE.md) §9「AIDLC 簡易版ワークフロー（Plan モード起点の自動ルーティング）」 | 設定サンプルには無い（→ **不採用**。理由は下記） |
| 計画ファイルに完了条件チェックリストを書く | [`CLAUDE.md`](../../plugins/model-setup/CLAUDE.md) ルール1「完了条件を先に定義する」／[`task-brief`](../../plugins/model-setup/skills/task-brief/SKILL.md) の「完了条件（機械的に判定できる形で）」 | 無し（上位互換） |
| 計画ファイルを Codex にレビューさせる | [`plan-review-codex.sh`](../../plugins/codex-bridge/hooks/plan-review-codex.sh)（`PreToolUse` matcher `ExitPlanMode`・opt-in）＋ `/codex-ask` | 無し（[2026-09-06 に取り込み済み](2026-09-06-plan-review-before-present.md)） |
| Stop フックで品質ゲートを回す | [`loop-stop-check.sh`](../../plugins/self-correct/hooks/loop-stop-check.sh)（状態ファイル駆動・1状態1ナッジ）／[`spec-sync-reminder.sh`](../../plugins/pipeline/hooks/spec-sync-reminder.sh)（Stop・非ブロッキング通知） | 5フェーズの連鎖自体は無い（→ **不採用**。公式 codex-plugin-cc のレビューゲートも Stop フック） |
| Phase 2: 計画チェックリストと実装の同期検証 | `spec-sync-reminder.sh`（SPEC.md 基準・非ブロッキング）／`feature-pipeline` の `status.md` と再開時の突き合わせ | 「チェックが更新されていない」の自動検出は無い（→ **不採用**。記事の Phase 2 は記事側の計画ファイル命名規約に依存しており、配布物にならない） |
| Phase 3: `/simplify` | **Claude Code 組み込みコマンド**（[Code review](https://code.claude.com/docs/en/code-review)、2026-09-06 取得）。`code-simplifier` も Anthropic 公式マーケットプレイス登録済み | 無し（本体機能） |
| Phase 4: `/codex:review` | [`codex-bridge`](../../plugins/codex-bridge/README.md) の `/codex-review`・`codex-reviewer`（P1–P4 の重大度） | 無し（上位互換） |
| Phase 5: `/commit` + `/pr` | [`pr-merge`](../../plugins/model-setup/skills/pr-merge/SKILL.md)（PR 作成〜マージ〜後片付け） | Conventional Commits の強制のみ差分。ただし既存 OSS 多数（[教訓1](../lessons.md)） |
| `skill-guard`（フラグファイルでスキル経由を強制） | [`block-secrets-commit.sh`](../../plugins/pipeline/hooks/block-secrets-commit.sh)（`git commit` を `PreToolUse` で捕捉・exit 2）／[`feedback-rules`](../../plugins/feedback-rules/README.md) の段階的 deny | 一般形は無い（→ **不採用**。理由は下記） |
| `terraform-guard` | `permissions.deny`（本体）／`feedback-rules` | 無し（本体機能） |
| `browser-check`（観測できる振る舞いで確認する） | `plugins/` 配下に playwright / browser / chrome の記述は **0件**。[`requirements-writer`](../../plugins/pipeline/agents/requirements-writer.md) が「人がレビューで直接検証できる文」「検証できない形容詞だけの基準を書かない」を持つ | 実行手段は無いが、思想は `requirements-writer` に実装済み（→ **不採用**） |
| WezTerm / gtr / Neovim / Zed | — | 個人の環境構成。配布物にならない（対象外） |

## 取り込んだ差分（1点）

### `self-correct` に「限界（過信しないこと）」節を足した（self-correct 0.2.1）

記事の dev-flow-gate を評価するために集めた証拠が、そのまま
[`loop-stop-check.sh`](../../plugins/self-correct/hooks/loop-stop-check.sh) に当たっていた。

**当たっている構造**: このフックは `.claude/self-correct/state.json` を読んで停止を判定するが、
その block 理由文は**判定される側のモデルに向けて**「`status` を `PASS` にする」
「`ESCALATED` に更新してください」と指示している（同スクリプト 113〜119行）。
つまり**解除キーを判定対象が握っている**。第三者が報告した迂回4類型のうち
(a)「ゲートを実行せず合格マーカーだけ出力」と (d)「状態ファイルを書き換えてループを回避」は
まさにこの形（[出典](https://zenn.dev/kok1eeeee/articles/claude-code-stop-hook-quality-gate-gaming)、2026-09-06 取得）。

書いた場所を2つに分けた（同じ事実の二重管理ではなく、読者が違う）:

- **[`README.md`](../../plugins/self-correct/README.md) の「限界（過信しないこと）」節（新設）** —
  導入を判断する**人間**向け。①状態ファイルはモデル自身が書くので、このゲートは善意前提であって
  セキュリティ境界ではない（迂回4類型を出典つきで列挙）②Stop フック一般の制約
  （ネストは無視される／永続 block は無限ループになりうる。実害報告 anthropics/claude-code
  [#55754](https://github.com/anthropics/claude-code/issues/55754)）と、本プラグインの
  `.stop-nudge`（1状態1ナッジ）がそれを構造的に避ける設計であること ③ゲートが効くのは
  ループ稼働中だけで、状態ファイル不在・`status` が `ACTIVE` でない・数値が壊れている場合は
  素通りする仕様であること。書式の前例は
  [`feedback-rules/README.md`](../../plugins/feedback-rules/README.md) の同名節
  （「セキュリティ境界としては使えません」）
- **[`SKILL.md`](../../plugins/self-correct/skills/self-correct/SKILL.md) の「このスキルがやらないこと」に1行** —
  ループを回す**モデル**向けの禁止。「`loop-judge` の判定が FAIL / UNVERIFIED のまま状態ファイルを
  `PASS` にして停止ゲートを解除する（状態ファイルは自分で書けるが、それは判定の代わりにならない）」

`.stop-nudge` による無限ループ回避は 2026-09-05 の実装時点から入っていたが、**その根拠となる出典が
どこにも無かった**。今回それを README に明記した（[プロンプト手法5件の記録](2026-09-06-prompt-techniques-7-adoption.md)の
積み残し「設計根拠への出典追記」と同じ性質）。

## 取り込まなかったもの（と理由）

| 候補 | 理由 |
|---|---|
| **`permissions.defaultMode: "plan"` を `settings.private.json` / `settings.company.json` に足す** | **①推奨構成と衝突する** — 根拠にしようとした追補ルール14 は同じ節で `feature-pipeline` へルーティングするが、その [`SKILL.md`](../../plugins/pipeline/skills/feature-pipeline/SKILL.md) は「パイプラインは research.md / story.md / brief.md 等を**書き出す**ため、全体は**通常モード**で動かす」「**Plan モードで起動された場合は CP まで進めない**」と明記している（[`task-pipeline`](../../plugins/pipeline/skills/task-pipeline/SKILL.md) も同文）。設定サンプルは `~/.claude/settings.json` へマージする**マシン全体の既定**なので、推奨構成が毎セッション詰まる。**②効果が誰にも届かない** — 規約5 の配信対象は `skills/`・`agents/`・`hooks/` 配下であり、`settings.*.json` はプラグイン導入で配信されない。既存導入者の環境は1つも変わらず、コストだけが新規ユーザーに乗る。**③事故の経路を新設する** — README のマージ手順は「統合する」としか書いておらず、既に `permissions.allow` / `deny` を持つ利用者が `permissions` オブジェクトごと置換して安全機構を失いうる（`feedback-rules/README.md` は「危険操作の遮断は `permissions.deny`・OS 権限・CI で行う」と、そこを安全境界に指定している）。**なお `defaultMode` を使うこと自体は本体機能**であり、必要な人は `.claude/settings.json` か `/config` で自分で設定できる（[教訓1](../lessons.md): 過去に `templates/plan-mode` を「本体 Plan モードと重複」として削除している） |
| **`browser-check` の「実装の詳細ではなく観測できる振る舞い」を `task-brief` の完了条件テンプレに足す** | **①検証手段を持たないまま要求だけを輸入することになる** — model-setup にブラウザ操作系は0件で、検証役 [`fresh-verifier`](../../plugins/model-setup/agents/fresh-verifier.md) の tools は `Read, Grep, Glob, Bash`。結果は「未検証」で埋まるか、コードを読んで「動くはず」と書くかの二択で、後者はルール4 が名指しで禁じている。**②見出しと矛盾する** — 追加先は「完了条件（**機械的に判定できる形で**）」。E2E コマンドがある案件なら「そのコマンドが通る」で既存の見出しが既に足りており、無い案件では機械判定を捨てさせることになる。記事の「悪い例（関数が active クラス文字列を返す）」はユニットテストの完了条件としては妥当で、悪い例として提示すると正しい粒度の条件まで書きにくくなる。**③層の重複** — UI の受け入れ基準は `requirements-writer` が既に担当しており、`task-brief` は自分の description で「着手前の数分で埋まる軽量ブリーフに徹する」と境界を宣言している |
| dev-flow-gate（Stop フック5フェーズの自動ゲート）そのもの | 中核は `self-correct`（状態ファイル駆動の停止ゲート）と `spec-sync-reminder`（Stop・非ブロッキング）で実装済み。Phase 3 の `/simplify` は本体組み込み、Phase 4 は公式 [openai/codex-plugin-cc](https://github.com/openai/codex-plugin-cc)（そのレビューゲート自体が Stop フック）。[教訓1](../lessons.md) に当たる。**採らない根拠は記事の側ではなく**、公式の制約（ネスト無視・永続 block の無限ループ・`stop_hook_active`）と迂回4類型の実測に置いている |
| Phase 1（計画ファイルの命名規約 `yyyyMMdd-機能名` の検証） | 記事のプロジェクト固有の規約であり、配布物にならない |
| Phase 2（計画チェックリストとコード変更の同期検証） | 対応する成果物がこのリポジトリでは `docs/pipeline/<slug>/status.md` で、`feature-pipeline` が再開時に「status.md と現実が食い違う場合はユーザーに報告し、整合する最後のフェーズからやり直す」を既に持つ。SPEC.md 側は `spec-sync-reminder` が担当。新規フックを足すと Stop フックが2本になり、上記の無限ループ・迂回のリスク面が増える |
| `skill-guard`（フラグファイルでスキル経由を強制する一般形） | `block-secrets-commit.sh` が `git commit` を `PreToolUse` で捕捉済み。かつ第三者事例自身が「ラッパースクリプトを経由しない方法は防げない」と明記しており（[3層防御の記事](https://zenn.dev/dely_jp/articles/claude-code-3-layer-defense-git-github)、2026-09-06 取得）、迂回可能な強制を増やす形になる。強制したい `/commit`・`/pr` 相当をこのリポジトリが配布していないため、置き場も無い |
| `terraform-guard` | `permissions.deny`（本体機能）と `feedback-rules` の段階的 deny で表現できる |
| `/gate off`（ゲートの一時無効化） | `self-correct` は状態ファイルの `status` を `ACTIVE` 以外にすれば素通りする。別の入口を作ると解除経路が2つになる |
| 「公式の Plugin やスキルがあればなるべくそれを使う」という指針 | [教訓1](../lessons.md)（作る前に 本体・公式プラグイン・著名 OSS の3点を確認する）が上位互換。過去9セクションの削除実績つき |

## 外部評価（Step 1・外部評価スコープ。すべて 2026-09-06 取得）

| 調べたもの | 分かったこと | 本リポジトリとの関係 |
|---|---|---|
| 記事の同定 | 原典は Zenn の ARMテックブログ記事（2026/06/16 公開・06/17 更新・著者表示名 umetsu）。渡された本文の「2026-08-11 公開」「フィッツプラス所属の梅津」はページのメタ情報と一致しない | 事実として記録する。採用理由にも減点材料にもしない |
| [`superpowers`](https://github.com/obra/superpowers) | 提供元は Jesse Vincent。[claude.com/plugins](https://claude.com/plugins/superpowers) にページがあり brainstorming / writing-plans スキルは実在。ただし `anthropics/claude-plugins-official` の marketplace.json 内にエントリは**確認できなかった**（ファイルが長大で取得が途中で切れたため、不在の証明ではない） | 記事は「公式マーケットプレイス」と記載。[`docs/skills-guide/README.md`](../skills-guide/README.md) は `obra/superpowers` として正しく記載済み |
| [`code-simplifier`](https://claude.com/plugins/code-simplifier) | `anthropics/claude-plugins-official` の marketplace.json に author: Anthropic で登録。`/simplify` 自体は [Claude Code 組み込みコマンド](https://code.claude.com/docs/en/code-review)として公式ドキュメントに記載がある | Phase 3 は本体機能。作る対象にならない |
| [`openai/codex-plugin-cc`](https://github.com/openai/codex-plugin-cc) | 実在・Apache-2.0・`/codex:review` を含む8コマンド | `codex-bridge` の住み分けは [2026-09-06 の記録](2026-09-06-plan-review-before-present.md)で確定済み |
| [`gtr`](https://github.com/coderabbitai/git-worktree-runner) | 配布元は coderabbitai/git-worktree-runner | 環境構成のため対象外 |
| [permission modes（公式）](https://code.claude.com/docs/en/permission-modes) | `plan` は "Exploring a codebase before changing it"。プロジェクト/ローカル設定で効かないのは `auto` と `bypassPermissions` のみで「The other values apply from any settings file.」 | `defaultMode: plan` は技術的には可能。不採用の理由は既存構成との衝突であって、実現可能性ではない |
| [Hooks（公式）](https://code.claude.com/docs/ja/hooks) | Stop フックは exit 0 + `{"decision":"block","reason":...}` で会話を継続させられる／「ネストされた Stop フックは無視されるため、Stop 内で別のターンをトリガーすることはできません」／「永続的に `decision: "block"` を返す場合、Claude は永遠にループ状態に陥る可能性があります」／`stop_hook_active`（v2.1.206 以降） | `self-correct` の `.stop-nudge` の設計根拠として README に明記した |
| [Stop Hook のゲーミング報告](https://zenn.dev/kok1eeeee/articles/claude-code-stop-hook-quality-gate-gaming) | 迂回4類型（合格マーカーだけ出力／「実行済み」と主張してスキップ／ブロック後に短い返事で上限まで継続／状態ファイルを書き換えて回避） | **今回の唯一の取り込みの直接の根拠** |
| Stop フック起因の無限ループ | anthropics/claude-code [#55754](https://github.com/anthropics/claude-code/issues/55754)（約50分・100回超でセッション配分を消費・duplicate クローズ）・#3573・#10205・#58348。サードパーティ製 claude-mem 側にも4件（出所は1系統） | 同上 |
| git コマンドをフックで塞ぐ運用の第三者事例 | 独立した出所で4件。うち [3層防御の記事](https://zenn.dev/dely_jp/articles/claude-code-3-layer-defense-git-github) は「ラッパースクリプトを経由しない方法は防げない」と明記 | `skill-guard` を不採用にした根拠 |

## challenger の反論と処理（1往復で確定）

| 反論 | 処理 |
|---|---|
| **C1-1（高）** 候補1の根拠であるルール14 が routing する `feature-pipeline` は「Plan モードで起動された場合は CP まで進めない」と明記しており、既定を plan にすると推奨構成が毎セッション詰まる | **採用。候補1を不採用にした** |
| **C1-2（中）** 公式は plan を「変更前の探索」用途として定義しており、書き込みが本体の作業（`/pr-merge`・`backlog-loop`・self-correct のループ）の既定に流用する形になる | **採用**（同上） |
| **C1-3（中）** 承認者が座っていない起点（`fan-out` の委譲先・`/long-run` の再開・Routine）で計画提示に倒れうる | **一部採用** — 継承範囲を確認できていないため、**不採用の根拠には使わず**「確認できなかったこと」に回した（中核ルール11） |
| **C1-4（中）** `settings.*.json` は規約5 の配信対象外で、既存導入者の環境は変わらない | **採用**（同上） |
| **C1-5（中）** `permissions` オブジェクトごと置換して `allow`/`deny` を失う手マージ事故の経路を新設する | **採用**（同上） |
| **C1-6（低）** 同じ事実が5か所に散る（教訓2） | **採用**（同上） |
| **C2-1（高）** model-setup にブラウザ実行能力が無く、`fresh-verifier` の tools は `Read, Grep, Glob, Bash`。「未検証」か「動くはず」にしかならず、後者はルール4 違反をテンプレート側から誘発する | **採用。候補2を不採用にした** |
| **C2-2（中〜高）** 「機械的に判定できる形で」という見出しと矛盾する。E2E がある案件なら既存の見出しで足り、無い案件では機械判定を捨てさせる | **採用**（同上） |
| **C2-3（中）** UI の受け入れ基準は `requirements-writer` の担当で、`task-brief` は自分で層の境界を宣言している | **採用**（同上） |
| **C2-4（低〜中）** `docs/evals/task-brief.md` に UI ケースが0件で、効果も劣化も測れない | **採用**（同上。積み残しにも記載） |
| **C3-1（高）** 証拠が `self-correct` の構造に当たっているのに、決定記録（履歴）にしか書かないのは不整合。導入者が読むのは README | **採用。設計を変えた** — README に「限界」節を新設し、SKILL.md にモデル向けの禁止を1行足した |
| **C3-2（中）** 「取り込まない＋記録」は adoption-review の既定出力であって取り込み候補ではない（先例2件） | **採用** — 取り込み件数は1件と数えている |
| **C3-3（中）** Stop フックの制約は記事固有ではなく一般の設計制約。記事1本の記録に埋めると次に引かれない。ただし `lessons.md` は「`git log` で根拠を引けるものだけ」と自分を縛っている | **採用** — 一般制約は `self-correct/README.md`（Stop フックを出荷している当事者）に置き、`lessons.md` には足さなかった |
| **C3-4（低）** 記事の著者・公開日が同定できていないまま典拠にすると記録が持たない | **採用** — 不採用の根拠を公式の制約と迂回4類型の実測に置き換えた |

## 積み残し（今回は実装しない）

- **`docs/evals/` に `self-correct` のシナリオが無い**。今回足した「限界」節と禁止1行が、
  迂回（合格マーカーだけ出力・FAIL のまま `PASS` にする）を実際に減らすかを測る手段は用意していない
- **`docs/evals/task-brief.md` に UI・画面を含むシナリオが0件**。候補2 を将来やり直すなら、
  先にこのシナリオが要る
- **停止ゲートを「解除キーを判定対象が握らない」形にできるか**（例: `verdict` が FAIL のまま
  `status` が `PASS` に変わった遷移をフック側で検出する）。今回は文書化に留め、機構は変えていない

## 確認できなかったこと

- **`permissions.defaultMode` の継承範囲** — Task サブエージェント・非対話実行（`claude -p`）・
  Routine 起点のセッションに継承されるかの公式記載を確認できなかった
- **既定が `plan` のときの pipeline チェックポイントの実挙動** — `feature-pipeline` は
  `EnterPlanMode` を「既に Plan モード中なら呼ばない＝冪等」と書くが、セッション既定が plan の
  状態での実測はしていない
- **Pro / Max / Team の既定 auto mode と `defaultMode: plan` の優先関係** — 公式に「設定ファイルの値が
  組み込みの開始モードを上書きするか」の記載を確認できなかった
- **記事の著者・所属・公開日の同定** — 貼り付け本文とページのメタ情報が一致しない
- **dev-flow-gate の5フェーズが実際に毎回通過する率・防いだズレの件数** — 記事にも第三者にも無い。
  これは調査不足ではなく**未立証**の状態
- **`superpowers` が `anthropics/claude-plugins-official` に登録されているか** — marketplace.json の
  取得が長さ制限で切れたため確定できなかった
- **Hacker News / Reddit の該当スレッド** — **0件**（検索で特定できず。不在の証明か検索語不足かは
  判別できない）

以上はいずれも **`adoption-review` の中核ルール11 に従い、減点の材料にしていない**。
不採用の根拠は「既存実装・本体機能との重複」「既存構成との衝突」「配信されないこと」であって、
情報の不在ではない。
