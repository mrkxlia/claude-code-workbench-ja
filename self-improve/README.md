# self-improve — git 不要の自己改善ループ（発見 → 承認制で適用）

普通の単発セッションで出た**訂正・繰り返し・行き詰まり**や、**実態とスキル定義のズレ**から、
スキル・CLAUDE.md・`.claude/rules`・hook・エージェントを**継続的に改善する**ためのスキル2種と
フック2種です。**GitHub も git も使わずローカル完結**し、**承認なしには1ファイルも変更しません**。

| スラッシュコマンド | 役割 | 変更 |
|-------------------|------|------|
| `/improve-scan [--days N]` | 発見: シグナルを抽出してローカル backlog に貯める | しない（発見のみ） |
| `/improve-apply` | 判定 → 品質ゲート → 1件ずつ承認 → 適用（`.bak`／差分ロールバック）→ 記録 | 承認したものだけ |

さらに、**改善の種を検出してキューに積む SessionEnd フック**と、**未処理件数・経過日数を通知する
SessionStart フック**を同梱します（kb-harvest と同じ「検出/通知は自動・本体は手動」パターン）。

## 明示起動は必須？ — 自動化の範囲

- **発見（improve-scan）は半自動**: `si-session-end.sh` が毎セッション終了時に grep で改善の種を
  前ふるいし、対象セッションを回収キューに積みます。意味的な分類は `/improve-scan` 実行時に行います。
- **適用（improve-apply）は手動**: ファイルを編集し1件ずつ承認するため自動化しません。代わりに
  `si-session-start.sh` が「未処理 N 件／前回適用から X 日」を通知します。
- **擬似定期実行（外部スケジューラ不要・git 不要）**: 通知は「backlog 非空 かつ 前回適用から閾値日数
  （既定7日・環境変数 `SELF_IMPROVE_NUDGE_DAYS` で調整）以上」のときだけ出ます。＝**一定期間ごとに
  次回セッション開始時に自動で促される**動きになります。
- **真の無人定期実行**が必要なら、Claude Code のフックは時間 cron を持たないため、外部スケジューラ
  （cron / launchd / Task Scheduler）や CI を併用してください（これらは git/環境前提）。

## 既存の自己改善系との違い（住み分け）

| | 対象 | 起点データ | 出力 | 前提 |
|---|---|---|---|---|
| **kb-harvest**（knowledge-share） | 個人の横断ナレッジ | トランスクリプト jsonl | `~/.claude/knowledge/` への**メモ追記**（スキルは直さない） | なし |
| **pipeline-improve**（software/task-pipeline） | パイプライン定義 | `LEARNINGS.md`・`status.md` 等**パイプライン産物** | 定義の改善編集 | **パイプライン運用中**（`docs/pipeline/`） |
| **self-improve（本セクション）** | 任意リポジトリのスキル/CLAUDE.md/rules/hook/agent | 直近トランスクリプト＋kb 蓄積 | 上記への**改善・新規作成**編集（承認制・`.bak`） | **パイプライン不要・git 不要** |

要点: `pipeline-improve` はパイプライン運用が前提、`kb-harvest` はメモを貯めるだけ。
self-improve は「**普通の単発セッションの訂正から、その場で恒久成果物を直す/作る**」を埋めます。

## kb-harvest との組み合わせ（データ層で連携）

self-improve は**自前の目的特化シグナル検出**を持ち、knowledge-share の抽出スクリプトは呼びません
（プラグイン別導入でパス解決できないため）。連携は**データ層のみ**です:

1. **kb-harvest** が各セッションの知見を `~/.claude/knowledge/` に蓄積（受動）。
2. **improve-scan** が直近トランスクリプトに加え、`~/.claude/knowledge/` の**常用/再出現メモを
   「恒久成果物への昇格候補」**として backlog に挙げる。
3. **improve-apply** が採用結果を **kb に書き戻す**（何を恒久化したか）。

knowledge-share が未導入でも self-improve は単体で動作します。

## 改善できる対象（新規追加も既存修正も）

- **スキル** … 既存 SKILL.md の改善 / 新規スキル作成（WHAT/HOW/FLOW 抽出 → 既存照合 → 仕様確認 →
  生成〔生ログ除外〕→ 公式スキルガイドで品質検証 の6フェーズ）
- **CLAUDE.md** … 追記＋曖昧/誤り記述の補強・修正（triage で最優先）
- **rules（`.claude/rules/`）** … 追加＋既存ルールの厳格化。`backend/**` 等の**パス条件付き**を優先
- **hook** … 新規雛形＋既存 hook の修正（全文＋settings 差分を提示して明示承認）
- **エージェント** … 定義の改善（プロンプト/`tools`/モデル階層）＋新規サブエージェント作成、
  エージェント `MEMORY.md`（合法的例外）で「同じ指摘を2回しない」を定着

## 安全策

- **承認制**: 候補を1件ずつ提示し Accept / Reject / Modify。承認なしに1ファイルも変更しない。
- **ロールバック**: 各 Edit 前に `<file>.bak` 退避。`settings.json` など JSON マージ系は
  追加エントリだけを記録して差分単位で復元（他設定を巻き戻さない）。
- **品質ゲート**: self-review →（任意で `/peer` か `/ask-claude` に独立レビュー）→ 公式スキルガイド検証 →
  秘密情報・公開可否チェック（kb のサニタイズ規律）。
- **サニタイズ**: backlog にも成果物にも、生ログ・絶対パス・秘密情報を残さない。

## 配置（ローカル・リポジトリ外）

```
~/.claude/self-improve/<project>/
├── queue.tsv                 # SessionEnd フックが積む対象セッション参照
├── improvement-backlog.md    # improve-scan が貯める改善候補（"- [ ] ..." 形式）
└── last-apply                # improve-apply が更新する適用タイムスタンプ（擬似定期の基準）
```

`<project>` キーは**フック・スキル共通**: `cwd` を `.claude/` か `CLAUDE.md` を持つ最も近い上位
ディレクトリに正規化し（git 非依存）、`printf '%s' "$root" | cksum | cut -d' ' -f1`。
**リポジトリ外**なのでチームへのコミット混入が無く、**プロジェクト単位**なので案件が混ざりません。

## ファイル構成

```
self-improve/
├── README.md
├── .claude-plugin/plugin.json
└── .claude/
    ├── skills/
    │   ├── improve-scan/SKILL.md
    │   └── improve-apply/SKILL.md
    ├── hooks/
    │   ├── si-session-end.sh     # SessionEnd: 検出してキューへ
    │   └── si-session-start.sh   # SessionStart: 未処理件数＋経過日数を通知
    ├── hooks.json                # 上記2フックを配線（プラグイン導入で自動ON）
    └── settings.json             # 手動導入時の登録サンプル
```

## 導入方法

### 方法1: プラグインで導入する

```
/plugin marketplace add mrkxlia/claude-code-workbench-ja
/plugin install self-improve@workbench-ja
```

プラグイン導入時は `hooks.json` 由来の検出/通知フックが自動で有効になります
（knowledge-share・codex-bridge と同じ前提）。

### 方法2: コピーして導入する

```bash
mkdir -p .claude/skills .claude/hooks
cp -r self-improve/.claude/skills/*  .claude/skills/
cp -r self-improve/.claude/hooks/*   .claude/hooks/
```

> フックはコピーしただけでは動きません。`~/.claude/hooks/` に置き、`self-improve/.claude/settings.json`
> のサンプルを参考に `~/.claude/settings.json` の `hooks.SessionStart`／`hooks.SessionEnd` に追記して
> ください（`$HOME` ベース）。スキルだけ使う場合はコピーだけで動きます。フックは bash 系のため
> Windows は Git Bash / WSL が必要・`jq` は不要です。

## 使い方の例

```
/improve-scan              # 回収キューのセッションから改善候補を backlog に貯める
/improve-scan --days 7     # 直近7日のトランスクリプトを走査
/improve-apply             # backlog を1件ずつ承認して適用
```

自然文（「最近のセッションを振り返って改善候補を出して」「backlog を反映して」）でも発動します。

## ライセンス・出典

[MIT License](../LICENSE)。自己改善ループの構成は以下を参考にした独自実装です（コードのコピーでは
ありません）。先行事例に無い**ロールバック・kb 連携・依存ゼロの品質ゲート（peer/ask-claude）・
客観ログ突合（嘘のない改善）**を加えています。

- TerenceBristol/claude-improve（`/improve`＝会話シグナル検出 → 設定ファイルを1件ずつ承認で改善）
- accidentalrebel/claude-skill-session-retrospective（セッション・レトロスペクティブ）
- takiko「Claude Code のログからスキルを作る」（ログ → スキル化の6フェーズ・品質検証）
- toarusyakaijin「Claude Code 自己改善システム」（skills-evolve/skills-learn・パス条件付き rules・
  エージェント永続メモリ・段階的育成）
- 公式: [Claude Code スキル ドキュメント](https://code.claude.com/docs/en/skills)
