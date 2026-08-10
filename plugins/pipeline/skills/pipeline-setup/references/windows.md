# Windows 対応（bash が使えるかでフックを振り分ける）

フックは `.sh`（baseline）と `.ps1`（PowerShell 同等版）の二種を同梱している。導入環境で**どちらを配るかは
「OS 名」ではなく「bash が使えるか」で判定する**（Git Bash は Windows 上でも `.sh` が動くため、`$env:OS` や
uname の OS 名で判定すると誤る）:

- **bash が使える**（Git Bash / WSL / Mac / Linux。`command -v bash` が成功）→ Step 6 のとおり `.sh` をコピーして
  `chmod +x`。settings.json の command は `bash "$CLAUDE_PROJECT_DIR"/.claude/hooks/xxx.sh`。
- **bash が無い純 PowerShell** → 代わりに `.ps1` をコピーし（`chmod` は skip）、command は
  `pwsh -NoProfile -ExecutionPolicy Bypass -File "<repo>/.claude/hooks/xxx.ps1"`。
  **`pwsh`（PowerShell 7）が無ければ Windows 標準の `powershell`（5.1）にフォールバック**する。
  例: `"command": "powershell -NoProfile -ExecutionPolicy Bypass -File .claude/hooks/spec-sync-reminder.ps1"`。
  `-ExecutionPolicy Bypass` は 5.1 の既定ポリシー（Restricted/RemoteSigned）でフックがブロックされるのを防ぐ。
  `$CLAUDE_PROJECT_DIR` はそのまま使え、パス区切りは `/` で統一（PowerShell も許容）。
  `.ps1` は **UTF-8 BOM 付き**で配る（5.1 が日本語を文字化けさせないため。BOM を外さないこと）。

注意:
- `block-secrets-commit` の `.git/hooks/pre-commit` 用途は `.sh` のまま（git は Windows でも sh で pre-commit を
  実行し、`.ps1` は pre-commit として起動しない）。`.ps1` は PreToolUse の command 経由のみ。
- settings.json は条件分岐を持てないため、**導入時の環境で確定した1つの command** だけを書く。再 setup で
  環境が変わったら 6-3 の「`.sh`/`.ps1` ペアは同一フック」ルールで二重登録を防ぐ。
- ドライランも環境に合わせる: PowerShell 版は `powershell -NoProfile -ExecutionPolicy Bypass -File .claude/hooks/xxx.ps1`（PS7 なら pwsh）に同じ JSON を stdin で渡す。
