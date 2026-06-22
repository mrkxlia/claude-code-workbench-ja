# guard-deliverable-writes.ps1 — guard-deliverable-writes.sh の PowerShell 同等版（PreToolUse 専用）
#
# bash が無い純 Windows/PowerShell 環境向け。挙動は .sh と一致させる:
#   1. 機密パターン（.env / *.key / *.pem / secrets.json）→ stderr に理由 + exit 2（ハードブロック）
#   2. 許可リスト外 → permissionDecision "ask" の JSON を stdout に1行だけ出力（exit 0）
#   3. それ以外 → 無出力 exit 0
# 契約: stdout は ask の JSON 1行のみ（余計な出力を出さない）／UTF-8 BOM 無し／ブロックは exit 2。
# Windows PowerShell 5.1 互換。このファイルは UTF-8 BOM 付きで保存する（BOM を外すと 5.1 で日本語が文字化けする）。
# .claude/settings.json の hooks.PreToolUse（matcher: Edit|Write）から次の形で呼ばれる想定:
#   powershell -NoProfile -ExecutionPolicy Bypass -File .claude/hooks/guard-deliverable-writes.ps1
#   （PowerShell 7 がある環境では powershell の代わりに pwsh を使ってよい）

$ErrorActionPreference = 'Stop'
$utf8 = New-Object System.Text.UTF8Encoding($false)   # BOM 無し UTF-8
function Write-Std([string]$s, [bool]$err) {
  $stream = if ($err) { [Console]::OpenStandardError() } else { [Console]::OpenStandardOutput() }
  $b = $utf8.GetBytes($s); $stream.Write($b, 0, $b.Length); $stream.Flush()
}

# --- 設定（task-pipeline-setup が承認済みの出力ディレクトリで書き換える）---------
$ALLOWED_PREFIXES = @('deliverables/', 'docs/task-pipeline/', '.claude/')
$ALLOWED_FILES    = @('CLAUDE.md')
$BLOCK = '(^|/)\.env(\..+)?$|\.key$|\.pem$|(^|/)secrets\.json$'
$ALLOW = '\.env\.example$|\.env\.sample$|\.env\.template$'

# --- stdin から file_path を取り出す（空/非JSON は素通り）-----------------------
$raw = [Console]::In.ReadToEnd()
if ([string]::IsNullOrWhiteSpace($raw)) { exit 0 }
try { $obj = $raw | ConvertFrom-Json } catch { exit 0 }
$fp = $obj.tool_input.file_path
if ([string]::IsNullOrWhiteSpace($fp)) { exit 0 }

$fp = $fp -replace '\\', '/'
$root = $(if ($env:CLAUDE_PROJECT_DIR) { $env:CLAUDE_PROJECT_DIR } else { $PWD.Path }) -replace '\\', '/'
$rel = if ($fp.StartsWith($root + '/')) { $fp.Substring($root.Length + 1) } else { $fp }

# --- 判定1: 機密パターンはハードブロック ---------------------------------------
if (($rel -cmatch $BLOCK) -and -not ($rel -cmatch $ALLOW)) {
  $msg = "BLOCKED: 機密ファイルへの書き込みは禁止されています: $rel`n`n" +
         "対処方法:`n" +
         "  1. 機密情報は成果物・ドキュメントに書き込まない（CLAUDE.md ハードルール）`n" +
         "  2. 誤検知の場合のみ、ユーザーに確認のうえフックのパターンを調整する`n"
  Write-Std $msg $true
  exit 2
}

# --- 判定2: 許可リスト外は人間に確認を求める -----------------------------------
foreach ($p in $ALLOWED_PREFIXES) { if ($rel.StartsWith($p)) { exit 0 } }
foreach ($f in $ALLOWED_FILES)    { if ($rel -eq $f)         { exit 0 } }

$escaped = $rel.Replace('\', '\\').Replace('"', '\"')
$reason  = "出力ディレクトリ外への書き込みです: $escaped — ビルダーの担当範囲（" +
           ($ALLOWED_PREFIXES -join ' ') + "）の外であり、意図しない変更の可能性があります"
$json = '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"' +
        $reason + '"}}' + "`n"
Write-Std $json $false
exit 0
