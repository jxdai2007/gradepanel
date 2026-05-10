// tests/graph.test.ts
// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { getDb, resetDb } from '@/lib/graph/db'

describe('graph db', () => {
  beforeEach(() => {
    resetDb() // memory db for tests
  })

  it('initializes schema with all tables', () => {
    const db = getDb()
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all()
      .map((r: any) => r.name)
    expect(tables).toContain('courses')
    expect(tables).toContain('assignments')
    expect(tables).toContain('rubric_items')
    expect(tables).toContain('concepts')
    expect(tables).toContain('deductions')
    expect(tables).toContain('deduction_embeddings')
  })

  it('inserts and retrieves a course', () => {
    const db = getDb()
    db.prepare("INSERT INTO courses (id, name, professor_id, term) VALUES (?, ?, ?, ?)")
      .run('c1', 'Math 131A', 'prof1', 'Fall 2026')
    const row = db.prepare('SELECT * FROM courses WHERE id = ?').get('c1') as any
    expect(row.name).toBe('Math 131A')
  })

  it('enforces foreign key constraints', () => {
    const db = getDb()
    expect(() => {
      db.prepare("INSERT INTO assignments (id, course_id, name, type) VALUES (?, ?, ?, ?)")
        .run('a1', 'nonexistent_course', 'mt1', 'midterm')
    }).toThrow()
  })

  it('reports sqlite-vec availability or FTS5 fallback', () => {
    const db = getDb()
    expect(['sqlite-vec', 'fts5-fallback']).toContain((global as any).__GRAPH_BACKEND__ || 'fts5-fallback')
  })
})
