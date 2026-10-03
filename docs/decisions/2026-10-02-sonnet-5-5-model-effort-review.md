# 2026-10-02 — Sonnet 5.5 に合わせたモデル割り当てと effort の見直し

公式ブログ「[Building with Claude Sonnet 5.5](https://claude.dev/blog/building-with-claude-sonnet-5-5/)」
（2026-09-25）と Claude Code 公式ドキュメントに照らして、このリポジトリの配布物と私用 PC の設定を
レビューし、推奨をユーザーが承認したうえで適用した記録。観点は次の3つ。

1. 作業に合っていないモデル（範囲が明確な調査・レビュー・下書きが Opus で動いていないか）
2. 間違った effort（Sonnet で動くものに固定された値が段階表に合っているか）
3. Sonnet 5.5 で効かない・逆効果の設定と指示（思考オフ、think less、推論の出力、古い回避策、API の 400）

ガイドが示す基準は次のとおり。

- 範囲が明確で繰り返しの多い作業（調査・レビュー・下書き）は Sonnet 5.5、長いエージェント的コーディングと
  慎重な判断は Opus 5.5。
- effort は、範囲が明確な作業は `medium`（Claude Code の既定）、難しい・長い作業は `high`。`xhigh`・`max` は
  測定で品質向上を確かめたときだけ。
- 一次情報: [model-config](https://code.claude.com/docs/en/model-config)・[sub-agents](https://code.claude.com/docs/en/sub-agents)・
  [settings-reference](https://code.claude.com/docs/en/settings-reference)・
  [Prompting Claude Sonnet 5.5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5-5)・
  [Migrating to Claude Sonnet 5.5](https://platform.claude.com/docs/en/models/sonnet-5-5/migration-guide)（いずれも 2026-10-01 取得）。

---

## 1. 前提として見つかったこと

| 発見 | 影響 | 対応 |
|---|---|---|
| 私用 PC の `~/.claude/CLAUDE.md` の import 先 `model-setup/CLAUDE.md` が、2026-07-19 の再編（#48）で `plugins/model-setup/` へ移動したまま追従されていなかった | 9ルールが約2か月半、グローバル経由で読み込まれていなかった（エラーは目に見えない） | import パスを直した（リポジトリ外） |
| 私用 PC の model-setup が 2.0.0 のまま（`.claude/agents/` 配置のため3エージェントが読み込まれない） | `/fan-out`・`/verify-fresh` が sonnet 固定のエージェントを呼べなかった | 3.6.0 へ更新した（リポジトリ外） |
| ユーザー設定のトップレベル `effortLevel` は、Opus 5.5 とそれ以降のモデル（Sonnet 5.5 を含む）には効かない（settings-reference） | `settings.private.json`・`settings.company.json` の `xhigh` は、手順どおり `~/.claude/settings.json` に入れると Sonnet 5.5 には効かない。仮に効いても段階表に反する | 両サンプルから `effortLevel` を外した |
| 過去のトランスクリプト151件の実測では、サブエージェントの呼び出しは Explore 30・general-purpose 27・Plan 16・pr-review-toolkit:code-reviewer 6 で、このリポジトリのエージェントは0 | 私用 PC の Opus 消費に効くのは組み込みの2つだけ | `~/.claude/agents/Explore.md`（`model: sonnet`・`effort: medium`）と `CLAUDE_CODE_SUBAGENT_MODEL=sonnet` を設定した（リポジトリ外） |
| このリポジトリに Claude API を呼ぶコードは無い | 観点3の API 部分は文書（PROMPTS.md）だけが対象 | — |

## 2. 配布物のモデル割り当て（観点1）

`inherit` のエージェントを仕事の種類で3つに分けた。

**Sonnet 5.5 へ移した8種**（範囲の決まった調査・レビュー・中継・下書き）:

| エージェント | effort | 理由 |
|---|---|---|
| `panel-reviewer` | high | 1ラウンド分のレビュー。light でも Task 6〜9回と最も多く呼ばれる |
| `panel-codex`・`panel-kiro`・`codex-advisor`・`kiro-advisor`・`kiro-reviewer` | medium | 考えるのは外部 CLI 側で、こちらは依頼の組み立てと要約の中継。採否の判断は呼び出し元が行う |
| `instruction-auditor` | high | 指示ファイル1組を5分類する監査 |
| `feedback-auditor` | high | 集計済みログから提案書を書く（提案のみ） |

**Opus（`inherit`）に残した8種**（慎重な判断または長い実装）: `adoption-challenger`（反証）・`panel-judge`（裁定）・
`judge-auditor`（Judge の検定）・`brief-writer`（設計）・`backend-builder`・`frontend-builder`・
`deliverable-builder`・`loop-builder`。

**保留した1種**: `loop-judge`。仕事としては Sonnet 向きだが、自己修正ループの合否ゲートを担う。
`sonnet`／`high` にした版を `/judge-eval` で検定し、見逃し率が悪化しない場合だけ移す（別の決定として残す）。

これらのエージェントを `inherit` に固定する決定記録は docs/decisions・lessons.md に無く、根拠はエージェント
冒頭のコメントだけだった。今回の変更は過去の決定と衝突しない。コメントは新しい理由に書き換えた。

## 3. effort（観点2）

`model: sonnet` で `effort` 未指定のエージェントが10種あった。公式は未指定時を「セッションから継承」と
書くだけで、セッションが Opus 5.5 の `xhigh` のときに Sonnet のサブエージェントへ何が渡るかは明記していない。
`/tasks` も frontmatter に書いたときしか effort を表示しない。そこで全エージェントに明示した。

| effort | エージェント |
|---|---|
| medium | `adoption-researcher`・`subtree-surveyor`・`pipeline/researcher`・`requirements-writer`・`task-worker` |
| high | `fresh-verifier`・`final-reviewer`・`design-doc-checker`・`test-verifier`・`flow-tracer` |
| 対象外 | haiku の `bulk-scanner`・`panel-verifier`（Haiku 4.5 は effort 非対応） |

`task-worker` は `medium` にした。ただし 5.5 ガイドによると `low`／`medium` では長い作業の途中で確認のために
止まりやすいので、未完のまま戻ってくるようなら `high` に上げる、とコメントに書いた。

文書側は MODEL-GUIDE §1（仕様表に Sonnet 5.5 列を追加）・§2（段階表とトップレベル `effortLevel` の挙動）・
§3（プロファイルから `xhigh` を外した理由）・§5（Sonnet 5 の「xhigh から始める」推奨に 5.5 の注記）と、
CLAUDE.private.md・CLAUDE.company.md の `xhigh`／`/effort max` の記述を段階表に合わせた。

## 4. 効かない・逆効果の設定と指示（観点3）

- 思考をオフにする設定、「think less」、返信に推論を書かせる指示、「do not be lazy」、拒否ステアリング、
  ツール再試行の回避策は、どれも見つからなかった。
- 境界例: `PROMPTS.md` #1（「応答の前に…注意深く検討して」）は考えてから答えさせる指示で、推論を出力させる
  ものではない。公式 5.5 の "Think the problem through before you answer." と同じ趣旨なので残した。
- `PROMPTS.md` の API 補足にあった「オフにするには `thinking: {type: "disabled"}`」は Sonnet 5.5 では 400 に
  なる。Sonnet 5 限定と注記し、5.5 の破壊的変更（`between_tools`・`content[0].text`・強制 `tool_choice`・
  推論の出力指示）を追記した。サンプリング引数の 400 は 5.5 でもそのままなので、既存の記述は残した。
- ツール結果ごとに差し込まれる harness テキスト（5.5 で注入と誤読されうる）は、リポジトリのフックにも、
  私用 PC に入っている公式プラグインの PostToolUse フック3つ（security-guidance・agentforce-adlc・
  claude-security）にも無かった。どれも一致時・対象ファイル時・push／PR 時にだけ出力する。

## 5. 敵対的検証で直したこと

初版の推奨を一次情報で反証しようとした結果、7点を直してから適用した。

1. 「環境は 2.1.286」と書いたが、レビューしたセッション自体は自動更新前に起動した 2.1.280 だった。
   2.1.280 では `sonnet` は Sonnet 5 を指し、ユーザー設定の `xhigh` も効く。起動し直す手順を先頭に加えた。
2. 「ツール結果ごとの差し込みは無い」の根拠がリポジトリのフックだけだった。公式プラグインのフックも読んだ。
3. 「Explore が最も多く呼ばれる」は推測だった。トランスクリプトで実測し、Explore と general-purpose の
   2つを「任意」から「推奨」に上げた。
4. `CLAUDE_CODE_SUBAGENT_MODEL` は Explore に「効かない」のではなく「単独では効かない（`_FORCE=1` 併用で効く）」。
5. 2.0.0 で `/fan-out` が「Opus の汎用エージェントに流れる」は未検証の推測だった。代わりの手順が書かれて
   いないことだけを事実とした。
6. 設定サンプルの `xhigh` が効いていないという主張は、会社 PC が Anthropic API で v2.1.284 以上という条件つき。
   Bedrock・Google Cloud では `sonnet` が Sonnet 4.5 を指す。MODEL-GUIDE §1・§3 に条件を書いた。
7. 細かい数値（skills-guide のリンク追加は7件、panel-reviewer の呼び出し回数は README の値）を直した。

## 6. version

規約5に従い、`agents/`・`skills/` を変えた7プラグインを minor で上げた: adoption-review 0.2.0・
agent-review-panel 0.6.0（`review-panel` SKILL.md の「判断を伴う役だけ inherit」も更新）・cli-bridge 1.1.0・
codebase-setup 0.6.0・feedback-rules 0.2.0・model-setup 3.7.0・pipeline 2.5.0。
MODEL-GUIDE・PROMPTS・CLAUDE.*.md・settings サンプルは配信対象外なので、それだけでは version を上げない。

## 7. 確認できなかったこと

- 未指定の `effort` が別モデルのサブエージェントにどう継承されるか（公式に明記なし）。frontmatter に明示して回避した。
- Sonnet 5.5 のリタイア日（MODEL-GUIDE §1 では「未確認」とした）。
- 会社 PC の接続先と Claude Code のバージョン。設定サンプルを会社 PC に反映するときに確かめる。
- 組み込み Explore を上書きした `~/.claude/agents/Explore.md` が、組み込みのプロンプトと同等の調査品質を
  出すか。使いながら確かめ、落ちるようなら削除して組み込みに戻す。
