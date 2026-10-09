<#
.SYNOPSIS
  Installs the admin kit into your Claude Code folder.

.DESCRIPTION
  Works in Windows PowerShell 5.1 and PowerShell 7. Run it from the kit folder:

    powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1

  Add -DryRun to see everything it would do without changing anything.
  Safe to run again: it only changes what is different, and it backs up your
  CLAUDE.md and settings.json first (into .claude\backups\admin-kit-<timestamp>\).

.PARAMETER DryRun
  Print every action. Write nothing, install nothing.

.PARAMETER Name
  Your first name (skips the question). Claude starts every reply with it.

.PARAMETER TimeZone
  Your IANA time zone, for example America/New_York (skips the question).
#>
[CmdletBinding()]
param(
  [switch]$DryRun,
  [string]$Name,
  [string]$TimeZone
)

$ErrorActionPreference = 'Stop'
$KitVersion = '0.1.0'
$KitDir = $PSScriptRoot
if (-not $KitDir) { $KitDir = Split-Path -Parent $MyInvocation.MyCommand.Path }
$Utf8 = New-Object System.Text.UTF8Encoding($false)
$Warnings = New-Object System.Collections.ArrayList
$script:BackupDir = $null
$script:Stamp = Get-Date -Format 'yyyyMMdd-HHmmss'

# ---------------------------------------------------------------- output helpers

function Step([string]$n, [string]$m) { Write-Host ''; Write-Host "Step ${n}: $m" -ForegroundColor Cyan }
function Ok([string]$m)   { Write-Host "  OK    $m" -ForegroundColor Green }
function Info([string]$m) { Write-Host "        $m" }
function Plan([string]$m) { Write-Host "  DRY   would $m" -ForegroundColor DarkGray }
function Warn([string]$m) { Write-Host "  WARN  $m" -ForegroundColor Yellow; [void]$Warnings.Add($m) }

# ---------------------------------------------------------------- file helpers

function Invoke-Native([string]$exe, [string[]]$argList) {
  $old = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $out = ''
  $code = 1
  try { $out = (& $exe @argList 2>&1 | Out-String); $code = $LASTEXITCODE }
  catch { $out = $_.Exception.Message; $code = 1 }
  finally { $ErrorActionPreference = $old }
  return [pscustomobject]@{ Out = $out.Trim(); Code = $code }
}

function Invoke-Live([string]$exe, [string[]]$argList) {
  $old = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $code = 1
  try { & $exe @argList | Out-Host; $code = $LASTEXITCODE }
  catch { Write-Host $_.Exception.Message; $code = 1 }
  finally { $ErrorActionPreference = $old }
  return $code
}

function Read-Utf8([string]$path) { return [System.IO.File]::ReadAllText($path, $Utf8) }

function Write-Utf8([string]$path, [string]$text) {
  $dir = Split-Path -Parent $path
  if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  [System.IO.File]::WriteAllText($path, $text, $Utf8)
}

function Backup-File([string]$path) {
  if (-not (Test-Path -LiteralPath $path)) { return }
  if (-not $script:BackupDir) {
    $script:BackupDir = Join-Path (Join-Path $ClaudeDir 'backups') ('admin-kit-' + $script:Stamp)
  }
  if ($DryRun) { Plan "copy $path to $script:BackupDir"; return }
  if (-not (Test-Path -LiteralPath $script:BackupDir)) { New-Item -ItemType Directory -Path $script:BackupDir -Force | Out-Null }
  Copy-Item -LiteralPath $path -Destination $script:BackupDir -Force
  Ok "backed up $(Split-Path -Leaf $path) to $script:BackupDir"
}

function Copy-Tree([string]$src, [string]$dst) {
  $srcFull = (Resolve-Path -LiteralPath $src).ProviderPath.TrimEnd('\', '/')
  $count = 0
  foreach ($f in Get-ChildItem -LiteralPath $srcFull -Recurse -Force -File) {
    $rel = $f.FullName.Substring($srcFull.Length).TrimStart('\', '/')
    $to = Join-Path $dst $rel
    $count++
    if ($DryRun) { continue }
    $toDir = Split-Path -Parent $to
    if (-not (Test-Path -LiteralPath $toDir)) { New-Item -ItemType Directory -Path $toDir -Force | Out-Null }
    Copy-Item -LiteralPath $f.FullName -Destination $to -Force
  }
  return $count
}

# ---------------------------------------------------------------- JSON helpers (5.1 has no -AsHashtable)

function ConvertTo-Hash($o) {
  if ($null -eq $o) { return $null }
  if ($o -is [System.Management.Automation.PSCustomObject]) {
    $h = [ordered]@{}
    foreach ($p in $o.PSObject.Properties) { $h[$p.Name] = ConvertTo-Hash $p.Value }
    return $h
  }
  if ($o -is [System.Collections.IList]) {
    $l = New-Object System.Collections.ArrayList
    foreach ($i in $o) { [void]$l.Add((ConvertTo-Hash $i)) }
    return , $l
  }
  return $o
}

function Test-Dict($x) { return ($x -is [System.Collections.IDictionary]) }

function Test-HasStyleHook($entries) {
  foreach ($e in $entries) {
    if (-not (Test-Dict $e) -or -not $e.Contains('hooks')) { continue }
    foreach ($h in $e['hooks']) {
      if ((Test-Dict $h) -and $h.Contains('command') -and ([string]$h['command']).Contains('style-reinforce.cjs')) { return $true }
    }
  }
  return $false
}

# Kit values win only for the keys the kit sets. Objects merge key by key.
# Hook lists are appended to, never replaced, and never duplicated.
function Merge-Settings($base, $kit, [bool]$inHooks) {
  foreach ($k in @($kit.Keys)) {
    $kv = $kit[$k]
    if ($inHooks) {
      if ($base.Contains($k) -and ($base[$k] -is [System.Collections.IList])) {
        if (-not (Test-HasStyleHook $base[$k])) { foreach ($e in $kv) { [void]$base[$k].Add($e) } }
      } else { $base[$k] = $kv }
    }
    elseif ((Test-Dict $kv) -and $base.Contains($k) -and (Test-Dict $base[$k])) {
      Merge-Settings $base[$k] $kv ($k -eq 'hooks')
    }
    else { $base[$k] = $kv }
  }
}

function ConvertTo-JsonText($h) { return (ConvertTo-Json -InputObject $h -Depth 20) }

# ---------------------------------------------------------------- time zone helpers

$WinToIana = @{
  'UTC' = 'UTC'; 'Eastern Standard Time' = 'America/New_York'; 'Central Standard Time' = 'America/Chicago'
  'Mountain Standard Time' = 'America/Denver'; 'US Mountain Standard Time' = 'America/Phoenix'
  'Pacific Standard Time' = 'America/Los_Angeles'; 'Alaskan Standard Time' = 'America/Anchorage'
  'Hawaiian Standard Time' = 'Pacific/Honolulu'; 'Atlantic Standard Time' = 'America/Halifax'
  'Canada Central Standard Time' = 'America/Regina'; 'GMT Standard Time' = 'Europe/London'
  'W. Europe Standard Time' = 'Europe/Berlin'; 'Romance Standard Time' = 'Europe/Paris'
  'Central Europe Standard Time' = 'Europe/Budapest'; 'India Standard Time' = 'Asia/Kolkata'
  'China Standard Time' = 'Asia/Shanghai'; 'Singapore Standard Time' = 'Asia/Singapore'
  'Tokyo Standard Time' = 'Asia/Tokyo'; 'AUS Eastern Standard Time' = 'Australia/Sydney'
}

function Get-IanaDefault {
  $id = [System.TimeZoneInfo]::Local.Id
  if ($id -match '/' -or $id -eq 'UTC') { return $id }
  try {
    $r = $null
    if ([System.TimeZoneInfo]::TryConvertWindowsIdToIanaId($id, [ref]$r) -and $r) { return $r }
  } catch { }
  if ($WinToIana.ContainsKey($id)) { return $WinToIana[$id] }
  return $null
}

function Test-Iana([string]$z) { return ($z -match '^[A-Za-z][A-Za-z0-9_+\-]*(/[A-Za-z0-9_+\-]+)+$' -or $z -eq 'UTC') }

function Ask([string]$prompt, [string]$default) {
  $suffix = ''
  if ($default) { $suffix = " [$default]" }
  try { $a = Read-Host "$prompt$suffix" } catch { return $default }
  if ([string]::IsNullOrWhiteSpace($a)) { return $default }
  return $a.Trim()
}

# ================================================================= start

Write-Host ''
Write-Host "Admin kit $KitVersion installer" -ForegroundColor White
if ($DryRun) { Write-Host 'DRY RUN: nothing will be written or installed.' -ForegroundColor Yellow }

$ClaudeSrc = Join-Path $KitDir 'claude'
$ModsSrc = Join-Path $KitDir 'mods'
if (-not (Test-Path -LiteralPath (Join-Path $ClaudeSrc 'CLAUDE.md'))) {
  Write-Host "ERROR: cannot find the kit's claude folder next to install.ps1. Run this from inside the unzipped kit folder." -ForegroundColor Red
  exit 1
}

$HomeDir = $HOME
if (-not $HomeDir) { $HomeDir = $env:USERPROFILE }
$ClaudeDir = $env:CLAUDE_CONFIG_DIR
if (-not $ClaudeDir) { $ClaudeDir = Join-Path $HomeDir '.claude' }
$Slug = ($HomeDir -replace '[^A-Za-z0-9]', '-')
$MemDir = Join-Path (Join-Path (Join-Path $ClaudeDir 'projects') $Slug) 'memory'
$StatePath = Join-Path $ClaudeDir 'admin-kit-install.json'
$ModsDst = Join-Path $ClaudeDir 'admin-kit-mods'

# ---------------------------------------------------------------- 1. tools

Step '1 of 7' 'Checking what is installed'

$claudeCmd = Get-Command claude -ErrorAction SilentlyContinue
if (-not $claudeCmd) {
  Write-Host '  Claude Code is not installed (or this window cannot see it).' -ForegroundColor Red
  Write-Host '  Install it, then close this window, open a new PowerShell and run this script again:'
  Write-Host '      winget install Anthropic.ClaudeCode'
  Write-Host '  No winget? Use:  irm https://claude.ai/install.ps1 | iex'
  if ($DryRun) { Warn 'Claude Code missing. A real run would stop here with exit code 1.' } else { exit 1 }
} else {
  $v = Invoke-Native 'claude' @('--version')
  Ok "Claude Code found: $($v.Out)"
}

$gitCmd = Get-Command git -ErrorAction SilentlyContinue
if ($gitCmd) { Ok 'Git for Windows found' }
else {
  Warn 'Git for Windows not found. Claude Code still works (it uses PowerShell), but the kit works best with it. Install:  winget install Git.Git'
}

$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCmd) {
  $nv = Invoke-Native 'node' @('--version')
  $major = 0
  if ($nv.Out -match '^v(\d+)') { $major = [int]$Matches[1] }
  if ($major -ge 18) { Ok "Node.js found: $($nv.Out)" }
  else { Warn "Node.js $($nv.Out) is too old (18 or newer needed for the plugins). Install:  winget install OpenJS.NodeJS.LTS" }
} else {
  Warn 'Node.js not found. The caveman, i-have-adhd and claude-hud plugins and the style hook need it. Install:  winget install OpenJS.NodeJS.LTS   then close and reopen PowerShell and run this script again.'
}

# ---------------------------------------------------------------- 2. questions

Step '2 of 7' 'Two quick questions'

$prior = $null
if (Test-Path -LiteralPath $StatePath) { try { $prior = (Read-Utf8 $StatePath) | ConvertFrom-Json } catch { $prior = $null } }

$firstName = $Name
if (-not $firstName) {
  $default = $null
  if ($prior -and $prior.name) { $default = [string]$prior.name }
  for ($i = 0; $i -lt 3 -and -not $firstName; $i++) {
    $a = Ask 'What first name should Claude start every reply with' $default
    if ($a) { $a = ($a -split '\s+')[0] }
    if ($a -and $a -match "^\p{L}[\p{L}\p{N}'\-]*$") { $firstName = $a } else { Write-Host '  Please type one word, letters only, for example Maria.' -ForegroundColor Yellow }
  }
}
if (-not $firstName -or $firstName -notmatch "^\p{L}[\p{L}\p{N}'\-]*$") {
  Write-Host '  ERROR: no usable first name. Run again with  -Name Maria  (your own name).' -ForegroundColor Red
  exit 1
}

$zone = $TimeZone
if (-not $zone) {
  $default = $null
  if ($prior -and $prior.timezone) { $default = [string]$prior.timezone } else { $default = Get-IanaDefault }
  if (-not $default) { Info 'Could not work out your time zone. Example: America/New_York, Europe/London, Asia/Singapore.' }
  for ($i = 0; $i -lt 3 -and -not $zone; $i++) {
    $a = Ask 'Your time zone name' $default
    if ($a -and (Test-Iana $a)) { $zone = $a } else { Write-Host '  Use the Region/City form, for example America/Chicago.' -ForegroundColor Yellow }
  }
}
if (-not $zone -or -not (Test-Iana $zone)) {
  Write-Host '  ERROR: no usable time zone. Run again with  -TimeZone America/New_York  (your own zone).' -ForegroundColor Red
  exit 1
}
Ok "Name: $firstName    Time zone: $zone"
Info "Claude folder:    $ClaudeDir"
Info "Memory folder:    $MemDir"

# ---------------------------------------------------------------- 3. CLAUDE.md

Step '3 of 7' 'Rules file (CLAUDE.md)'

$rendered = (Read-Utf8 (Join-Path $ClaudeSrc 'CLAUDE.md')).Replace('__CANARY__', $firstName).Replace('__TIMEZONE__', $zone)
$mdTarget = Join-Path $ClaudeDir 'CLAUDE.md'
$existingMd = $null
if (Test-Path -LiteralPath $mdTarget) { $existingMd = Read-Utf8 $mdTarget }
if ($null -ne $existingMd -and $existingMd -ceq $rendered) { Ok 'CLAUDE.md is already up to date' }
else {
  Backup-File $mdTarget
  if ($DryRun) { Plan "write $mdTarget" } else { Write-Utf8 $mdTarget $rendered; Ok "wrote $mdTarget" }
}

# ---------------------------------------------------------------- 4. settings and files

Step '4 of 7' 'Settings, scripts, skills, memory'

$kitSettingsText = (Read-Utf8 (Join-Path $ClaudeSrc 'settings.json')).Replace('__KIT_MODS_DIR__', $ModsDst.Replace('\', '\\'))
$kitSettings = ConvertTo-Hash ($kitSettingsText | ConvertFrom-Json)
$setTarget = Join-Path $ClaudeDir 'settings.json'
$current = [ordered]@{}
if (Test-Path -LiteralPath $setTarget) {
  $curText = Read-Utf8 $setTarget
  if (-not [string]::IsNullOrWhiteSpace($curText)) {
    try { $current = ConvertTo-Hash ($curText | ConvertFrom-Json) }
    catch {
      Write-Host "  ERROR: $setTarget is not valid JSON, so it was left alone. Fix it or rename it, then run this script again." -ForegroundColor Red
      exit 1
    }
  }
}
$before = ConvertTo-JsonText $current
Merge-Settings $current $kitSettings $false
$after = ConvertTo-JsonText $current
if ($before -ceq $after) { Ok 'settings.json already has the kit settings' }
else {
  Backup-File $setTarget
  if ($DryRun) { Plan "merge the kit settings into $setTarget (your other keys stay)" }
  else { Write-Utf8 $setTarget $after; Ok "merged kit settings into $setTarget" }
}

# scripts and the PowerShell hooks reference file
foreach ($pair in @(@('scripts\style-reinforce.cjs', 'scripts'), @('settings.powershell-hooks.json', ''))) {
  $srcFile = Join-Path $ClaudeSrc $pair[0]
  $dstDir = $ClaudeDir
  if ($pair[1]) { $dstDir = Join-Path $ClaudeDir $pair[1] }
  $dstFile = Join-Path $dstDir (Split-Path -Leaf $pair[0])
  if ($DryRun) { Plan "copy $(Split-Path -Leaf $pair[0]) to $dstFile" }
  else {
    if (-not (Test-Path -LiteralPath $dstDir)) { New-Item -ItemType Directory -Path $dstDir -Force | Out-Null }
    Copy-Item -LiteralPath $srcFile -Destination $dstFile -Force
    Ok "copied $(Split-Path -Leaf $pair[0])"
  }
}

# caveman flag: first install only, so a level you switched off stays off on re-run
$flagDst = Join-Path $ClaudeDir '.caveman-active'
if ($prior) { Ok '.caveman-active left as you have it (not a first install)' }
elseif (Test-Path -LiteralPath $flagDst) { Ok '.caveman-active already exists, kept' }
elseif ($DryRun) { Plan "copy .caveman-active (level caveman) to $flagDst" }
else { Copy-Item -LiteralPath (Join-Path $ClaudeSrc '.caveman-active') -Destination $flagDst -Force; Ok 'caveman level set to caveman (mildest)' }

# skills
foreach ($d in Get-ChildItem -LiteralPath (Join-Path $ClaudeSrc 'skills') -Directory) {
  $n = Copy-Tree $d.FullName (Join-Path (Join-Path $ClaudeDir 'skills') $d.Name)
  if ($DryRun) { Plan "copy skill $($d.Name) ($n files) to $(Join-Path (Join-Path $ClaudeDir 'skills') $d.Name)" } else { Ok "skill $($d.Name) ($n files)" }
}

# optional mod, copied so the kit folder can be deleted later
$n = Copy-Tree $ModsSrc $ModsDst
if ($DryRun) { Plan "copy the admin-hud mod ($n files) to $ModsDst" } else { Ok "admin-hud mod copied to $ModsDst (off until you enable it)" }

# memory seeds
$memSrc = Join-Path $ClaudeSrc 'memory'
$added = 0; $kept = 0
foreach ($f in Get-ChildItem -LiteralPath $memSrc -File) {
  $to = Join-Path $MemDir $f.Name
  if ($f.Name -eq 'MEMORY.md') { continue }
  if (Test-Path -LiteralPath $to) { $kept++; continue }
  $added++
  if (-not $DryRun) { Write-Utf8 $to (Read-Utf8 $f.FullName) }
}
$idxTo = Join-Path $MemDir 'MEMORY.md'
$kitIdx = Read-Utf8 (Join-Path $memSrc 'MEMORY.md')
if (-not (Test-Path -LiteralPath $idxTo)) {
  if (-not $DryRun) { Write-Utf8 $idxTo $kitIdx }
  $idxNote = 'created the memory index'
} else {
  $idx = Read-Utf8 $idxTo
  $new = New-Object System.Collections.ArrayList
  foreach ($line in ($kitIdx -split "`r?`n")) {
    if ($line -match '^- \[' -and $line -match '\]\(([^)]+)\)') {
      if (-not $idx.Contains('(' + $Matches[1] + ')')) { [void]$new.Add($line) }
    }
  }
  if ($new.Count -gt 0) {
    if (-not $DryRun) { Write-Utf8 $idxTo ($idx.TrimEnd() + "`n" + ($new -join "`n") + "`n") }
    $idxNote = "added $($new.Count) lines to your memory index"
  } else { $idxNote = 'memory index already has every kit line' }
}
if ($DryRun) { Plan "seed memory in ${MemDir}: $added new files, $kept kept, index: $idxNote" }
else { Ok "memory seeded in ${MemDir}: $added new files, $kept already there, $idxNote" }

# ---------------------------------------------------------------- 5. plugins

Step '5 of 7' 'Plugins (this downloads from GitHub and can take a few minutes)'

# Pin attempt: Claude Code refuses a commit hash after # (only a branch or tag name works), so the newest version is used. The kit defaults (level caveman) match caveman 3.2.0.
$CavemanPin = 'JuliusBrussee/caveman#766dce6b1394ebb56a3090748d5a0240a5aefb36'
$Markets = @(
  @{ Name = 'caveman'; Source = 'JuliusBrussee/caveman'; Pin = $CavemanPin },
  @{ Name = 'i-have-adhd'; Source = 'ayghri/i-have-adhd'; Pin = $null },
  @{ Name = 'claude-hud'; Source = 'jarrodwatts/claude-hud'; Pin = $null },
  @{ Name = 'anthropic-agent-skills'; Source = 'anthropics/skills'; Pin = $null }
)
$Plugins = @('caveman@caveman', 'i-have-adhd@i-have-adhd', 'claude-hud@claude-hud', 'document-skills@anthropic-agent-skills', 'example-skills@anthropic-agent-skills')
$PluginProblems = New-Object System.Collections.ArrayList

if ($DryRun) {
  foreach ($m in $Markets) {
    if ($m.Pin) { Plan "run: claude plugin marketplace add $($m.Pin)   (then without the pin if that is refused)" }
    else { Plan "run: claude plugin marketplace add $($m.Source)" }
  }
  foreach ($p in $Plugins) { Plan "run: claude plugin install $p" }
}
elseif (-not $claudeCmd) { Warn 'Skipped plugins because Claude Code is missing.' }
else {
  $mk = Invoke-Native 'claude' @('plugin', 'marketplace', 'list')
  $knownMarkets = ''
  if ($mk.Code -eq 0) { $knownMarkets = $mk.Out }
  foreach ($m in $Markets) {
    if ($knownMarkets -and $knownMarkets.Contains($m.Name)) { Ok "marketplace $($m.Name) already added"; continue }
    $code = 1
    if ($m.Pin) {
      $code = Invoke-Live 'claude' @('plugin', 'marketplace', 'add', $m.Pin)
      if ($code -ne 0) { Warn "Could not pin $($m.Name) to a fixed version; using the newest instead. Level names depend on the version. The kit default is caveman (mildest); if it is not accepted, type /caveman status and use a level it lists." }
    }
    if ($code -ne 0) { $code = Invoke-Live 'claude' @('plugin', 'marketplace', 'add', $m.Source) }
    if ($code -eq 0) { Ok "marketplace $($m.Name) added" }
    else {
      $re = Invoke-Native 'claude' @('plugin', 'marketplace', 'list')
      if ($re.Code -eq 0 -and $re.Out.Contains($m.Name)) { Ok "marketplace $($m.Name) is present" }
      else { [void]$PluginProblems.Add("claude plugin marketplace add $($m.Source)"); Warn "marketplace $($m.Name) failed to add" }
    }
  }
  $pl = Invoke-Native 'claude' @('plugin', 'list')
  $installed = ''
  if ($pl.Code -eq 0) { $installed = $pl.Out }
  foreach ($p in $Plugins) {
    $short = $p.Split('@')[0]
    if ($installed -and $installed.Contains($short)) { Ok "plugin $p already installed"; continue }
    $code = Invoke-Live 'claude' @('plugin', 'install', $p)
    if ($code -eq 0) { Ok "plugin $p installed" }
    else { [void]$PluginProblems.Add("claude plugin install $p"); Warn "plugin $p failed to install" }
  }
}

# ---------------------------------------------------------------- 6. record

Step '6 of 7' 'Recording what was installed'
$state = [ordered]@{
  kitVersion = $KitVersion; name = $firstName; timezone = $zone; claudeDir = $ClaudeDir
  memoryDir = $MemDir; modsDir = $ModsDst; installedAt = (Get-Date).ToString('s')
}
if ($script:BackupDir) { $state['lastBackupDir'] = $script:BackupDir }
elseif ($prior -and $prior.lastBackupDir) { $state['lastBackupDir'] = [string]$prior.lastBackupDir }
if ($DryRun) { Plan "write $StatePath" } else { Write-Utf8 $StatePath (ConvertTo-JsonText $state); Ok "wrote $StatePath" }

# ---------------------------------------------------------------- 7. checklist

Step '7 of 7' 'Done. Your checklist'
if ($DryRun) { Write-Host '  That was a dry run. Run the same command without -DryRun to install.' -ForegroundColor Yellow }
if ($PluginProblems.Count -gt 0) {
  Write-Host ''
  Write-Host '  These plugin steps failed. Check your internet, then run them one by one:' -ForegroundColor Yellow
  foreach ($c in $PluginProblems) { Write-Host "      $c" }
}
Write-Host ''
Write-Host '  1. Check the install (every line should say PASS):'
Write-Host '       powershell -NoProfile -ExecutionPolicy Bypass -File .\verify\check-install.ps1'
Write-Host '  2. Start Claude from your home folder:'
Write-Host '       cd ~'
Write-Host '       claude'
Write-Host '     The first time, a browser opens so you can sign in with your Claude account.'
Write-Host '  3. Copy the setup prompt, then paste it into Claude with Ctrl+V and press Enter:'
Write-Host '       Get-Content .\ONBOARD-PROMPT.md -Raw | Set-Clipboard'
Write-Host "     Claude's first word should be your name ($firstName)."
Write-Host '  4. Optional status bar: in Claude type  /claude-hud:setup'
Write-Host ''
if ($Warnings.Count -gt 0) {
  Write-Host "  $($Warnings.Count) warning(s) above need a look, but nothing stopped the install." -ForegroundColor Yellow
}
exit 0
