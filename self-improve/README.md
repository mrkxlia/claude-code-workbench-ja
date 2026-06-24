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

## kb-harvest との組み合わせ（密連携・閉ループ）

`knowledge-share`（kb / kb-harvest）と両方入れると、**捕捉 → 再発検知 → 恒久成果物へ昇格 →
リンク戻し**の閉ループになります。**プラグインは別のまま**で、共有データ契約だけで連携します
（コードは共有しません。**片方だけでも単体動作**します）。

```
  kb / kb-harvest ──(知見を ~/.claude/knowledge/ に捕捉)──▶ #promote タグ
        ▲                                                      │
        │ ④ リンク戻し                                          ▼
   (- 昇格: <path> を追記 / #promoted 化)            ② improve-scan が
        │                                            「昇格候補」として backlog 化
        └──────── ③ improve-apply が承認の上で ◀──── （再発回数はログから自前で数える）
                  .claude/rules・skill・CLAUDE.md へ昇格
```

連携の中身（すべてデータ層・後方互換）:

1. **キュー共有**: `improve-scan` は、`~/.claude/knowledge/queue/pending-sessions.tsv`（kb 側）が
   あれば自前キューと**併せて読み**、**`session_id`（TSV 2列目）で union・dedup** します。
   重複セッションは1件として扱い、二重処理しません。kb が無ければ自前キューだけで動きます。
2. **昇格候補の取り込み**: `#promote` 付き kb エントリや、ログ上で再発しているのに kb に既存
   エントリがあるものを「昇格候補」として backlog に挙げます。
3. **昇格の適用**: `improve-apply` が承認の上で `.claude/rules`・skill・CLAUDE.md へ昇格します。
4. **リンク戻し**: 昇格したら kb エントリの index タグを `#promote→#promoted` に更新し、本体に
   `- 昇格: <成果物パス>` を1行追記します（再提案防止＋知見が在り処を指す）。

> **抽出スクリプトは共有しません**。kb の `kb-extract-candidates.sh` は「エラー→解決ペア」抽出が
> 目的で、self-improve の検出対象（訂正/逸脱/スキルギャップ等）とは別物のため、improve-scan は
> 自前検出を使います。共有するのは「どのセッションを見るか＝キュー」と「昇格メタデータ」だけです。

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
