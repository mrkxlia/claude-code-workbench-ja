---
name: python-project-ops
description: >-
  依存関係のインストール・同期・追加・削除・更新、テスト実行、リント、型チェックなど、Python プロジェクトの運用作業全般で参照するスキル。uv・pytest・ruff などの操作依頼で発動する。
---

# python-project-ops

依存関係のインストール・同期・追加・削除・更新、テスト実行、リント、型チェックなど、
Pythonプロジェクトの運用作業全般で参照するスキルです。

---

## パッケージマネージャー（uv 専用）

**`uv` 以外のパッケージマネージャー（pip / poetry / conda）は使用しない。**

| 操作 | コマンド |
|------|---------|
| 依存関係を同期 | `uv sync` |
| パッケージを追加 | `uv add <package>` |
| 開発用パッケージを追加 | `uv add --group dev <package>` |
| パッケージを削除 | `uv remove <package>` |
| スクリプト実行 | `uv run python <script.py>` |
| テスト実行 | `uv run pytest` |
| リント | `uv run ruff check .` |
| フォーマット | `uv run ruff format .` |
| 型チェック | `uv run mypy src` |
| ノートブック実行 | `uv run papermill <input.ipynb> <output.ipynb>` |

---

## Pythonバージョン

`.python-version` ファイルで指定されたバージョンを使用する（デフォルト: 3.11）。

---

## 推奨ワークフロー

1. `pyproject.toml` を変更したら必ず `uv sync` を実行する
2. Pythonコードを追加・変更したら `uv run ruff check .` でリントを確認する
3. フォーマットは `uv run ruff format .` で自動修正する
4. コミット前に `uv run pytest` と `uv run mypy src` を実行する
5. CI が失敗した場合はローカルで再現してから修正する

---

## pyproject.toml の構成例

```toml
[project]
name = "analysis-project"
version = "0.1.0"
requires-python = ">=3.11"

[dependency-groups]
dev = [
    "pytest>=8.0",
    "mypy>=1.8",
    "ruff>=0.3",
    "papermill>=2.5",
]

[tool.ruff]
line-length = 88
target-version = "py311"

[tool.mypy]
python_version = "3.11"
strict = true
```
