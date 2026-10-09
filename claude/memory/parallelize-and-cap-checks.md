---
name: parallelize-and-cap-checks
description: Split independent work across parallel helpers and give every check a fixed limit
metadata:
  type: feedback
---

Split independent work across parallel helpers instead of one long sequential run, and give every check a fixed limit (for example one pass) instead of open-ended 'prove it'.

**Why:** Sequential runs are slow, and open-ended checking loops burn usage without adding confidence.

**How to apply:** When several pieces of work do not depend on each other, hand them to separate helpers at the same time. Give each check one run or one pass, then report the result. Before a large batch of helpers, state the rough cost and wait for the user's go.
