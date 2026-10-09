// Kit self-test. Run from the kit folder:  node --test verify/check.mjs
// No dependencies. Needs Node 22 or newer (Node 24 recommended).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const rel = p => path.relative(KIT, p).split(path.sep).join('/')
const read = p => fs.readFileSync(path.join(KIT, p), 'utf8')

/** Every file under a kit folder, as kit-relative posix paths. */
function walk(dir) {
  const out = []
  for (const e of fs.readdirSync(path.join(KIT, dir), { withFileTypes: true })) {
    const p = `${dir}/${e.name}`
    if (e.isDirectory()) out.push(...walk(p))
    else out.push(p)
  }
  return out
}

/** Text files only: a file with a NUL byte is binary and skipped. */
function textFiles(dir) {
  return walk(dir).filter(p => !fs.readFileSync(path.join(KIT, p)).includes(0))
}

const VENDOR = 'claude/skills/archify/'
const ownFiles = [...textFiles('claude'), ...textFiles('mods')].filter(p => !p.startsWith(VENDOR))
const allFiles = [...textFiles('claude'), ...textFiles('mods')]

function frontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)
  return m ? m[1] : null
}

// MANIFEST.md

test('every path in the MANIFEST Files table exists in the kit', () => {
  const text = read('MANIFEST.md')
  const section = text.split(/^## Files\s*$/m)[1]?.split(/^## /m)[0]
  assert.ok(section, 'MANIFEST.md has a "## Files" section')
  const paths = []
  for (const line of section.split('\n')) {
    if (!line.startsWith('|')) continue
    const cell = line.split('|')[1]?.trim() ?? ''
    const m = /^`([^`]+)`$/.exec(cell)
    if (m) paths.push(m[1])
  }
  assert.ok(paths.length >= 20, `expected many manifest rows, found ${paths.length}`)
  const missing = paths.filter(p => !fs.existsSync(path.join(KIT, p)))
  assert.deepEqual(missing, [])
})

test('every file under claude/ (own files) is listed in the MANIFEST', () => {
  const text = read('MANIFEST.md')
  const unlisted = ownFiles.filter(p => p.startsWith('claude/')).filter(p => !text.includes('`' + p + '`') && !text.includes('`' + path.posix.dirname(p) + '/`'))
  assert.deepEqual(unlisted, [])
})

// settings

test('claude/settings.json parses and holds the expected keys', () => {
  const s = JSON.parse(read('claude/settings.json'))
  assert.equal(s.permissions.defaultMode, 'default')
  assert.equal(s.env.CAVEMAN_DEFAULT_MODE, 'caveman')
  for (const key of ['model', 'effortLevel', 'ultracode']) assert.equal(key in s, false, `${key} must not be set`)
  assert.equal('CLAUDE_CODE_ENABLE_FUNCTION_HOOKS' in s.env, false)
  for (const id of ['caveman@caveman', 'i-have-adhd@i-have-adhd', 'claude-hud@claude-hud', 'document-skills@anthropic-agent-skills']) {
    assert.equal(s.enabledPlugins[id], true, id)
  }
  for (const name of ['caveman', 'i-have-adhd', 'claude-hud', 'anthropic-agent-skills', 'admin-kit-mods']) {
    assert.ok(s.extraKnownMarketplaces[name], `marketplace ${name}`)
  }
  const cmds = [...s.hooks.UserPromptSubmit, ...s.hooks.PostToolUse].flatMap(h => h.hooks.map(x => x.command))
  assert.equal(cmds.length, 2)
  for (const c of cmds) assert.match(c, /style-reinforce\.cjs/)
  for (const c of cmds) assert.match(c, /\$HOME/)
})

test('claude/settings.powershell-hooks.json parses and uses the powershell shell', () => {
  const s = JSON.parse(read('claude/settings.powershell-hooks.json'))
  const hooks = [...s.hooks.UserPromptSubmit, ...s.hooks.PostToolUse].flatMap(h => h.hooks)
  assert.equal(hooks.length, 2)
  for (const h of hooks) {
    assert.equal(h.shell, 'powershell')
    assert.match(h.command, /USERPROFILE/)
  }
})

test('settings files hold no personal paths, names or token-looking strings', () => {
  for (const f of ['claude/settings.json', 'claude/settings.powershell-hooks.json']) {
    const t = read(f)
    assert.equal(t.includes('/Users/'), false, `${f} has /Users/`)
    assert.equal(/sal/i.test(t), false, `${f} contains "sal"`)
  }
})

test('no kit file holds a token-looking string', () => {
  const patterns = [/sk-[A-Za-z0-9_-]{10,}/, /ghp_[A-Za-z0-9]{10,}/, /xox[abprs]-[A-Za-z0-9-]{5,}/, /AKIA[0-9A-Z]{12,}/, /\b[0-9a-f]{40,}\b/i]
  const hits = []
  for (const f of ownFiles) {
    const t = read(f)
    for (const re of patterns) if (re.test(t)) hits.push(`${f} ${re}`)
  }
  assert.deepEqual(hits, [])
})

// forbidden words

test('no kit file under claude/ or mods/ names the author, employer or retired tooling', () => {
  const words = [['Hq', 'O'], ['h', 'qo'], ['sal', '.', 'drag', 'one'], ['Drag', 'one'], ['stran', 'gle'], ['J', 'ev'], ['Hind', 'sight'], ['Source', 'graph']].map(p => p.join(''))
  const hits = []
  for (const f of allFiles) {
    const t = read(f)
    for (const w of words) if (t.includes(w)) hits.push(`${f}: ${w}`)
    if (new RegExp('\\b' + ['S', 'al'].join('') + '\\b').test(t)) hits.push(`${f}: Sal`)
  }
  assert.deepEqual(hits, [])
})

test('the issue-tracker word appears nowhere except the two exempt files and the vendored diagram skill catalog', () => {
  const LIN = ['Lin', 'ear'].join('')
  const exempt = new Set(['MANIFEST.md', 'mods/README.md'])
  const hits = allFiles.filter(f => !exempt.has(f) && !f.startsWith(VENDOR) && read(f).includes(LIN))
  assert.deepEqual(hits, [])
  // The vendored skill may carry only its brand-icon catalog entry for the product named in the exempt list.
  const vendorHits = allFiles.filter(f => f.startsWith(VENDOR) && read(f).includes(LIN))
  assert.deepEqual(vendorHits, [VENDOR + 'renderers/shared/generated-brand-marks.mjs'])
})

// frontmatter

test('every SKILL.md has frontmatter with name and description', () => {
  const skills = walk('claude/skills').filter(p => p.endsWith('/SKILL.md'))
  assert.ok(skills.length >= 3)
  for (const f of skills) {
    const fm = frontmatter(read(f))
    assert.ok(fm, `${f} frontmatter`)
    assert.match(fm, /^name:\s*\S+/m, `${f} name`)
    assert.match(fm, /^description:\s*\S+/m, `${f} description`)
    const dirName = path.posix.basename(path.posix.dirname(f))
    assert.match(fm, new RegExp(`^name:\\s*${dirName}\\s*$`, 'm'), `${f} name matches folder`)
  }
})

test('every memory file except MEMORY.md has frontmatter with name, description and feedback type', () => {
  const files = walk('claude/memory').filter(p => p.endsWith('.md') && !p.endsWith('/MEMORY.md'))
  assert.equal(files.length, 12)
  for (const f of files) {
    const t = read(f)
    const fm = frontmatter(t)
    assert.ok(fm, `${f} frontmatter`)
    assert.match(fm, /^name:\s*\S+/m, `${f} name`)
    assert.match(fm, /^description:\s*\S+/m, `${f} description`)
    assert.match(fm, /^\s+type:\s*feedback\s*$/m, `${f} metadata.type`)
    assert.match(t, /\*\*Why:\*\*/, `${f} Why`)
    assert.match(t, /\*\*How to apply:\*\*/, `${f} How to apply`)
  }
})

test('MEMORY.md links every memory file and nothing else', () => {
  const index = read('claude/memory/MEMORY.md')
  const linked = [...index.matchAll(/\]\(([^)]+\.md)\)/g)].map(m => m[1]).sort()
  const files = fs.readdirSync(path.join(KIT, 'claude/memory')).filter(n => n.endsWith('.md') && n !== 'MEMORY.md').sort()
  assert.deepEqual(linked, files)
})

// CLAUDE.md

test('claude/CLAUDE.md carries the placeholders, switches and required blocks', () => {
  const t = read('claude/CLAUDE.md')
  for (const s of ['__CANARY__', '__TIMEZONE__', 'stop caveman', 'stop adhd mode', 'normal mode', '/caveman', '/i-have-adhd']) {
    assert.ok(t.includes(s), `missing ${s}`)
  }
  for (const tag of ['precedence', 'canary', 'style id="caveman"', 'shape id="adhd-shape"', 'persistence', 'style-core', 'controls', 'admin-work-defaults', 'session-economics', 'memory', 'secrets', 'verify-before-claiming', 'decide-and-note', 'say-recommendation-once', 'artifacts', 'env-facts']) {
    assert.ok(t.includes(`<${tag}`), `missing block ${tag}`)
  }
})

test('claude/CLAUDE.md has balanced block tags and no developer-tool vocabulary', () => {
  const t = read('claude/CLAUDE.md')
  const open = [...t.matchAll(/^<([a-z-]+)[ >]/gm)].map(m => m[1])
  const close = [...t.matchAll(/^<\/([a-z-]+)>/gm)].map(m => m[1])
  assert.deepEqual(open, close)
  for (const w of ['1Password', 'zsh', 'asdf', 'launchd', 'push gate', 'ultracode', 'CodeRabbit']) assert.equal(t.includes(w), false, w)
})

// flag files

test('caveman flag is caveman and the adhd flag file is absent', () => {
  assert.equal(read('claude/.caveman-active').trim(), 'caveman')
  assert.equal(fs.existsSync(path.join(KIT, 'claude/.i-have-adhd-always')), false)
})

test('the archify skill is a real directory, not a symlink', () => {
  assert.equal(fs.lstatSync(path.join(KIT, 'claude/skills/archify')).isSymbolicLink(), false)
  assert.ok(fs.existsSync(path.join(KIT, 'claude/skills/archify/bin/archify.mjs')))
})

// style-reinforce hook

const { styleReinforce } = require(path.join(KIT, 'claude/scripts/style-reinforce.cjs'))

function sandbox({ caveman, adhd }) {
  const dir = fs.mkdtempSync(path.join(fs.realpathSync(process.env.TMPDIR || process.env.TEMP || '/tmp'), 'kit-sr-'))
  const claude = path.join(dir, '.claude')
  fs.mkdirSync(claude)
  if (caveman) fs.writeFileSync(path.join(claude, '.caveman-active'), caveman)
  if (adhd) fs.writeFileSync(path.join(claude, '.i-have-adhd-always'), '')
  return { dir, opts: { env: { STYLE_REINFORCE_EVERY: '2' }, homedir: () => dir, tmpdir: () => dir } }
}

test('style-reinforce is silent when both modes are off', () => {
  const { opts } = sandbox({})
  assert.equal(styleReinforce(JSON.stringify({ hook_event_name: 'UserPromptSubmit', session_id: 'a' }), opts), '')
})

test('style-reinforce anchors adhd on every prompt and caveman every Nth tool call', () => {
  const { opts } = sandbox({ caveman: 'caveman', adhd: true })
  const prompt = JSON.parse(styleReinforce(JSON.stringify({ hook_event_name: 'UserPromptSubmit', session_id: 's1' }), opts))
  assert.match(prompt.hookSpecificOutput.additionalContext, /ADHD MODE ACTIVE/)
  const tool = JSON.stringify({ hook_event_name: 'PostToolUse', session_id: 's1' })
  assert.equal(styleReinforce(tool, opts), '')
  const second = JSON.parse(styleReinforce(tool, opts))
  assert.match(second.hookSpecificOutput.additionalContext, /CAVEMAN MODE STILL ACTIVE \(caveman\)/)
  assert.match(second.hookSpecificOutput.additionalContext, /ADHD MODE STILL ACTIVE/)
})

test('style-reinforce drops the adhd line for a subagent whose transcript path uses Windows backslashes', () => {
  const { opts } = sandbox({ caveman: 'caveman', adhd: true })
  const out = styleReinforce(
    JSON.stringify({ hook_event_name: 'PostToolUse', session_id: 'w1', transcript_path: 'C:\\Users\\me\\.claude\\projects\\p\\abc\\subagents\\agent-1.jsonl' }),
    opts,
  )
  assert.equal(out, '')
  const second = JSON.parse(
    styleReinforce(JSON.stringify({ hook_event_name: 'PostToolUse', session_id: 'w1', transcript_path: 'C:\\Users\\me\\.claude\\projects\\p\\abc\\subagents\\agent-1.jsonl' }), opts),
  )
  assert.match(second.hookSpecificOutput.additionalContext, /CAVEMAN MODE STILL ACTIVE/)
  assert.doesNotMatch(second.hookSpecificOutput.additionalContext, /ADHD/)
})

test('style-reinforce never throws on bad input', () => {
  const { opts } = sandbox({ caveman: 'caveman' })
  assert.doesNotThrow(() => styleReinforce('not json', opts))
  assert.doesNotThrow(() => styleReinforce(null, opts))
})

// admin-hud mod

test('mods marketplace lists only admin-hud and its files exist', () => {
  const m = JSON.parse(read('mods/.claude-plugin/marketplace.json'))
  assert.deepEqual(m.plugins.map(p => p.name), ['admin-hud'])
  const plugin = JSON.parse(read('mods/admin-hud/.claude-plugin/plugin.json'))
  assert.equal(plugin.name, 'admin-hud')
  for (const f of ['hooks/hooks.json', 'hooks/lib.ts', 'hooks/register.tsx', 'types/index.d.ts']) {
    assert.ok(fs.existsSync(path.join(KIT, 'mods/admin-hud', f)), f)
  }
})

test('admin-hud has no sidebar, party or cmux code', () => {
  for (const f of ['hooks/lib.ts', 'hooks/register.tsx', 'types/index.d.ts']) {
    const t = read(`mods/admin-hud/${f}`)
    for (const w of ['cmux', 'sidebar', 'Sidebar', 'party', 'Party', 'sal-hud']) assert.equal(t.includes(w), false, `${f} ${w}`)
  }
})

test('admin-hud lib: default config has four segments and parses user config', async () => {
  const lib = await import(pathToFileURL(path.join(KIT, 'mods/admin-hud/hooks/lib.ts')).href)
  assert.deepEqual(lib.DEFAULT_CONFIG.segments, ['model', 'cost', 'context', 'usage'])
  assert.equal(lib.parseConfig(undefined).segments.length, 4)
  assert.equal(lib.parseConfig('{"segments":["cost","sidebar"]}').segments.join(), 'cost')
  assert.equal(lib.parseConfig('{bad').segments.length, 4)
  assert.equal(lib.toolTarget('Read', { file_path: 'C:\\Users\\me\\Documents\\plan.docx' }), 'plan.docx')
  assert.equal(lib.displayModel('claude-opus-5-5[1m]'), 'Opus 5.5')
  assert.deepEqual(lib.pluginNames('{"enabledPlugins":{"a@m":false}}', '{"plugins":{"a@m":[],"b@m":[]}}'), ['b'])
})

// installer and docs half

const PWSH = (() => {
  const r = spawnSync('pwsh', ['-NoProfile', '-Command', '$PSVersionTable.PSVersion.ToString()'], { encoding: 'utf8' })
  return r.status === 0
})()
const NO_PWSH = PWSH ? false : 'pwsh is not installed on this machine'
const NO_SH_SHIM = process.platform === 'win32' ? 'fake claude shim is a shell script' : false

test('docs, installers and housekeeping files exist', () => {
  for (const f of ['README.md', 'ACCOUNTS.md', 'ONBOARD-PROMPT.md', 'install.ps1', 'install.sh', 'verify/check-install.ps1', 'CHANGELOG.md', '.gitignore']) {
    assert.ok(fs.existsSync(path.join(KIT, f)), f)
  }
})

test('install.ps1 has a dry-run switch, backs up first, and keeps its version in step with the CHANGELOG', () => {
  const t = read('install.ps1')
  assert.ok(t.includes('-DryRun') || t.includes('$DryRun'), 'DryRun')
  assert.ok(t.includes('[switch]$DryRun'))
  assert.ok(t.includes('backups'))
  const version = /\$KitVersion = '([^']+)'/.exec(t)?.[1]
  assert.match(read('CHANGELOG.md'), new RegExp(`^## ${version.replace(/\./g, '\\.')} - 2026-10-09$`, 'm'))
})

test('install.ps1 runs the plugin commands in the documented order and form', () => {
  const t = read('install.ps1')
  assert.ok(t.indexOf("'plugin', 'marketplace', 'add'") < t.indexOf("'plugin', 'install'"))
  for (const p of ['caveman@caveman', 'i-have-adhd@i-have-adhd', 'claude-hud@claude-hud', 'document-skills@anthropic-agent-skills', 'example-skills@anthropic-agent-skills']) {
    assert.ok(t.includes(p), p)
  }
  for (const src of ['JuliusBrussee/caveman', 'ayghri/i-have-adhd', 'jarrodwatts/claude-hud', 'anthropics/skills']) assert.ok(t.includes(src), src)
})

test('ACCOUNTS.md covers plans, connectors and what to skip', () => {
  const t = read('ACCOUNTS.md')
  for (const w of ['Pro', 'Max', 'Max 5x', '/mcp', 'Microsoft 365', 'Entra', 'Docusign', 'Canva', 'Granola', 'GitHub', '1Password', 'long-term memory services', 'winget install rtk-ai.rtk']) {
    assert.ok(t.includes(w), w)
  }
})

test('README links ACCOUNTS.md and covers install, modes, update and uninstall', () => {
  const t = read('README.md')
  assert.ok(t.includes('(ACCOUNTS.md)'))
  for (const w of ['install.ps1', 'check-install.ps1', 'ONBOARD-PROMPT.md', 'stop caveman', 'stop adhd mode', '## Update', '## Uninstall', 'backups']) assert.ok(t.includes(w), w)
})

test('ONBOARD-PROMPT.md walks through every first-run step', () => {
  const t = read('ONBOARD-PROMPT.md')
  for (const w of ['.i-have-adhd-always', 'CAVEMAN_DEFAULT_MODE', '/mcp', '.docx', 'Documents', 'MEMORY.md', 'meeting notes', 'proposal outline', 'spreadsheet']) {
    assert.ok(t.toLowerCase().includes(w.toLowerCase()), w)
  }
})

test('.gitignore keeps secrets, backups and zips out', () => {
  const lines = read('.gitignore').split(/\r?\n/)
  for (const l of ['secrets.env', 'backups/', '*.zip']) assert.ok(lines.includes(l), l)
})

test('no file in the kit names the author or employer', () => {
  const words = [['sal', '.', 'drag', 'one'], ['Drag', 'one'], ['Hq', 'O'], ['h', 'qo']].map(p => p.join(''))
  const files = []
  const top = fs.readdirSync(KIT, { withFileTypes: true }).filter(e => e.name !== '.git')
  for (const e of top) {
    if (e.isDirectory()) files.push(...textFiles(e.name))
    else if (!fs.readFileSync(path.join(KIT, e.name)).includes(0)) files.push(e.name)
  }
  const hits = []
  for (const f of files) {
    if (f === 'LICENSE') continue // the copyright line names the author
    const t = read(f)
    for (const w of words) if (t.includes(w)) hits.push(`${f}: ${w}`)
  }
  assert.deepEqual(hits, [])
})

test('install.sh passes bash -n', () => {
  const r = spawnSync('bash', ['-n', path.join(KIT, 'install.sh')], { encoding: 'utf8' })
  assert.equal(r.status, 0, r.stderr)
})

test('both PowerShell scripts parse', { skip: NO_PWSH }, () => {
  for (const f of ['install.ps1', 'verify/check-install.ps1']) {
    const cmd = `$e = $null; [void][System.Management.Automation.Language.Parser]::ParseFile('${path.join(KIT, f)}', [ref]$null, [ref]$e); if ($e) { $e; exit 1 }`
    const r = spawnSync('pwsh', ['-NoProfile', '-Command', cmd], { encoding: 'utf8' })
    assert.equal(r.status, 0, `${f}: ${r.stdout}${r.stderr}`)
  }
})

/** A throwaway home folder, a fake `claude` on PATH that records what it is told, and a runner for the PowerShell scripts. */
function installSandbox() {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(process.env.TMPDIR || '/tmp'), 'kit-inst-'))
  const home = path.join(root, 'home')
  const bin = path.join(root, 'bin')
  const st = path.join(root, 'state')
  for (const d of [home, bin, st]) fs.mkdirSync(d)
  fs.writeFileSync(path.join(bin, 'claude'), `#!/bin/sh
case "$*" in
  "--version") echo "2.1.300 (Claude Code)" ;;
  "plugin list") cat "$FAKE_STATE/plugins" 2>/dev/null ;;
  "plugin marketplace list") cat "$FAKE_STATE/markets" 2>/dev/null ;;
  "plugin marketplace add"*)
    case "$4" in
      *caveman*) n=caveman ;; *adhd*) n=i-have-adhd ;; *claude-hud*) n=claude-hud ;; anthropics/skills) n=anthropic-agent-skills ;; *) n=other ;;
    esac
    echo "$n" >> "$FAKE_STATE/markets"; echo "$4" >> "$FAKE_STATE/calls" ;;
  "plugin install"*) echo "$3" >> "$FAKE_STATE/plugins"; echo "$3" >> "$FAKE_STATE/calls" ;;
esac
`, { mode: 0o755 })
  const env = { ...process.env, HOME: home, PATH: `${bin}${path.delimiter}${process.env.PATH}`, FAKE_STATE: st }
  delete env.CLAUDE_CONFIG_DIR
  const run = (script, args = []) => spawnSync('pwsh', ['-NoProfile', '-File', path.join(KIT, script), ...args], { encoding: 'utf8', env })
  const slug = home.replace(/[^A-Za-z0-9]/g, '-')
  return { root, home, st, run, claude: path.join(home, '.claude'), mem: path.join(home, '.claude', 'projects', slug, 'memory') }
}

test('install.ps1 -DryRun prints actions and writes nothing', { skip: NO_PWSH || NO_SH_SHIM }, () => {
  const s = installSandbox()
  const r = s.run('install.ps1', ['-DryRun', '-Name', 'Maria', '-TimeZone', 'America/New_York'])
  assert.equal(r.status, 0, r.stdout + r.stderr)
  assert.match(r.stdout, /DRY RUN/)
  assert.match(r.stdout, /DRY\s+would run: claude plugin install caveman@caveman/)
  assert.equal(fs.existsSync(s.claude), false)
  assert.equal(fs.existsSync(path.join(s.st, 'calls')), false)
})

test('install.ps1 installs, merges settings, backs up, and is idempotent; check-install passes', { skip: NO_PWSH || NO_SH_SHIM }, () => {
  const s = installSandbox()
  fs.mkdirSync(s.claude, { recursive: true })
  fs.writeFileSync(path.join(s.claude, 'CLAUDE.md'), 'my old rules\n')
  const mine = { model: 'my-model', env: { FOO: '1' }, hooks: { PostToolUse: [{ hooks: [{ type: 'command', command: 'echo mine' }] }] } }
  fs.writeFileSync(path.join(s.claude, 'settings.json'), JSON.stringify(mine))

  const first = s.run('install.ps1', ['-Name', 'Maria', '-TimeZone', 'America/New_York'])
  assert.equal(first.status, 0, first.stdout + first.stderr)

  const md = fs.readFileSync(path.join(s.claude, 'CLAUDE.md'), 'utf8')
  assert.ok(md.includes('Maria') && md.includes('America/New_York'))
  assert.equal(/__CANARY__|__TIMEZONE__/.test(md), false)

  const backups = fs.readdirSync(path.join(s.claude, 'backups'))
  assert.equal(backups.length, 1)
  assert.match(backups[0], /^admin-kit-\d{8}-\d{6}$/)
  assert.equal(fs.readFileSync(path.join(s.claude, 'backups', backups[0], 'CLAUDE.md'), 'utf8'), 'my old rules\n')
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(s.claude, 'backups', backups[0], 'settings.json'), 'utf8')), mine)

  const read1 = () => JSON.parse(fs.readFileSync(path.join(s.claude, 'settings.json'), 'utf8'))
  const set = read1()
  assert.equal(set.model, 'my-model')
  assert.equal(set.env.FOO, '1')
  assert.equal(set.env.CAVEMAN_DEFAULT_MODE, 'caveman')
  assert.equal(set.permissions.defaultMode, 'default')
  assert.equal(set.hooks.PostToolUse.length, 2)
  assert.equal(set.hooks.UserPromptSubmit.length, 1)
  assert.equal(set.enabledPlugins['admin-hud@admin-kit-mods'], false)
  assert.equal(set.extraKnownMarketplaces['admin-kit-mods'].source.path, path.join(s.claude, 'admin-kit-mods'))
  assert.equal(JSON.stringify(set).includes('__KIT_MODS_DIR__'), false)

  assert.ok(fs.existsSync(path.join(s.claude, 'scripts', 'style-reinforce.cjs')))
  for (const k of ['verified-status', 'resume-handoff', 'archify']) assert.ok(fs.existsSync(path.join(s.claude, 'skills', k, 'SKILL.md')), k)
  assert.equal(fs.readFileSync(path.join(s.claude, '.caveman-active'), 'utf8').trim(), 'caveman')
  assert.ok(fs.existsSync(path.join(s.claude, 'admin-kit-mods', 'admin-hud', 'hooks', 'register.tsx')))
  assert.equal(fs.readdirSync(s.mem).filter(n => n.endsWith('.md') && n !== 'MEMORY.md').length, 12)

  const calls = fs.readFileSync(path.join(s.st, 'calls'), 'utf8').trim().split('\n')
  assert.equal(calls.length, 9)
  assert.ok(calls.slice(0, 4).every(c => c.includes('/')), 'four marketplace adds come first')
  assert.deepEqual(calls.slice(4), ['caveman@caveman', 'i-have-adhd@i-have-adhd', 'claude-hud@claude-hud', 'document-skills@anthropic-agent-skills', 'example-skills@anthropic-agent-skills'])

  // a user's own memory edit and a switched-off caveman survive a re-run
  fs.writeFileSync(path.join(s.mem, 'ship-small.md'), 'edited by user\n')
  fs.rmSync(path.join(s.claude, '.caveman-active'))
  const second = s.run('install.ps1', ['-Name', 'Maria', '-TimeZone', 'America/New_York'])
  assert.equal(second.status, 0, second.stdout + second.stderr)
  assert.equal(fs.readdirSync(path.join(s.claude, 'backups')).length, 1, 'no new backup when nothing changed')
  assert.deepEqual(read1(), set)
  assert.equal(fs.readFileSync(path.join(s.mem, 'ship-small.md'), 'utf8'), 'edited by user\n')
  assert.equal(fs.existsSync(path.join(s.claude, '.caveman-active')), false)
  assert.equal(fs.readFileSync(path.join(s.st, 'calls'), 'utf8').trim().split('\n').length, 9, 'no repeat plugin commands')

  const check = s.run('verify/check-install.ps1')
  assert.equal(check.status, 0, check.stdout + check.stderr)
  assert.match(check.stdout, /PASS/)
  assert.equal(/FAIL/.test(check.stdout), false)
})

test('check-install.ps1 exits 1 and says FAIL on an empty home', { skip: NO_PWSH || NO_SH_SHIM }, () => {
  const s = installSandbox()
  const r = s.run('verify/check-install.ps1')
  assert.equal(r.status, 1)
  assert.match(r.stdout, /FAIL/)
})

test('install.ps1 refuses a settings.json that is not JSON and leaves it untouched', { skip: NO_PWSH || NO_SH_SHIM }, () => {
  const s = installSandbox()
  fs.mkdirSync(s.claude, { recursive: true })
  fs.writeFileSync(path.join(s.claude, 'settings.json'), '{ not json')
  const r = s.run('install.ps1', ['-Name', 'Maria', '-TimeZone', 'America/New_York'])
  assert.equal(r.status, 1)
  assert.equal(fs.readFileSync(path.join(s.claude, 'settings.json'), 'utf8'), '{ not json')
})
