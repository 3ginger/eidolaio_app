// Database migration script
import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import pool from './services/db.js'
import 'dotenv/config'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function migrate() {
  console.log('Running database migrations...')

  if (!pool) {
    console.error('Database not configured. Set POSTGRES_URL environment variable.')
    process.exit(1)
  }

  try {
    // Create migrations tracking table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS eidola.migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT NOW()
      )
    `)

    // Get list of migration files
    const migrationsDir = join(__dirname, '../migrations')
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort()

    // Get already applied migrations
    const applied = await pool.query('SELECT filename FROM eidola.migrations')
    const appliedSet = new Set(applied.rows.map(r => r.filename))

    // Run pending migrations
    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`Skipping ${file} (already applied)`)
        continue
      }

      console.log(`Applying ${file}...`)
      const sql = readFileSync(join(migrationsDir, file), 'utf-8')
      await pool.query(sql)
      await pool.query('INSERT INTO eidola.migrations (filename) VALUES ($1)', [file])
      console.log(`Applied ${file}`)
    }

    console.log('Migration completed successfully!')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

migrate()
