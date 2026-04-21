import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const docsRoot = path.join(repoRoot, 'src/content/docs')

function walk(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(fullPath))
    else out.push(fullPath)
  }
  return out
}

const allFiles = walk(docsRoot)
const mdxFiles = allFiles.filter((file) => file.endsWith('.mdx'))
const metaFiles = allFiles.filter((file) => file.endsWith('meta.json'))

const validRoutes = new Set(['/docs'])
for (const file of mdxFiles) {
  const rel = path.relative(docsRoot, file).replaceAll(path.sep, '/')
  const route =
    '/docs/' + rel.replace(/\/index\.mdx$/, '').replace(/\.mdx$/, '')
  validRoutes.add(route)
}

function stripCode(content) {
  return content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`\n]+`/g, '')
}

function resolveRelativeRoute(fromFile, target) {
  const relFile = path.relative(docsRoot, fromFile)
  const fromDir = path.dirname(relFile)
  const joined = path
    .normalize(path.join('/', fromDir, target))
    .replaceAll(path.sep, '/')
  const withoutExt = joined.replace(/\.mdx$/, '')
  const withoutIndex = withoutExt === '/index' ? '' : withoutExt.replace(/\/index$/, '')
  return '/docs' + withoutIndex
}

const linkIssues = []
for (const file of mdxFiles) {
  const source = stripCode(fs.readFileSync(file, 'utf8'))
  const matches = [
    ...source.matchAll(/\]\(([^)]+)\)/g),
    ...source.matchAll(/href="([^"]+)"/g),
  ]

  for (const match of matches) {
    const raw = match[1].trim()
    if (
      raw === '' ||
      raw.startsWith('http://') ||
      raw.startsWith('https://') ||
      raw.startsWith('mailto:') ||
      raw.startsWith('#')
    ) {
      continue
    }

    const target = raw.split('#')[0]
    let route = null
    if (target.startsWith('/docs')) {
      route = target.replace(/\/$/, '') || '/docs'
    } else if (target.startsWith('./') || target.startsWith('../')) {
      route = resolveRelativeRoute(file, target)
    } else if (target.startsWith('/')) {
      continue
    }

    if (route !== null && !validRoutes.has(route)) {
      linkIssues.push(
        `${path.relative(repoRoot, file)} -> ${raw} (resolved ${route})`,
      )
    }
  }
}

const metaIssues = []
const docsDirs = fs
  .readdirSync(docsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(docsRoot, entry.name))

for (const dir of docsDirs) {
  const metaPath = path.join(dir, 'meta.json')
  if (!fs.existsSync(metaPath)) {
    metaIssues.push(`${path.relative(repoRoot, dir)} is missing meta.json`)
  }
}

for (const metaFile of metaFiles) {
  const dir = path.dirname(metaFile)
  const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'))
  const entries = (meta.pages ?? []).filter((page) => page !== '---')
  const siblings = fs.readdirSync(dir, { withFileTypes: true })
  const expected = new Set()

  for (const sibling of siblings) {
    if (sibling.name === 'meta.json') continue
    if (sibling.isFile() && sibling.name.endsWith('.mdx')) {
      expected.add(sibling.name.replace(/\.mdx$/, ''))
    }
    if (sibling.isDirectory()) expected.add(sibling.name)
  }

  for (const entry of entries) {
    if (!expected.has(entry)) {
      metaIssues.push(
        `${path.relative(repoRoot, metaFile)} references missing page "${entry}"`,
      )
    }
  }

  for (const slug of [...expected].sort()) {
    if (!entries.includes(slug)) {
      metaIssues.push(
        `${path.relative(repoRoot, metaFile)} is missing page "${slug}"`,
      )
    }
  }
}

if (linkIssues.length === 0 && metaIssues.length === 0) {
  console.log('docs integrity check passed')
  process.exit(0)
}

if (linkIssues.length > 0) {
  console.error('Broken internal docs links:')
  for (const issue of linkIssues) console.error(`- ${issue}`)
}

if (metaIssues.length > 0) {
  console.error('Docs metadata integrity issues:')
  for (const issue of metaIssues) console.error(`- ${issue}`)
}

process.exit(1)
