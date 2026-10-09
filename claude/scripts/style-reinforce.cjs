#!/usr/bin/env node
'use strict';
// Style anchor hook: keeps the caveman and ADHD style modes from drifting.
//  - UserPromptSubmit: one-line ADHD anchor on every prompt (the caveman plugin
//    already emits its own per-prompt line, so caveman is skipped here).
//  - PostToolUse: one-line anchor for both modes every EVERY-th tool call, so
//    long agentic turns get re-anchored mid-turn.
//    Inside a subagent (transcript path under a "subagents" folder, or an agent_id)
//    the ADHD line is dropped: the style rules apply to the main conversation only.
// Reads <claude folder>\.caveman-active (the level) and <claude folder>\.i-have-adhd-always.
// The claude folder is CLAUDE_CONFIG_DIR when set, else <home>\.claude.
// Skips caveman independent modes (commit/review/compress).
// Cost: about 30 tokens per anchor. Silent on any error: it must never break a tool call.
// Needs only Node on PATH. No shell tools. Works the same on Windows, macOS and Linux.
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * @param {string | null} inputText raw hook JSON (null: no stdin, as when stdin is a TTY)
 * @param {{ env?: object, homedir?: () => string, tmpdir?: () => string }} [opts]
 * @returns {string} the stdout body ('' when the hook prints nothing)
 */
function styleReinforce(inputText, opts) {
  const o = opts || {};
  const env = o.env || process.env;
  const homedir = o.homedir || os.homedir;
  const tmpdir = o.tmpdir || os.tmpdir;
  try {
    let sessionId = 'default';
    let event = 'PostToolUse';
    let subagent = false;
    try {
      if (inputText !== null && inputText !== undefined) {
        const data = JSON.parse(inputText);
        if (data && typeof data.session_id === 'string') {
          sessionId = data.session_id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'default';
        }
        if (data && typeof data.hook_event_name === 'string') event = data.hook_event_name;
        // Subagent detection: workers have their own transcript under a "subagents" folder (or an agent_id).
        // The separator class accepts both Windows backslashes and forward slashes.
        if (data && (typeof data.agent_id === 'string' || (typeof data.transcript_path === 'string' && /[\\/]subagents[\\/]/.test(data.transcript_path)))) subagent = true;
      }
    } catch (e) { /* no/bad stdin: defaults */ }
    const claudeDir = env.CLAUDE_CONFIG_DIR || path.join(homedir(), '.claude');
    let mode = null;
    try {
      const raw = fs.readFileSync(path.join(claudeDir, '.caveman-active'), 'utf8').trim();
      if (/^[a-z][a-z-]{1,15}$/.test(raw)) mode = raw;
    } catch (e) { /* flag absent: caveman off */ }
    const INDEPENDENT = new Set(['commit', 'review', 'compress']);
    if (mode && INDEPENDENT.has(mode)) mode = null;
    let adhd = false;
    try { adhd = fs.existsSync(path.join(claudeDir, '.i-have-adhd-always')); } catch (e) {}
    // The ADHD structure applies to the main conversation only, not to subagents.
    if (subagent) adhd = false;
    if (!mode && !adhd) return '';

    const parts = [];
    if (event === 'UserPromptSubmit') {
      if (adhd) parts.push('ADHD MODE ACTIVE — response-shape rules apply: next action first, numbered bounded steps, state restated, lists capped at 5, one closing action under 2 minutes.');
    } else {
      const EVERY = parseInt(env.STYLE_REINFORCE_EVERY || '10', 10) || 10;
      const counterPath = path.join(tmpdir(), 'style-reinforce-' + sessionId);
      let n = 0;
      try { n = parseInt(fs.readFileSync(counterPath, 'utf8'), 10) || 0; } catch (e) {}
      n += 1;
      try { fs.writeFileSync(counterPath, String(n)); } catch (e) {}
      if (n % EVERY !== 0) return '';
      if (mode) parts.push('CAVEMAN MODE STILL ACTIVE (' + mode + ') — session ruleset applies to ALL user-facing prose, including the remainder of this turn. No filler drift.');
      if (adhd) parts.push('ADHD MODE STILL ACTIVE — response-shape rules apply for the rest of this turn.');
    }
    if (!parts.length) return '';
    return JSON.stringify({
      suppressOutput: true,
      hookSpecificOutput: { hookEventName: event, additionalContext: parts.join(' ') }
    });
  } catch (e) { /* silent */ }
  return '';
}

module.exports = { styleReinforce };

if (require.main === module) {
  try {
    let inputText = null;
    try {
      if (!process.stdin.isTTY) inputText = fs.readFileSync(0, 'utf8');
    } catch (e) { /* no/bad stdin: defaults */ }
    const out = styleReinforce(inputText);
    if (out) process.stdout.write(out);
  } catch (e) { /* silent */ }
  process.exit(0);
}
