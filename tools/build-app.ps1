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
# apps\<Key>\linked.txt = যে অ্যাপগুলোর ডাটা এই অ্যাপ পড়ে (কমা দিয়ে), সেগুলো বদলালেও লাইভ রিফ্রেশ
$linkedFile = Join-Path $dest 'linked.txt'
$linked = if (Test-Path $linkedFile) { ([IO.File]::ReadAllText($linkedFile)).Trim() } else { '' }
$head = @"
<!-- ============ SCS Management: অ্যাকাউন্ট + Supabase ইঞ্জিন (tools/build-app.ps1 দিয়ে তৈরি) ============ -->
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<link rel="manifest" href="../../manifest.webmanifest" />
<link rel="icon" type="image/png" href="../../assets/icon-192.png" />
<script src="../../assets/config.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></script>
<script src="../../assets/scs-core.js"></script>
$(if ($hasPre) { '<script src="adapter-pre.js"></script>' })
<script src="../../assets/gas/host.js" data-app="$Key"$(if ($hasServer) { ' data-server="adapter.gs"' })$(if ($linked) { ' data-linked="' + $linked + '"' })></script>
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
# দ্বিতীয় ধরন: <script id="scs-app-bundle" type="text/plain">BASE64</script> + আলাদা লোডার স্ক্রিপ্ট
if ($bundle -eq $null) {
  # যেকোনো নাম: scs-app-bundle, scs-store-bundle, ...
  $cm = [regex]::Match($html, '(?s)<script[^>]*id="(scs-[\w-]*bundle)"[^>]*>\s*([A-Za-z0-9+/=\s]+?)\s*</script>')
  if ($cm.Success) {
    $bid = $cm.Groups[1].Value
    $bundle = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String(($cm.Groups[2].Value -replace '\s', '')))
    $html = $html.Substring(0, $cm.Index) + $html.Substring($cm.Index + $cm.Length)
    $lm = [regex]::Match($html, "(?s)<script>(?:(?!</script>).)*?getElementById\('" + [regex]::Escape($bid) + "'\).*?</script>")
    if ($lm.Success) { $html = $html.Substring(0, $lm.Index) + '<script>SCS_GAS_LOAD("app.js");</script>' + $html.Substring($lm.Index + $lm.Length) }
    else { $html = $html + '<script>SCS_GAS_LOAD("app.js");</script>' }
  }
}
# আলাদা বিল পাতা (SCS Projects): <script id="scs-bill-page">gzip+base64</script> -> bill.html
#  Apps Script এ ?page=bill দিলে সার্ভার এটা খুলে দিত; এখানে বিল্ডের সময়ই আলাদা ফাইল বানানো হয়
$bill = $null
$bm2 = [regex]::Match($html, '(?is)<script[^>]*id=["'']?scs-bill-page["'']?[^>]*>([\s\S]*?)</script>')
if ($bm2.Success) {
  $b64 = $bm2.Groups[1].Value -replace '[^A-Za-z0-9+/=]', ''
  $ms = New-Object IO.MemoryStream(, [Convert]::FromBase64String($b64))
  $gz = New-Object IO.Compression.GZipStream($ms, [IO.Compression.CompressionMode]::Decompress)
  $sr = New-Object IO.StreamReader($gz, [Text.Encoding]::UTF8); $bill = $sr.ReadToEnd(); $sr.Close()
  $html = $html.Substring(0, $bm2.Index) + $html.Substring($bm2.Index + $bm2.Length)
}
# patches.json: [{ "find": "...", "replace": "...", "in": "app" | "html" | "bill" }] — অ্যাপের অ্যাকাউন্ট/পিন সংযোগ
$pf = Join-Path $dest 'patches.json'
if (Test-Path $pf) {
  $patches = [IO.File]::ReadAllText($pf, [Text.Encoding]::UTF8) | ConvertFrom-Json
  $patches = $patches | ForEach-Object { $_ }
  foreach ($p in $patches) {
    $inBill = ($p.in -eq 'bill')
    if ($inBill -and $bill -eq $null) { continue }
    $inApp = (-not $inBill) -and ($p.in -ne 'html') -and ($bundle -ne $null)
    $txt = if ($inBill) { $bill } elseif ($inApp) { $bundle } else { $html }
    # "rx": রেগুলার এক্সপ্রেশন দিয়ে পুরো অংশ বদলানো (যেমন পুরনো পিন-লগইন স্ক্রিনের পুরো কোড মুছে ফেলা)
    if ($p.rx) {
      $re = New-Object Text.RegularExpressions.Regex($p.rx, [Text.RegularExpressions.RegexOptions]::Singleline)
      $n = $re.Matches($txt).Count
      if ($n -ne 1) { Write-Warning ("Regex patch matched $n times (expected 1): " + $p.rx.Substring(0, [Math]::Min(80, $p.rx.Length))); if ($n -eq 0) { continue } }
      $rep = [string]$p.replace
      $txt = $re.Replace($txt, [Text.RegularExpressions.MatchEvaluator]{ param($m) $rep }, 1)
      if ($inBill) { $bill = $txt } elseif ($inApp) { $bundle = $txt } else { $html = $txt }
      continue
    }
    $n = ([regex]::Matches($txt, [regex]::Escape($p.find))).Count
    if ($p.all) { $txt = $txt.Replace($p.find, $p.replace); if ($inBill) { $bill = $txt } elseif ($inApp) { $bundle = $txt } else { $html = $txt }; continue }   # "all": true = সব জায়গায়
    if ($n -ne 1) { Write-Warning ("Patch matched $n times (expected 1): " + $p.find.Substring(0, [Math]::Min(80, $p.find.Length))); if ($n -eq 0) { continue } }
    $txt = $txt.Replace($p.find, $p.replace)
    if ($inBill) { $bill = $txt } elseif ($inApp) { $bundle = $txt } else { $html = $txt }
  }
}
# ভার্সন নম্বর: ব্রাউজার/GitHub Pages পুরনো ফাইল ক্যাশ থেকে দিলেও নতুন ফাইল আসে
$stamp = (Get-Date).ToString('yyyyMMddHHmm')
$html = $html.Replace('SCS_GAS_LOAD("app.js")', 'SCS_GAS_LOAD("app.js?v=' + $stamp + '")')
$tail = $tail.Replace('src="adapter.js"', 'src="adapter.js?v=' + $stamp + '"')
$head = $head.Replace('src="adapter-pre.js"', 'src="adapter-pre.js?v=' + $stamp + '"')
$head = $head.Replace('assets/scs-core.js"', 'assets/scs-core.js?v=' + $stamp + '"').Replace('assets/gas/host.js"', 'assets/gas/host.js?v=' + $stamp + '"')
# পুরনো index.html ক্যাশে থেকে নতুন app.js লোড হলে (ইঞ্জিন নেই) -> একবার নতুন করে পেজ লোড
$guard = "if(!window.SCS_GAS_HOST){(function(){var k='scs_reload_$Key';try{if(!sessionStorage.getItem(k)){sessionStorage.setItem(k,'1');location.replace(location.pathname+'?r='+Date.now()+location.hash);return}}catch(e){}alert('This page is outdated: please upload the new apps/$Key/index.html to the site, then reload.\nপেজটা পুরনো: সাইটে নতুন apps/$Key/index.html আপলোড করে রিলোড করুন।')})();throw new Error('SCS: outdated index.html')}`ntry{sessionStorage.removeItem('scs_reload_$Key')}catch(e){}`n"
if ($bundle -ne $null) { [IO.File]::WriteAllText((Join-Path $dest 'app.js'), "/* $Key UI — Apps Script Index.html থেকে (tools/build-app.ps1) */`n" + $guard + $bundle, $utf8) }

if ($html -match '(?i)<head[^>]*>') { $html = ([regex]'(?i)<head[^>]*>').Replace($html, { param($m) $m.Value + "`n" + $head }, 1) }
elseif ($html -match '(?i)<html[^>]*>') { $html = ([regex]'(?i)<html[^>]*>').Replace($html, { param($m) $m.Value + "`n<head>" + $head + "</head>" }, 1) }
else { $html = "<!doctype html>`n<html><head>" + $head + "</head><body>`n" + $html + "`n</body></html>" }
$i = $html.ToLower().LastIndexOf('</body>')
if ($i -ge 0) { $html = $html.Substring(0, $i) + $tail + $html.Substring($i) } else { $html = $html + $tail }

if ($bill -ne $null) {
  # মূল পাতা: ?page=bill বা ?q= (শেয়ার লিংক) এলে bill.html এ
  # bill-raw.html = আসল বিল পাতা (মূল অ্যাপের ভেতরের ফ্রেমে বসে, মূল অ্যাপের ইঞ্জিন ব্যবহার করে)
  [IO.File]::WriteAllText((Join-Path $dest 'bill-raw.html'), $bill, $utf8)
  $redir = '<script>if(/[?&](page=bill|q=)/.test(location.search)&&!/bill\.html$/.test(location.pathname))location.replace("bill.html"+location.search+location.hash);</script>'
  $html = ([regex]'(?i)<head[^>]*>').Replace($html, { param($m) $m.Value + "`n" + $redir }, 1)
  $bhead = $head
  $billTail = "`n" + $(if (Test-Path (Join-Path $dest 'adapter-bill.js')) { '<script src="adapter-bill.js?v=' + $stamp + '"></script>' } else { '' })
  if ($bill -match '(?i)<head[^>]*>') { $bill = ([regex]'(?i)<head[^>]*>').Replace($bill, { param($m) $m.Value + "`n" + $bhead }, 1) } else { $bill = "<!doctype html>`n<html><head>" + $bhead + "</head><body>`n" + $bill + "`n</body></html>" }
  $j = $bill.ToLower().LastIndexOf('</body>')
  if ($j -ge 0) { $bill = $bill.Substring(0, $j) + $billTail + $bill.Substring($j) } else { $bill = $bill + $billTail }
  [IO.File]::WriteAllText((Join-Path $dest 'bill.html'), $bill, $utf8)
  "  + bill.html (" + [int]($bill.Length / 1024) + " KB)"
}
[IO.File]::WriteAllText((Join-Path $dest 'index.html'), $html, $utf8)
"Built apps\$Key  (Code.gs " + [int]($code.Length / 1024) + " KB, index.html " + [int]($html.Length / 1024) + " KB)"
