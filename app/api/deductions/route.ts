// app/api/deductions/route.ts
// GET /api/deductions?submissionId=<id>
// Returns all deductions stored in the graph for a given submission.
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/graph/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const submissionId = searchParams.get('submissionId')

  if (!submissionId) {
    return NextResponse.json({ error: 'submissionId required' }, { status: 400 })
  }

  const db = getDb()

  // Verify submission exists
  const sub = db.prepare('SELECT id FROM submissions WHERE id = ?').get(submissionId)
  if (!sub) {
    return NextResponse.json({ error: 'submission_not_found' }, { status: 404 })
  }

  const rows = db
    .prepare(
      `SELECT id, rubric_item_id, points_deducted, reason,
              location_line_start, location_line_end, location_quote
       FROM deductions
       WHERE submission_id = ?
       ORDER BY location_line_start ASC, id ASC`
    )
    .all(submissionId) as Array<{
    id: string
    rubric_item_id: string
    points_deducted: number
    reason: string
    location_line_start: number | null
    location_line_end: number | null
    location_quote: string | null
  }>

  const deductions = rows.map((r) => ({
    id: r.id,
    rubric_item_id: r.rubric_item_id,
    points_deducted: r.points_deducted,
    reason: r.reason,
    location_line_start: r.location_line_start,
    location_line_end: r.location_line_end,
    location_quote: r.location_quote,
  }))

  return NextResponse.json({ deductions })
}
