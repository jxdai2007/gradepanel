// app/api/deduction/route.ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { getDb } from '@/lib/graph/db'
import { embed } from '@/lib/graph/embed'
import { insertDeduction } from '@/lib/graph/store'
import { validateQuote } from '@/lib/grounding/validate'

const Body = z.object({
  action: z.enum(['accept_add', 'accept_once', 'reject', 'edit']),
  submissionId: z.string().min(1),
  rubricItemId: z.string().min(1),
  pointsDeducted: z.number(),
  reason: z.string().min(1),
  locationLineStart: z.number().optional(),
  locationLineEnd: z.number().optional(),
  locationQuote: z.string().optional(),
  conceptIds: z.array(z.string()).optional(),
})

export async function POST(req: Request) {
  let body: z.infer<typeof Body>
  try {
    body = Body.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  // Quote validation applies to all actions that provide a quote
  if (body.locationQuote) {
    const db = getDb()
    const sub = db
      .prepare('SELECT content FROM submissions WHERE id = ?')
      .get(body.submissionId) as { content: string } | undefined
    if (!sub) {
      return NextResponse.json({ error: 'submission_not_found' }, { status: 404 })
    }
    const validation = validateQuote(sub.content, body.locationQuote)
    if (!validation.valid) {
      return NextResponse.json({ error: 'quote_validation_failed' }, { status: 400 })
    }
  }

  // accept_once and reject — return without persisting
  if (body.action === 'reject' || body.action === 'accept_once') {
    return NextResponse.json({ ok: true, action: body.action })
  }

  // accept_add or edit — embed + persist into graph
  const db = getDb()
  const sub = db
    .prepare('SELECT content FROM submissions WHERE id = ?')
    .get(body.submissionId) as { content: string } | undefined
  if (!sub) {
    return NextResponse.json({ error: 'submission_not_found' }, { status: 404 })
  }

  const text = `${body.reason} ${body.locationQuote ?? ''}`
  const embedding = await embed(text)

  const id = randomUUID()
  insertDeduction(
    {
      id,
      submission_id: body.submissionId,
      rubric_item_id: body.rubricItemId,
      points_deducted: body.pointsDeducted,
      reason: body.reason,
      location_line_start: body.locationLineStart,
      location_line_end: body.locationLineEnd,
      location_quote: body.locationQuote,
      source: 'ta_override',
    },
    embedding,
    body.conceptIds ?? []
  )

  return NextResponse.json({ ok: true, id }, { status: 201 })
}
