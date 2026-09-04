# inject-spec-summary.ps1 — inject-spec-summary.sh の PowerShell 同等版（SessionStart / SubagentStart）
#
# bash が無い純 Windows/PowerShell 環境向け。挙動は .sh と一致させる:
#   SPEC.md（無ければ SPEC-recovered.md）の [確定] 要件の目次を文脈へ注入する。
#   SPEC が無ければ「外部ツールでの作成を推奨」の1行だけ。常に exit 0。
# 契約: SessionStart はプレーンテキストを stdout へ／SubagentStart は additionalContext の JSON を1行。
#       stdout は UTF-8 BOM 無しで書く。
# 抽出規則の定義は skills/pipeline-setup/references/spec-summary.md（.sh と共通の元）。
# Windows PowerShell 5.1 互換。このファイルは UTF-8 BOM 付きで保存する（BOM を外すと 5.1 で日本語が文字化けする）。
# .claude/settings.json から次の形で呼ばれる想定:
#   powershell -NoProfile -ExecutionPolicy Bypass -File .claude/hooks/inject-spec-summary.ps1
#   （PowerShell 7 がある環境では powershell の代わりに pwsh を使ってよい）

$ErrorActionPreference = 'SilentlyContinue'
$utf8 = New-Object System.Text.UTF8Encoding($false)
function Write-Std([string]$s) {
  $stream = [Console]::OpenStandardOutput()
  $b = $utf8.GetBytes($s); $stream.Write($b, 0, $b.Length); $stream.Flush()
}

$MaxRows = 60
$MaxBytes = 6000
$MaxCells = 3

# stdin からイベント名を取り出す（判別できなければプレーン扱い）
$event = ''
$raw = [Console]::In.ReadToEnd()
if (-not [string]::IsNullOrWhiteSpace($raw)) {
  try { $event = ($raw | ConvertFrom-Json).hook_event_name } catch { $event = '' }
}

$root = $env:CLAUDE_PROJECT_DIR
if ([string]::IsNullOrWhiteSpace($root)) { $root = (Get-Location).Path }

$spec = $null; $rel = $null
foreach ($c in @('SPEC.md', 'SPEC-recovered.md')) {
  $p = Join-Path $root $c
  if (Test-Path -LiteralPath $p -PathType Leaf) { $spec = $p; $rel = $c; break }
}

if ($null -eq $spec) {
  $body = @"
【仕様】このリポジトリに SPEC.md はありません。既存の挙動・規約が文書化されていないため、
既存仕様との整合は保証できません。レガシーコードからの逆引きは cc-rsg 等の外部ツールで
SPEC.md を作ってから進めることを推奨します。
"@
} else {
  # 最終更新日: git 管理下ならコミット日、そうでなければファイルの mtime
  $updated = ''
  if (Get-Command git -ErrorAction SilentlyContinue) {
    $updated = (& git -C $root log -1 --format=%ad --date=short -- $rel 2>$null)
  }
  if ([string]::IsNullOrWhiteSpace($updated)) {
    $updated = (Get-Item -LiteralPath $spec).LastWriteTime.ToString('yyyy-MM-dd')
  }

  # [確定] 要件の行を拾う。切り詰めは必ずセル区切り `|`（ASCII）の位置で行う
  # （文字の途中で切るとマルチバイト文字が壊れ、JSON が不正な UTF-8 になる）
  $rows = @()
  foreach ($line in [System.IO.File]::ReadAllLines($spec, [System.Text.Encoding]::UTF8)) {
    if ($line -notmatch '(^|[^A-Za-z0-9])[FD]-[0-9]+([^0-9]|$)') { continue }
    if ($line -notmatch '\[確定\]') { continue }
    $t = $line -replace '^\s*\|*\s*', '' -replace '\s*\|*\s*$', ''
    $cells = $t -split '\s*\|\s*'
    $out = ($cells | Select-Object -First $MaxCells) -join ' / '
    if ($cells.Count -gt $MaxCells) { $out = "$out …" }
    if (-not [string]::IsNullOrWhiteSpace($out)) { $rows += $out }
  }

  if ($rows.Count -eq 0) {
    $list = '（[確定] とラベルされた要件はまだありません）'
  } else {
    # 行数とバイト数の両方で頭打ちにする。落とすのは常に行単位（文字は割らない）
    $kept = @(); $acc = 0
    foreach ($r in $rows) {
      if ($kept.Count -ge $MaxRows) { break }
      $acc += $utf8.GetByteCount($r) + 1
      if ($acc -gt $MaxBytes) { break }
      $kept += $r
    }
    $list = $kept -join "`n"
    if ($rows.Count -gt $kept.Count) {
      $list = "$list`n（ほか $($rows.Count - $kept.Count) 件。全件は $rel を参照）"
    }
  }

  $body = @"
【仕様（spec of record）】$rel（最終更新 $updated）
このリポジトリの確定要件は次のとおりです。実装・レビュー・要件定義は、この既存仕様と
矛盾しないことを確認してから進めてください。矛盾する変更が必要なら、黙って変えずに
ブリーフの「既存仕様への影響」で明示して承認を得てください。

$list

これは目次であり本文ではありません。判断の前に $rel の本文を読んでください。
"@
}

$body = $body.TrimEnd()

if ($event -eq 'SubagentStart') {
  # ConvertTo-Json が文字列を JSON エスケープするので、そのまま値として埋める
  $escaped = ($body | ConvertTo-Json)
  Write-Std ('{"hookSpecificOutput":{"hookEventName":"SubagentStart","additionalContext":' + $escaped + "}}`n")
} else {
  Write-Std ($body + "`n")
}

exit 0
