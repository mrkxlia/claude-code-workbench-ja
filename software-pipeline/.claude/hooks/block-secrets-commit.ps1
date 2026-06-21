# block-secrets-commit.ps1 — block-secrets-commit.sh の PowerShell 同等版（PreToolUse 専用）
#
# bash が無い純 Windows/PowerShell 環境向け。PreToolUse(Bash) で git commit を検知したとき、
# ステージに .env / *.key / *.pem / secrets.json が含まれていれば stderr に理由を出して exit 2。
# 契約: ブロックは exit 2（throw は使わない）／stderr は UTF-8 BOM 無し。
# 注: .git/hooks/pre-commit としての利用は .sh のまま（git は .ps1 を pre-commit に使わない）。
# .claude/settings.json の hooks.PreToolUse（matcher: Bash）から
#   pwsh -NoProfile -File .claude/hooks/block-secrets-commit.ps1 として呼ばれる想定。

$ErrorActionPreference = 'Stop'
$utf8 = New-Object System.Text.UTF8Encoding($false)
function Write-Err([string]$s) {
  $stream = [Console]::OpenStandardError()
  $b = $utf8.GetBytes($s); $stream.Write($b, 0, $b.Length); $stream.Flush()
}

$BLOCK = '(^|/)\.env(\..+)?$|\.key$|\.pem$|(^|/)secrets\.json$'
$ALLOW = '\.env\.example$|\.env\.sample$|\.env\.template$'

# stdin から Bash ツールのコマンドを取り出す（空/非JSON は判定材料が無いので素通り）
$raw = [Console]::In.ReadToEnd()
$command = ''
if (-not [string]::IsNullOrWhiteSpace($raw)) {
  try { $command = ($raw | ConvertFrom-Json).tool_input.command } catch { $command = '' }
}

# コマンドが git commit を含まないなら何もしない
if ($command -and ($command -notmatch 'git\s+([^&|;]*\s)?commit')) { exit 0 }

# ステージされたファイルを検査（git 管理外・git 不在なら exit 0 で素通り＝.sh の `|| exit 0` 等価）
try { $staged = & git diff --cached --name-only 2>$null } catch { exit 0 }
if ($LASTEXITCODE -ne 0) { exit 0 }

$hits = @($staged | Where-Object { $_ -and ($_ -cmatch $BLOCK) -and -not ($_ -cmatch $ALLOW) })
if ($hits.Count -gt 0) {
  $msg = "BLOCKED: 機密ファイルがステージされているため、このコミットを中止しました。`n`n" +
         "該当ファイル:`n" + (($hits | ForEach-Object { "  - $_" }) -join "`n") + "`n`n" +
         "対処方法:`n" +
         "  1. ステージから外す:        git reset HEAD <file>`n" +
         "  2. 追跡対象から除外する:    .gitignore に追加する`n" +
         "  3. 誤検知の場合のみ、ユーザーに確認のうえパターンを調整する`n"
  Write-Err $msg
  exit 2
}

exit 0
