// lib/extract/bootstrap.ts
import { z } from 'zod'
import { callLLM } from '@/lib/llm/caller'
import { MODELS } from '@/lib/llm/models'
import {
  EXTRACTION_SYSTEM,
  buildExtractionPrompt,
  RUBRIC_INFERENCE_SYSTEM,
  buildRubricInferencePrompt,
  CONCEPT_EXTRACTION_SYSTEM,
  buildConceptPrompt,
} from '@/lib/panel/prompts'
import { validateQuote } from '@/lib/grounding/validate'

// ── Schemas ──────────────────────────────────────────────────────────────────

const ExtractedDeductionSchema = z.object({
  rubric_text: z.string(),
  points: z.number(),
  line_start: z.number(),
  line_end: z.number(),
  quote: z.string(),
  reason: z.string(),
})

const ExtractedSubmissionSchema = z.object({
  student_answer: z.string(),
  deductions: z.array(ExtractedDeductionSchema),
})

export type ExtractedDeduction = z.infer<typeof ExtractedDeductionSchema>
export type ExtractedSubmission = z.infer<typeof ExtractedSubmissionSchema>

const InferredRubricSchema = z.object({
  rubric_items: z.array(
    z.object({
      id: z.string(),
      description: z.string(),
      max_points: z.number(),
      matches: z.array(z.number()),
    })
  ),
})

export type InferredRubric = z.infer<typeof InferredRubricSchema>

const ConceptsSchema = z.object({
  concepts: z.array(z.string()).max(3),
})

// ── Extraction ────────────────────────────────────────────────────────────────

export async function extractFromSubmission(text: string): Promise<ExtractedSubmission> {
  const result = await callLLM({
    model: MODELS.CLAUDE,
    messages: [
      { role: 'system', content: EXTRACTION_SYSTEM },
      { role: 'user', content: buildExtractionPrompt(text) },
    ],
    schema: ExtractedSubmissionSchema,
  })
  // Filter out hallucinated quotes
  const validated = result.deductions.filter((d) => validateQuote(text, d.quote).valid)
  return { ...result, deductions: validated }
}

export async function inferRubric(
  allDeductions: Array<{ rubric_text: string; reason: string }>
): Promise<InferredRubric> {
  return callLLM({
    model: MODELS.CLAUDE,
    messages: [
      { role: 'system', content: RUBRIC_INFERENCE_SYSTEM },
      { role: 'user', content: buildRubricInferencePrompt(allDeductions) },
    ],
    schema: InferredRubricSchema,
  })
}

export async function extractConcepts(rubricDescription: string): Promise<string[]> {
  const result = await callLLM({
    model: MODELS.CLAUDE,
    messages: [
      { role: 'system', content: CONCEPT_EXTRACTION_SYSTEM },
      { role: 'user', content: buildConceptPrompt(rubricDescription) },
    ],
    schema: ConceptsSchema,
  })
  return result.concepts.slice(0, 3)
}

// ── Bootstrap pipeline ────────────────────────────────────────────────────────

export interface BootstrapResult {
  perSubmission: Array<{ original: string; extracted: ExtractedSubmission }>
  rubric: InferredRubric
  conceptsByItem: Record<string, string[]>
}

export async function runBootstrap(submissions: string[]): Promise<BootstrapResult> {
  // Step 1: extract per-submission in parallel
  const perSubmission = await Promise.all(
    submissions.map(async (text) => ({ original: text, extracted: await extractFromSubmission(text) }))
  )
  // Step 2: collect all deductions, infer rubric
  const allDeductions = perSubmission.flatMap((s) =>
    s.extracted.deductions.map((d) => ({ rubric_text: d.rubric_text, reason: d.reason }))
  )
  const rubric = await inferRubric(allDeductions)
  // Step 3: concepts per rubric item, parallel
  const conceptResults = await Promise.all(
    rubric.rubric_items.map(async (item) => [item.id, await extractConcepts(item.description)] as const)
  )
  const conceptsByItem = Object.fromEntries(conceptResults)
  return { perSubmission, rubric, conceptsByItem }
}
