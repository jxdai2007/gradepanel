// tests/extract.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { extractFromSubmission, extractConcepts, inferRubric } from '@/lib/extract/bootstrap'

const hasRealKey = !!process.env.OPENROUTER_API_KEY

const SAMPLE_GRADED = `Student: Jane Doe
Q1: Find the derivative of f(x) = sin(2x²)

Student work:
Line 1: f(x) = sin(2x²)
Line 2: f'(x) = cos(2x²) · 2
Line 3: Final answer: 2cos(2x²)

TA Grading:
- Q1, line 2: -1, "missed chain rule depth — should be cos(2x²) · 4x"
- Q1, line 3: -1, "carries forward the error from line 2"
Total: 8/10`

describe('bootstrap extraction', () => {
  beforeAll(() => {
    if (!hasRealKey) return
  })

  it.skipIf(!hasRealKey)('extracts deductions from a graded submission', async () => {
    const result = await extractFromSubmission(SAMPLE_GRADED)
    expect(result.deductions.length).toBeGreaterThanOrEqual(1)
    expect(result.deductions[0]).toHaveProperty('rubric_text')
    expect(result.deductions[0]).toHaveProperty('points')
    expect(result.deductions[0]).toHaveProperty('quote')
  }, 60_000)

  it.skipIf(!hasRealKey)('extracted quotes appear in original submission', async () => {
    const result = await extractFromSubmission(SAMPLE_GRADED)
    for (const d of result.deductions) {
      expect(SAMPLE_GRADED.includes(d.quote) || d.quote.length === 0).toBe(true)
    }
  }, 60_000)

  it.skipIf(!hasRealKey)('infers concepts as specific terms (not generic)', async () => {
    const concepts = await extractConcepts('Apply the chain rule correctly when differentiating composite functions')
    expect(Array.isArray(concepts)).toBe(true)
    expect(concepts.length).toBeGreaterThanOrEqual(1)
    expect(concepts.length).toBeLessThanOrEqual(3)
    // expect at least one to mention "chain rule" or "composite" or "derivative"
    expect(
      concepts.some((c) => /chain|composite|derivative/i.test(c))
    ).toBe(true)
  }, 60_000)

  it.skipIf(!hasRealKey)('inferRubric clusters deductions into rubric items', async () => {
    const deductions = [
      { rubric_text: 'chain rule', reason: 'missed chain rule' },
      { rubric_text: 'chain rule application', reason: 'incorrect derivative of outer function' },
    ]
    const rubric = await inferRubric(deductions)
    expect(rubric.rubric_items.length).toBeGreaterThanOrEqual(1)
    expect(rubric.rubric_items[0]).toHaveProperty('id')
    expect(rubric.rubric_items[0]).toHaveProperty('description')
    expect(rubric.rubric_items[0]).toHaveProperty('max_points')
  }, 60_000)
})
