// lib/grading/pipeline.ts
import { z } from 'zod'
import { getDb } from '@/lib/graph/db'
import { runPanel } from '@/lib/panel'
import { GRADING_SYSTEM, buildGradingPrompt } from '@/lib/panel/prompts'
import { embed } from '@/lib/graph/embed'
import { retrievePrecedent, type RetrievedDeduction } from '@/lib/graph/retrieve'
import { validateQuote } from '@/lib/grounding/validate'

// ── Schemas ───────────────────────────────────────────────────────────────────

const Deduction = z.object({
  rubric_item_id: z.string(),
  points_deducted: z.number(),
  location: z.object({
    line_start: z.number(),
    line_end: z.number(),
    quote: z.string(),
  }),
  reason: z.string(),
})

const GradingResult = z.object({ deductions: z.array(Deduction) })

export type GradedDeduction = z.infer<typeof Deduction>
export type GradingResult = z.infer<typeof GradingResult>

export interface GradeOptions {
  submissionId: string
  submission: string
  assignmentId: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function lineNumber(text: string): string {
  return text
    .split('\n')
    .map((line, i) => `${String(i + 1).padStart(3)}: ${line}`)
    .join('\n')
}

function summarizePrecedent(matches: RetrievedDeduction[]): string {
  if (matches.length === 0) return '(none)'
  return matches
    .map((m) => `- [Tier ${m.tier}] ${m.reason} (−${m.points_deducted}pt)${m.location_quote ? `: "${m.location_quote}"` : ''}`)
    .join('\n')
}

// ── Pipeline ──────────────────────────────────────────────────────────────────

export async function gradeSubmission(opts: GradeOptions): Promise<{ deductions: GradedDeduction[] }> {
  const db = getDb()

  // Query rubric items for this assignment
  const rubricItems = db.prepare(
    `SELECT id, description, max_points FROM rubric_items WHERE assignment_id = ?`
  ).all(opts.assignmentId) as Array<{ id: string; description: string; max_points: number }>

  if (rubricItems.length === 0) {
    return { deductions: [] }
  }

  // Query concepts for each rubric item (via rubric_concepts join)
  const conceptsByItem: Record<string, string[]> = {}
  for (const item of rubricItems) {
    const rows = db.prepare(
      `SELECT concept_id FROM rubric_concepts WHERE rubric_item_id = ?`
    ).all(item.id) as Array<{ concept_id: string }>
    conceptsByItem[item.id] = rows.map((r) => r.concept_id)
  }

  // Embed the submission text once
  const submissionEmbedding = await embed(opts.submission)

  // Build precedent block per rubric item
  const precedentLines: string[] = []
  for (const item of rubricItems) {
    const tiered = retrievePrecedent({
      rubricItemId: item.id,
      embedding: submissionEmbedding,
      conceptIds: conceptsByItem[item.id] ?? [],
    })
    const relevant = [...tiered.tier1, ...tiered.tier2].slice(0, 3)
    if (relevant.length > 0) {
      precedentLines.push(`Rubric item "${item.id}" precedents:\n${summarizePrecedent(relevant)}`)
    }
  }
  const precedent = precedentLines.length > 0 ? precedentLines.join('\n\n') : '(no prior deductions)'

  // Build line-numbered submission
  const submissionLineNumbered = lineNumber(opts.submission)

  // Run panel
  const result = await runPanel({
    messages: [
      { role: 'system', content: GRADING_SYSTEM },
      {
        role: 'user',
        content: buildGradingPrompt({
          submissionLineNumbered,
          rubric: rubricItems,
          precedent,
        }),
      },
    ],
    schema: GradingResult,
  })

  if (!result.consensus) {
    // No majority agreement
    return { deductions: [] }
  }

  // Validate every quote — only keep deductions with grounded quotes
  const validated = result.consensus.deductions.filter(
    (d) => validateQuote(opts.submission, d.location.quote).valid
  )

  return { deductions: validated }
}
