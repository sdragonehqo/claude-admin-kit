# Changelog

## 0.1.0 - 2026-10-09

Initial kit.

- Installer for native Windows (`install.ps1`, with a Git Bash wrapper `install.sh`) and an install check (`verify/check-install.ps1`).
- Global rules file, settings, style hook, three skills, twelve memory seeds, and the optional admin-hud status band.
- Plugins installed from the command line: caveman, i-have-adhd, claude-hud, document-skills, example-skills.
- MIT license added.
- Plugin CLI facts verified in a scratch config: `claude plugin marketplace add owner/repo#<commit>` is refused (only branch or tag names work), so caveman installs unpinned at 3.2.0 and the kit default level is `caveman`; `claude plugin install` has `-y`/`--yes` for marketplace-declared commands only.
- README, ACCOUNTS.md (accounts, costs, plan choice, connectors) and ONBOARD-PROMPT.md (first-run setup that Claude walks through).
