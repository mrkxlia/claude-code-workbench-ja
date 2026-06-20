# implementation-skills — 実装の文脈を残す・取り戻すスキル集

実装セッションをまたいで「コードの裏にある理由」を引き継ぐための Claude Code スキル2種です。
2つのスキルは対になっています。

- **notes** — これから書くコードの文脈を *残す*（実装しながら implementation-notes.md を記録）
- **spec-extract** — すでにあるコードの文脈を *取り戻す*（既存コードから SPEC.md を逆引き生成）

notes が残した implementation-notes.md は spec-extract の一次資料になり、逆引き仕様書の
「推定」を「確定」に格上げします。

---

## software-pipeline との関係

このディレクトリは**単体利用向けの原本**です。
[`software-pipeline/`](../software-pipeline/) には、この2スキルの**パイプライン連携版**が統合されています
（`software-pipeline/.claude/skills/notes/`・`spec-extract/`）。パイプライン連携版では、ビルダーが
`docs/pipeline/<slug>/implementation-notes.md` に判断を記録し、`/feature-pipeline 再開` が
Status ブロックを読み、spec-extract がレガシーコードへのパイプライン導入の入口になります。

- **パイプライン（feature-pipeline）と一緒に使う** → software-pipeline 側のパイプライン連携版（`/pipeline-setup` が自動配布）
- **単体で使う**（パイプラインを導入しないプロジェクト・単発の実装） → このディレクトリからコピー

パイプライン連携版は「原本の完全コピー + 末尾の `PIPELINE-INTEGRATION` マーカー以降に追加ルール」という
構造です。**このディレクトリの原本を更新したら、パイプライン連携版のマーカーより上を新しい原本で
まるごと差し替えてください**（一致確認コマンドは software-pipeline/README.md に記載）。

---

## ファイル構成

```
implementation-skills/
├── README.md                        # このファイル
└── .claude/skills/
    ├── notes/SKILL.md               # 実装ノート記録スキル（/notes）
    └── spec-extract/SKILL.md        # 仕様書逆引き生成スキル（/spec-extract）
```

---

## 使い方

`.claude/skills/` 配下のディレクトリを、使いたいプロジェクトの `.claude/skills/` にコピーするだけです。

```bash
# 例: 自分のプロジェクトに両方インストール
cp -r implementation-skills/.claude/skills/notes      <your-project>/.claude/skills/
cp -r implementation-skills/.claude/skills/spec-extract <your-project>/.claude/skills/
```

グローバルに使いたい場合は `~/.claude/skills/` にコピーします。

### notes（/notes）

実装タスク中に自動で発動し、仕様にない判断・仕様からの逸脱・トレードオフ・ハマりどころ・
積み残しを `implementation-notes.md` に追記していきます。手動起動も可能です。

- `/notes` — ファイル作成、または記録漏れの追記
- `/notes <テキスト>` — その場で1件記録
- `/notes status` — ファイル冒頭の Status ブロックだけ更新

**Status ブロック**: ファイル先頭に「現状・次の一手・要注意点」の3行を置き、セッション末に
上書き更新します（append-only の例外は Status の上書きとアーカイブ移動の2つ）。
次のセッションは Status を読むだけで10秒で引き継げます。

**物証参照**: 全エントリに `file:line`・テスト名・コミットハッシュ・エラーメッセージの
いずれかを必須で添えます。コード上で位置を特定できないメモは半人前、という設計です。

### spec-extract（/spec-extract [対象パス]）

既存のコード・テスト・ドキュメントから仕様書 `SPEC.md` を逆引き生成します。
全記述に確度3段階のラベルと根拠が付きます。

| ラベル | 意味 | 根拠 |
|--------|------|------|
| `[確定]` | 実証された挙動 | コードの実装箇所、またはパスするテスト |
| `[推定]` | 意図の推測 | コメント・ドキュメント・命名・implementation-notes.md |
| `[不明]` | 未確認 | ユーザー・原作者への確認が必要 |

要件はID付きテーブル（F-01…）で全件に根拠列が付き、テストとの突合セクションで
「テストのない挙動 = リファクタで壊れる箇所」を仕様リスクとして洗い出します。
コードとドキュメントが食い違った場合、挙動はコード優先、食い違い自体は未解決質問に回します。

ハンドオフ・引き継ぎドキュメント作成、レガシーコードのリファクタ前の現状固定などに使えます。

---

## セッション開始時に notes を確実に読ませる（推奨設定）

スキルの description は会話内容とのマッチで読み込まれるため、「作業ディレクトリに
implementation-notes.md が存在する」というファイルシステムの状態だけでは発動しません。
最初の指示が実装系であればスキルが載って Status を先に読みますが、**確実に**
セッション開始時に読ませたい場合は、対象プロジェクト側で次のどちらかを設定してください。

### 方法1: プロジェクトの CLAUDE.md に1行追加（手軽）

```markdown
## セッション開始時
- リポジトリに implementation-notes.md がある場合、コードを書く前に冒頭の Status ブロックを読むこと。
```

### 方法2: SessionStart フック（確実）

プロジェクトの `.claude/settings.json` に追加します。ノートがあるときだけ
その場所をセッション冒頭のコンテキストに注入します。

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "f=$(find . -maxdepth 3 -name implementation-notes.md -not -path '*/node_modules/*' | head -1); [ -n \"$f\" ] && echo \"implementation-notes.md があります: $f — コードを書く前に Status ブロックを読んでください。\""
          }
        ]
      }
    ]
  }
}
```

---

## 配布用パッケージ（.skill）の作り方

スキルを単体で配布したい場合は、スキルディレクトリを ZIP 化して拡張子を `.skill` にします。

```bash
cd implementation-skills/.claude/skills
zip -r notes.skill notes/
zip -r spec-extract.skill spec-extract/
```
