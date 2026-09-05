# reinject-brief.ps1 — reinject-brief.sh の PowerShell 同等版（SessionStart / matcher: compact）
#
# bash が無い純 Windows/PowerShell 環境向け。挙動は .sh と一致させる:
#   long-run が固定したブリーフファイル（docs/long-run/brief.md → .claude/long-run-brief.md）を
#   圧縮直後の文脈へ戻す。無ければ何も出力せず exit 0。
# 契約: stdout はプレーンテキストのみ（SessionStart はそれをそのまま文脈に入れる）／UTF-8 BOM 無しで書く。
# Windows PowerShell 5.1 互換。このファイルは UTF-8 BOM 付きで保存する（BOM を外すと 5.1 で日本語が文字化けする）。
# bash が無い環境ではスキル frontmatter のフックが動かないため、settings.json に次の形で配線する:
#   powershell -NoProfile -ExecutionPolicy Bypass -File .claude/hooks/reinject-brief.ps1
#   （PowerShell 7 がある環境では powershell の代わりに pwsh を使ってよい）

$ErrorActionPreference = 'SilentlyContinue'
$utf8 = New-Object System.Text.UTF8Encoding($false)
function Write-Std([string]$s) {
  $stream = [Console]::OpenStandardOutput()
  $b = $utf8.GetBytes($s); $stream.Write($b, 0, $b.Length); $stream.Flush()
}

# stdin は使わないが、ブロッキングを避けるため読み捨てる
[void][Console]::In.ReadToEnd()

$root = $env:CLAUDE_PROJECT_DIR
if ([string]::IsNullOrWhiteSpace($root)) { $root = (Get-Location).Path }

$brief = $null
$rel = $null
foreach ($c in @('docs/long-run/brief.md', '.claude/long-run-brief.md')) {
  $p = Join-Path $root $c
  if (Test-Path -LiteralPath $p -PathType Leaf) { $brief = $p; $rel = $c; break }
}
if ($null -eq $brief) { exit 0 }

$size = (Get-Item -LiteralPath $brief).Length
if ($size -eq 0) { exit 0 }

# フック出力は 10,000 字で切られる。長いブリーフは場所を伝えて読ませる
if ($size -gt 8000) {
  Write-Std @"
【long-run ブリーフ】コンテキストが圧縮されました。このタスクの完了条件・スコープ・制約は
$rel に固定してあります（$size バイトと長いため全文は載せません）。
作業を続ける前に $rel を読み直し、そこに書かれた範囲だけを進めてください。
"@
  exit 0
}

$body = [System.IO.File]::ReadAllText($brief, [System.Text.Encoding]::UTF8)
Write-Std @"
【long-run ブリーフ（圧縮後の再注入）】
このセッションは long-run プロトコルで進行中です。以下は $rel に固定した
承認済みブリーフの全文です。圧縮でこれらの制約が薄れていないか確認し、この範囲だけを進めてください。
作業中に制約が増えたら $rel を更新してください（更新しないと次の圧縮で失われます）。
---
$body
---
"@

exit 0
