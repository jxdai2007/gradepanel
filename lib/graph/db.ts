// lib/graph/db.ts
import Database, { Database as DBType } from 'better-sqlite3'
import * as sqliteVec from 'sqlite-vec'
import fs from 'fs'
import path from 'path'

let db: DBType | null = null
let backend: 'sqlite-vec' | 'fts5-fallback' = 'fts5-fallback'

export function getDb(): DBType {
  if (db) return db
  const dbPath = process.env.NODE_ENV === 'test'
    ? ':memory:'
    : process.env.GRADEPANEL_DB_PATH || path.resolve(process.cwd(), 'data', 'graph.db')
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  }
  db = new Database(dbPath)
  db.pragma('foreign_keys = ON')
  db.pragma('journal_mode = WAL')

  // Try to load sqlite-vec
  try {
    sqliteVec.load(db)
    backend = 'sqlite-vec'
  } catch {
    backend = 'fts5-fallback'
  }
  ;(global as { __GRAPH_BACKEND__?: string }).__GRAPH_BACKEND__ = backend

  // Apply schema
  const schemaPath = path.resolve(process.cwd(), 'lib', 'graph', 'schema.sql')
  const schema = fs.readFileSync(schemaPath, 'utf-8')
  db.exec(schema)
  return db
}

export function resetDb(): void {
  if (db) db.close()
  db = null
  ;(global as { __GRAPH_BACKEND__?: string }).__GRAPH_BACKEND__ = undefined
}
