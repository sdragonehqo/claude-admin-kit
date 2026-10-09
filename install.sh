#!/usr/bin/env bash
# Admin kit installer for Git Bash. install.ps1 is the primary installer;
# this wrapper runs it, so both give the same result.
#   bash install.sh              install
#   bash install.sh --dry-run    show every action, change nothing
#   bash install.sh --name Maria --timezone America/New_York
set -eu

here="$(cd "$(dirname "$0")" && pwd)"
args=()
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) args+=("-DryRun") ;;
    --name) shift; args+=("-Name" "${1:?--name needs a value}") ;;
    --timezone) shift; args+=("-TimeZone" "${1:?--timezone needs a value}") ;;
    *) echo "Unknown option: $1"; echo "Use --dry-run, --name NAME, --timezone ZONE"; exit 2 ;;
  esac
  shift
done

if command -v powershell.exe >/dev/null 2>&1; then ps=powershell.exe
elif command -v pwsh >/dev/null 2>&1; then ps=pwsh
else
  echo "PowerShell not found. On Windows it ships with the system; open a new Git Bash window and try again."
  exit 1
fi

if command -v cygpath >/dev/null 2>&1; then script="$(cygpath -w "$here/install.ps1")"; else script="$here/install.ps1"; fi
exec "$ps" -NoProfile -ExecutionPolicy Bypass -File "$script" ${args[@]+"${args[@]}"}
