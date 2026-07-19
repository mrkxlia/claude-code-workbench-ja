# agent-review-panel — 複数ペルソナの敵対的パネルレビュー

コード差分・実装計画・ドキュメントを、**異なるペルソナの複数サブエージェント**（既定3名）に
レビューさせる Claude Code スキル＆エージェント一式です。1名の意見ではなく、
**ブラインド並列回答 → 相互批判 → 応答・譲歩 → 統合**という討論を経た結論を返します。

| 使い方 | フェーズ | 出力 | 依存 |
|--------|---------|------|------|
| `/review-panel <対象>`（light・既定） | R0 実施判断 → R1 ブラインド並列 → R2 相互批判 → R3 応答・譲歩 → 統合 | 会話内要約 | **なし（CLI/git/ネット不要）** |
| `/review-panel deep <対象>` | light ＋ 引用検証 ＋ 裁定者の最終評決 | 会話内サマリ＋`docs/review-panel/*.md` レポート | なし |
| `/review-panel [deep] codex <対象>` | 上記に外部パネリスト（Codex）を混成 | 同上 | `codex` CLI（任意。未導入なら欠席扱いで内部のみ続行） |

## どれを選ぶか

- **1名のセカンドオピニオンで足りる（実装前の壁打ち・軽い相談）→ [`ai-peer`](../ai-peer/) の `/peer`**。
  そちらのほうがずっと軽い（Task 1回 vs 6〜9回）。
- **行レベルの網羅的なコードレビューが欲しい → 内蔵 `/code-review` か [`codex-bridge`](../codex-bridge/) の `/codex-review`**。
  単独レビュアーの網羅性が目的ならそちら。
- **重要な設計判断・リリース前・意見が割れそうな対象 → 本パネル**。指摘を討論でたたき合わせ、
  生き残った指摘・未解決の対立・全員一致の警告まで含めて返すのが本スキルの守備範囲です。
- **成果物が完了条件を満たすかの合否判定 → [`model-setup`](../model-setup/) の `/verify-fresh`**。

## なぜこの構成か

- **ファシリテーター＝メインの Claude（オーケストレーター）**: Claude Code のサブエージェントは
  サブエージェントを起動できないため、ラウンド進行・匿名化・ゲート適用は SKILL.md の手順として
  メインが担います。SKILL.md がプロトコルの正本です。
- **パネリストは1定義＋ペルソナ注入**: エージェント定義は `panel-reviewer` の1つだけで、
  視点の違いは `personas.md` の6ペルソナ（正確性ホーク・セキュリティ監査役・悪魔の代弁者・
  明晰性エディタ・実現可能性アナリスト・コスト保守モデラー）をプロンプト注入して作ります。
  サブエージェントの独立性は「定義ファイルが別か」ではなく「fresh context か・他者の回答を
  渡されていないか」で決まるため、定義を6つに分けても品質は上がらず保守だけが増えます。
- **ブラインド性は「渡さない」ことで担保**: Round 1 の各パネリストには他のパネリストの存在すら
  渡しません。ステートレスな fresh context なので、渡さなければ構造的に漏れません。
- **反グループシンク機構（採用5つ）**: ①構造的ブラインド ②ブラインドスコアリング＋全員一致警告
  （「全員一致は最も危険な失敗モード」）③具体性ゲート（反例・矛盾箇所のない批判は破棄）
  ④ゴーストパネリスト検証（空回答・契約不履行は1回だけ再委譲、駄目なら「欠席」— 声を捏造しない）
  ⑤追従的収束の検出（理由なき全面譲歩を無効化）＋ファシリテーター私見の分離。
- **見送ったもの（設計ノート）**: パネリスト間の複数往復討論（R2→R3 の1往復まで。往復を増やすと
  トークンが爆発する割に新しい論点はほぼ出ない）、6名超の大パネル（同一モデル内では視点の追加
  効果が逓減する）、light でのレポートファイル出力（軽い相談にファイルは過剰）。
- **同一モデルの限界**: 内部パネリストはすべて同じ Claude なので、モデル自体が共有するバイアスは
  ペルソナでは消えません。構造的な討論規律で単一レビュアーよりは堅牢になりますが、それでも
  残る相関を減らしたいときのために `codex` opt-in（異種モデル混成）を用意しています。

## プロトコル

```
Round 0   実施判断・編成承認（Task なし。単純な対象は /peer・/code-review へ誘導）
   │      対象パッケージを1回だけ構築（行番号つき・目安400行）
Round 1   panel-reviewer ×N を1ターンで一斉起動（ブラインド: 互いの存在を知らない）
   │      → 指摘リスト（物証つき）＋ブラインドスコア＋最重要指摘
Round 2   匿名化した他者所見を配布 → 具体的批判のみ（「疑わしい」は禁止・具体性ゲートで破棄）
Round 3   批判を受けた者だけ再起動 → 維持（根拠）/ 譲歩（理由）/ 修正
Synthesis 統合（合意した指摘・未解決の対立・譲歩履歴・スコア分布＋全員一致警告・私見は分離）

deep 追加:
検証      panel-verifier（haiku）が全指摘の file:line と引用を機械的に照合
          → CONFIRMED / LINE-MISMATCH / NOT-FOUND
裁定      panel-judge（討論に非関与の fresh context）が対立に裁定・重大度を再判定・
          全員一致チェック・最終評決（承認/条件付き承認/差し戻し）
レポート  docs/review-panel/<YYYYMMDD>-<slug>.md に出力
```

## 前提

- **light / deep** … 追加の前提なし（Claude Code だけで動く。git・ネットワーク不要）。
- **codex 混成** … `codex` CLI が導入・認証済みであること。詳細は
  [`codex-bridge/README.md`](../codex-bridge/README.md) の「前提」を参照（本プラグインは
  codex-bridge に依存しません — 未導入なら外部パネリストを欠席にして内部のみで続行します）。

## ファイル構成

```
agent-review-panel/
├── README.md
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   └── review-panel/
│       ├── SKILL.md               # /review-panel（プロトコル正本・ファシリテーター手順）
│       ├── personas.md            # ペルソナ6種（Task プロンプトへ注入するテンプレート）
│       └── report-template.md     # deep モードのレポート雛形
└── agents/
    ├── panel-reviewer.md          # 汎用パネリスト（ペルソナ注入型・read-only）
    ├── panel-codex.md             # 外部パネリスト（codex CLI を read-only 非対話で駆動）
    ├── panel-verifier.md          # deep: 引用検証係（haiku・機械的照合のみ）
    └── panel-judge.md             # deep: 裁定者（討論非関与の fresh context）
```

## 導入方法

### 方法1: プラグインで導入する

```
/plugin marketplace add mrkxlia/claude-code-workbench-ja
/plugin install agent-review-panel@workbench-ja
```

### 方法2: コピーして導入する

スキルとエージェントを、使いたいプロジェクトの `.claude/` にコピーします。

```bash
mkdir -p .claude/skills .claude/agents
cp -r plugins/agent-review-panel/skills/*  .claude/skills/
cp -r plugins/agent-review-panel/agents/*  .claude/agents/
```

グローバルに使いたい場合は `~/.claude/skills/`・`~/.claude/agents/` にコピーします。

## 使い方の例

```
/review-panel この実装計画をレビューして（…計画本文…）
/review-panel deep @docs/design.md
/review-panel codex この差分を敵対的にレビューして
/review-panel deep codex 5名で リリース前の最終チェックをして
```

自然文（「パネルレビューして」「複数の視点で徹底的にレビューして」「レビュー会議にかけて」
「Codex も混ぜて」）でも発動します。

## トークンの目安

- **light（3名）**: Task 6〜9回（R1×3＋R2×3＋R3×0〜3）。対象パッケージは1回構築・
  全ラウンド再利用、R2/R3 は指摘表のみ配布、批判ゼロのパネリストの R3 はスキップ。
- **deep（4名）**: 上記＋R1/R2/R3 が1名分増＋検証1回（haiku・安価）＋裁定1回。
- **codex 混成**: Codex 呼び出しは light=1回 / deep=最大2回。
- 単独レビューで足りる対象に使うと割高です（Round 0 で誘導されます）。

## ライセンス・出典

[MIT License](../LICENSE)。以下の2つのコンセプトを参考にした独自実装です
（コードのコピーではありません）。

- [wan-huiyan/agent-review-panel](https://github.com/wan-huiyan/agent-review-panel) —
  複数ペルソナの並列独立レビュー→討論→検証→裁定者という多フェーズ・パネル構成、
  ブラインドスコアリング・「全員一致は危険」フラグ・引用検証のコンセプト
- [makinux/adversarial-panel](https://github.com/makinux/adversarial-panel) —
  軽量4ラウンド敵対プロトコル（ブラインド並列回答→相互批判→応答・譲歩→統合）、
  「疑わしい」でなく反例で批判する検証優位性、ゴーストパネリスト・追従的収束・
  ファシリテーター私見分離という失敗モード対策、異種モデル混成のコンセプト
- スキル（入口）／エージェント（実行）の分業と要約契約は、本リポジトリ
  [`ai-peer`](../ai-peer/)・[`codex-bridge`](../codex-bridge/) と同型
