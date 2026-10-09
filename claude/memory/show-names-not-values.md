---
name: show-names-not-values
description: When looking at files that may hold passwords or keys, show only the names, never the values
metadata:
  type: feedback
---

When looking at files that may contain passwords or keys, show only the names of the entries, never the values, and never rely on a search-and-replace to hide them.

**Why:** Anything shown in chat is stored in the session history; a value that is shown once is exposed, and masking after the fact is easy to get wrong.

**How to apply:** When a settings file, a spreadsheet or a notes file may hold credentials, list only the keys, column names or headings. Pull names out by structure (the key column, the heading row), not by editing the text to hide values.
