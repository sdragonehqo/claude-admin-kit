/** One drawn piece of a segment. A part with a `command` is a Button; the rest is Text. */
export type HudPart = {
  text: string
  color?: string
  dim?: boolean
  bold?: boolean
  /** Default slash command (no leading slash); makes the part clickable. */
  command?: string
  /** What a click rule's `match` is tried against, when not `text` itself. */
  match?: string
}

export type HudSegment = { id: string; parts: HudPart[] }

export type HudClick = { match: string; command: string }

export type HudFrame = {
  /** False when admin-hud.json in the Claude folder says "enabled": false. */
  enabled: boolean
  /** Line 1, in the configured order. */
  segments: HudSegment[]
  separator: string
  showTools: boolean
  /** The user's own click rules; they go ahead of each part's default command. */
  clicks: HudClick[]
  /** Running subagents. */
  agents: number
}

export type HudTools = {
  /** Tool calls in flight on the main loop, oldest first. */
  running: { id: string; tool: string; target: string }[]
  /** Finished main-loop calls per tool name. */
  counts: Record<string, number>
}

declare module 'claude-code' {
  interface PluginState {
    'admin-hud': {
      frame: HudFrame
      tools: HudTools
      mode: string
      effort: string
    }
  }
}
