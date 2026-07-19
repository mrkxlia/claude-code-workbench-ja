# SPEC: knowledge-share ＋ self-improve（横断ナレッジと自己改善の閉ループ）

Track B（最も CC 結合度が高い＝低忠実度）。**原本 `knowledge-share/.claude/{skills,hooks}` ・ `self-improve/.claude/{skills,hooks}`
を一次根拠**に起こした派生ドキュメント。グローバル KB ストア・`@import` 自動読込・transcript jsonl 採掘・SessionStart/End フック・
cksum プロジェクトキー・両者の閉ループ に依存するため、各ツールでは **degrade 必須**。確度ラベル: `[確定]`/`[推定]`/`[要確認]`。

## K0. 目的 `[確定]`

- **knowledge-share**: 複数セッション・複数リポジトリで解決した知見を横断ストアに貯め、次に同じ問題で即座に引けるようにする
  （`kb`＝記録/検索/昇格、`kb-harvest`＝過去ログから採掘）。
- **self-improve**: 単発セッションの訂正・繰り返し・行き詰まり・実態とスキル定義のズレを拾い、改善候補を貯め（`improve-scan`）、
  品質ゲート＋1件ずつ承認で恒久成果物（スキル・指示書・ルール・hook・エージェント）に適用する（`improve-apply`）。
- **閉ループ** `[確定]`: 捕捉 → 再発検知 → 恒久成果物へ昇格 → リンク戻し（`#promote`→`#promoted`・`- 昇格:` 追記）。片方だけでも単体動作。

## K1. ツール非依存の中核（SPEC＝共有）`[確定]`

- **KB エントリ書式**: `KB-YYYYMMDD-NN: タイトル` ＋ 日付/出典・環境・問題・原因・対処・物証・タグ・（任意）昇格。
- **kb の3モード**: 記録（重複チェック→topic 選定→本体追記→index 1行→予算 200行/25KB 管理）／検索（2段 grep・読み取り専用）／昇格（プロジェクト固有→一般形へ）。
- **採掘の判定**: 再発性（他リポジトリでも起こり得る）∧ 解決確認（実際に解決）だけ記録。質を絞る。
- **scan の2系統**: skills-evolve（ツール呼び出し履歴 vs SKILL.md の客観突合）／skills-learn（訂正・繰り返し・摩擦・自力回避・外部レビュー）。各候補に頻度・一貫性・根拠。
- **apply のゲート**: triage（指示書/ルール最優先）→ 成果物種別ごとに提案 → 品質ゲート（self-review＋任意ピア＋公式ガイド検証＋秘密チェック）→ **1件ずつ承認** → 適用（`.bak`/エントリ差分でロールバック可）→ 記録（kb 書き戻し・却下を例外記録・last-apply 更新）。
- **サニタイズ必須** `[確定]`: トークン・内部ホスト名・IP・顧客データ・個人情報・生ログ・絶対パスを記録しない。エラーは核心1行。
- **昇格ライフサイクル**: `#promote`（候補・kb-harvest/ユーザー）→ scan が拾う → apply が昇格確定し `#promoted` 化＋`- 昇格:` 追記。

## K2. ツール依存（実装ごと・degrade ポイント）

| 機構 | CC（原本） | Kiro | Codex |
|---|---|---|---|
| 横断ストア | `~/.claude/knowledge/`・`~/.claude/self-improve/<project>/` | `~/.kiro/knowledge/`・`~/.kiro/self-improve/<project>/` `[推定]` | `~/.codex/knowledge/`（ローカル）`[推定]` |
| index の自動読込 | `@import`（全セッション常時） | **steering `kb-index.md`（`inclusion: always`）** が自動読込の相当物 | `AGENTS.md` への索引断片（手動・限定的） |
| 過去ログ採掘 | `~/.claude/projects/*/` の transcript jsonl | Kiro セッションログ `[要確認]`（形式・場所） | Codex セッションログ `[要確認]`（無ければ harvest 不可） |
| キュー積み | SessionEnd フック→`queue.tsv`/`pending-sessions.tsv` | **Kiro hooks `SessionEnd`** で同等キュー | **フック貧弱→非対応**（手動 `--days`/パス指定で代替） |
| 通知 | SessionStart フック | **Kiro hooks `SessionStart`** | 非対応（手動起動のみ） |
| project キー | `cksum`（cwd 正規化） | 同一アルゴリズム流用可 | 同上 |
| 昇格先 | CLAUDE.md・`.claude/rules`・skill・hook・agent | steering・`.kiro/skills`・`.kiro/hooks`・`.kiro/agents` | AGENTS.md・`.agents/skills`・`.codex/agents`（hook 不可） |
| 品質ゲートのピア | `/peer`・`/ask-claude`（ai-peer） | Kiro 内のレビュー（または codex-bridge `/codex-ask`） | codex 自身・人手 |

## K3. degrade 方針 `[確定]`

- **Kiro**: ほぼ全機能を再現可。自動読込は steering(always)、採掘/キュー/通知は Kiro hooks ＋ セッションログ（`[要確認]`）。
  昇格先を Kiro 資産（steering/skills/agents/hooks）に読み替える。**transcript 形式が未確認のため、harvest/scan は手動 `--days`/パス指定を一次手段**にし、フック自動キューは確認後に有効化。
- **Codex**: フック・自動キュー・通知が無いため **kb（記録/検索/昇格）のみ移植**。auto-load は AGENTS.md の索引断片で限定的に代替。
  **kb-harvest / improve-scan / improve-apply はセッションログ＋フック依存のため本増分では非対応**（規範を AGENTS.md に明記して補う）。
  将来 Codex のセッションログ仕様が確認できたら harvest/scan を追加する。

## K4. 各ツール実装

- **Claude Code（原本）**: `knowledge-share/`・`self-improve/`（参照元）。
- **Kiro**: `../impl/kiro/{knowledge-share,self-improve}/`。skills（kb/kb-harvest/improve-scan/improve-apply）＋
  steering `kb-index.md`（auto-load）＋ hooks（SessionStart/End）。Kiro Power 同梱。
- **Codex**: `../impl/codex/knowledge-share/`。kb スキルのみ＋AGENTS.md 索引断片。harvest/scan/apply は K3 のとおり非対応（理由明記）。
