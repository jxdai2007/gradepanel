// lib/graph/retrieve.ts
import { getDb } from '@/lib/graph/db'
import { cosineSimilarity } from '@/lib/graph/embed'

export interface RetrievedDeduction {
  deduction_id: string
  rubric_item_id: string
  points_deducted: number
  reason: string
  location_quote?: string
  similarity: number
  tier: 1 | 2 | 3
}

export interface TieredRetrieval {
  tier1: RetrievedDeduction[] // same rubric item
  tier2: RetrievedDeduction[] // same concept(s), different rubric item
  tier3: RetrievedDeduction[] // semantic catch-all
}

function readEmbedding(buf: Buffer): Float32Array {
  return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / Float32Array.BYTES_PER_ELEMENT)
}

export function retrievePrecedent(args: {
  rubricItemId: string
  embedding: Float32Array
  conceptIds: string[]
  topK?: number
}): TieredRetrieval {
  const db = getDb()
  const k = args.topK ?? 5

  // Tier 1: same rubric_item_id
  const t1Rows = db.prepare(`
    SELECT d.id as deduction_id, d.rubric_item_id, d.points_deducted, d.reason, d.location_quote, e.embedding
    FROM deductions d
    JOIN deduction_embeddings e ON e.deduction_id = d.id
    WHERE d.rubric_item_id = ?
  `).all(args.rubricItemId) as Array<{
    deduction_id: string
    rubric_item_id: string
    points_deducted: number
    reason: string
    location_quote: string | null
    embedding: Buffer
  }>

  const t1: RetrievedDeduction[] = t1Rows
    .map((r) => ({
      deduction_id: r.deduction_id,
      rubric_item_id: r.rubric_item_id,
      points_deducted: r.points_deducted,
      reason: r.reason,
      location_quote: r.location_quote ?? undefined,
      similarity: cosineSimilarity(args.embedding, readEmbedding(r.embedding)),
      tier: 1 as const,
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k)

  // Tier 2: same concept(s), different rubric_item_id
  let t2: RetrievedDeduction[] = []
  if (args.conceptIds.length > 0) {
    const placeholders = args.conceptIds.map(() => '?').join(', ')
    const t2Rows = db.prepare(`
      SELECT DISTINCT d.id as deduction_id, d.rubric_item_id, d.points_deducted, d.reason, d.location_quote, e.embedding
      FROM deductions d
      JOIN deduction_embeddings e ON e.deduction_id = d.id
      JOIN deduction_concepts dc ON dc.deduction_id = d.id
      WHERE dc.concept_id IN (${placeholders})
        AND d.rubric_item_id != ?
    `).all(...args.conceptIds, args.rubricItemId) as Array<{
      deduction_id: string
      rubric_item_id: string
      points_deducted: number
      reason: string
      location_quote: string | null
      embedding: Buffer
    }>

    t2 = t2Rows
      .map((r) => ({
        deduction_id: r.deduction_id,
        rubric_item_id: r.rubric_item_id,
        points_deducted: r.points_deducted,
        reason: r.reason,
        location_quote: r.location_quote ?? undefined,
        similarity: cosineSimilarity(args.embedding, readEmbedding(r.embedding)),
        tier: 2 as const,
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, k)
  }

  // Tier 3: semantic catch-all — all deductions not already in t1/t2
  const allRows = db.prepare(`
    SELECT d.id as deduction_id, d.rubric_item_id, d.points_deducted, d.reason, d.location_quote, e.embedding
    FROM deductions d
    JOIN deduction_embeddings e ON e.deduction_id = d.id
  `).all() as Array<{
    deduction_id: string
    rubric_item_id: string
    points_deducted: number
    reason: string
    location_quote: string | null
    embedding: Buffer
  }>

  const t1Ids = new Set(t1.map((r) => r.deduction_id))
  const t2Ids = new Set(t2.map((r) => r.deduction_id))

  const t3: RetrievedDeduction[] = allRows
    .filter((r) => !t1Ids.has(r.deduction_id) && !t2Ids.has(r.deduction_id))
    .map((r) => ({
      deduction_id: r.deduction_id,
      rubric_item_id: r.rubric_item_id,
      points_deducted: r.points_deducted,
      reason: r.reason,
      location_quote: r.location_quote ?? undefined,
      similarity: cosineSimilarity(args.embedding, readEmbedding(r.embedding)),
      tier: 3 as const,
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3)

  return { tier1: t1, tier2: t2, tier3: t3 }
}
