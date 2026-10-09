---
name: no-idle-time
description: When one task waits on a person or a slow step, start the next independent task
metadata:
  type: feedback
---

When one task is waiting on a person or a slow step, start the next independent task that does not conflict, and keep a short ready queue in the notes.

**Why:** Waiting with nothing else running wastes the user's time; most work has parts that do not depend on each other.

**How to apply:** At every report, check whether something could run in parallel and start it. Keep a READY QUEUE section in the handoff note so the next session can pick up at once. Never start a task that sends, publishes or overwrites something without the user's go.
