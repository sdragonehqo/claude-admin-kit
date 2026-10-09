import type { HudClick, HudPart, HudSegment, HudTools } from '../types'

export const REFRESH_MS = 5000
export const EVENT_REFRESH_MS = 1500
export const PLUGINS_TTL_MS = 60_000

export const SEGMENT_IDS = ['model', 'cost', 'context', 'usage', 'plugins'] as const
export type SegmentId = (typeof SEGMENT_IDS)[number]

/** Shown by default; plugins is a valid id but off. */
export const DEFAULT_SEGMENTS: SegmentId[] = ['model', 'cost', 'context', 'usage']

export type Config = {
  enabled: boolean
  segments: SegmentId[]
  showTools: boolean
  colors: Partial<Record<SegmentId, string>>
  barWidth: number
  separator: string
  clicks: HudClick[]
}

export const DEFAULT_CONFIG: Config = {
  enabled: true,
  segments: [...DEFAULT_SEGMENTS],
  showTools: true,
  colors: { model: 'cyan' },
  barWidth: 10,
  separator: ' │ ',
  clicks: [],
}

/** The text of a starter config file: every key at its default. */
export const defaultConfigText = (): string => `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`

const BASE_COLORS = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white']
const COLORS = new Set(['gray', ...BASE_COLORS, ...BASE_COLORS.map(c => `${c}Bright`)])

/** A color Text accepts: a named ANSI color, its Bright form, gray, or #rrggbb. */
export const isColor = (v: unknown): v is string => typeof v === 'string' && (COLORS.has(v) || /^#[0-9a-fA-F]{6}$/.test(v))

/**
 * <claude folder>/admin-hud.json: missing or invalid text means the defaults, and each key that is
 * missing or invalid falls back to its own default; an invalid click rule or color is skipped.
 */
export function parseConfig(text: string | undefined): Config {
  const base: Config = { ...DEFAULT_CONFIG, segments: [...DEFAULT_CONFIG.segments], colors: { ...DEFAULT_CONFIG.colors }, clicks: [] }
  if (text === undefined) return base
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return base
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return base
  const r = raw as Record<string, unknown>

  if (Array.isArray(r.segments)) {
    const ids = [...new Set(r.segments.filter((s): s is SegmentId => (SEGMENT_IDS as readonly unknown[]).includes(s)))]
    if (ids.length > 0) base.segments = ids
  }
  if (typeof r.colors === 'object' && r.colors !== null && !Array.isArray(r.colors)) {
    const colors: Partial<Record<SegmentId, string>> = {}
    for (const id of SEGMENT_IDS) {
      const c = (r.colors as Record<string, unknown>)[id]
      if (isColor(c)) colors[id] = c
    }
    base.colors = { ...base.colors, ...colors }
  }
  if (typeof r.barWidth === 'number' && Number.isInteger(r.barWidth) && r.barWidth >= 1 && r.barWidth <= 40) base.barWidth = r.barWidth
  if (typeof r.separator === 'string' && r.separator.trim() !== '' && r.separator.length <= 12) base.separator = r.separator
  if (typeof r.showTools === 'boolean') base.showTools = r.showTools
  if (r.enabled === false) base.enabled = false
  if (Array.isArray(r.clicks)) {
    for (const c of r.clicks) {
      if (typeof c !== 'object' || c === null) continue
      const { match, command } = c as Record<string, unknown>
      if (typeof match !== 'string' || match === '' || typeof command !== 'string') continue
      const name = command.trim().replace(/^\/+/, '')
      if (name !== '') base.clicks.push({ match, command: name })
    }
  }
  return base
}

/** True for a rule's match against a text: plain substring, or `re:<regex>`; a bad regex never matches. */
export function matches(rule: string, text: string): boolean {
  if (rule.startsWith('re:')) {
    try {
      return new RegExp(rule.slice(3)).test(text)
    } catch {
      return false
    }
  }
  return rule !== '' && text.includes(rule)
}

/** What a click on a part runs: the user's first matching rule, else the part's own default; undefined when not clickable. */
export function clickCommand(part: HudPart, clicks: readonly HudClick[]): string | undefined {
  if (part.command === undefined) return undefined
  const text = part.match ?? part.text

  return clicks.find(c => matches(c.match, text))?.command ?? part.command
}

/** True when the user's own click rules cover this text, so the built-in default for it stays out of the way. */
export const hasClickRule = (text: string, clicks: readonly HudClick[]): boolean => clicks.some(c => matches(c.match, text))

/** Bar cells for a percentage: filled count rounds, never leaves the 0..width range. */
export function bar(percent: number, width: number): { filled: string; empty: string } {
  const n = Math.max(0, Math.min(width, Math.round((percent / 100) * width)))

  return { filled: '█'.repeat(n), empty: '░'.repeat(width - n) }
}

/** Context fill: green under 70, yellow to 85, red above. */
export const contextColor = (p: number): string => (p > 85 ? 'red' : p >= 70 ? 'yellow' : 'green')

/** Usage window: bright blue under 75, bright magenta under 90, red from 90. */
export const usageColor = (p: number): string => (p >= 90 ? 'red' : p >= 75 ? 'magentaBright' : 'blueBright')

/** "42m", "1h 20m", "2d" until an ISO reset time; undefined when it is unknown or past. */
export function resetsIn(resetsAt: string | undefined, now: number): string | undefined {
  if (resetsAt === undefined) return undefined
  const at = Date.parse(resetsAt)
  if (!Number.isFinite(at) || at <= now) return undefined
  const minutes = Math.max(1, Math.round((at - now) / 60_000))
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours >= 24) return `${Math.floor(hours / 24)}d`
  const rest = minutes % 60

  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`
}

/** Model display name the way the status line spells it: claude-opus-5-5[1m] is "Opus 5.5". */
export function displayModel(model: string): string {
  const id = model.replace(/\[.*\]$/, '')
  const m = /^claude-(opus|sonnet|haiku|fable)-(\d+)(?:-(\d{1,2}))?(?:-\d{8})?$/.exec(id)
  const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)
  if (m !== null) return `${cap(m[1] ?? '')} ${m[2]}${m[3] === undefined ? '' : `.${m[3]}`}`

  return /^[a-z]+$/.test(id) ? cap(id) : id
}

export type Inputs = {
  model: string
  effort: string
  cost?: number
  context: { window: number; tokens?: number; percent?: number }
  rateLimits: readonly { kind: string; percentUsed: number; resetsAt?: string }[]
  plugins: readonly string[]
  now: number
}

const dim = (text: string, extra: Partial<HudPart> = {}): HudPart => ({ text, dim: true, ...extra })

type Builder = (i: Inputs, cfg: Config, color: string | undefined) => HudPart[] | undefined

/** The model badge: brackets in color around a clickable name, the effort dim after it. */
const modelSegment: Builder = (i, _cfg, color) => {
  const name = displayModel(i.model)
  if (name === '') return undefined
  const tint = color ?? 'cyan'

  return [
    { text: '[', color: tint },
    { text: name, command: 'model', match: `[${name}]` },
    { text: ']', color: tint },
    ...(i.effort === '' ? [] : [dim(` ${i.effort}`)]),
  ]
}

const costSegment: Builder = (i, _cfg, color) => {
  if (i.cost === undefined) return undefined
  const text = `Cost $${i.cost.toFixed(2)}`

  return [color === undefined ? dim(text, { command: 'usage' }) : { text, color, command: 'usage' }]
}

const contextSegment: Builder = (i, cfg, color) => {
  const percent = i.context.percent ?? (i.context.tokens !== undefined && i.context.window > 0 ? Math.round((i.context.tokens / i.context.window) * 100) : undefined)
  if (percent === undefined && i.context.window <= 0) return undefined
  const p = Math.max(0, Math.min(100, percent ?? 0))
  const tint = color ?? contextColor(p)
  const b = bar(p, cfg.barWidth)

  return [dim('Context', { command: 'context' }), { text: ' ' }, { text: b.filled, color: tint }, dim(b.empty), { text: ' ' }, { text: `${Math.round(p)}%`, color: tint }]
}

const usageSegment: Builder = (i, cfg, color) => {
  const w = i.rateLimits.find(r => r.kind === 'five_hour')
  if (w === undefined) return undefined
  const p = Math.max(0, Math.min(100, w.percentUsed))
  const tint = color ?? usageColor(p)
  const b = bar(p, cfg.barWidth)
  const reset = resetsIn(w.resetsAt, i.now)

  return [
    dim('Usage', { command: 'usage' }),
    { text: ' ' },
    { text: b.filled, color: tint },
    dim(b.empty),
    { text: ' ' },
    { text: `${Math.round(p)}%`, color: tint },
    ...(reset === undefined ? [] : [dim(` (resets in ${reset})`)]),
  ]
}

const pluginsSegment: Builder = (i, _cfg, color) => {
  if (i.plugins.length === 0) return undefined
  const part = (text: string): HudPart => (color === undefined ? dim(text) : { text, color })
  const parts: HudPart[] = [part('⚡ ')]
  i.plugins.forEach((name, n) => {
    if (n > 0) parts.push(part(' · '))
    parts.push({ ...part(name), command: 'plugin' })
  })

  return parts
}

const BUILDERS: Record<SegmentId, Builder> = { model: modelSegment, cost: costSegment, context: contextSegment, usage: usageSegment, plugins: pluginsSegment }

/** Line 1: the configured segments in order; a segment with no data is left out. */
export function buildSegments(i: Inputs, cfg: Config): HudSegment[] {
  const out: HudSegment[] = []
  for (const id of cfg.segments) {
    const parts = BUILDERS[id](i, cfg, cfg.colors[id])
    if (parts !== undefined) out.push({ id, parts })
  }

  return out
}

/**
 * The names the plugin segment lists: installed_plugins.json filtered by settings enabledPlugins
 * (only an explicit false drops one). Bad text gives [].
 */
export function pluginNames(settingsText: string | undefined, registryText: string | undefined): string[] {
  try {
    const registry = (JSON.parse(registryText ?? '') as { plugins?: Record<string, unknown> }).plugins ?? {}
    let enabled: Record<string, unknown> = {}
    try {
      enabled = (JSON.parse(settingsText ?? '') as { enabledPlugins?: Record<string, unknown> }).enabledPlugins ?? {}
    } catch {
      // No readable settings: every installed plugin counts.
    }

    return Object.keys(registry)
      .filter(k => enabled[k] !== false)
      .map(k => k.split('@')[0] ?? k)
      .sort()
  } catch {
    return []
  }
}

// Tool activity (line 2).

export const EMPTY_TOOLS: HudTools = { running: [], counts: {} }

/** An MCP tool "mcp__server__tool" shows as "tool". */
export const toolName = (tool: string): string => (tool.includes('__') ? (tool.split('__').pop() ?? tool) : tool)

const clip = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

/** A short target for the running-tool label: the command, file name, pattern or description. */
export function toolTarget(tool: string, input: Record<string, unknown>): string {
  const str = (k: string): string => (typeof input[k] === 'string' ? (input[k] as string) : '')
  const base = (p: string): string => p.split(/[\\/]/).filter(Boolean).pop() ?? p
  let t = ''
  switch (tool) {
    case 'Bash':
      t = str('command').split('\n')[0] ?? ''
      break
    case 'Read':
    case 'Edit':
    case 'Write':
    case 'NotebookEdit':
      t = base(str('file_path') || str('notebook_path'))
      break
    case 'Grep':
    case 'Glob':
      t = str('pattern')
      break
    case 'WebFetch':
      t = str('url').replace(/^https?:\/\//, '')
      break
    case 'Skill':
      t = str('skill')
      break
    case 'Agent':
    case 'Task':
      t = str('description')
      break
    default:
      t = ''
  }

  return clip(t.trim(), 32)
}

export const startTool = (s: HudTools, call: { id: string; tool: string; target: string }): HudTools => ({
  ...s,
  running: [...s.running.filter(r => r.id !== call.id), { ...call, tool: toolName(call.tool) }],
})

/** Moves a running call to the finished counts; a call that was never started changes nothing. */
export function finishTool(s: HudTools, id: string): HudTools {
  const call = s.running.find(r => r.id === id)
  if (call === undefined) return s

  return { running: s.running.filter(r => r.id !== id), counts: { ...s.counts, [call.tool]: (s.counts[call.tool] ?? 0) + 1 } }
}

/**
 * Line 2: the newest running tool, the top four finished tools by count, "+N more", running subagents.
 * Undefined when there has been no tool activity.
 */
export function toolsParts(s: HudTools, agents: number, separator: string): HudPart[] | undefined {
  const groups: HudPart[][] = []
  const running = s.running[s.running.length - 1]
  if (running !== undefined) groups.push([{ text: `◐ ${running.tool}${running.target === '' ? '' : `: ${running.target}`}`, color: 'yellow' }])

  const done = Object.entries(s.counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  for (const [name, n] of done.slice(0, 4)) groups.push([{ text: '✓', color: 'green' }, { text: ` ${name} ` }, dim(`×${n}`)])
  if (done.length > 4) groups.push([dim(`+${done.length - 4} more`)])
  if (agents > 0) groups.push([{ text: `◐ ${agents} agent${agents === 1 ? '' : 's'}`, color: 'yellow' }])
  if (groups.length === 0) return undefined

  return groups.flatMap((g, n) => (n === 0 ? g : [dim(separator), ...g]))
}

const DEFAULT_PILL: Record<string, string> = {
  acceptEdits: '▶▶ accept edits on',
  plan: '⏸ plan mode on',
  auto: '▶▶ auto mode on',
  bypassPermissions: '▶▶ bypass permissions on',
  dontAsk: "▶▶ don't ask on",
}

const PILL_COLOR: Record<string, string> = {
  acceptEdits: 'magenta',
  plan: 'cyan',
  auto: 'yellow',
  bypassPermissions: 'red',
  dontAsk: 'red',
}

export type Pill = { text: string; color: string }

/**
 * The permission pill: the engine's own, read from the hint line it draws (so shift+tab cycling shows
 * at once), else from the mode last seen on a hook input. The default mode has none.
 */
export function pillFor(hint: string, mode: string): Pill | null {
  const m = /(▶▶|⏵⏵|⏸)\s+([^(·]*?)(?=\s*\(|\s+·|\s{2,}|$)/u.exec(hint)
  if (m !== null) {
    const text = `${m[1]} ${(m[2] ?? '').trim()}`
    const lower = text.toLowerCase()
    const key = lower.includes('bypass') ? 'bypassPermissions' : lower.includes('accept') ? 'acceptEdits' : lower.includes('plan') ? 'plan' : lower.includes('auto') ? 'auto' : lower.includes("don't") ? 'dontAsk' : mode

    return { text, color: PILL_COLOR[key] ?? 'yellow' }
  }
  if (/\? for shortcuts/.test(hint)) return null
  const text = DEFAULT_PILL[mode]

  return text === undefined ? null : { text, color: PILL_COLOR[mode] ?? 'yellow' }
}
