// tests/graph.test.ts
// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { getDb, resetDb } from '@/lib/graph/db'
import { insertDeduction } from '@/lib/graph/store'
import { retrievePrecedent } from '@/lib/graph/retrieve'

describe('graph db', () => {
  beforeEach(() => {
    resetDb() // memory db for tests
  })

  it('initializes schema with all tables', () => {
    const db = getDb()
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all()
      .map((r) => (r as { name: string }).name)
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
    const row = db.prepare('SELECT * FROM courses WHERE id = ?').get('c1') as { name: string }
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
    getDb()
    expect(['sqlite-vec', 'fts5-fallback']).toContain((global as { __GRAPH_BACKEND__?: string }).__GRAPH_BACKEND__ || 'fts5-fallback')
  })
})

describe('retrieval', () => {
  beforeEach(() => {
    resetDb()
    const db = getDb()
    db.prepare("INSERT INTO courses (id, name) VALUES ('c1', 'Math 131A')").run()
    db.prepare("INSERT INTO assignments (id, course_id, name, type) VALUES ('mt1', 'c1', 'Midterm 1', 'midterm')").run()
    db.prepare("INSERT INTO submissions (id, assignment_id, content) VALUES ('s1', 'mt1', 'submission text')").run()
    db.prepare("INSERT INTO rubric_items (id, assignment_id, description, max_points) VALUES ('r1', 'mt1', 'Chain rule application', 2)").run()
    db.prepare("INSERT INTO rubric_items (id, assignment_id, description, max_points) VALUES ('r2', 'mt1', 'Product rule application', 2)").run()
    db.prepare("INSERT INTO concepts (id, course_id, name) VALUES ('cn-chain', 'c1', 'chain rule')").run()
    db.prepare("INSERT INTO rubric_concepts (rubric_item_id, concept_id) VALUES ('r1', 'cn-chain')").run()
    db.prepare("INSERT INTO rubric_concepts (rubric_item_id, concept_id) VALUES ('r2', 'cn-chain')").run()
  })

  it('returns empty tiers when graph is empty', () => {
    const emb = new Float32Array(1536).fill(0.1)
    const result = retrievePrecedent({ rubricItemId: 'r1', embedding: emb, conceptIds: ['cn-chain'] })
    expect(result.tier1.length).toBe(0)
    expect(result.tier2.length).toBe(0)
    expect(result.tier3.length).toBe(0)
  })

  it('Tier 1 returns same-rubric-item deductions', () => {
    const emb = new Float32Array(1536).fill(0.1)
    insertDeduction(
      { submission_id: 's1', rubric_item_id: 'r1', points_deducted: 1, reason: 'missed chain rule', source: 'bootstrap' },
      emb,
      ['cn-chain']
    )
    const result = retrievePrecedent({ rubricItemId: 'r1', embedding: emb, conceptIds: ['cn-chain'] })
    expect(result.tier1.length).toBe(1)
    expect(result.tier1[0].rubric_item_id).toBe('r1')
    expect(result.tier1[0].tier).toBe(1)
  })

  it('Tier 2 returns cross-rubric-item via shared concept', () => {
    const emb = new Float32Array(1536).fill(0.1)
    // Insert deduction under r2 with concept cn-chain
    insertDeduction(
      { submission_id: 's1', rubric_item_id: 'r2', points_deducted: 1, reason: 'chain rule on product', source: 'bootstrap' },
      emb,
      ['cn-chain']
    )
    // Retrieve for r1 — r2's deduction shares concept but different rubric item → tier2
    const result = retrievePrecedent({ rubricItemId: 'r1', embedding: emb, conceptIds: ['cn-chain'] })
    expect(result.tier1.length).toBe(0)
    expect(result.tier2.length).toBe(1)
    expect(result.tier2[0].rubric_item_id).toBe('r2')
    expect(result.tier2[0].tier).toBe(2)
  })

  it('Tier 3 is semantic catch-all excluding tier1/tier2', () => {
    const emb1 = new Float32Array(1536).fill(0.1)
    const emb2 = new Float32Array(1536).fill(0.9)
    // Insert one deduction with no concepts (won't match tier2 for r1 via concept)
    // Use r2 but with no shared concept so it lands in tier3
    const db = getDb()
    db.prepare("INSERT INTO concepts (id, course_id, name) VALUES ('cn-product', 'c1', 'product rule')").run()
    db.prepare("INSERT INTO rubric_concepts (rubric_item_id, concept_id) VALUES ('r2', 'cn-product')").run()
    insertDeduction(
      { submission_id: 's1', rubric_item_id: 'r2', points_deducted: 1, reason: 'product rule error', source: 'bootstrap' },
      emb2,
      ['cn-product']
    )
    // Retrieve for r1 with concept cn-chain only — r2's deduction has cn-product, not cn-chain
    const result = retrievePrecedent({ rubricItemId: 'r1', embedding: emb1, conceptIds: ['cn-chain'] })
    expect(result.tier1.length).toBe(0)
    expect(result.tier2.length).toBe(0)
    expect(result.tier3.length).toBe(1)
    expect(result.tier3[0].tier).toBe(3)
  })
})
