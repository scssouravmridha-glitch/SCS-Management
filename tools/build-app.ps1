# =====================================================================
#  SCS Management — Apps Script অ্যাপ থেকে ওয়েব অ্যাপ বানানো (ইঞ্জিন দিয়ে চলে)
#
#  ব্যবহার (PowerShell):
#    .\tools\build-app.ps1 -Source "D:\Web App\Apps Script Source\SCS Chemical Order" -Key chemical-order
#
#  যা করে:
#   - Source ফোল্ডার থেকে Code.gs আর Index.html শুধু পড়ে (কিছু বদলায় না, মুছে না)
#   - apps\<Key>\Code.gs  = আসল Code.gs এর কপি
#   - apps\<Key>\index.html = আসল Index.html + SCS অ্যাকাউন্ট/ইঞ্জিন সংযোগ
#   - apps\<Key>\adapter.js / adapter.gs থাকলে সেগুলো রেখে দেয় (অ্যাপ-ভিত্তিক সমন্বয়)
#  পরে Apps Script এ অ্যাপ আপডেট করলে শুধু এই কমান্ড আবার চালালেই নতুন ভার্সন তৈরি।
# =====================================================================
param(
  [Parameter(Mandatory = $true)][string]$Source,
  [Parameter(Mandatory = $true)][string]$Key
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$dest = Join-Path $root ("apps\" + $Key)
New-Item -ItemType Directory -Force $dest | Out-Null
$utf8 = New-Object Text.UTF8Encoding($false)

$code = [IO.File]::ReadAllText((Join-Path $Source 'Code.gs'), [Text.Encoding]::UTF8)
$html = [IO.File]::ReadAllText((Join-Path $Source 'Index.html'), [Text.Encoding]::UTF8)
[IO.File]::WriteAllText((Join-Path $dest 'Code.gs'), $code, $utf8)

# Code.gs এ include('X') থাকলে Source এর X.html ও সাথে নেওয়া
Get-ChildItem $Source -Filter *.html | ? { $_.Name -ne 'Index.html' } | % {
  Copy-Item $_.FullName (Join-Path $dest ('gas-' + $_.Name)) -Force
}

$hasServer = Test-Path (Join-Path $dest 'adapter.gs')
$hasPre = Test-Path (Join-Path $dest 'adapter-pre.js')
$head = @"
<!-- ============ SCS Management: অ্যাকাউন্ট + Supabase ইঞ্জিন (tools/build-app.ps1 দিয়ে তৈরি) ============ -->
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<link rel="manifest" href="../../manifest.webmanifest" />
<link rel="icon" type="image/png" href="../../assets/icon-192.png" />
<script src="../../assets/config.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></script>
<script src="../../assets/scs-core.js"></script>
$(if ($hasPre) { '<script src="adapter-pre.js"></script>' })
<script src="../../assets/gas/host.js" data-app="$Key"$(if ($hasServer) { ' data-server="adapter.gs"' })></script>
<!-- ============ আসল অ্যাপ (Apps Script Index.html) ============ -->
"@
$tail = @"
<!-- ============ SCS Management: অ্যাপ-ভিত্তিক সমন্বয় ============ -->
$(if (Test-Path (Join-Path $dest 'adapter.js')) { '<script src="adapter.js"></script>' })
"@

# base64 এ রাখা UI বান্ডেল (var rawB64 = "...") -> app.js (পড়া/প্যাচ সহজ, লোড দ্রুত)
$bundle = $null
$rx = [regex]'(?s)<script>\s*\(function\(\)\s*\{\s*try\s*\{\s*var rawB64 = "([A-Za-z0-9+/=]+)";.*?</script>'
$bm = $rx.Match($html)
if ($bm.Success) {
  $bundle = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($bm.Groups[1].Value))
  # অ্যাকাউন্ট যাচাই (রোল জানা) হওয়ার পরে UI চালু হয়
  $html = $html.Substring(0, $bm.Index) + '<script>SCS_GAS_LOAD("app.js");</script>' + $html.Substring($bm.Index + $bm.Length)
}
# patches.json: [{ "find": "...", "replace": "...", "in": "app" | "html" }] — অ্যাপের অ্যাকাউন্ট/পিন সংযোগ
$pf = Join-Path $dest 'patches.json'
if (Test-Path $pf) {
  $patches = [IO.File]::ReadAllText($pf, [Text.Encoding]::UTF8) | ConvertFrom-Json
  $patches = $patches | ForEach-Object { $_ }
  foreach ($p in $patches) {
    $inApp = ($p.in -ne 'html') -and ($bundle -ne $null)
    $txt = if ($inApp) { $bundle } else { $html }
    $n = ([regex]::Matches($txt, [regex]::Escape($p.find))).Count
    if ($n -ne 1) { Write-Warning ("Patch matched $n times (expected 1): " + $p.find.Substring(0, [Math]::Min(80, $p.find.Length))); if ($n -eq 0) { continue } }
    $txt = $txt.Replace($p.find, $p.replace)
    if ($inApp) { $bundle = $txt } else { $html = $txt }
  }
}
if ($bundle -ne $null) { [IO.File]::WriteAllText((Join-Path $dest 'app.js'), "/* $Key UI — Apps Script Index.html থেকে (tools/build-app.ps1) */`n" + $bundle, $utf8) }

if ($html -match '(?i)<head[^>]*>') { $html = ([regex]'(?i)<head[^>]*>').Replace($html, { param($m) $m.Value + "`n" + $head }, 1) }
elseif ($html -match '(?i)<html[^>]*>') { $html = ([regex]'(?i)<html[^>]*>').Replace($html, { param($m) $m.Value + "`n<head>" + $head + "</head>" }, 1) }
else { $html = "<!doctype html>`n<html><head>" + $head + "</head><body>`n" + $html + "`n</body></html>" }
$i = $html.ToLower().LastIndexOf('</body>')
if ($i -ge 0) { $html = $html.Substring(0, $i) + $tail + $html.Substring($i) } else { $html = $html + $tail }

[IO.File]::WriteAllText((Join-Path $dest 'index.html'), $html, $utf8)
"Built apps\$Key  (Code.gs " + [int]($code.Length / 1024) + " KB, index.html " + [int]($html.Length / 1024) + " KB)"
