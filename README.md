# Claude Admin Kit

This kit sets up Claude Code on your Windows PC for admin work and drafting proposals.

- It installs a set of rules so Claude opens every reply with your first name, uses your time zone, checks facts before reporting them, and keeps secrets out of view.
- It adds optional reply styles: shorter replies (caveman) and replies shaped as small numbered steps (ADHD mode). You can switch both off by typing a few words.
- It adds skills for status reports and picking up unfinished work, and diagrams, plus the Word, Excel, PowerPoint and PDF skills from Anthropic.
- It seeds Claude's memory with twelve working habits, so it starts out knowing how you like to work.
- It ends with a first-run setup that Claude walks you through. You only answer questions.

Costs, accounts and sign-up links are in [ACCOUNTS.md](ACCOUNTS.md).

## Before you start

You need a paid Claude plan (see [ACCOUNTS.md](ACCOUNTS.md)) and these three installs. Open Windows Terminal (Start menu, type "Terminal") and paste one line at a time.

| Install | Command | You should see |
|---|---|---|
| Claude Code (required) | `winget install Anthropic.ClaudeCode` | "Successfully installed". Then close the window and open a new one. |
| Git for Windows (recommended) | `winget install Git.Git` | "Successfully installed" |
| Node.js (needed by the plugins) | `winget install OpenJS.NodeJS.LTS` | "Successfully installed" |

No `winget`? Install Claude Code with `irm https://claude.ai/install.ps1 | iex`, and download Git and Node from the links in [ACCOUNTS.md](ACCOUNTS.md).

Check them in a new window:

```powershell
claude --version
git --version
node --version
```

You should see a version number for each. Windows Terminal itself is free: https://aka.ms/terminal

Only if you want Claude to build or convert Word, Excel, PowerPoint or PDF files with its own tools: `winget install Python.Python.3.12` and `winget install TheDocumentFoundation.LibreOffice`. Skip them now; Claude will tell you if it needs them.

## The 10-minute install

1. **Unzip the kit.** Right-click the zip, choose Extract All, and put it somewhere you will find it, for example your Documents folder.
2. **Open the kit folder in PowerShell.** Adjust the folder name to match yours:

   ```powershell
   cd "$HOME\Documents\claude-admin-kit"
   dir install.ps1
   ```

   You should see one line listing `install.ps1`. If it says it cannot find it, you are one folder too high or too low; open the folder that contains `install.ps1`.

3. **Preview first (optional, changes nothing):**

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1 -DryRun
   ```

   You should see a list of lines starting with `DRY would ...` and "That was a dry run".

4. **Install:**

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
   ```

   It asks two things: your first name, and your time zone (it suggests one; press Enter to accept). It then backs up any CLAUDE.md and settings.json you already have, copies the kit in, and downloads the plugins. This takes a few minutes. At the end you should see "Done. Your checklist". Lines marked WARN are advice, not errors.

   Prefer Git Bash? `bash install.sh` does the same thing. It runs `install.ps1` for you.

5. **Check it:**

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\verify\check-install.ps1
   ```

   You should see `PASS` on every line and "All ... checks PASSED". A `FAIL` line tells you the fix.

6. **Start Claude from your home folder:**

   ```powershell
   cd ~
   claude
   ```

   The first time, your browser opens so you can sign in with your Claude account. Always start Claude from your home folder (the folder PowerShell opens in). Claude keeps its memory per folder, and the kit put its starter memories in the one for your home folder.

7. **Paste the setup prompt.** Open a second PowerShell window in the kit folder and run this to copy it:

   ```powershell
   Get-Content .\ONBOARD-PROMPT.md -Raw | Set-Clipboard
   ```

   Click into the Claude window, press Ctrl+V, then Enter. Claude's first word should be your first name. It then walks you through: ADHD mode (yes or no), caveman level, connecting Gmail, Google and the rest, a test Word proposal in your Documents folder, saving one preference to memory, and three example prompts.

8. **Optional status bar.** In Claude type `/claude-hud:setup`. It adds a line under the prompt showing model, usage and context.

## What each piece does

| Piece | What it does, in plain words |
|---|---|
| `CLAUDE.md` rules | The house rules Claude reads every session: reply with your name first, give times in your time zone, say "UNVERIFIED" when it has not checked something, never print secrets, look things up before asking you, take sensible defaults after you approve. |
| `settings.json` | Claude Code's settings: it asks permission before risky actions, turns on the plugins below, and runs the style hook. |
| Style hook (`style-reinforce.cjs`) | Reminds Claude of your chosen reply styles every so often so they do not fade in long sessions. Needs Node.js. |
| caveman plugin | Makes replies shorter. Its level names depend on the version. The kit installs the newest caveman (3.2.0), whose levels are `caveman` (mildest, the default), `ultracave` and `megacave`. Older versions called them lite, full and ultra. |
| i-have-adhd plugin | Shapes replies: next action first, short numbered steps, one small closing action. Off until you turn it on. |
| claude-hud plugin | A status line showing model, usage and context. Needs `/claude-hud:setup` once. |
| document-skills plugin | Anthropic's skills for Word (.docx), Excel (.xlsx), PowerPoint (.pptx) and PDF files. |
| example-skills plugin | More Anthropic skills: co-authoring documents, brand guidelines, internal communications, themes, design. Remove it if you do not want it. |
| verified-status skill | Reports status as "claim, check, result" and labels guesses as UNVERIFIED. |
| resume-handoff skill | Picks up unfinished work from a handoff note, checking the note against reality first. |
| archify skill | Draws process, workflow and flow diagrams as a web page you can open. Needs Node.js. |
| Memory seeds (12 files) | Working habits Claude remembers: decide and note instead of re-asking, say a recommendation once, check state before asking, times in your time zone, light-mode pages, no idle time, results next to the control, cap every check, ship small, hints not answers when you are learning, cost check before many helpers, show names not values for secrets. |
| admin-hud mod | A second status band. Installed but switched off, to avoid doubling up with claude-hud. Needs Claude Code 2.1.288 or newer. To switch on later: `claude plugin install admin-hud@admin-kit-mods`. |
| `ONBOARD-PROMPT.md` | The first-run setup you paste into Claude. |

## Switching modes on and off

Type these to Claude, in the chat:

| You type | What happens |
|---|---|
| `stop caveman` | Replies go back to normal length |
| `/caveman`, `/ultracave` or `/megacave` | Change the shortness level (`/caveman status` shows the current one; the old names lite, full and ultra still work as aliases) |
| `/i-have-adhd` | ADHD shaping on for this session |
| `stop adhd mode` | ADHD shaping off |
| `normal mode` | Both styles off |
| `turn style back on` | Restores what was on before |

These last until you close Claude. To make a choice permanent, ask Claude ("make ADHD mode always on", "turn caveman off for good"), or do it yourself:

```powershell
New-Item -ItemType File -Force "$HOME\.claude\.i-have-adhd-always"     # ADHD mode always on
Remove-Item "$HOME\.claude\.i-have-adhd-always"                        # ADHD mode off for good
Remove-Item "$HOME\.claude\.caveman-active"                            # caveman flag off
```

## Update

1. Download the newer kit and unzip it over, or beside, the old one.
2. Run the install step again (step 4 above). It only changes what differs, takes a fresh backup before it touches CLAUDE.md or settings.json, and never overwrites memory files you have edited.
3. Update the plugins and Claude Code:

   ```powershell
   claude plugin marketplace update caveman
   claude plugin marketplace update i-have-adhd
   claude plugin marketplace update claude-hud
   claude plugin marketplace update anthropic-agent-skills
   winget upgrade Anthropic.ClaudeCode
   ```

   Restart Claude afterwards. See CHANGELOG.md for what changed.

## Uninstall

The installer saved your original files in `%USERPROFILE%\.claude\backups\admin-kit-<date-time>\`. The oldest folder holds the versions from before the kit.

```powershell
$c = "$HOME\.claude"
# 1. restore your original CLAUDE.md and settings.json (skip if there is no backups folder)
$backup = Get-ChildItem "$c\backups" -Directory -Filter 'admin-kit-*' | Sort-Object Name | Select-Object -First 1
Copy-Item "$($backup.FullName)\*" $c -Force
# 2. remove the kit's files
Remove-Item "$c\scripts\style-reinforce.cjs","$c\.caveman-active","$c\.i-have-adhd-always","$c\settings.powershell-hooks.json","$c\admin-kit-install.json" -ErrorAction SilentlyContinue
Remove-Item "$c\skills\verified-status","$c\skills\resume-handoff","$c\skills\archify","$c\admin-kit-mods" -Recurse -ErrorAction SilentlyContinue
# 3. remove the plugins
claude plugin uninstall caveman@caveman
claude plugin uninstall i-have-adhd@i-have-adhd
claude plugin uninstall claude-hud@claude-hud
claude plugin uninstall document-skills@anthropic-agent-skills
claude plugin uninstall example-skills@anthropic-agent-skills
```

If you had no CLAUDE.md or settings.json before the kit, there is nothing to restore: delete `$c\CLAUDE.md` and `$c\settings.json` instead. Your memory files stay in `%USERPROFILE%\.claude\projects\` and are yours to keep or delete. The location is saved in `admin-kit-install.json` before you remove it.

## If something goes wrong

| You see | Do this |
|---|---|
| `claude` is not recognized | Close the window, open a new Windows Terminal, try again. Still no: `winget install Anthropic.ClaudeCode`. |
| "running scripts is disabled" | Use the full command from step 4, which includes `-ExecutionPolicy Bypass`. |
| Claude's first word is not your name | Run the install step again, then start a new Claude session. |
| A plugin failed to install | The installer prints the exact command to retry. Check your internet and run it. |
| A `FAIL` from the check | The line under it says the fix. |
| Settings look wrong or a `__KIT_MODS_DIR__` shows up | `settings.json` must be installed through `install.ps1`; it holds a placeholder the installer fills in. Do not copy the file by hand. |
| Hooks do nothing without Git for Windows | Hook behaviour in PowerShell alone is untested. Git for Windows is the safer path: `winget install Git.Git`. |

## Tested on

Tested with PowerShell 7 on macOS using a fake `claude` shim. Windows PowerShell 5.1 and a real Windows machine are not yet tested. The memory folder name on Windows is inferred, not confirmed. Plugin install prompts may appear on first run.

License: MIT

More: [ACCOUNTS.md](ACCOUNTS.md) for plans, costs and connectors. [MANIFEST.md](MANIFEST.md) lists every file. [mods/README.md](mods/README.md) explains the optional mod.
