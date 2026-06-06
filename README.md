# Claude Code on the Web — Windows マルチインスタンス起動

Windows Terminal で Claude Code を複数同時に起動するためのスクリプトとガイドをまとめたリポジトリです。

## 収録内容

| ファイル | 内容 |
|---|---|
| [`windows/launch-6pane.ps1`](windows/launch-6pane.ps1) | 横3列×縦2行（6ペイン）をワンコマンドで起動するスクリプト |
| [`windows/keybindings.md`](windows/keybindings.md) | ペイン分割・移動のキーバインド一覧 |

## 動作環境

- Windows 10 / 11
- [Windows Terminal](https://aka.ms/terminal)
- [Claude Code CLI](https://claude.ai/download)

## クイックスタート

```powershell
# 初回のみ: スクリプト実行を許可する
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 6ペインで起動
.\windows\launch-6pane.ps1
```

起動後、各ペインで `claude` または `claude --worktree <名前>` を実行してください。

## 同じリポジトリで複数インスタンスを使う場合

同じリポジトリで複数の Claude Code を動かすときは `--worktree` オプションで競合を防げます。

```powershell
# ペイン1
cd C:\myproject
claude --worktree feature-a

# ペイン2（同じリポジトリ、別タスク）
cd C:\myproject
claude --worktree bugfix-b
```
