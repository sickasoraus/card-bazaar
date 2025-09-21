param(
  [string]$Input = "docs/Deployment_Plan_2025-09-14.rtf",
  [string]$Output = "docs/Deployment_Plan_2025-09-14.docx"
)

$ErrorActionPreference = 'Stop'

function Resolve-FullPath([string]$p){
  if ([string]::IsNullOrWhiteSpace($p)) { throw "Path is empty" }
  return (Resolve-Path -LiteralPath $p).Path
}

function Convert-With-Word([string]$inPath, [string]$outPath){
  try {
    $word = New-Object -ComObject Word.Application -ErrorAction Stop
  } catch {
    return $false
  }
  try {
    $word.Visible = $false
    $doc = $word.Documents.Open($inPath)
    # 12 = wdFormatXMLDocument (.docx)
    $doc.SaveAs([ref]$outPath, [ref]12)
    $doc.Close()
    $word.Quit()
    return $true
  } catch {
    try { if ($doc) { $doc.Close() } } catch {}
    try { if ($word) { $word.Quit() } } catch {}
    throw
  }
}

function Convert-With-Pandoc([string]$inPath, [string]$outPath){
  $pandoc = Get-Command pandoc -ErrorAction SilentlyContinue
  if (-not $pandoc) { return $false }
  & $pandoc.Source $inPath -o $outPath
  if ($LASTEXITCODE -ne 0) { throw "pandoc failed with exit code $LASTEXITCODE" }
  return $true
}

try {
  $in = Resolve-FullPath $Input
  $out = (Resolve-Path -LiteralPath (Split-Path -Parent $Input)).Path + "\" + (Split-Path -Leaf $Output)
} catch {
  Write-Error "Could not resolve paths: $_"
  exit 1
}

Write-Host "Exporting to DOCX..." -ForegroundColor Cyan
if (Convert-With-Word -inPath $in -outPath $out) {
  Write-Host "Saved: $out" -ForegroundColor Green
  exit 0
}

Write-Host "Microsoft Word not found. Trying pandoc..." -ForegroundColor Yellow
if (Convert-With-Pandoc -inPath $in -outPath $out) {
  Write-Host "Saved: $out" -ForegroundColor Green
  exit 0
}

Write-Error "Neither Microsoft Word nor pandoc is available. Install either to convert RTF→DOCX."
exit 2

