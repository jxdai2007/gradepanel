// tests/pdf-extract.test.ts
// Live test for PDF → PNG conversion and vision extraction.
// Requires OPENROUTER_API_KEY to run the LLM portion.
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { pdfToPagePngs } from '@/lib/extract/pdf'
import { extractFromPdfPages } from '@/lib/extract/bootstrap'

const FIXTURE_PDF = path.resolve(__dirname, '../fixtures/sample-math31.pdf')
const hasPdf = fs.existsSync(FIXTURE_PDF)

describe('PDF extraction pipeline', () => {
  it.skipIf(!hasPdf)('pdfToPagePngs converts PDF pages to PNG data URLs', async () => {
    const buf = fs.readFileSync(FIXTURE_PDF)
    const bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
    const pages = await pdfToPagePngs(bytes, { maxPages: 3, scale: 1.5 })

    expect(pages.length).toBeGreaterThan(0)
    expect(pages.length).toBeLessThanOrEqual(3)

    for (const page of pages) {
      expect(page.dataUrl).toMatch(/^data:image\/png;base64,/)
      expect(page.width).toBeGreaterThan(0)
      expect(page.height).toBeGreaterThan(0)
      expect(page.pageNumber).toBeGreaterThan(0)
    }
  }, 30_000)

  it.skipIf(!hasPdf || !process.env.OPENROUTER_API_KEY?.startsWith('sk-or-'))(
    'extractFromPdfPages returns student_answer and deductions via vision LLM',
    async () => {
      const buf = fs.readFileSync(FIXTURE_PDF)
      const bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
      // Only use 2 pages to keep cost low
      const pages = await pdfToPagePngs(bytes, { maxPages: 2, scale: 1.5 })
      expect(pages.length).toBeGreaterThan(0)

      const result = await extractFromPdfPages(pages)

      expect(result).toHaveProperty('student_answer')
      expect(typeof result.student_answer).toBe('string')
      expect(result.student_answer.length).toBeGreaterThan(0)

      expect(result).toHaveProperty('deductions')
      expect(Array.isArray(result.deductions)).toBe(true)

      // Structural check on any deductions returned
      for (const d of result.deductions) {
        expect(d).toHaveProperty('rubric_text')
        expect(d).toHaveProperty('points')
        expect(d).toHaveProperty('page')
        expect(d).toHaveProperty('quote')
        expect(d).toHaveProperty('reason')
      }
    },
    120_000
  )
})
