import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, RenderElement } from 'claude-code'

import type { HudFrame, HudPart, HudTools } from '../types'

import {
  EMPTY_TOOLS,
  EVENT_REFRESH_MS,
  PLUGINS_TTL_MS,
  REFRESH_MS,
  buildSegments,
  clickCommand,
  finishTool,
  parseConfig,
  pillFor,
  pluginNames,
  startTool,
  toolTarget,
  toolsParts,
} from './lib'
import type { Config } from './lib'

const EMPTY: HudFrame = { enabled: true, segments: [], separator: ' │ ', showTools: true, clicks: [], agents: 0 }

const frameAtom = atom({ plugin: 'admin-hud', key: 'frame' } as const, EMPTY)
const toolsAtom = atom({ plugin: 'admin-hud', key: 'tools' } as const, EMPTY_TOOLS)
const modeAtom = atom({ plugin: 'admin-hud', key: 'mode' } as const, 'default')
const effortAtom = atom({ plugin: 'admin-hud', key: 'effort' } as const, '')

// Module variables reset on a hot reload; everything a drawing reads is in the state.
let inFlight = false
let isDirty = false
let lastAt = 0
let isWarned = false
let plugins: { at: number; names: string[] } | undefined

/** One log line per session, however many refreshes fail. */
function warnOnce($: EngineInterface, text: string): void {
  if (isWarned) return
  isWarned = true
  $.ui.log(`admin-hud: ${text}`)
}

/**
 * The Claude folder: CLAUDE_CONFIG_DIR when set, else <home>/.claude. The home folder is HOME where it
 * exists and USERPROFILE on native Windows. Forward slashes are accepted by Node on Windows.
 */
async function configDir($: EngineInterface): Promise<string> {
  const home = (await $.env.get('HOME')) ?? (await $.env.get('USERPROFILE')) ?? ''

  return (await $.env.get('CLAUDE_CONFIG_DIR')) ?? `${home}/.claude`
}

/** The plugin names, read at most once a minute. */
async function pluginList($: EngineInterface, dir: string, now: number): Promise<string[]> {
  if (plugins !== undefined && now - plugins.at < PLUGINS_TTL_MS) return plugins.names
  const [settings, registry] = await Promise.all([$.fs.read(`${dir}/settings.json`).catch(() => undefined), $.fs.read(`${dir}/plugins/installed_plugins.json`).catch(() => undefined)])
  plugins = { at: now, names: pluginNames(settings, registry) }

  return plugins.names
}

/** Builds the frame from session data: no subprocess, every call answers from the engine or one small file read. */
async function compute($: EngineInterface, cfg: Config, dir: string, now: number): Promise<HudFrame> {
  const [model, usage, agents, names, effort] = await Promise.all([
    $.session.model().catch(() => ''),
    $.session.usage().catch(() => undefined),
    $.agent.list().catch(() => []),
    pluginList($, dir, now).catch(() => []),
    read($, effortAtom),
  ])

  return {
    enabled: true,
    segments: buildSegments(
      {
        model,
        effort,
        ...(usage?.cost === undefined ? {} : { cost: usage.cost.usd }),
        context: usage?.context ?? { window: 0 },
        rateLimits: usage?.rateLimits ?? [],
        plugins: names,
        now,
      },
      cfg,
    ),
    separator: cfg.separator,
    showTools: cfg.showTools,
    clicks: cfg.clicks,
    agents: agents.filter(a => a.status === 'running').length,
  }
}

/** Recomputes the frame and stores it when it changed; the last good frame stays on screen meanwhile. */
async function refresh($: EngineInterface, force = false): Promise<void> {
  if (inFlight) {
    isDirty = true

    return
  }
  const now = await $.clock.now()
  if (!force && now - lastAt < EVENT_REFRESH_MS) return
  inFlight = true
  lastAt = now
  try {
    do {
      isDirty = false
      const dir = await configDir($)
      const cfg = parseConfig(await $.fs.read(`${dir}/admin-hud.json`).catch(() => undefined))
      let next: HudFrame
      if (!cfg.enabled) next = { ...EMPTY, enabled: false }
      else {
        try {
          next = await compute($, cfg, dir, now)
        } catch (error) {
          warnOnce($, `refresh failed, drawing the permission pill only (${error instanceof Error ? error.message : String(error)})`)
          next = { ...EMPTY, separator: cfg.separator, showTools: cfg.showTools, clicks: cfg.clicks }
        }
      }
      await update($, frameAtom, old => (JSON.stringify(old) === JSON.stringify(next) ? old : next))
    } while (isDirty)
  } catch {
    // A refresh never throws into a hook.
  } finally {
    inFlight = false
  }
}

/** Runs a slash command as if typed; where that is refused, puts it in the prompt box. */
async function runSlash($: EngineInterface, line: string): Promise<void> {
  const [command = '', ...rest] = line.trim().split(/\s+/)
  try {
    await $.command.run({ command, ...(rest.length === 0 ? {} : { args: rest.join(' ') }) })
  } catch {
    await $.prompt.fill({ text: `/${line.trim()}`, mode: 'replace' })
    $.ui.toast(`/${line.trim()} is in the prompt box: press Enter`)
  }
}

/** Remembers the main thread's permission mode and effort a hook input carries. */
async function seed($: EngineInterface, e: { agent_id?: string; permission_mode?: string; effort?: { level: string } }): Promise<void> {
  if (e.agent_id !== undefined) return
  const mode = e.permission_mode
  if (mode !== undefined) await update($, modeAtom, old => (old === mode ? old : mode))
  const level = e.effort?.level
  if (level !== undefined) await update($, effortAtom, old => (old === level ? old : level))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await refresh($, true)
    $.clock.every(REFRESH_MS, () => {
      void refresh($, true)
    })

    return next(e)
  })

  // Main-loop tool calls feed line 2: started before the call, counted when it returns or fails.
  on('tool.call', async ($, e, next) => {
    const id = e.tool_use_id
    if (e.agentId !== undefined || id === undefined) return next(e)
    const target = toolTarget(e.tool, e as unknown as Record<string, unknown>)
    await update($, toolsAtom, (old: HudTools) => startTool(old, { id, tool: e.tool, target }))
    try {
      return await next(e)
    } finally {
      await update($, toolsAtom, (old: HudTools) => finishTool(old, id))
      void refresh($)
    }
  })

  on('turn.complete', ($, e, next) => {
    void refresh($, true)

    return next(e)
  })

  on('classic.UserPromptSubmit', async ($, e, next) => {
    await seed($, e)
    void refresh($)

    return next(e)
  })

  on('classic.PostToolUse', async ($, e, next) => {
    await seed($, e)

    return next(e)
  })

  on('classic.Stop', async ($, e, next) => {
    await seed($, e)

    return next(e)
  })

  // The line under the prompt: status segments, tool activity, then the permission pill; nothing right of the pill.
  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    const frame = await read($, frameAtom)
    if (!frame.enabled) return next(e)

    const [tools, mode] = await Promise.all([read($, toolsAtom), read($, modeAtom)])
    const pill = pillFor(e.props.hint, mode)
    const toolParts = frame.showTools ? toolsParts(tools, frame.agents, frame.separator) : undefined
    if (frame.segments.length === 0 && toolParts === undefined && pill === null) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)

    const partEl = (p: HudPart, key: string): RenderElement => {
      const command = clickCommand(p, frame.clicks)
      if (command !== undefined) return <Button key={key} label={p.text} plain {...(p.dim ? { dimColor: true } : {})} onPress={() => void runSlash($, command)} />

      return (
        <Text key={key} wrap="truncate" {...(p.color === undefined ? {} : { color: p.color })} {...(p.dim ? { dimColor: true } : {})} {...(p.bold ? { bold: true } : {})}>
          {p.text}
        </Text>
      )
    }

    const sepEl = (key: string): RenderElement => (
      <Text key={key} wrap="truncate" dimColor>
        {frame.separator}
      </Text>
    )

    // The context segment never shrinks, so its percent is not the part that gets cut.
    const line1: RenderElement[] = frame.segments.flatMap((seg, n) => {
      const els = seg.parts.map((p, i) => partEl(p, `hud-${seg.id}-${i}`))

      return [
        ...(n === 0 ? [] : [sepEl(`hud-sep-${n}`)]),
        ...(seg.id === 'context'
          ? [
              <Box key="hud-context" flexDirection="row" flexShrink={0}>
                {els}
              </Box>,
            ]
          : els),
      ]
    })

    return (
      <Box flexDirection="column">
        {line1.length > 0 && (
          <Box key="hud-line1" flexDirection="row">
            {line1}
          </Box>
        )}
        {toolParts !== undefined && (
          <Box key="hud-tools" flexDirection="row">
            {toolParts.map((p, i) => partEl(p, `hud-tools-${i}`))}
          </Box>
        )}
        {pill !== null && (
          <Text key="hud-pill" color={pill.color} wrap="truncate">
            {pill.text}
          </Text>
        )}
      </Box>
    )
  })
}
