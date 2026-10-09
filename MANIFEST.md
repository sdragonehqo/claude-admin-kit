# Kit manifest

Content half of the kit. Installers, README, ACCOUNTS.md and ONBOARD-PROMPT.md are added separately.

Placeholders the installer fills in: `__CANARY__` and `__TIMEZONE__` in `claude/CLAUDE.md`; `__KIT_MODS_DIR__` in `claude/settings.json`.

Two destination forms are given. Windows: `%USERPROFILE%\.claude\...`. Git Bash: `~/.claude/...`. The Claude folder is `CLAUDE_CONFIG_DIR` when that is set.

## Files

| File in kit | Windows destination | Git Bash destination | What it does | Need |
|---|---|---|---|---|
| `claude/CLAUDE.md` | `%USERPROFILE%\.claude\CLAUDE.md` | `~/.claude/CLAUDE.md` | The global rules: precedence, canary word, optional caveman and adhd-shape styles with switches, admin-work defaults, memory, secrets, verify-before-claiming, Windows environment notes. | required |
| `claude/settings.json` | `%USERPROFILE%\.claude\settings.json` (merge into any existing file) | `~/.claude/settings.json` | Permission mode default, caveman default level lite, the style-reinforce hooks, plugin enablement and marketplace sources. | required |
| `claude/settings.powershell-hooks.json` | `%USERPROFILE%\.claude\settings.powershell-hooks.json` (reference only, never loaded) | `~/.claude/settings.powershell-hooks.json` | The same two hooks written for PowerShell-only machines (no Git for Windows). Copy its `hooks` block over the one in settings.json. | optional |
| `claude/scripts/style-reinforce.cjs` | `%USERPROFILE%\.claude\scripts\style-reinforce.cjs` | `~/.claude/scripts/style-reinforce.cjs` | Hook that re-anchors the caveman and adhd-shape styles every tenth tool call. Node only. | required |
| `claude/.caveman-active` | `%USERPROFILE%\.claude\.caveman-active` | `~/.claude/.caveman-active` | Flag file holding the caveman level (`lite`). Delete it or run "stop caveman" to turn caveman off. | required |
| `claude/skills/verified-status/` | `%USERPROFILE%\.claude\skills\verified-status\` | `~/.claude/skills/verified-status/` | Skill: status reports as claim, check, result, with UNVERIFIED labels. | required |
| `claude/skills/resume-handoff/` | `%USERPROFILE%\.claude\skills\resume-handoff\` | `~/.claude/skills/resume-handoff/` | Skill: resume work from a handoff note, verifying the note against live state first. | required |
| `claude/skills/archify/` | `%USERPROFILE%\.claude\skills\archify\` (real directory copy, not a symlink) | `~/.claude/skills/archify/` | Third-party skill (MIT): process, workflow, sequence and data-flow diagrams as standalone HTML. Needs Node on PATH. Examples and tests were left out. | optional |
| `claude/memory/MEMORY.md` | `%USERPROFILE%\.claude\projects\<project>\memory\MEMORY.md` | `~/.claude/projects/<project>/memory/MEMORY.md` | Index of the twelve seeded working-style memories. Merge into an existing index if one exists. | required |
| `claude/memory/decide-and-note-dont-reask.md` | `...\memory\decide-and-note-dont-reask.md` | `.../memory/decide-and-note-dont-reask.md` | After an approval, take defaults and note them. | required |
| `claude/memory/say-recommendation-once.md` | `...\memory\say-recommendation-once.md` | `.../memory/say-recommendation-once.md` | State an urgent recommendation once. | required |
| `claude/memory/check-state-before-asking.md` | `...\memory\check-state-before-asking.md` | `.../memory/check-state-before-asking.md` | Check live state before asking for approval. | required |
| `claude/memory/times-in-local-time.md` | `...\memory\times-in-local-time.md` | `.../memory/times-in-local-time.md` | Times in the user's time zone. | required |
| `claude/memory/artifacts-default-light.md` | `...\memory\artifacts-default-light.md` | `.../memory/artifacts-default-light.md` | Pages and charts open in light mode. | required |
| `claude/memory/no-idle-time.md` | `...\memory\no-idle-time.md` | `.../memory/no-idle-time.md` | Start the next independent task while one waits. | required |
| `claude/memory/results-next-to-the-control.md` | `...\memory\results-next-to-the-control.md` | `.../memory/results-next-to-the-control.md` | Results open next to the control that made them. | required |
| `claude/memory/parallelize-and-cap-checks.md` | `...\memory\parallelize-and-cap-checks.md` | `.../memory/parallelize-and-cap-checks.md` | Parallel helpers; fixed limit on every check. | required |
| `claude/memory/ship-small.md` | `...\memory\ship-small.md` | `.../memory/ship-small.md` | Smallest useful piece first. | required |
| `claude/memory/tutor-with-hints.md` | `...\memory\tutor-with-hints.md` | `.../memory/tutor-with-hints.md` | Hints, not answers, when the user is learning. | required |
| `claude/memory/cost-check-before-fanout.md` | `...\memory\cost-check-before-fanout.md` | `.../memory/cost-check-before-fanout.md` | Cost line and a go before ten or more helpers. | required |
| `claude/memory/show-names-not-values.md` | `...\memory\show-names-not-values.md` | `.../memory/show-names-not-values.md` | Show names, never values, from files that may hold secrets. | required |
| `mods/.claude-plugin/marketplace.json` | `%USERPROFILE%\.claude\admin-kit-mods\.claude-plugin\marketplace.json` (copied by the installer) | `~/.claude/admin-kit-mods/.claude-plugin/marketplace.json` | Local marketplace `admin-kit-mods` listing the one included mod. `__KIT_MODS_DIR__` in settings.json is replaced with the installed `admin-kit-mods` folder. | optional |
| `mods/admin-hud/` | `%USERPROFILE%\.claude\admin-kit-mods\admin-hud\` (copied by the installer, loaded through the local marketplace) | `~/.claude/admin-kit-mods/admin-hud/` | Mod: status band under the prompt (model, cost, context, usage, tool activity). Disabled by default in settings.json. Needs Claude Code 2.1.288 or newer. | optional |
| `mods/README.md` | not installed | not installed | Which mods were included and which were left out, with reasons. | optional |
| `verify/check.mjs` | not installed | not installed | Kit self-test. Run `node --test verify/` from the kit folder. | required |

## Plugins and marketplaces

Versions are the ones this kit was prepared with. Claude Code installs the marketplace head unless a ref is given, so a newer version may install; see the caveman note below.

| Plugin | Marketplace source | Pinned version | Needs | Need |
|---|---|---|---|---|
| `caveman@caveman` | GitHub `JuliusBrussee/caveman` | 766dce6b1394 (full commit 766dce6b1394ebb56a3090748d5a0240a5aefb36) | Node 18 or newer; Git Bash for its bash-form start hook | optional (style) |
| `i-have-adhd@i-have-adhd` | GitHub `ayghri/i-have-adhd` | 0.2.0 (commit e7555fcaf612dfa1739dc86610ea926a906db614) | Node 18 or newer | optional (style, off until the flag file exists) |
| `claude-hud@claude-hud` | GitHub `jarrodwatts/claude-hud` | 0.8.0 (commit 939eb66485832dead1b0a28a954f76f7aa2bdb06) | Node 18 or newer; Claude Code 2.1.260 or newer. After install run `/claude-hud:setup` once; it writes the statusLine entry for the machine's shell, so settings.json does not carry one. | optional |
| `document-skills@anthropic-agent-skills` | GitHub `anthropics/skills` (public, no account) | no version published in the marketplace; head as of 2026-10-09 | Contains docx, xlsx, pptx and pdf skills. On Windows these may need Python 3 and Node on PATH, and LibreOffice for PDF conversion and formula recalculation. | required for documents |
| `example-skills@anthropic-agent-skills` | GitHub `anthropics/skills` | same marketplace, head as of 2026-10-09 | Includes doc-coauthoring, brand-guidelines, internal-comms, theme-factory and canvas-design among others. | optional |
| `admin-hud@admin-kit-mods` | local directory `mods/` in this kit | 0.1.0 | Claude Code 2.1.288 or newer | optional (disabled by default) |

Notes for the installer:

- Newer upstream releases exist (caveman 3.2.0, i-have-adhd 0.4.1, claude-hud 0.10.0). In caveman 3.2.0 the level names changed to caveman, ultracave and megacave, so `lite` no longer exists there. The CLAUDE.md and settings.json in this kit assume the pinned caveman, which has lite, full and ultra.
- Install from the command line: `claude plugin marketplace add <owner/repo>` then `claude plugin install <plugin>@<marketplace>`. Mods need no enable flag on Claude Code 2.1.287 or newer; `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS` is ignored there and is not set.
- If Git for Windows is installed in a non-standard place and Claude Code cannot find Git Bash, set `CLAUDE_CODE_GIT_BASH_PATH` to the full path of `bash.exe` in the `env` block of settings.json (for example `C:\\Program Files\\Git\\bin\\bash.exe`). Without Git for Windows at all, Claude Code uses PowerShell and the hooks in `settings.powershell-hooks.json` apply.
- Left out on purpose: long-term memory services, usage-compression tooling (rtk), a password-manager launcher, orchestration and push-gate skills, and every mod except admin-hud. The docs worker may describe rtk and a password manager as optional extras.
