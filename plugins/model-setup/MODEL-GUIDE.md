# MODEL-GUIDE — プロファイルとワークフローの設計メモ

> 2026-10-06 に縮小した。モデル仕様表・価格・effort の意味・各モデルの prompting guide の要約は、
> 公式ドキュメントの言い直しで、すぐ古くなるため削除した（§1 のリンクから原文を読む）。
> ここに残すのは、このテンプレート独自の判断 — 2プロファイルの分け方・エスカレーション・
> Fable 5.1 の挙動を何で再現するか・AIDLC 簡易版の写像 — だけ。
> 経緯: `docs/decisions/2026-10-06-repo-cleanup.md`

## 1. 公式情報（原文を読む）

| 知りたいこと | 一次情報 |
|---|---|
| モデルの仕様・価格・リタイア日 | [Models overview](https://platform.claude.com/docs/en/about-claude/models/overview)・[Pricing](https://platform.claude.com/docs/en/about-claude/pricing) |
| Claude Code でのモデル指定・エイリアスの行き先・`opusplan` | [Model configuration](https://code.claude.com/docs/en/model-config) |
| effort の段階と既定値 | [Effort](https://platform.claude.com/docs/en/build-with-claude/effort) |
| モデル別のプロンプトの書き方（スニペットつき） | [Opus 5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5)・[Sonnet 5.5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5-5)・[Fable 5.1](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-1)・[Best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) |
| サブエージェントの `model:`／`effort:` | [Sub-agents](https://code.claude.com/docs/en/sub-agents) |
| 圧縮後に何が残るか | [What survives compaction](https://code.claude.com/docs/en/context-window#what-survives-compaction) |

## 2. プロファイル

### 私用 PC（Opus + Sonnet・git あり・Codex 不使用）

```json
{ "model": "opusplan" }
```

計画を Opus、実行を Sonnet に分ける。effort は settings に書かない（ユーザー設定のトップレベル
`effortLevel` は Opus 5.5・Sonnet 5.5 に効かない — 上の Model configuration）。実行側は既定のまま始め、
難しい・長い作業だけ `/effort high` にする。CLAUDE.md（ルール1〜4）の後ろに `CLAUDE.private.md`
（ルール5〜6）を追記する。

**Opus 5 が実行側に回るとき**（`/model opus` 等）は、公式 Opus 5 ガイドに従い検証と委譲の指示を
減らす。追補ルール6 はこれを織り込み済み（`/verify-fresh` は引き渡し前の1回だけ、ルール3 は省略可）。

### 会社 PC（Sonnet のみ・git なし・Codex CLI あり）

```json
{ "model": "sonnet" }
```

CLAUDE.md（ルール1〜4）の後ろに `CLAUDE.company.md`（ルール5〜6）を追記する。上位モデルに
逃がせないので、構造（pipeline・verify-fresh・review-panel）と effort の引き上げ（§3）で補う。

git が無い環境での代替策:
- **版管理**: 作業単位でのフォルダ／zip コピー退避
- **レビュー**: 単一モデルの自己レビューは偏りやすい。Codex CLI があるので公式 Codex プラグインの
  レビューで第二の目を確保する（git が無くても対象ファイル指定でレビューできる）

計画だけ確定させて別セッションで実行させたいときは、本体の Plan モードの計画ファイルを使う
（追加のスキルは作らない）。

## 3. エスカレーション規則

- **手戻りが2回続いたタスクは、1段上のモデル／effort に切り替える。**
  （例: Sonnet `high` で2回失敗 → `xhigh` へ、または Opus へ。Opus の高 effort でも届かない → Fable 5.1）
- 設定では完全には埋まらない領域: 受け入れ条件を書くこと自体が仕事の核心になる設計判断、
  「何がシンプルか」のようなルール適用の判断そのもの。これらは上位モデルへの切り替えで対応する。
- 長時間作業で完了条件の判定を機械に任せたいときは本体の `/goal`。圧縮で会話中の制約が薄れるのを
  避けたいなら、制約を Plan モードの計画ファイルか CLAUDE.md に書く（どちらも圧縮後に再注入される）。

## 4. Fable 5.1 パリティマップ

Fable 5.1 の挙動を、このテンプレートでは何が担うかの対応表。2026-10-06 に、本体機能・公式スニペットで
足りる行は担い手を本体・公式に移した（スキルを作り直さない）。

| Fable の挙動 | 担い手 |
|---|---|
| 並列サブエージェント委譲（委譲中も作業継続） | **本体**（Opus 5 は自ら委譲する）・dynamic workflows・`/batch` |
| fresh context 検証（自己批評より有効） | `/verify-fresh` ＋ `fresh-verifier`（Opus 5 実行時は引き渡し前の1回） |
| 早期停止しない自律完走 | **本体の `/goal`** ＋ 公式 Fable 5.1 ガイドの「Finish the whole task」スニペット（原文で貼る） |
| 証拠に基づく進捗報告・結論先行の報告 | 公式 Fable 5.1 ガイドのスニペット（原文で貼る）＋ ルール4（確信度と3点報告） |
| 評価と実行の境界（頼まれるまで直さない） | 追補ルール5 |
| 変更とテストを依頼範囲に限定 | 公式 Sonnet 5.5 ガイドのスニペット（原文で貼る） |
| コンパクション要約で残すもの | 公式 Fable 5.1 ガイドのスニペット＋ Plan モードの計画ファイル（再注入される） |
| メモリ（教訓の記録・更新） | **本体の auto memory** |
| 着手前の仕様の確定 | ルール1（完了条件）＋ **本体の Plan モード** |

**5.1 固有で再現不要の挙動**（Sonnet/Opus には元々その傾向が無い、または API 側の話）:
部分編集でなくファイル全体を書き直しがち／`xhigh`・`max` で長文成果物を思考内で下書きしてしまう／
安全分類器の誤検知／thinking ブロックの束縛／取得元の文章を引用符なしで再現しがち。

## 5. AIDLC 簡易版ワークフロー（Plan モード起点の自動ルーティング）

AWS Labs [AI-DLC (aidlc-workflows)](https://github.com/awslabs/aidlc-workflows) —
「AI が提案し、人間が承認する」ゲート付き開発ライフサイクル — を、**新しいルールツリーを作らずに**
既存資材へ写像した簡易版。実装の本体は追補ルール6「ワークフローの既定」で、エンドユーザの操作は
「**Plan モードで普通に依頼 → 計画を承認**」の2つだけ。

| AIDLC の概念 | 担い手 |
|---|---|
| Intent（意図の表明） | Plan モードでの普通の依頼（`PROMPTS.md` #0 のテンプレートを貼るとさらに確実） |
| Inception: 要件確認 | Plan モードでのまとめた質問／深い要件は `grilling`〔pipeline 導入時〕 |
| Inception: 設計・計画 | Plan モードの実行計画（使うスキル分担・検証チェックポイントを明記） |
| 承認ゲート（Human in the Loop） | Plan 承認（唯一のゲート）／パイプラインの3チェックポイント |
| Construction: 実装 | 軽微なら直接実行。機能開発 → superpowers〔導入時〕、非コード成果物 → `task-pipeline` |
| Units of Work（並列作業単位） | 本体のサブエージェント委譲・dynamic workflows・`/batch`／pipeline の並列実行グループ |
| 検証（レビュー役の分離） | `/verify-fresh`（`fresh-verifier`）。コードは外部 CLI へのレビュー委譲、設計・文書は `review-panel`〔導入時〕 |
| 複雑度適応 | 軽微な変更（1〜2ファイル・完了条件が自明）はパイプラインを通さず直接実行 |
| 成果物の集約 | `notes`（実装ノート）〔導入時〕・本体 auto memory — 新規の仕組みは作らない |

削ったもの: ルールツリー（aidlc-rules/）→ 追補ルール1本／opt-in 拡張機構 → プラグインの導入有無／
Operations フェーズ → 対象外。

設計の裏づけ: ゲート付き spec/plan 先行は業界の収束点（[spec-kit](https://github.com/github/spec-kit)・
[BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD)・AI-DLC）。外部フィードバックなしの
自己修正は不安定（[Huang et al., ICLR 2024](https://arxiv.org/abs/2310.01798)・
[Kamoi et al., 2024](https://arxiv.org/abs/2406.01297)）→ fresh context の `/verify-fresh` を挟む根拠。

## 6. Fable 本人にやらせる仕事（上位モデルが一時的に使えるとき）

| 優先度 | 仕事 | なぜ Fable 本人でないと駄目か |
|---|---|---|
| 高 | このテンプレート（ルール・追補・スキル・エージェント）の監査 | 再現の正解は本人の挙動。Sonnet/Opus に自分自身の再現度は測れない |
| 高 | 受け入れ条件を書くこと自体が核心になる設計判断と、その決定記録 | §3 で上位モデル向けとした領域 |
| 高 | 後日 Sonnet/Opus が実行する作業の計画（完了条件・スコープ・検証方法つき） | 計画の質が実行の質を決める |
| 中 | リポジトリ横断の網羅監査（陳腐化・矛盾・リンク切れ） | 自己選別せず全件出す力 |
| 低 | typo 修正・version bump などの機械的作業 | Sonnet で十分 |
