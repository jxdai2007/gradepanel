// lib/grounding/validate.ts
export function normalizeWhitespace(s: string): string {
  return s.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim()
}

export interface QuoteValidationResult {
  valid: boolean
  confidence: number
  normalizedMatch?: string
}

export function validateQuote(submission: string, quote: string): QuoteValidationResult {
  if (!quote || quote.trim().length === 0) {
    return { valid: false, confidence: 0 }
  }
  const normalizedSub = normalizeWhitespace(submission)
  const normalizedQuote = normalizeWhitespace(quote)
  if (normalizedSub.includes(normalizedQuote)) {
    return {
      valid: true,
      confidence: 1.0,
      normalizedMatch: normalizedQuote,
    }
  }
  // Try fuzzy: collapse whitespace inside quote even more aggressively
  const aggressive = normalizedQuote.replace(/\s+/g, '')
  const aggressiveSub = normalizedSub.replace(/\s+/g, '')
  if (aggressiveSub.includes(aggressive) && aggressive.length > 0) {
    return {
      valid: true,
      confidence: 0.7,
      normalizedMatch: normalizedQuote,
    }
  }
  return { valid: false, confidence: 0 }
}
