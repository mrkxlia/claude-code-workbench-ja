# guard-builder-writes.ps1 — guard-builder-writes.sh の PowerShell 同等版（PreToolUse 専用）
#
# bash が無い純 Windows/PowerShell 環境向け。挙動は .sh と一致させる:
#   発火条件 AND2つ（1. docs/pipeline/<slug>/.parallel-active が存在 2. 共有ファイル禁止リスト該当）の
#   ときだけ permissionDecision "ask" の JSON を stdout に1行出力。それ以外は無出力 exit 0。
# 契約: stdout は ask の JSON 1行のみ／UTF-8 BOM 無し。
# .claude/settings.json の hooks.PreToolUse（matcher: Edit|Write）から
#   pwsh -NoProfile -File .claude/hooks/guard-builder-writes.ps1 として呼ばれる想定。

$ErrorActionPreference = 'Stop'
$utf8 = New-Object System.Text.UTF8Encoding($false)
function Write-Std([string]$s, [bool]$err) {
  $stream = if ($err) { [Console]::OpenStandardError() } else { [Console]::OpenStandardOutput() }
  $b = $utf8.GetBytes($s); $stream.Write($b, 0, $b.Length); $stream.Flush()
}

# 共有ファイルパターン（CLAUDE.md・spec-writer の「並列実行プラン」と一致させる）
$SHARED = '(^|/)prisma/|\.prisma$|(^|/)migrations?/|(^|/)package\.json$|(^|/)package-lock\.json$|(^|/)yarn\.lock$|(^|/)pnpm-lock\.yaml$|(^|/)go\.(mod|sum)$|(^|/)Cargo\.(toml|lock)$|(^|/)src/types/index\.(ts|tsx)$|(^|/)src/app/api/route\.(ts|tsx)$'

$raw = [Console]::In.ReadToEnd()
if ([string]::IsNullOrWhiteSpace($raw)) { exit 0 }
try { $obj = $raw | ConvertFrom-Json } catch { exit 0 }
$fp = $obj.tool_input.file_path
if ([string]::IsNullOrWhiteSpace($fp)) { exit 0 }

$fp = $fp -replace '\\', '/'
$rootDir = $(if ($env:CLAUDE_PROJECT_DIR) { $env:CLAUDE_PROJECT_DIR } else { $PWD.Path })
$root = $rootDir -replace '\\', '/'
$rel = if ($fp.StartsWith($root + '/')) { $fp.Substring($root.Length + 1) } else { $fp }

# 発火条件1: 並列フェーズ中か（.parallel-active マーカーの存在。git 非依存）
$markerFound = $false
$pdir = Join-Path $rootDir 'docs/pipeline'
if (Test-Path $pdir) {
  $markerFound = [bool](Get-ChildItem $pdir -Directory -ErrorAction SilentlyContinue |
    Where-Object { Test-Path (Join-Path $_.FullName '.parallel-active') } | Select-Object -First 1)
}
if (-not $markerFound) { exit 0 }

# 発火条件2: 共有ファイルか
if (-not ($rel -cmatch $SHARED)) { exit 0 }

$escaped = $rel.Replace('\', '\\').Replace('"', '\"')
$reason  = "並列フェーズ中の共有ファイルへの書き込みです: $escaped — 複数グループが同時に触れると上書き衝突やマイグレーション履歴破壊の恐れがあります。共有変更は並列前の「共有/先行逐次ステップ」で済ませる設計です。意図した書き込みか確認してください"
$json = '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"' +
        $reason + '"}}' + "`n"
Write-Std $json $false
exit 0
