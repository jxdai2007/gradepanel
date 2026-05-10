// app/api/regrade/route.ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getDb } from '@/lib/graph/db'
import { embed } from '@/lib/graph/embed'
import { retrievePrecedent } from '@/lib/graph/retrieve'
import { ferpaFilter } from '@/lib/security/regradeFilter'
import { callLLM } from '@/lib/llm/caller'
import { MODELS } from '@/lib/llm/models'
import { STUDENT_ARGUMENT_MAX_CHARS } from '@/lib/security/inputCaps'

const Body = z.object({
  deductionId: z.string().min(1),
  studentArgument: z.string().min(1).max(STUDENT_ARGUMENT_MAX_CHARS),
})

const ResponseSchema = z.object({ response: z.string() })

export async function POST(req: Request) {
  let body: z.infer<typeof Body>
  try {
    body = Body.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const db = getDb()

  // Look up deduction + submission content via join
  const ded = db
    .prepare(
      `SELECT d.id, d.rubric_item_id, d.points_deducted, d.reason, s.content as submission_content
       FROM deductions d
       JOIN submissions s ON s.id = d.submission_id
       WHERE d.id = ?`
    )
    .get(body.deductionId) as
    | {
        id: string
        rubric_item_id: string
        points_deducted: number
        reason: string
        submission_content: string
      }
    | undefined

  if (!ded) {
    return NextResponse.json({ error: 'deduction_not_found' }, { status: 404 })
  }

  // Get concept IDs for this deduction
  const conceptIds = (
    db
      .prepare(`SELECT concept_id FROM deduction_concepts WHERE deduction_id = ?`)
      .all(body.deductionId) as Array<{ concept_id: string }>
  ).map((r) => r.concept_id)

  // Embed the student argument
  const argEmbedding = await embed(body.studentArgument)

  // Retrieve precedent cases (aggregate only — no individual student content)
  const precedent = retrievePrecedent({
    rubricItemId: ded.rubric_item_id,
    embedding: argEmbedding,
    conceptIds,
  })

  const tier1Count = precedent.tier1.length
  const tier2Count = precedent.tier2.length
  const aggregateMessage = `Across ${tier1Count} prior cases on this rubric item and ${tier2Count} similar cases on related concepts, the typical deduction is ${ded.points_deducted} points for: ${ded.reason}.`

  const llmResp = await callLLM({
    model: MODELS.CLAUDE,
    messages: [
      {
        role: 'system',
        content:
          'You draft a fair, professional regrade response for a student. Be concise, specific, and kind. Return JSON with a single field "response" containing your message.',
      },
      {
        role: 'user',
        content: `Student argument: ${body.studentArgument}\n\nOriginal deduction reason: ${ded.reason} (−${ded.points_deducted} pts)\n\nPrecedent context: ${aggregateMessage}`,
      },
    ],
    schema: ResponseSchema,
  })

  const filtered = ferpaFilter({
    response: llmResp.response,
    originalSubmission: ded.submission_content,
  })

  return NextResponse.json({
    response: filtered,
    precedent: { tier1Count, tier2Count },
  })
}
