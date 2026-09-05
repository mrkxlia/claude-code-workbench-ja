# guard-builder-paths.ps1 — guard-builder-paths.sh の PowerShell 同等版（PreToolUse 専用）
#
# bash が無い純 Windows/PowerShell 環境向け。挙動は .sh と一致させる:
#   1. 第1引数の許可プレフィックスが空 → 何もしない exit 0
#   2. 実装ノート、または担当範囲の中 → 無出力 exit 0（`!` 始まりの除外指定は許可より優先）
#   3. それ以外 → stderr に理由 + exit 2（ハードブロック）
# 契約: stdout には何も出さない／stderr は BOM 無し UTF-8／ブロックは exit 2。
# Windows PowerShell 5.1 互換。このファイルは UTF-8 BOM 付きで保存する（BOM を外すと 5.1 で日本語が文字化けする）。
# エージェント frontmatter の hooks.PreToolUse から次の形で呼ばれる想定:
#   powershell -NoProfile -ExecutionPolicy Bypass -File .claude/hooks/guard-builder-paths.ps1 "src/server/ src/jobs/"
#   （PowerShell 7 がある環境では powershell の代わりに pwsh を使ってよい）

param([string]$AllowedPrefixes = '')

$ErrorActionPreference = 'Stop'
$utf8 = New-Object System.Text.UTF8Encoding($false)
function Write-Err([string]$s) {
  $stream = [Console]::OpenStandardError()
  $b = $utf8.GetBytes($s); $stream.Write($b, 0, $b.Length); $stream.Flush()
}

# 許可プレフィックスが未設定なら判定材料が無いので素通りする
if ([string]::IsNullOrWhiteSpace($AllowedPrefixes)) { exit 0 }

# 実装ノートは担当に関係なく全ビルダーが書く（パイプラインの記録先）
$alwaysAllowed = '^docs/(pipeline|task-pipeline)/[^/]+/implementation-notes(-[^/]*)?\.md$'

$raw = [Console]::In.ReadToEnd()
if ([string]::IsNullOrWhiteSpace($raw)) { exit 0 }
try { $obj = $raw | ConvertFrom-Json } catch { exit 0 }
$fp = $obj.tool_input.file_path
if ([string]::IsNullOrWhiteSpace($fp)) { exit 0 }

# Windows のバックスラッシュ区切りパスをスラッシュ区切りに正規化して判定を揃える
$fp = $fp -replace '\\', '/'

$root = $env:CLAUDE_PROJECT_DIR
if ([string]::IsNullOrWhiteSpace($root)) { $root = (Get-Location).Path }
$root = $root -replace '\\', '/'

$rel = $fp
if ($fp.StartsWith($root + '/')) { $rel = $fp.Substring($root.Length + 1) }

if ($rel -match $alwaysAllowed) { exit 0 }

# 除外指定（`!` 始まり）は許可より優先して拒否する
$denied = $false
foreach ($prefix in ($AllowedPrefixes -split '\s+')) {
  if (-not $prefix.StartsWith('!')) { continue }
  $deny = $prefix.Substring(1)
  if ([string]::IsNullOrWhiteSpace($deny)) { continue }
  if ($rel.StartsWith($deny)) { $denied = $true; break }
}

if (-not $denied) {
  foreach ($prefix in ($AllowedPrefixes -split '\s+')) {
    if ([string]::IsNullOrWhiteSpace($prefix)) { continue }
    if ($prefix.StartsWith('!')) { continue }
    if ($rel.StartsWith($prefix)) { exit 0 }
  }
}

Write-Err @"
BLOCKED: 担当範囲の外への書き込みです: $rel

このエージェントが書き込めるのは次の範囲だけです: $AllowedPrefixes
（`!` 始まりは除外指定です）
（実装ノート docs/pipeline/<slug>/implementation-notes.md は常に書けます）

対処方法:
  1. 担当外のファイルが必要なら、実装せずに実装ノートへ「必要な変更」として記録し、
     オーケストレーター（メインセッション）に差し戻す
  2. ブリーフの所有パス宣言が実態と違う場合は、ブリーフを更新してから再実行する
"@
exit 2
