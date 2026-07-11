# RESEARCH — 自己改善エージェントの論文・実装例調査ノート

self-improve セクション（発見 → 承認制で適用する自己改善ループ）を先行研究・先行実装の文脈に
位置づけるための調査ノートです。README の「ライセンス・出典」に挙げた直接の参考元4件に加えて、
**学術論文の系譜**と **Claude Code 向け OSS 実装**を体系的に整理します。

- 調査日: 2026-07-11（Web 検索ベース。リンクは調査時点のもの）
- 対象範囲: LLM エージェントの「自己改善」— 振り返りの蓄積・スキルの自動獲得・
  エージェント定義自体の書き換え・変更の受理判定
- 対象外: モデル重みの更新（ファインチューニング・RLHF 等の勾配ベース学習）

---

## 1. 学術論文の系譜

自己改善エージェントの研究は、おおまかに「①エピソード間の反省 → ②スキルの蓄積 →
③エージェント定義そのものの書き換え → ④変更の安全な受理判定」へと発展してきました。
self-improve はこの4層すべてに対応物を持ちます（対応表は §3）。

### ① エピソード間反省系 — 「振り返りを言語で残して次に活かす」

| 論文 | 年 | 要点 |
|---|---|---|
| [Self-Refine](https://arxiv.org/abs/2303.17651)（Madaan et al.） | 2023 | 単一エピソード内で自己批評 → 修正を反復。自己改善の最小単位 |
| [Reflexion](https://arxiv.org/abs/2303.11366)（Shinn et al.） | 2023 | 失敗後に言語的な振り返り（verbal reflection）を記録し、次試行のプロンプトに前置。勾配更新なしで HumanEval pass@1 91%（GPT-4 素は 80%） |
| [ExpeL](https://arxiv.org/abs/2308.10144)（Zhao et al.） | 2023 | 過去の成功/失敗経験から知見（insights）を抽出・蓄積して再利用 |
| [Agent Workflow Memory](https://arxiv.org/abs/2409.07429)（Wang et al.） | 2024 | 過去の軌跡から再利用可能なワークフロー（手順）を帰納してメモリ化 |

**self-improve との関係**: improve-scan の失敗ルート（訂正・繰り返し指示・行き詰まり・
エラー自力回避の検出）は Reflexion / ExpeL の「失敗を言語化して次に残す」の実装形です。
ただし振り返りをプロンプト前置やメモリではなく、**スキル・CLAUDE.md・rules という
恒久成果物への編集候補**として backlog に外部化する点が異なります。

### ② スキルライブラリ系 — 「獲得した手順を再利用可能な資産として貯める」

| 論文 | 年 | 要点 |
|---|---|---|
| [Voyager](https://arxiv.org/abs/2305.16291)（Wang et al.） | 2023 | Minecraft で再利用可能なコードスキルを書いて成長するスキルライブラリに蓄積。勾配更新なしの生涯学習の原型 |
| [SkillForge](https://arxiv.org/pdf/2604.08618) | 2026 | クラウド技術サポート領域でのドメイン特化スキルの自己進化。産業応用での検証 |
| [MUSE-Autoskill](https://arxiv.org/html/2605.27366v1) | 2026 | スキルの作成・再利用・整理・評価（ユニットテスト＋実行時フィードバック）を統一ライフサイクルで管理。スキル単位のメモリを持つ |

**self-improve との関係**: 「スキルを恒久成果物として貯める」発想は Voyager が原型。
improve-scan の成功ルート（ツール呼び出し履歴 vs SKILL.md の客観突合）は、MUSE-Autoskill の
「実行時フィードバックによるスキル評価」に相当します。

### ③ 自己書き換え系 — 「エージェント定義そのものを改変する」

| 論文 | 年 | 要点 |
|---|---|---|
| [ADAS: Automated Design of Agentic Systems](https://arxiv.org/abs/2408.08435)（Hu et al.） | 2024 | メタエージェントがコードで新しいエージェント設計を探索・発明。メタ/ターゲットを分離した探索型 |
| [Gödel Agent](https://arxiv.org/abs/2410.04444)（[ACL 2025](https://aclanthology.org/2025.acl-long.1354/)） | 2024–2025 | 実行時メモリ（Python の変数空間）を自己検査し、自身のロジックを再帰的に改変。事前定義ルーチンに依存しない |
| [SICA: A Self-Improving Coding Agent](https://arxiv.org/abs/2504.15228)（Robeyns et al.） | 2025 | メタ/ターゲットの区別を排し、自身のコードベースを直接編集して改善。SWE-Bench Verified 部分集合で 17%→53% |
| [Darwin Gödel Machine](https://arxiv.org/abs/2505.22954)（Zhang, Hu, Lu, Lange, Clune） | 2025 | エージェントのアーカイブを進化的に成長させ（選択→改変→保存）、**各自己改変をコーディングベンチマークで実証検証**してから採用。80イテレーションで大幅改善 |
| [Huxley-Gödel Machine](https://arxiv.org/pdf/2510.21614) | 2025 | DGM 系列の後続。個体単発の性能ではなく子孫系統（クレード）全体の生産性近似で自己改変を選択 |

**self-improve との関係**: 「エージェント定義（スキル/CLAUDE.md/rules/hook/agent）を編集対象に
する」点で本セクションはこの系譜に属します。ただし SICA/DGM が**ベンチマークによる自動検証**で
変更を採否判定するのに対し、self-improve は**人間の1件ずつ承認＋品質ゲート＋`.bak` ロールバック**
で同じ役割を果たします（個人の開発環境にはベンチマークが存在しないため）。

### ④ 安全性・受理判定 — 「自己改変をいつ受け入れてよいか」

| 論文 | 年 | 要点 |
|---|---|---|
| [PACE: Anytime-Valid Acceptance Tests for Self-Evolving Agents](https://arxiv.org/pdf/2606.08106) | 2026 | 自己進化エージェントの変更を統計的に受理判定（anytime-valid な受理検定）。「改善したつもりの劣化」を統計的に弾く |

**self-improve との関係**: improve-apply の品質ゲート（self-review → 任意の独立レビュー →
公式スキルガイド検証 → 秘密情報チェック）は、PACE が統計で行う受理判定の「レビュー版」です。

---

## 2. OSS / コミュニティ実装（主に Claude Code 向け）

調査時点で確認できた実装の比較です（✅=あり / —=なし・不明）。

| 実装 | 改善対象 | トリガー | 承認制 | ロールバック | 鮮度管理 |
|---|---|---|---|---|---|
| [TerenceBristol/claude-improve](https://github.com/TerenceBristol/claude-improve) ※README 既掲載 | 設定ファイル全般 | 手動 `/improve` | ✅ 1件ずつ | — | — |
| [UniM0cha/claude-self-improving-skills](https://github.com/UniM0cha/claude-self-improving-skills) | `~/.claude/skills/` | Stop フック（ツール呼び出し12回＋編集2件で発火）→ skill-distiller サブエージェント | —（自動） | ✅ 編集前バックアップ＋不正内容の自動ロールバック | ✅ 未使用30日で stale・90日でアーカイブ・使用3回以上で劣化半減 |
| [bokan/claude-skill-self-improvement](https://github.com/bokan/claude-skill-self-improvement) | CLAUDE.md | 手動 | ✅ 提案のみ（CLAUDE_IMPROVEMENTS.md に頻度順で出力） | — | — |
| [Kulaxyz/self-learning-skills](https://github.com/Kulaxyz/self-learning-skills) | スキル/ルール（Claude Code / Cursor / AGENTS.md 横断） | セッション内で「golden path」を検知 | ✅ | — | — |
| [aviadr1/claude-meta](https://github.com/aviadr1/claude-meta) | CLAUDE.md | メタルール（Reflect → abstract → generalize → add） | —（自動追記） | — | — |
| [Shmayro/singularity-claude](https://github.com/Shmayro/singularity-claude) | スキル | 実行ごとに5次元スコアリング（正確性/完全性/エッジケース/効率/再利用性）、平均50未満で自動リライト | —（自動） | ✅ バージョン管理（draft→tested→hardened→crystallized の成熟段階） | ✅ スコア履歴・テレメトリを `~/.claude/singularity/` に蓄積 |
| [ChristopherA の bootstrap seed prompt](https://gist.github.com/ChristopherA/fd2985551e765a86f4fbb24080263a2f) | 設定システム全体 | シードプロンプト1つから自己進化 | — | — | — |
| **self-improve（本セクション）** | スキル/CLAUDE.md/rules/hook/agent | SessionEnd 検出＋SessionStart 通知（半自動）、適用は手動 | ✅ 1件ずつ Accept/Reject/Modify | ✅ `.bak`＋JSON は差分単位 | —（§4 の取り込み候補） |

関連資料:

- [anthropics/claude-code Issue #57830](https://github.com/anthropics/claude-code/issues/57830) —
  Hermes Agent 型の「経験からの自律スキル生成ループ」の公式機能要望。コミュニティ実装が乱立する
  背景に、本体機能としての需要があることを示す
- [Yohei Nakajima「Better Ways to Build Self-Improving AI Agents」](https://yoheinakajima.com/better-ways-to-build-self-improving-ai-agents/) —
  自己改善エージェントの実装パターンの整理（BabyAGI 作者によるブログ）

**観察**: 実装は「全自動型」（UniM0cha / singularity-claude / claude-meta）と「承認型」
（claude-improve / bokan / self-improve）に二分されます。全自動型は鮮度管理・スコアリングなどの
**自己修復機構**が発達している一方、承認型はロールバックと提案品質に投資しています。
両方（承認制＋ロールバック＋フック検出）を備えるのは調査時点で self-improve のみでした。

---

## 3. self-improve の設計と先行研究の対応表

| self-improve の設計 | 先行研究での対応物 |
|---|---|
| 発見（improve-scan）と適用（improve-apply）の分離 | Reflexion の「振り返り生成」と「次試行での利用」の分離。ADAS のメタ/ターゲット分離にも相当 |
| improvement-backlog.md（候補の蓄積） | Voyager のスキルライブラリ、DGM のエージェントアーカイブの「候補プール」に相当 |
| 承認制（1件ずつ Accept/Reject/Modify）＋品質ゲート | DGM のベンチマーク実証検証・PACE の統計的受理判定の**人間版**。個人環境にはベンチマークが無いため人間承認で代替 |
| `.bak` ロールバック・JSON 差分復元 | DGM が「劣化した自己改変を破棄してアーカイブの別系統から再出発」する機構のローカル版 |
| 成功ルートの客観ログ突合（ツール履歴 vs SKILL.md） | MUSE-Autoskill の実行時フィードバックによるスキル評価。「嘘のない改善」＝実証ベースの採否という DGM の思想と同型 |
| kb-harvest との昇格閉ループ（#promote → 恒久成果物） | ExpeL の「経験 → 知見 → 再利用」パイプラインの、メモから恒久成果物への昇格版 |

---

## 4. 取り込み候補のアイデア（1・3 は v0.3.0 で導入済み）

先行事例から self-improve に取り込む価値がありそうなもの:

1. **スキル鮮度管理**（UniM0cha 式）— スキャン範囲で未使用の自作スキルを「アーカイブ or
   トリガー改善」候補として backlog に挙げる。「増やす」だけでなく「減らす」方向の自己改善
   → **v0.3.0 で導入**（improve-scan の棚卸しルート）
2. **スキル利用実績トラッキング**（singularity-claude 式）— スキルごとの利用回数・スコア履歴を
   継続的に蓄積し、劣化検知に使う（未導入。フックでの計測が必要になるため見送り中）
3. **適用前後の比較**（PACE / DGM 式）— improve-apply の適用記録に「期待する効果」を残し、
   次回 improve-scan で「同じ訂正が再発していないか」を突合して改善の効果を検証する
   → **v0.3.0 で導入**（improve-apply の期待効果記録＋improve-scan の効果検証）

---

## 出典・調査方法について

- 本ノートは Web 検索（2026-07-11 実施）に基づきます。GitHub リポジトリは内容を直接確認済み。
  arXiv / ACL Anthology のリンクは検索結果のタイトル・URL 一致で確認しています
- README の「ライセンス・出典」節に挙げた直接の参考元4件（claude-improve /
  session-retrospective / takiko 記事 / toarusyakaijin 記事）は本ノートの対象と重複するため、
  そちらの記載を正とします
