# Accounts and installs

What you need, what it costs, and what each one unlocks. Prices and plan rules were checked on 2026-10-09 and can change; the sign-up pages are the final word.

## The list

Need: **required** = the kit does not work without it. **recommended** = skip it only if you know why. **optional** = add it when you need what it does.

| Account or install | Need | Cost | What it unlocks | Sign up | Plan gating |
|---|---|---|---|---|---|
| Claude plan (Pro or Max) | required | Pro $20/month ($17/month if paid yearly); Max 5x $100/month; Max 20x $200/month | The login that lets Claude Code run, plus connectors, memory and document skills. The free plan does not include Claude Code. | https://claude.ai/login | Claude Code is on Pro, Max, Team and Enterprise. |
| Claude Code (command line, or the desktop app's Code tab) | required | Free software; needs a paid Claude plan | The tool itself. This kit installs plugins and hooks, so it expects the command-line version (`winget install Anthropic.ClaudeCode`). The desktop app includes Claude Code but does not put `claude` on the terminal path. | https://claude.com/download | Pro, Max, Team, Enterprise. |
| Git for Windows | recommended | Free | Gives Claude a bash shell, which the caveman plugin's start hook uses. Without it Claude Code uses PowerShell and still works. This is not a GitHub account. | https://git-scm.com/downloads/win | None. |
| Node.js LTS | recommended | Free | Not needed for Claude Code itself. Needed by the caveman, i-have-adhd and claude-hud plugins and the kit's style hook. | https://nodejs.org/en/download | None. |
| Windows Terminal | recommended | Free (built into Windows 11; Microsoft Store on Windows 10) | A better window for typing to Claude. Skip it if you only use the desktop app. | https://aka.ms/terminal | None. |
| Google account | recommended | Free (personal Gmail) or Workspace (paid) | Gmail, Calendar, Drive, Docs, Sheets and Slides inside Claude. A personal account works. | https://accounts.google.com/signup | Connectors are open to all Claude plans; on Team and Enterprise an Owner turns them on first. (Likely; confirm in claude.ai > Customize > Connectors) |
| Python 3 | optional | Free | Only needed if the document skills (Word, Excel, PowerPoint, PDF) run on your PC and ask for it. | https://www.python.org/downloads/windows/ | None. |
| LibreOffice | optional | Free | Used by the document skills for PDF conversion, slide previews and recalculating spreadsheet formulas. Not needed just to create .docx, .pptx or .xlsx files. Word, Excel and PowerPoint are not required. | https://www.libreoffice.org/download/download-libreoffice/ | None. |
| Microsoft 365 work or school account | optional | Microsoft 365 Business plan (Microsoft sets the price) | Outlook, SharePoint, OneDrive and Teams inside Claude. Only if your proposals live there. A company administrator must approve it. | https://www.microsoft.com/microsoft-365/business | Connector is on all Claude plans. Personal outlook.com, hotmail.com and live.com accounts are not supported. A Microsoft Entra Global Administrator must give consent. |
| Slack | optional | Free workspace account; Claude in Slack needs a paid Slack plan | Claude working in your team's Slack. Only if your team uses Slack. | https://slack.com/get-started | Pro and Max use Claude in Slack; Team and Enterprise use Claude Tag. The Slack admin must approve the Claude app. (Likely; confirm in claude.ai > Customize > Connectors) |
| Granola | optional | Free tier; paid tiers from Granola | Meeting notes and transcripts, so Claude can draft follow-ups and proposals from your calls. Needs your own Granola account. | https://www.granola.ai | Not confirmed for Claude plans. The connector exists in the claude.ai list. |
| Docusign | optional | Docusign plan (Docusign sets the price) | Look up or prepare e-signature envelopes. Needs your own Docusign account. | https://www.docusign.com/products/electronic-signature | Not confirmed for Claude plans. The connector exists in the claude.ai list. |
| Canva | optional | A free Canva plan works with the connector | Create on-brand designs and presentations from a conversation. | https://www.canva.com/signup | Available in the claude.ai directory. (Likely; confirm in claude.ai > Customize > Connectors) |
| GitHub | optional | Free | Not needed to install this kit; the plugins come from public pages with no login. Useful only for backing up your files online. | https://github.com/signup | None. |
| 1Password | optional | Paid individual plan | Storing secret keys. You only need it if you later add tools that use API keys. The connectors above sign in through your browser and need no keys. | https://1password.com/sign-up | None. |

## Pick your plan

For all-day drafting in Claude Code, choose **Max 5x ($100 a month)**. Long sessions that read and write documents use up a plan quickly, and Max gives five times the Pro usage in each 5-hour session.

If you want to try before spending $100, start on **Pro ($20 a month, or $17 paid yearly)** for one or two weeks. Move to Max 5x the first time you hit the 5-hour limit most days. Both plans also have a weekly limit. Max 20x ($200 a month) is for people who run out even on Max 5x.

The newest top model, Fable, runs only on paid-as-you-go usage credits on Pro, and up to half of your weekly limit on Max. You do not need it for admin work.

## Connect your tools

Claude Code can use the same connectors as the claude.ai website.

1. Sign in to Claude Code with your Claude account (it asks the first time you run `claude`). Connectors do not load if you sign in with an API key instead.
2. In a browser go to https://claude.ai/customize/connectors and add the tools you use. Each one asks you to sign in to that tool and allow Claude.
3. In Claude Code type `/mcp`. Your connectors appear in the list, marked claude.ai. You should see them as connected.
4. On a Team or Enterprise plan, an Owner has to switch connectors on for the organisation first.

The ones that matter for admin work and proposals:

| Connector | Use it to | Watch out for |
|---|---|---|
| Gmail | Find threads, draft and send replies | Ask Claude to draft first, send yourself |
| Google Calendar | Check availability, find meeting times | None |
| Google Drive, Docs, Sheets, Slides | Find files, read them, create and edit documents and spreadsheets | Google Docs, Sheets and Slides are separate connectors; connect each one |
| Slack | Search channels, draft messages | Needs a paid Slack plan and admin approval |
| Docusign | Look up and prepare signature envelopes | Needs your own Docusign account |
| Canva | Create designs and slide decks | A free Canva plan works |
| Granola | Pull meeting notes and transcripts into drafts | Needs your own Granola account |
| Microsoft 365 | Outlook, SharePoint, OneDrive, Teams | Work or school account only, and a company administrator must approve it. Personal Microsoft accounts do not work. Sending mail and editing files is controlled by that administrator. |

## What to skip

- **GitHub**, unless you want online backups of your files. The kit installs from public pages with no login.
- **1Password**, unless you later hold API keys for other tools. Connectors sign in through the browser.
- **Add-on long-term memory services.** The kit's built-in memory (see README.md) is enough for admin work.
- **rtk** is optional and rarely helps this kind of work. It shortens the output of developer commands. If you ever want it: `winget install rtk-ai.rtk`, then `rtk init -g --hook-only`, then restart Claude Code.
