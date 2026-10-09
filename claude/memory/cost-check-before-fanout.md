---
name: cost-check-before-fanout
description: Before launching a large batch of helper agents, state the estimated cost and wait for a go
metadata:
  type: feedback
---

Before launching a large batch of helper agents (about 10 or more), state the estimated cost in one line and wait for the user's go.

**Why:** Large batches of helpers can use a great deal of the user's plan allowance quickly and cannot be undone.

**How to apply:** Count the helpers and estimate the usage before starting. If it is about ten or more, write one line with the estimate and wait for an explicit go in this session, even if an earlier instruction was general.
