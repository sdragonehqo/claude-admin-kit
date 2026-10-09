---
name: resume-handoff
description: Start-of-session procedure when the user says "resume from the handoff", "pick up where we left off", "read the handoff note", or a MEMORY.md line says READ FIRST. Load before acting on any handoff note.
---

# Resume from a handoff

A handoff note is a short file the user (or an earlier session) wrote to carry work across a /clear or a new day. Keep them in one notes folder the user names, for example `Documents\Claude\notes`, as `HANDOFF-<topic>-<date>.md`. Where there is no named folder, use `%USERPROFILE%\.claude\notes\`. A note is a claim about the past, not live state. This skill is the order of operations for trusting it, announcing the plan, and getting back to work without idle time.

## Steps

1. Read the note. Use the Read tool on the note file. Read the top "UPDATE" block first if there is one; it overrides the body. Then read START HERE, READY QUEUE, Waiting on the user, and Key files. Do not open other notes unless one of these points at them. To find the right note, look at the MEMORY.md lines marked READ FIRST, or list the notes folder and take the newest file for the topic.
2. Verify the note against live state before trusting it (use the verified-status skill for the claim | check | result format). For each file or document the queue touches, check it exists and was last changed when the note says (`Get-Item "<path>" | Select-Object LastWriteTime`). For each email draft, calendar event or shared link the note names, look it up through its connector. Check that an item is not already done before listing it as next. If the note and the live state disagree, fix the note in the same pass with a dated "Corrected" line before continuing.
3. Announce in at most 8 bullets before any action: what is done, what is next, where each next step lives (which file, folder or connector), and every assumption being made, including any correction made in step 2. These bullets are an announcement, not a question.
4. Proceed on the READY QUEUE without waiting for a go. Fill every wait with the next independent item that does not conflict. Record each default you pick as a one-line "Decisions taken" entry in the note, not as a question to the user.
5. Go rules. Anything that sends, publishes, shares or overwrites a shared or final file needs a go from the user in this session. Read-only work and saving a new draft never wait on a go. If a note says the user already approved something, treat that as covered only if the note quotes the approval.
6. Before any closing ask (approve, send, review), do the state check from step 2 once more for that item. If it is done, report it as done.
7. Update the note before the session ends or before the user runs /clear: refresh READY QUEUE, what is in progress, what is waiting on the user, and the date last verified.

## Final message

Next action first, then the state in two or three lines, then the one action the user takes.
