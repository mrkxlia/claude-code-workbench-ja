# Windows Terminal キーバインド一覧

Claude Code のマルチペイン操作で使うキーバインドをまとめています。

---

## ペイン分割

| 操作 | キー |
|---|---|
| 縦分割（左右に並べる） | `Alt+Shift+=` |
| 横分割（上下に並べる） | `Alt+Shift+-` |
| 現在のペインを複製して分割 | `Alt+Shift+D` |
| ペインを閉じる | `Ctrl+Shift+W` |

---

## ペイン移動・リサイズ

| 操作 | キー |
|---|---|
| ペイン間を移動 | `Alt+↑` / `Alt+↓` / `Alt+←` / `Alt+→` |
| ペインのサイズを変更 | `Alt+Shift+↑` / `Alt+Shift+↓` / `Alt+Shift+←` / `Alt+Shift+→` |

---

## タブ操作

| 操作 | キー |
|---|---|
| 新しいタブを開く | `Ctrl+Shift+T` |
| タブを閉じる | `Ctrl+Shift+W` |
| 次のタブへ | `Ctrl+Tab` |
| 前のタブへ | `Ctrl+Shift+Tab` |
| タブ番号で移動 | `Ctrl+1` 〜 `Ctrl+8` |

---

## カスタムキーバインドの追加（オプション）

Windows Terminal の `settings.json` を開き（`Ctrl+,` → 左下の「JSONを開く」）、
`"actions"` 配列に以下を追記するとさらに便利になります。

```json
{
    "actions": [
        { "command": { "action": "splitPane", "split": "vertical"   }, "keys": "ctrl+shift+\\" },
        { "command": { "action": "splitPane", "split": "horizontal" }, "keys": "ctrl+shift+-"  },
        { "command": { "action": "moveFocus", "direction": "left"   }, "keys": "ctrl+alt+left"  },
        { "command": { "action": "moveFocus", "direction": "right"  }, "keys": "ctrl+alt+right" },
        { "command": { "action": "moveFocus", "direction": "up"     }, "keys": "ctrl+alt+up"    },
        { "command": { "action": "moveFocus", "direction": "down"   }, "keys": "ctrl+alt+down"  }
    ]
}
```

> 既存の `"actions"` 配列がある場合は、末尾に追記してください。

---

## 6ペイン起動スクリプト

[`launch-6pane.ps1`](launch-6pane.ps1) を使えばワンコマンドで横3列×縦2行のレイアウトを開けます。

```powershell
.\windows\launch-6pane.ps1
```
