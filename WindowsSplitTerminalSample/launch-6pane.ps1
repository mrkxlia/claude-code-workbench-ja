<#
.SYNOPSIS
    Claude Code 6ペイン起動スクリプト

.DESCRIPTION
    Windows Terminal を横3列 x 縦2行の6ペインで起動します。
    各ペインはホームディレクトリで開きます。

    レイアウト:
        +----------+----------+----------+
        | Claude 1 | Claude 2 | Claude 3 |
        +----------+----------+----------+
        | Claude 6 | Claude 5 | Claude 4 |
        +----------+----------+----------+

.EXAMPLE
    .\launch-6pane.ps1

.NOTES
    初回のみ実行ポリシーの設定が必要です:
        Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

    起動後、各ペインで以下を実行してください:
        claude                          # 新規セッション
        claude --worktree <名前>        # 同一リポジトリで複数インスタンス起動（競合防止）
#>

$dir = $env:USERPROFILE

wt new-tab          --title "Claude 1" -d $dir `; `
  split-pane -V -s 0.667 --title "Claude 2" -d $dir `; `
  split-pane -V -s 0.5   --title "Claude 3" -d $dir `; `
  split-pane -H          --title "Claude 4" -d $dir `; `
  move-focus left `; `
  split-pane -H          --title "Claude 5" -d $dir `; `
  move-focus left `; `
  split-pane -H          --title "Claude 6" -d $dir
