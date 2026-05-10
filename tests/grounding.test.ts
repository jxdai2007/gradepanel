// tests/grounding.test.ts
import { describe, it, expect } from 'vitest'
import { validateQuote, normalizeWhitespace } from '@/lib/grounding/validate'

describe('validateQuote', () => {
  it('returns valid:true for exact substring match', () => {
    const submission = 'On line 1, the student wrote f(x) = sin(2x).\nOn line 2, the derivative is wrong.'
    const result = validateQuote(submission, 'f(x) = sin(2x)')
    expect(result.valid).toBe(true)
    expect(result.confidence).toBeGreaterThan(0.9)
  })

  it('tolerates whitespace differences', () => {
    const submission = 'f(x) = sin(2x)'
    const result = validateQuote(submission, 'f(x)  =  sin(2x)')
    expect(result.valid).toBe(true)
  })

  it('rejects hallucinated quote', () => {
    const submission = 'f(x) = sin(2x)'
    const result = validateQuote(submission, 'f(x) = cos(3x)')
    expect(result.valid).toBe(false)
  })

  it('rejects empty quote', () => {
    expect(validateQuote('anything', '').valid).toBe(false)
  })

  it('normalizes CRLF to LF', () => {
    expect(normalizeWhitespace('a\r\nb')).toBe('a\nb')
  })
})
