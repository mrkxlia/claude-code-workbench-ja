---
name: feedback-setup
description: >-
  フィードバックルール基盤を導入するセットアップスキル。ルール置き場の作成、フックの配線
  （プラグイン導入済みなら不要である旨の判定を含む）、最初のルールの作成、動作確認までを
  案内する。多数のファイルを書き込むワンショットの導入作業であるため自動発動はせず、
  /feedback-setup で名指しされたときだけ実行する。
disable-model-invocation: true
---

# feedback-setup — 導入（/feedback-setup）

## Step 1 — 導入形態を判定する

まず、**プラグインとして導入済みかどうか**を確認します。

- プラグイン導入（`/plugin install feedback-rules@workbench-ja`）なら、
  `hooks/hooks.json` により **3つのフックは既に自動配線済み**です。Step 3 は不要。
- ファイルをコピーして使う場合のみ、Step 3 の配線が要ります。

`python3 [エンジンのパス] doctor` が動くかどうかで、エンジンの場所も確認できます。

## Step 2 — ルール置き場を決める

| 置き場所 | 用途 |
|---|---|
| `~/.claude/feedback/` | 個人ルール。全プロジェクトで効く。**まずはこちら** |
| `[プロジェクト]/.claude/feedback/` | チームで共有したいルール。git にコミットする |

両方使えます（同名はプロジェクト側が勝ちます）。ディレクトリを作り、`README.md` を置いて
「ここは何か」を1行書いておくとチームに説明しやすくなります。

状態ファイル（`.violations.jsonl`・`.candidates.jsonl`・`.stop-attempts.*`）は同じ場所に
できます。プロジェクト側に置く場合は `.gitignore` に次を足すことを提案してください。

```gitignore
.claude/feedback/.violations.jsonl
.claude/feedback/.candidates.jsonl
.claude/feedback/.stop-attempts.*
.claude/feedback/changed_files.*.txt
```

## Step 3 — フックを配線する（コピー導入時のみ）

`hooks/feedback-hook.sh` と `hooks/feedback_rules.py` を対象リポジトリの `.claude/hooks/` へ
コピーし、`setup/settings.json` の内容を `.claude/settings.json` にマージします。
**既存の settings.json は上書きせず、hooks の各配列に追記**してください。

## Step 4 — 最初のルールを作る

いきなり大量に作らないこと。**実際に2回以上指摘した内容を1つ**ルール化するところから始めます。
作成は `/feedback-rule` に任せます。何を入れるか迷う場合の定番:

- テスト・lint を Bash から手動実行しない（`pre_bash`）
- 実装ファイルの前にテストファイルを書く（`pre_edit` の `absent_sibling`）
- 生成物・ロックファイルを手で編集しない（`pre_edit` の `path`）

## Step 5 — 動作確認する

```bash
python3 [エンジンのパス] doctor
echo '{"tool_name":"Bash","tool_input":{"command":"[検知させたいコマンド]"}}' \
  | python3 [エンジンのパス] guard
```

`doctor` の「備考」欄が空であること、`guard` が意図どおりの `permissionDecision` を返すことを
確認します。何も返らない（exit 0・出力なし）なら、パターンが当たっていません。

## Step 6 — 正規表現で書けないルールの扱いを説明する

指摘の多くは正規表現に落ちません（順序・意図・設計判断など）。選択肢は2つです。

1. **`enforce: []` のまま注入だけに頼る**（既定。count 3 以上で毎ターン注入される）
2. **モデルに判定させるフックを opt-in で足す**（判断が要るルール向け・追加コストあり）

2 を選ぶ場合の設定例（`.claude/settings.json` に**利用者が明示的に**足すもの。
このプラグインは既定では配線しません）:

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "agent",
            "prompt": "~/.claude/feedback/ 配下のルール（count 3 以上のもの）を読み、直前のターンの作業がそれらに違反していないか検査せよ。違反があれば hookSpecificOutput.decision を block にし、reason に違反したルール名と該当箇所を書く。違反が無ければ何も出力しない。$ARGUMENTS",
            "timeout": 60
          }
        ]
      }
    ]
  }
}
```

`type: "agent"` のフックは Read / Grep / Glob を使って実ファイルを確認できます（既定
タイムアウト60秒）。**毎ターン LLM 呼び出しが増える**ため、コストと遅延を説明したうえで
ユーザーに選ばせてください。判断が不要な機械的ルールは、必ず `enforce` で書きます。

## Step 7 — 限界を伝える

導入時に必ず伝えます（過信させないため）:

- サブエージェント内の操作・MCP ツール・`-p` のパイプ実行では、フックが発火しない、または
  判定が無視される経路があります
- モデルは禁止されたコマンドを**別の書き方で迂回する**ことがあります
- セキュリティ境界としては使えません。危険操作の遮断は `permissions.deny`・OS 権限・CI で行い、
  このプラグインは「同じ指摘を繰り返さない」ための開発体験の矯正に使います
