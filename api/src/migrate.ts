// Database migration script
import { readFileSync } from 'fs'
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
    // Read migration file
    const migrationPath = join(__dirname, '../migrations/001_initial_schema.sql')
    const sql = readFileSync(migrationPath, 'utf-8')

    // Execute migration
    await pool.query(sql)

    console.log('Migration completed successfully!')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

migrate()
