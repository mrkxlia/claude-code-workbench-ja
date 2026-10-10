# agent-flow — サブエージェントの木を Claude Code 内のペインで見る mod（同梱）

[Charlie0113-T/claude-agent-flow](https://github.com/Charlie0113-T/claude-agent-flow) を**無改変で同梱**したものです
（Apache-2.0、上流コミット `76ef8fb`・2026-10-08、2026-10-10 取得）。上流の README は [`README.upstream.md`](README.upstream.md)（英語）。

`/flow` で、セッションのサブエージェントとチームメイトの**木**をトランスクリプトの横のペインに出します。

- 1行が1エージェント: 状態・種類・名前・説明・経過時間・**いまの作業**（ツール呼び出しとその経過時間、または承認待ち）・呼び出し回数・終わったらトークン
- 行の `[+]` で詳細: モデル・プロンプトの抜粋・最後に書いた行・直近のツール呼び出し・トークン
- 承認待ちのエージェントを強調し、30秒を超えるツール呼び出しと、2分黙っている実行中のエージェントにも印を付ける
- 本体の一覧に出ないループ（Workflow のエージェント・本体のフォーク）は「unlisted loops」に畳んで出し、黙って消さない
- ペインを描けない場所（`-p`、VS Code 拡張）では同じ木を文字で出す。`/flow text` でいつでも文字で出す
- 狭い端末でプロンプトの上に置かれたときは、注意が要る行だけを出す

## なぜ同梱したか

このリポジトリで作っていた progress-pane のエージェントの地図を、公開 mod と読み比べた（2026-10-10）。承認待ち・詳細の展開・
一覧に出ないループの扱い・文字での代替・狭いときの出し分けのどれもこちらが上回っていたため、自作をやめて同梱した。
経緯は [`docs/decisions/2026-10-08-tsundoku-task-band-mod.md`](../../docs/decisions/2026-10-08-tsundoku-task-band-mod.md)。

## 同梱するときに確かめたこと

- **ライセンス**: Apache-2.0。[`LICENSE`](LICENSE) をそのまま置いている（NOTICE ファイルは上流に無い）。ソースは改変していない
- **何をするか（ソースで確認）**: 観測だけ。プロセスの実行・ネットワーク・ファイルの書き込み・モデルの呼び出しは無い。
  `$.store` には「ペインを開いたままにしていたか」の好みだけを保存する
- **同梱しなかった上流のファイル**: 上流の開発用のもの（`bun/`・`tests/`・`vendor/`・`scripts/`・`bunfig.toml`・`tsconfig.json`・
  上流の `.claude-plugin/marketplace.json`）。動かすのに要るのは `.claude-plugin/plugin.json`・`hooks/`・`assets/` だけ
- `claude plugin validate` が通ることを確認した。実機での描画は確かめていない

## 導入方法

```
/plugin marketplace add mrkxlia/claude-code-workbench-ja
/plugin install agent-flow@workbench-ja
```

上流から直接入れてもよい（上流の更新を早く受け取れる）: `/plugin install agent-flow --marketplace Charlie0113-T/claude-agent-flow`

## 上流との同期

このフォルダは上流の写しです。直したいところは上流に報告し、ここでは書き換えない。取り込み直すときは、上流の
`.claude-plugin/plugin.json`・`hooks/`・`assets/`・`LICENSE`・`README.md`（→ `README.upstream.md`）をそのまま上書きし、
この README の上流コミットと取得日を更新する（version は上流の plugin.json に従う）。
