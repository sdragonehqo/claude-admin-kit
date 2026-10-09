<#
.SYNOPSIS
  Checks that the admin kit installed correctly. Prints PASS or FAIL for each check.
  Exits 1 if any check fails. Works in Windows PowerShell 5.1 and PowerShell 7.

.DESCRIPTION
    powershell -NoProfile -ExecutionPolicy Bypass -File .\verify\check-install.ps1
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Continue'
$Utf8 = New-Object System.Text.UTF8Encoding($false)
$script:Fails = 0
$script:Passes = 0

function Pass([string]$m) { Write-Host "  PASS  $m" -ForegroundColor Green; $script:Passes++ }
function Fail([string]$m, [string]$fix) {
  Write-Host "  FAIL  $m" -ForegroundColor Red
  if ($fix) { Write-Host "        fix: $fix" }
  $script:Fails++
}
function Note([string]$m) { Write-Host "  NOTE  $m" -ForegroundColor Yellow }
function Check([string]$m, [bool]$ok, [string]$fix) { if ($ok) { Pass $m } else { Fail $m $fix } }

$HomeDir = $HOME
if (-not $HomeDir) { $HomeDir = $env:USERPROFILE }
$ClaudeDir = $env:CLAUDE_CONFIG_DIR
if (-not $ClaudeDir) { $ClaudeDir = Join-Path $HomeDir '.claude' }
$rerun = 'Run install.ps1 again.'

$state = $null
$statePath = Join-Path $ClaudeDir 'admin-kit-install.json'
if (Test-Path -LiteralPath $statePath) { try { $state = ([System.IO.File]::ReadAllText($statePath, $Utf8)) | ConvertFrom-Json } catch { $state = $null } }
$MemDir = Join-Path (Join-Path (Join-Path $ClaudeDir 'projects') ($HomeDir -replace '[^A-Za-z0-9]', '-')) 'memory'
if ($state -and $state.memoryDir) { $MemDir = [string]$state.memoryDir }

Write-Host ''
Write-Host 'Admin kit install check' -ForegroundColor White
Write-Host "Claude folder: $ClaudeDir"
Write-Host ''

# Claude Code
$claudeCmd = Get-Command claude -ErrorAction SilentlyContinue
Check 'Claude Code is on PATH' ([bool]$claudeCmd) 'winget install Anthropic.ClaudeCode, then open a new PowerShell window'

# install record
Check 'install record exists (admin-kit-install.json)' ($null -ne $state) $rerun

# CLAUDE.md
$md = Join-Path $ClaudeDir 'CLAUDE.md'
if (Test-Path -LiteralPath $md) {
  $t = [System.IO.File]::ReadAllText($md, $Utf8)
  Pass 'CLAUDE.md exists'
  Check 'CLAUDE.md has your name and time zone filled in' (-not $t.Contains('__CANARY__') -and -not $t.Contains('__TIMEZONE__')) $rerun
} else { Fail 'CLAUDE.md exists' $rerun }

# settings.json
$sp = Join-Path $ClaudeDir 'settings.json'
$settings = $null
if (Test-Path -LiteralPath $sp) {
  try { $settings = ([System.IO.File]::ReadAllText($sp, $Utf8)) | ConvertFrom-Json; Pass 'settings.json parses as JSON' }
  catch { Fail 'settings.json parses as JSON' "Open $sp, fix the typo or rename the file, then run install.ps1 again." }
} else { Fail 'settings.json exists' $rerun }
if ($settings) {
  $hookText = ($settings.hooks | ConvertTo-Json -Depth 20 -Compress)
  Check 'settings.json has the style hooks' ($hookText -match 'style-reinforce') $rerun
  Check 'settings.json lists the kit plugins' ($settings.enabledPlugins -and $settings.enabledPlugins.PSObject.Properties.Name -contains 'caveman@caveman') $rerun
  Check 'settings.json has no leftover placeholder' (-not ([System.IO.File]::ReadAllText($sp, $Utf8)).Contains('__KIT_MODS_DIR__')) $rerun
}

# scripts, skills
Check 'style-reinforce.cjs is in place' (Test-Path -LiteralPath (Join-Path $ClaudeDir 'scripts\style-reinforce.cjs')) $rerun
foreach ($s in @('verified-status', 'resume-handoff', 'archify')) {
  Check "skill $s is in place" (Test-Path -LiteralPath (Join-Path $ClaudeDir "skills\$s\SKILL.md")) $rerun
}

# memory
Check 'memory index exists' (Test-Path -LiteralPath (Join-Path $MemDir 'MEMORY.md')) "Run install.ps1 again. Looked in $MemDir"
$memCount = 0
if (Test-Path -LiteralPath $MemDir) { $memCount = @(Get-ChildItem -LiteralPath $MemDir -Filter '*.md' -File | Where-Object { $_.Name -ne 'MEMORY.md' }).Count }
Check "memory seeds present ($memCount of 12 or more)" ($memCount -ge 12) $rerun

# plugins
if ($claudeCmd) {
  $old = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
  $listOut = ''; $code = 1
  try { $listOut = (& claude plugin list 2>&1 | Out-String); $code = $LASTEXITCODE } catch { $code = 1 }
  $ErrorActionPreference = $old
  Check "'claude plugin list' runs" ($code -eq 0) 'Update Claude Code: winget upgrade Anthropic.ClaudeCode'
  if ($code -eq 0) {
    foreach ($p in @('caveman', 'i-have-adhd', 'claude-hud', 'document-skills', 'example-skills')) {
      Check "plugin $p is listed" ($listOut.Contains($p)) "claude plugin install $p@$(if ($p -like '*-skills') { 'anthropic-agent-skills' } else { $p })"
    }
  }
}

# helpers (not failures)
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Note 'Node.js is missing. Install:  winget install OpenJS.NodeJS.LTS  (the plugins and style hook need it)' }
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Note 'Git for Windows is missing (optional).  winget install Git.Git' }

Write-Host ''
if ($script:Fails -gt 0) {
  Write-Host "$($script:Fails) check(s) FAILED, $($script:Passes) passed." -ForegroundColor Red
  exit 1
}
Write-Host "All $($script:Passes) checks PASSED." -ForegroundColor Green
exit 0
