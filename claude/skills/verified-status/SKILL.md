---
name: verified-status
description: How to report status so guesses cannot pass as facts. Load when the user asks for "status", "where are we", "is X done", "verified status of <project>", before writing any handoff or progress note, and before asking the user to approve, send, review or do anything.
---

# Verified status

The user's standing request: "Give me a verified status of <project>. For every item, show: claim | check you ran | the key result. Mark anything you couldn't verify as UNVERIFIED. Don't infer capabilities, check them."

## Hard rules

- Never say a file was saved, an email was sent, a document was updated, a meeting was booked or a setting was changed until a tool call in this session confirmed it.
- Evidence is the check you ran plus its decisive result. A claim with no check is labelled UNVERIFIED.
- Check a capability (can a connector send mail, can a tool open a file) by trying the smallest real call, or by reading the setting that grants it. Never infer it from the failure of something else. A connection error means the connector failed to connect, not that it lacks the capability.
- A memory note or an earlier message is a past record. Re-check it live before reporting it as current.
- Read before reinventing: open the user's existing template, folder or document before building a replacement.

## Steps

1. List the claims. Write each as one checkable sentence, one per item, before running anything. Run independent checks together.
2. File saved: check that it exists and has a sensible size and date. In PowerShell: `Get-Item "<path>" | Select-Object FullName, Length, LastWriteTime`, or `Test-Path "<path>"`. For a text file, `(Get-Content "<path>").Count` gives the line count. A path you wrote earlier and never checked is UNVERIFIED.
3. Document edited: read it back (the Read tool, or the document skill's read step) and quote the changed line. For Word, Excel, PowerPoint and PDF files, open it with the matching document skill and confirm the change is in the saved file, not just in your plan.
4. Email: draft created or sent: look it up through the mail connector (list drafts, or search the sent folder) and quote the subject line and recipient. A draft is not a sent email; say which one it is.
5. Calendar event: list the day's events through the calendar connector and quote the title, time and attendees.
6. Shared link or permissions: read the file's sharing settings back through the connector and quote who has access and at what level.
7. Setting changed: read the settings file or run the matching check and quote the line. For Claude Code settings, the file is `%USERPROFILE%\.claude\settings.json`.
8. Connector working: make the smallest real call (a search with one result, a list of one item) and quote what came back. If it errors, quote the error and say the connector failed to connect.
9. Before any ask to the user (approve, send, review, run): run the live check for the thing you would ask about. If it is already done, report it as done and drop the ask.
10. Write the report in the shape below. Quote the result verbatim; if a check printed nothing, say so.

## Output shape

| claim | check | key result |
|---|---|---|
| proposal draft is saved | `Get-Item "C:\Users\me\Documents\Proposals\Acme.docx"` | `Length 48213, LastWriteTime 3:05 PM` |
| email draft to Acme exists | mail connector, list drafts | `Subject: Acme proposal v1, To: pat@acme.example` |
| calendar hold on Friday | UNVERIFIED | no check run |

Then one line: `Open items: <UNVERIFIED claims and failing checks, or "none">.` A handoff or progress note uses the same table; an UNVERIFIED row stays in the note until a later session checks it.
