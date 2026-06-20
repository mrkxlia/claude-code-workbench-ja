# docs/ — リポジトリ横断の設計ノート

このディレクトリは、特定のセクション（`software-pipeline/` など）単体に閉じない、
**複数セクションをまたぐ設計提案・検討資料**を置く場所です。

セクション固有のドキュメントは各セクションの `README.md` に置き、ここには
「どのセクションに実装するかを含めて検討する段階」の資料を置きます。

## ファイル一覧

| ファイル | 内容 |
|---------|------|
| `pipeline-spec-alignment-proposal.html` | `software-pipeline` / `task-pipeline` / `implementation-skills` の3つに、既存リポジトリの仕様の「吸い出し（extraction）」と以降要件の「合致性（conformance）」を強制化するための設計提案・判断材料（案A 軽量強化 / 案B steering 層新設の比較）。ブラウザで開いて読む単一ファイル HTML。 |
