<!-- PIPELINE-INTEGRATION: この行より上は原本（sentinel の source: 参照）と同一に保つ。
     このファイルは tools/skill-sync が原本 + tools/skill-sync/fragments/spec-extract-pipeline-integration.md
     から生成する派生物。直接編集せず、原本または fragment を編集して
     `python3 tools/skill-sync/sync.py` を実行すること（`--check` は CI で検証のみ行う）。 -->

## パイプライン連携（software-pipeline / task-pipeline 統合連携版）

このコピーは software-pipeline（feature-pipeline）と task-pipeline の**両方で同一内容**の
統合連携版。単体利用の原本は `templates/implementation-skills/.claude/skills/spec-extract/` にある。

### モード判定（成果物がプログラムかそれ以外か）

次の優先順で**コードモード**か**成果物モード**かを決める:

1. オーケストレーター・エージェント定義から対象やモードの指示があればそれに従う
2. `docs/pipeline/<slug>/` が進行中 → コードモード、`docs/task-pipeline/<slug>/` が進行中 → 成果物モード
3. どちらも無ければ、逆引きする対象の種類で判定する: プログラム（ソースコード・テスト・API）なら
   コードモード、それ以外（図・ドキュメント・レポート等の成果物群）なら成果物モード

パイプライン外の単体利用では、この節は適用されず原本どおりに振る舞う。

### 位置づけ: パイプラインの「入口」（両モード共通）

spec-extract はパイプラインの**前工程**として使う。仕様書のないレガシーなコード/成果物群に
パイプラインを導入するときの推奨フロー:

1. `/spec-extract <対象>` で現状（コードモード: 挙動 / 成果物モード: 内容・構成・表記規約）を
   SPEC.md に固定する
2. 人間が SPEC.md をレビューし、`[不明]` の質問に答えられる範囲で答える
3. コードモード: `/feature-pipeline <機能>` を開始 — codebase-researcher が SPEC.md を一次資料として読む。
   成果物モード: `/task-pipeline <依頼>` を開始 — source-researcher が SPEC.md を一次資料として読む

パイプラインの**出口**（最終検証フェーズの後）では呼ばない。その時点では story.md /
requirements.md / brief.md / api-contract.md という順方向の仕様が既に存在し、逆引きは冗長になる。

### モード別の読み替え表

コードモードでは原本どおり。成果物モードでは原本のコード前提語を次のように読み替える:

| 原本（コード前提） | 成果物モード（task-pipeline） |
|---|---|
| tests／test name アンカー | 受け入れ基準・レビュー観点・参照素材のパス |
| `F-NN` 機能要件 | `D-NN` 成果物要件（章・節・図要素の単位） |
| 「挙動を変えた」 | 「成果物の内容・構成・表記規約を変えた」 |
| コード `file:line` 物証 | 成果物ファイルのパス・見出し・図ノードID |
| `docs/pipeline/<slug>/` | `docs/task-pipeline/<slug>/` |

`[確定]/[推定]/[不明]` ラベルと「物証主義」、clarify パス、変更管理（追加/変更/廃止・改訂履歴）は
両モードでそのまま流用する。

### 証拠インベントリの拡張（原本の手順2に追加）

対象リポジトリに `docs/pipeline/`（コードモード）または `docs/task-pipeline/`（成果物モード）が
ある場合、以下を**最上位の証拠ソース**として扱う:

- `docs/.../*/implementation-notes.md` — 実装/作成時の判断・逸脱・ハマりどころ（[推定]→[確定] の格上げ材料）
- `docs/pipeline/*/story.md`・`docs/task-pipeline/*/requirements.md` / 各 `brief.md` —
  承認済みの要件・設計（意図の一次資料）
- `docs/pipeline/*/api-contract.md`（コードモードのみ） — API 仕様（インターフェース節の根拠）

### 出力場所は原本どおり

SPEC.md はリポジトリルートまたは対象モジュール/成果物群の隣に置く。`docs/.../<slug>/` 配下には
置かない — SPEC.md は機能/依頼単位ではなく、コードベース/成果物群単位の成果物のため。
