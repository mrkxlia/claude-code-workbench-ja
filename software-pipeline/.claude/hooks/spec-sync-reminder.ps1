# spec-sync-reminder.ps1 — spec-sync-reminder.sh の PowerShell 同等版（SessionStart / Stop）
#
# bash が無い純 Windows/PowerShell 環境向け。挙動は .sh と一致させる:
#   SPEC.md 最終更新コミット以降にソース/成果物が変わっていれば stderr で非ブロッキング通知。
#   git 管理外・SPEC.md 不在なら静かに何もしない。常に exit 0（作業を止めない）。
# .claude/settings.json の hooks.SessionStart / hooks.Stop から
#   pwsh -NoProfile -File .claude/hooks/spec-sync-reminder.ps1 として呼ばれる想定。

$ErrorActionPreference = 'SilentlyContinue'
$utf8 = New-Object System.Text.UTF8Encoding($false)
function Write-Err([string]$s) {
  $stream = [Console]::OpenStandardError()
  $b = $utf8.GetBytes($s); $stream.Write($b, 0, $b.Length); $stream.Flush()
}

# stdin は使わないが、ブロッキングを避けるため読み捨てる
[void][Console]::In.ReadToEnd()

# git 管理外なら何もしない
& git rev-parse --is-inside-work-tree 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) { exit 0 }

# SPEC ファイルを探す（リポジトリ直下）
$spec = $null
foreach ($c in @('SPEC.md', 'SPEC-recovered.md')) { if (Test-Path $c) { $spec = $c; break } }
if (-not $spec) { exit 0 }

# SPEC を最後に変更したコミット。未コミットなら静かに終了
$specCommit = (& git log -1 --format=%H -- $spec 2>$null)
if ([string]::IsNullOrWhiteSpace($specCommit)) { exit 0 }

# SPEC 最終更新以降に変わったファイル（コミット済み＋作業ツリー）。SPEC 自身・パイプライン
# 中間成果物・実装ノートは除外する。
$exclude = '(^|/)SPEC(-recovered)?\.md$|^docs/(pipeline|task-pipeline)/|(^|/)implementation-notes(-[^/]*)?\.md$'
$committed = & git diff --name-only "$specCommit" HEAD 2>$null
$working   = & git status --porcelain 2>$null | ForEach-Object { if ($_.Length -gt 3) { $_.Substring(3) } }
$changed = @(@($committed) + @($working) |
  Where-Object { $_ -and ($_ -notmatch $exclude) } |
  Sort-Object -Unique)
if ($changed.Count -eq 0) { exit 0 }

$head = ($changed | Select-Object -First 3 | ForEach-Object { "     - $_" }) -join "`n"
$msg = "📝 SPEC.md（$spec）が最後に更新されてから、$($changed.Count) 件のソース/成果物が変更されています。`n" +
       "   既存挙動を変えていれば、該当 F-NN/D-NN だけ SPEC.md を増分更新すると spec of record が陳腐化しません`n" +
       "   （/spec-extract の「変更管理」を参照。不要なら無視して構いません）。例:`n" +
       $head + "`n"
Write-Err $msg
exit 0
