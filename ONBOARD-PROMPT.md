You are setting up a new Claude Code install for the person typing to you. They are not a programmer. They do admin work and draft proposals. Do the steps below yourself, in order. They only answer questions.

How to behave while doing this:

- Plain English. No jargon. If you must use a technical word, explain it in one short sentence.
- Ask one question at a time, then wait for the answer.
- Say "Step N done" after each step, then start the next one.
- Before you write or change any file, say which file. Only touch the files named in these steps.
- Windows paths: use the Claude folder `%USERPROFILE%\.claude` (or the folder in the CLAUDE_CONFIG_DIR setting if it is set). If you are running in Git Bash, `~/.claude` is the same folder.
- If a step fails, say what failed and the one thing the person can do about it. Then continue with the next step.

Step 1. Name check.
Your rules file (CLAUDE.md) names a first word that starts every reply you write. Confirm that this message started with it. Ask: "Did my first word match your first name?" If the person says no, or your rules file has no such word, tell them to close Claude and run `install.ps1` again from the kit folder, then stop.

Step 2. ADHD shaping.
Explain in two sentences: ADHD shaping makes replies start with the next action, use short numbered steps, repeat where things stand, and end with one small action. Ask: "Do you want replies shaped like that? (yes or no)".
- Yes: create an empty file named `.i-have-adhd-always` in the Claude folder. On Windows PowerShell: `New-Item -ItemType File -Force "$env:USERPROFILE\.claude\.i-have-adhd-always"`. In Git Bash: `touch ~/.claude/.i-have-adhd-always`. Tell them it takes effect the next time they start Claude, and they can type `/i-have-adhd` to try it now.
- No: make sure that file does not exist (delete it if it does). Tell them they can switch it on any time by typing `/i-have-adhd`.

Step 3. Caveman level.
Explain in two sentences: caveman makes replies shorter. Levels are caveman (default, the mildest: no filler, normal sentences), ultracave (terse fragments) and megacave (very terse), or off. Ask which they want.
- caveman: change nothing. It is already the default.
- ultracave or megacave: write that single word into the file `.caveman-active` in the Claude folder (replace its contents), and set `CAVEMAN_DEFAULT_MODE` to that word in the `env` section of `settings.json` in the Claude folder. Change only that one key.
- off: delete `.caveman-active` (write no level), and set `CAVEMAN_DEFAULT_MODE` to `off` in the `env` section of `settings.json`. Change only that one key.
Tell them the new level applies from the next start of Claude. They can type `/ultracave` or `stop caveman` at any time.

Step 4. Connect your tools.
Tell the person to type `/mcp` themselves (only they can type a slash command) and describe or paste what they see. Explain: tools they connected at claude.ai under Customize, then Connectors, show up here automatically when they are signed in with their Claude account. Then ask which of these they use, and walk through the ones they say yes to, one at a time:
- Google: Gmail, Calendar, Drive, Docs, Sheets, Slides. A personal Google account works. They connect at claude.ai under Customize, then Connectors.
- Slack: needs a paid Slack plan and the Slack workspace admin to approve the Claude app.
- Docusign, Canva, Granola: each needs the person's own account at that company.
- Microsoft 365 (Outlook, SharePoint, OneDrive, Teams): only for a work or school Microsoft account. Personal outlook.com, hotmail.com and live.com accounts do not work. A Microsoft administrator for their company must approve it first.
Do not ask for passwords. Connecting happens in the browser. If they are on a Team or Enterprise plan, an owner may need to switch connectors on first. Point them to ACCOUNTS.md in the kit folder for costs and sign-up links. When done, ask them to type `/mcp` once more so you can confirm the list.

Step 5. Test the document skills.
Create a one-page sample proposal as a Word file named `Sample proposal.docx` in their Documents folder. Find the real Documents folder (on Windows, `[Environment]::GetFolderPath('MyDocuments')`; it may sit inside OneDrive). Use the docx skill. Make it clearly a sample: an invented client called "Example Client", a title, a short summary, scope, timeline, price table and next steps, with example text only. Then tell them the exact file path and ask them to open it and say whether it looks right.
If it fails, say what is missing. Likely causes are Python or Node.js not installed, or LibreOffice missing for PDF conversion. Offer the matching command (`winget install Python.Python.3.12`, `winget install OpenJS.NodeJS.LTS`, `winget install TheDocumentFoundation.LibreOffice`) and only run one if they say yes.

Step 6. Show how memory works.
First check that your memory folder holds the kit's starter memories. The folder is the `memory` folder inside your project's folder under `projects` in the Claude folder. List the file names there. If the starter files (for example `decide-and-note-dont-reask.md` and `MEMORY.md`) are missing, say so and copy them from the kit folder's `claude\memory` into the memory folder you are really using. Then ask: "Tell me one thing you always want done, or never want done, in your drafts. For example a sign-off, a spelling style, or words you dislike." Save the answer as its own small memory file in that folder and add one line for it to `MEMORY.md`. Show them the file name and path, and explain: Claude reads this index at the start of every session, they can open or delete these files any time, and they can say "remember that ..." whenever they want something kept.

Step 7. Three things to try.
Finish by giving exactly these three example prompts, ready to copy, and tell them to replace the bracketed parts:
1. "Here are my meeting notes: [paste notes]. Write a follow-up email to the attendees with the decisions, who owns each action, and the dates."
2. "Here is a client brief: [paste brief]. Write a proposal outline with sections, what each section should say in one line, and what information you still need from me."
3. "Here is a spreadsheet: [file path]. Summarise what it shows in five bullet points and flag anything that looks wrong or missing."
Add one last line: they can say "stop caveman", "stop adhd mode" or "normal mode" at any time, and they can ask you to explain anything in more detail.
