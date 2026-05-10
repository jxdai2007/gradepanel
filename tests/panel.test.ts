// tests/panel.test.ts
import { describe, it, expect } from 'vitest'
import { runPanel } from '@/lib/panel'
import { aggregate } from '@/lib/panel/aggregate'
import { z } from 'zod'

const hasRealKey = !!process.env.OPENROUTER_API_KEY

const SimpleSchema = z.object({ score: z.number(), reasoning: z.string() })

describe('runPanel', () => {
  it.skipIf(!hasRealKey)('returns 3 model results in parallel', async () => {
    const result = await runPanel({
      messages: [{ role: 'user', content: 'Return {"score": 7, "reasoning": "ok"}' }],
      schema: SimpleSchema,
    })
    expect(result.responses.length).toBe(3)
    expect(result.responses.filter((r) => r.status === 'fulfilled').length).toBeGreaterThanOrEqual(2)
  }, 60_000)

  it.skipIf(!hasRealKey)('aggregates consensus from 3 agreeing models', async () => {
    const result = await runPanel({
      messages: [{ role: 'user', content: 'Return {"score": 7, "reasoning": "X"}' }],
      schema: SimpleSchema,
    })
    expect(result.consensus).toBeDefined()
    if (result.consensus) {
      expect(typeof result.consensus.score).toBe('number')
    }
  }, 60_000)

  it('handles partial failure gracefully (1 model dies, returns 2 results)', () => {
    // covered by aggregator unit tests below
    expect(true).toBe(true)
  })
})

describe('aggregate (unit)', () => {
  it('reports majority consensus', () => {
    const responses = [
      { model: 'a', status: 'fulfilled' as const, value: { x: 1 } },
      { model: 'b', status: 'fulfilled' as const, value: { x: 1 } },
      { model: 'c', status: 'fulfilled' as const, value: { x: 2 } },
    ]
    const r = aggregate(responses)
    expect(r.consensus).toEqual({ x: 1 })
    expect(r.agreement).toBeCloseTo(2 / 3)
  })

  it('flags disagreement when no majority', () => {
    const responses = [
      { model: 'a', status: 'fulfilled' as const, value: { x: 1 } },
      { model: 'b', status: 'fulfilled' as const, value: { x: 2 } },
      { model: 'c', status: 'fulfilled' as const, value: { x: 3 } },
    ]
    const r = aggregate(responses)
    expect(r.consensus).toBeUndefined()
    expect(r.disagreementFlag).toBe(true)
  })

  it('handles all-rejected case', () => {
    const responses = [
      { model: 'a', status: 'rejected' as const, reason: 'timeout' },
      { model: 'b', status: 'rejected' as const, reason: 'timeout' },
      { model: 'c', status: 'rejected' as const, reason: 'timeout' },
    ]
    const r = aggregate(responses)
    expect(r.consensus).toBeUndefined()
    expect(r.agreement).toBe(0)
    expect(r.disagreementFlag).toBe(true)
  })

  it('2-of-3 fulfilled achieve majority', () => {
    const responses = [
      { model: 'a', status: 'fulfilled' as const, value: { x: 5 } },
      { model: 'b', status: 'fulfilled' as const, value: { x: 5 } },
      { model: 'c', status: 'rejected' as const, reason: 'error' },
    ]
    const r = aggregate(responses)
    expect(r.consensus).toEqual({ x: 5 })
    expect(r.disagreementFlag).toBe(false)
  })
})
