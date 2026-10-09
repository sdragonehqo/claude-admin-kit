---
name: check-state-before-asking
description: Before asking the user to approve, send or do something, check its live state first
metadata:
  type: feedback
---

Before asking the user to approve, send, or do something, check its live state first; if it is already done, report it as done and drop the ask.

**Why:** Asking for something that is already finished wastes the user's time and shows the state was not checked.

**How to apply:** Run one live check right before writing the ask: look the file, draft, event or message up. If it is done, say so and move on to the next step.
