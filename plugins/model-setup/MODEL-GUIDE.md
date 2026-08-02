# MODEL-GUIDE — モデル・effort 選定ガイド

> 2026年7月時点の情報。Claude 5 世代（Fable 5 / Mythos 5）のリリースと Sonnet 5 の
> 導入価格終了（2026-08-31）を踏まえて書かれている。モデルの新世代が出たら要更新。

このドキュメントは、Fable 5（期間限定の Mythos 級モデル）が使えなくなった後、
**私用 PC（Opus 4.8 + Sonnet 5・git あり・Codex 不使用）** と
**会社 PC（Sonnet 5 のみ・git なし・Codex CLI あり）** の2環境で
効率よく Claude Code を使うための判断材料をまとめたものです。
本セクション（model-setup）の目標は、Fable 5 の挙動をプロファイル別のプロンプト
（CLAUDE.md＋追補）・スキル・サブエージェントで再現することであり、
どの挙動を何が担うかは末尾の「§8 Fable 5 パリティマップ」にまとめてあります。

## 1. モデル仕様表

| | Opus 4.8 | Sonnet 5 | Haiku 4.5 |
|---|---|---|---|
| 位置づけ | 複雑なエージェント型コーディング・企業向け | 速度と知性の最良バランス | 最速・準フロンティア級知性 |
| 価格（入力/出力 per MTok） | $5 / $25 | $3 / $15（〜2026-08-31 は導入価格 $2 / $10） | $1 / $5 |
| コンテキスト窓 | 1M tokens | 1M tokens | 200k tokens |
| 最大出力 | 128k tokens | 128k tokens | 64k tokens |
| adaptive thinking | あり（`thinking: adaptive` 明示） | 既定 ON | 拡張思考（extended thinking）対応 |
| effort 既定値 | high | high | — |
| 公式推奨の開始点 | コーディング/エージェント作業は **xhigh** | 最難タスクは **xhigh**、通常は既定の high | — |

出典: [Claude models overview](https://platform.claude.com/docs/en/about-claude/models/overview)、
[effort](https://platform.claude.com/docs/en/build-with-claude/effort)、
[Prompting Claude Sonnet 5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5)。

## 2. effort 早見表

| 設定方法 | 効果 | 持続性 |
|---|---|---|
| `settings.json` の `"effortLevel": "high"` | **Sonnet 5 の既定値と同じ**。設定しても挙動は変わらない（no-op） | 恒久 |
| `settings.json` の `"effortLevel": "xhigh"` | 実質的な格上げ。より粘り強く考える。トークン消費（コスト）は増える | 恒久 |
| `/effort` コマンド | セッション中にスライダーで変更。`max` はセッション限定 | セッション限定 |
| プロンプトに `ultrathink` | そのターンだけ深い推論を要求 | ターン限定 |

**注意**: 「settings.json に high を入れると粘る側に寄る」という紹介を見かけますが、
Sonnet 5 の既定は既に `high` なので、それだけでは挙動は変わりません。本当に深くしたいときは
`xhigh` を選び、コスト増と引き換えにします。

effort レベルは 5 段階（`low` / `medium` / `high` / `xhigh` / `max`）。`medium` は
Sonnet 4.6 の `high` 相当、Sonnet 5 の `high` は Sonnet 4.6 の `max` 相当という公式の
目安がある（ベンチマークする際はレベル名でなく実測の思考の長さで比較する）。

Sonnet 5 は effort レベルを**特に低い側で字義どおり守る** — `low`/`medium` では期待以上の
ことをせず、求められた範囲に作業を限定する。複雑な問題で推論が浅いときの第一手は
プロンプトの工夫ではなく effort の引き上げ（`high`/`xhigh`）。レイテンシ都合で低 effort を
維持する定型ルートには、的を絞った促し（`PROMPTS.md` #1）を貼る。

## 3. プロファイル

### 私用 PC（Opus 4.8 + Sonnet 5・git あり・Codex 不使用）

```json
{ "model": "opusplan", "effortLevel": "xhigh" }
```

`opusplan` は計画フェーズを Opus、実行フェーズを Sonnet で行うモデル設定。Opus が
計画を立て、Sonnet がその計画を実行する分担がそのまま活きる。
CLAUDE.md（ルール1〜9）の後ろに追補 `CLAUDE.private.md`（ルール10〜14）を追記して使う。

### 会社 PC（Sonnet 5 のみ・git なし・Codex CLI あり）

```json
{ "model": "sonnet", "effortLevel": "xhigh" }
```

根拠: 手戻りのコストはトークンのコストより高くつくことがほとんどなので、既定は xhigh。
予算が厳しい場合は `effortLevel` を設定から外し、既定の `high` で運用しつつ、
難しいタスクだけ `/effort xhigh` を都度指定する。
CLAUDE.md（ルール1〜9）の後ろに追補 `CLAUDE.company.md`（ルール10〜15）を追記して使う。

git が無い環境での代替策:
- **版管理の代替**: backlog.md への完了記録（日付・変更内容）＋作業単位でのフォルダ／zip
  コピー退避。
- **レビューの代替**: 単一モデル（Sonnet のみ）環境では自己レビューにバイアスがかかりやすい。
  会社では Codex CLI が使えるので、`codex-bridge` の `/codex-review` で第二の目を確保する
  （git が無くても対象ファイル指定でレビューできる）。

## 4. Opus で計画 → Sonnet で実行（「7/7まで…」前置きの恒久的な代替）

`opusplan` を設定していれば、計画立案は自動的に Opus が担う。より明示的に「計画だけ確定させて
別セッションで実行させたい」場合は、`plan-mode` の `/create-plan` で読み取り専用の実行計画
ファイルを作成し、新しいセッション（Sonnet）でそれを読ませて実行する。
**この用途の新しいスキルは作らない** — `create-plan` が既にこの役割を担っている。
なお `fan-out` スキルは「計画の引き継ぎ」ではなくセッション内の並列分担であり、
この役割（create-plan）とは重ならない。

以前は「あなたは期間限定の高性能モデルです。Sonnet が実行できる粒度で計画を」という前置きを
毎回書いていたが、`opusplan` 設定 + `create-plan` の組み合わせがこれを恒久的に代替する。

## 5. Sonnet 5 運用の要点（公式 prompting guide より）

- **指示を字義どおりに実行する。** 「これを全部のセクションに適用して」のように、
  適用範囲は明示しないと一部にしか広げない。
- **小出しの複数ターン指示は効率を落とす。** 最初のターンでタスク・意図・制約を
  完全に指定するほど、自律性と効率が上がる（→ `task-brief` を使う）。
- **high・xhigh effort ではツール使用がより積極的になる。** 探索的なコーディング・
  エージェント作業では xhigh から始めるのが公式推奨。
- **コードレビュー用途では「自己選別せず網羅で報告」を明示的に指示する。** 「重要なものだけ
  報告して」と言うと、Sonnet 5 は調査の深さ自体は落とさずに指摘の報告を絞り込みがちで、
  見かけ上の再現率（recall）が下がることがある。フィルタリングは別工程に任せ、
  発見工程では網羅性を優先させる（`model-setup/CLAUDE.md` ルール9）。
- **応答の長さはタスクの複雑さに応じて可変。** 特定の冗長性に寄せたいときはプロンプトで
  明示する（`PROMPTS.md` #8）。また長いエージェント作業中の進捗報告は素の品質が上がって
  いるため、「ツール呼び出しn回ごとに報告」のような機械的スキャフォールディングは足さない
  （区切り基準で報告する — long-run の報告規律と同じ）。
- **デザイン・フロントエンドは固定のハウススタイルに収束しやすい。** `temperature` が
  使えないため、多様性は「構築前に方向性を複数提案させて選ぶ」（`PROMPTS.md` #6、追補
  ルール14/15 の複数案比較）と具体仕様の明示で作る。本格運用は公式 `frontend-design`
  スキル・superpowers `brainstorming`（`docs/skills-guide/` 参照）。

## 6. 構造で補う（LLM アプリ・プロンプト開発編）

Sonnet/Haiku と Opus/Fable の差は「賢さ」ではなく「構造」で埋める、という knowledge-baton
プロジェクトで確立した運用知見を一般化したもの。プロンプトを書くアプリケーション開発
（RAG・分類・抽出・エージェントパイプライン等）で特に効く。

### 上位モデルとの差を埋める7つの作法

1. **1プロンプト1タスク。** 「読んで、分類して、差分を作って、要約もして」を1回で頼まない。
   パイプラインの各段に分割する。
2. **出力スキーマを固定する。** すべての LLM 呼び出しに厳密な出力形式（JSON スキーマ等）を
   指定し、コード側でバリデーション→不合格なら理由を添えて1回だけ自動リトライする。
3. **few-shot 例を必ず与える。** 特に「悪い例」を含める。精度が落ちたらまず例を増やす
   （抽象的な指示文の増強は効果が薄い）。
4. **コンテキストを絞る。** 関連する範囲だけを渡す。長文投入で解決しようとしない
   （渡しすぎが不調の主因になりやすい）。
5. **「わからない」を許可する。** 確信が持てない場合のエスカレーション出口
   （例: `needs_human`）を用意し、塞がない。曖昧なまま出力させるより安全。
6. **受け入れテストは実際に使うモデルの実機で行う。** 開発機（Opus/Fable）だけで
   確認して「合格」にしない。
7. **コーディング作業は小さく刻む。** 「1機能・1ファイル・テスト付き」の粒度。
   plan mode で計画→承認→実装の順を守る。大きなリファクタは spec を先に文書化する。

### 品質が出ないときの対処順序

1. few-shot 例を増やす・悪い例を追加する
2. タスクをさらに分割する（例: 軽量モデルで下書き→上位モデルで仕上げの二段構え）
3. 入力コンテキストを削る
4. 出力スキーマを厳しくしてリトライ条件を明確化する
5. それでもダメなら needs_human 率の上昇を許容し、人の承認負荷側で吸収する

**禁じ手**: プロンプトに「もっと賢く考えて」系の指示を足す／1プロンプトに役割を追加して
肥大化させる／スキーマ検証を外す。

### モデルルーティングの原則

- 判断や正確な構造化出力が要る仕事（依頼の解釈・差分生成・矛盾検知・コードレビュー支援）→
  **Sonnet**
- 分類・タグ付け・言い換え整形・一次スクリーニングのような、機械的で大量にループする処理 →
  **Haiku**
- 二段構え（Haiku で下書き→Sonnet で仕上げ）でコストと精度を両立させる
- 原則: **迷ったら Sonnet。ただしループで大量に回す処理は必ず Haiku で設計し、
  Sonnet は1件ずつの判断に使う。**
- サブエージェントの frontmatter で `model:` / `effort:` をタスクごとに指定できる
  （例: 機械的スキャン担当のエージェントだけ `model: haiku`）。
- この原則の同梱実装が `agents/` の3エージェント: `task-worker`（sonnet・汎用実行）／
  `fresh-verifier`（sonnet・検証専用）／`bulk-scanner`（haiku・機械的スキャン）。

## 7. エスカレーション規則

- **手戻りが2回続いたタスクは、1段上のモデル／effort に切り替える。**
  （例: Sonnet `high` で2回失敗 → `xhigh` へ、または Opus へ）
- CLAUDE.md や settings では完全には埋まらない領域: 長時間作業での序盤の制約保持、
  受け入れ条件を書くこと自体が仕事の核心になる設計判断、「何がシンプルか」のような
  ルール適用の判断そのもの。これらは上位モデルへの切り替えで対応する
  （序盤の制約保持は `/long-run` の「ブリーフ固定＋区切りごとの再読」で部分的に補える）。

## 8. Fable 5 パリティマップ

公式 [Prompting Claude Fable 5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5)
ガイド（2026-07）が挙げる Fable 5 の挙動と、それを本セクションで何が担うかの対応表。

| Fable 5 の挙動 | この構成での担い手 |
|---|---|
| 並列サブエージェント委譲（委譲中も作業継続） | `/fan-out` ＋ `task-worker` ＋ 追補ルール14（会社版は15） |
| fresh context 検証（自己批評より有効） | `/verify-fresh` ＋ `fresh-verifier` |
| 証拠に基づく進捗報告（捏造ステータスの排除） | 追補ルール10（既存ルール4・7の拡張） |
| 早期停止しない自律完走 | `/long-run` ＋ 追補ルール11 |
| 過剰計画の抑制（揃ったら着手） | 追補ルール11 後段 |
| 評価と実行の境界（頼まれるまで直さない） | 追補ルール12 |
| 結論先行・見ていない読者向けサマリ | 追補ルール13 |
| メモリ（教訓の記録・更新） | **knowledge-share プラグイン（`kb` / `kb-harvest`）を使う — 本セクションでは新規に作らない** |
| 長時間作業での序盤制約の保持 | `/long-run` の「ブリーフ固定＋区切り再読」＋ §7 エスカレーション（完全には埋まらない） |
| テストへの過剰適合の回避（汎用解の実装） | `task-worker` ルール5 ＋ `fresh-verifier` 観点4（未委譲の直接実装には `PROMPTS.md` #3） |
| 開いていないコードを推測で語らない | 追補ルール10（3点目・両プロファイル共通） |

**互換方向の注意**: 公式ガイドは「旧世代向けに書かれたスキルは Fable 5 には処方的すぎる
（削るほど良い）」とする一方、その裏返しとして **Sonnet / Opus 向けのスキルは処方的・
明示的に書くのが正しい方向**になる。本セクションの3スキル（fan-out / long-run / verify-fresh）が
長く具体的なのは意図的であり、「冗長だから」と簡略化しないこと。

## 9. AIDLC 簡易版ワークフロー（Plan モード起点の自動ルーティング）

AWS Labs [AI-DLC (aidlc-workflows)](https://github.com/awslabs/aidlc-workflows) —
「AI が提案し、人間が承認する」ゲート付き開発ライフサイクル — を参考に、
その流れを**新しいルールツリーを作らずに**このリポジトリの既存資材へ写像した簡易版。
実装の本体は追補ルール14（private）／15（company）「ワークフローの既定」で、
エンドユーザの操作は「**Plan モードで普通に依頼 → 計画を承認**」の2つだけに減らし、
スキルの選択・起動は CC 側が裏で行う。

### AIDLC の概念 → このリポジトリでの担い手

| AIDLC の概念 | このリポジトリでの担い手 |
|---|---|
| Intent（意図の表明） | Plan モードでの普通の依頼（`PROMPTS.md` #0 のテンプレートを貼るとさらに確実） |
| Inception: 要件確認（構造化質問） | `task-brief`（選択肢＋推奨値の一括質問）／深い要件は `clarify`〔pipelines 導入時〕 |
| Inception: 設計・計画 | Plan モードの実行計画（使うスキル分担・検証チェックポイントを明記） |
| 承認ゲート（Human in the Loop） | Plan 承認（唯一のゲート）／Step ごとに刻むなら `backlog-loop`／パイプラインの3チェックポイント |
| Construction: 実装 | 軽微なら直接実行。機能開発 → `feature-pipeline`、非コード成果物 → `task-pipeline`、汎用実装 → `task-worker` |
| Units of Work（並列作業単位） | `/fan-out` の分解（書き込み範囲が交わらないサブタスク）／pipelines の並列実行グループ |
| 検証（レビュー役の分離） | `/verify-fresh`（`fresh-verifier`）を要所で自動実行。コードは `/codex-review`、設計・文書は `review-panel`・`peer`〔各導入時〕 |
| 複雑度適応（adaptive execution） | 軽微な変更（1〜2ファイル・完了条件が自明）はパイプラインを通さず直接実行 |
| 成果物の集約（aidlc-docs/ 相当） | 作業メモ（long-run）・`notes`（実装ノート）・`kb`（教訓）〔各導入時〕 — 新規の仕組みは作らない |

### 簡易化で削ったもの

- **ルールツリー**（aidlc-rules/ の階層的ルール群）→ CLAUDE 追補のルール1本＋各スキルの既存手順で代替
- **opt-in 拡張機構**（extensions/）→ プラグインの導入有無〔導入時〕がそのまま opt-in にあたる
- **Operations フェーズ**（デプロイ・監視）→ 対象外（AIDLC 本家でも将来予定）

### 設計の裏づけ（類似実装・研究）

- **ゲート付き spec/plan 先行ワークフローは業界の収束点**: [GitHub spec-kit](https://github.com/github/spec-kit)
  （Specify→Plan→Tasks→Implement）・[BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD)
  （フェーズ別ロールエージェント）・AI-DLC が同型。本節はその最軽量版（ゲートは Plan 承認の1点）
- **役割分離マルチエージェントの有効性**: [MetaGPT](https://arxiv.org/abs/2308.00352)（PM/Architect/
  Engineer/QA の SOP 分業）・[ChatDev](https://arxiv.org/abs/2307.07924)（各段階で実装役と
  レビュー役が対話検証）が、複雑タスクでの役割分離の優位を報告 → pipelines・task-worker /
  fresh-verifier の分離の根拠
- **外部検証の必要性**: [LLMs Cannot Self-Correct Reasoning Yet](https://arxiv.org/abs/2310.01798)
  （Huang et al., ICLR 2024）・[自己修正の批判的サーベイ](https://arxiv.org/abs/2406.01297)
  （Kamoi et al., 2024）が「外部フィードバックなしの自己修正は不安定（悪化もある）」と報告。
  誤りを生んだ文脈を持たない fresh context の評価は有効 → `/verify-fresh` を要所で自動で挟む根拠
- **既知の失敗モード**: 単純タスクへのプロセス過剰（→ 複雑度適応）・マルチエージェントの
  トークンコスト（→ 軽微は直接実行・機械的スキャンは haiku の `bulk-scanner`）
