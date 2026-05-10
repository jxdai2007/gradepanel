// lib/graph/store.ts
import { randomUUID } from 'crypto'
import { getDb } from '@/lib/graph/db'

export interface DeductionRow {
  id?: string
  submission_id: string
  rubric_item_id: string
  ta_id?: string
  points_deducted: number
  reason: string
  comment?: string
  location_line_start?: number
  location_line_end?: number
  location_quote?: string
  source: 'panel' | 'precedent_validated' | 'ta_override' | 'bootstrap'
  grounding_confidence?: number
}

export function insertDeduction(
  d: DeductionRow,
  embedding: Float32Array,
  conceptIds: string[] = []
): string {
  const id = d.id ?? randomUUID()
  const db = getDb()
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO deductions (id, submission_id, rubric_item_id, ta_id, points_deducted, reason, comment, location_line_start, location_line_end, location_quote, source, grounding_confidence)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      d.submission_id,
      d.rubric_item_id,
      d.ta_id ?? null,
      d.points_deducted,
      d.reason,
      d.comment ?? null,
      d.location_line_start ?? null,
      d.location_line_end ?? null,
      d.location_quote ?? null,
      d.source,
      d.grounding_confidence ?? null
    )
    db.prepare(
      `INSERT INTO deduction_embeddings (deduction_id, embedding) VALUES (?, ?)`
    ).run(id, Buffer.from(embedding.buffer))
    for (const cid of conceptIds) {
      db.prepare(
        `INSERT OR IGNORE INTO deduction_concepts (deduction_id, concept_id) VALUES (?, ?)`
      ).run(id, cid)
    }
  })
  tx()
  return id
}
