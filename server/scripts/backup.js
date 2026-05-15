// Daily SQLite backup. Run via Coolify Scheduled Task: `node scripts/backup.js`
// Copies the single DB file into /data/backups (inside the persistent volume,
// so on the host it's e.g. /opt/shoaa-erp-data/backups/ — trivial to copy off).
// Keeps the most recent KEEP files; deletes older ones.
import { copyFileSync, mkdirSync, existsSync, readdirSync, unlinkSync, statSync } from 'fs'
import { dirname, join, isAbsolute, resolve } from 'path'
import { fileURLToPath } from 'url'

const KEEP = parseInt(process.env.BACKUP_KEEP, 10) || 14

const url = process.env.DATABASE_URL || 'file:/data/invoicing.sqlite'
const raw = url.replace(/^file:/, '')
// Prisma resolves relative file: URLs relative to the schema dir (../prisma)
const schemaDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'prisma')
const dbPath = isAbsolute(raw) ? raw : resolve(schemaDir, raw)
if (!existsSync(dbPath)) {
  console.error(`[backup] DB not found at ${dbPath}`)
  process.exit(1)
}

const backupsDir = join(dirname(dbPath), 'backups')
mkdirSync(backupsDir, { recursive: true })

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const dest = join(backupsDir, `invoicing-${stamp}.sqlite`)
copyFileSync(dbPath, dest)
console.log(`[backup] created ${dest}`)

// Prune: keep newest KEEP
const files = readdirSync(backupsDir)
  .filter((f) => f.startsWith('invoicing-') && f.endsWith('.sqlite'))
  .map((f) => ({ f, t: statSync(join(backupsDir, f)).mtimeMs }))
  .sort((a, b) => b.t - a.t)

for (const { f } of files.slice(KEEP)) {
  unlinkSync(join(backupsDir, f))
  console.log(`[backup] pruned old ${f}`)
}
