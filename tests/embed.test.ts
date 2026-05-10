// tests/embed.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { embed, embedBatch, cosineSimilarity } from '@/lib/graph/embed'

const hasRealKey = Boolean(
  process.env.OPENROUTER_API_KEY && !process.env.OPENROUTER_API_KEY.startsWith('dummy')
)

describe('embed', () => {
  beforeAll(() => {
    if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY required')
  })

  it.skipIf(!hasRealKey)('returns 1536-dim vector', async () => {
    const v = await embed('hello world')
    expect(v.length).toBe(1536)
  }, 30_000)

  it.skipIf(!hasRealKey)('returns array of vectors for batch', async () => {
    const vs = await embedBatch(['hello', 'world'])
    expect(vs.length).toBe(2)
    expect(vs[0].length).toBe(1536)
  }, 30_000)

  it.skipIf(!hasRealKey)('cosine similarity of identical text is ~1.0', async () => {
    const [a, b] = await embedBatch(['the cat sat', 'the cat sat'])
    expect(cosineSimilarity(a, b)).toBeGreaterThan(0.99)
  }, 30_000)

  it.skipIf(!hasRealKey)('cosine similarity of unrelated text is < 0.5', async () => {
    const [a, b] = await embedBatch(['differential calculus chain rule', 'recipe for chocolate cake'])
    expect(cosineSimilarity(a, b)).toBeLessThan(0.5)
  }, 30_000)
})
