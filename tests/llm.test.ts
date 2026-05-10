import { describe, it, expect, beforeAll } from 'vitest'
import { z } from 'zod'
import { callLLM } from '@/lib/llm/caller'
import { MODELS } from '@/lib/llm/models'

const hasRealKey = !!process.env.OPENROUTER_API_KEY?.startsWith('sk-or-')

describe('callLLM', () => {
  beforeAll(() => {
    if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY required for tests')
  })

  it.skipIf(!hasRealKey)('returns a parsed object matching schema', async () => {
    const schema = z.object({ greeting: z.string() })
    const result = await callLLM({
      model: MODELS.CLAUDE,
      messages: [
        { role: 'system', content: 'You return JSON exactly matching the user-provided schema.' },
        { role: 'user', content: 'Return {"greeting": "hi"}' },
      ],
      schema,
    })
    expect(result.greeting).toBeTypeOf('string')
  }, 30_000)

  it.skipIf(!hasRealKey)('throws SchemaValidationError on persistently malformed response', async () => {
    const schema = z.object({ impossible_field: z.literal('xyz123abc') })
    await expect(
      callLLM({
        model: MODELS.CLAUDE,
        messages: [{ role: 'user', content: 'Say hello.' }],
        schema,
        maxRetries: 1,
      })
    ).rejects.toThrow(/schema/i)
  }, 30_000)
})
