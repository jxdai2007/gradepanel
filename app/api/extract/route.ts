// app/api/extract/route.ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { runBootstrap, extractFromSubmission, extractFromPdfPages, inferRubric, extractConcepts } from '@/lib/extract/bootstrap'
import { pdfToPagePngs } from '@/lib/extract/pdf'
import {
  SUBMISSION_MIN_CHARS,
  SUBMISSION_MAX_CHARS,
  SUBMISSIONS_MIN_COUNT,
  SUBMISSIONS_MAX_COUNT,
} from '@/lib/security/inputCaps'

// Allow up to 5 PDF files (vision is slow; >5 risks timeout at hackathon scale)
const PDF_MAX_COUNT = 5
// Base64 PDF cap: ~10MB raw ≈ 13.3MB base64 per file
const PDF_MAX_BASE64_CHARS = 14_000_000

// Increase function timeout for vision extraction (Vercel Pro: up to 300s)
export const maxDuration = 300

// ── Input schemas ─────────────────────────────────────────────────────────────

const FileItem = z.object({
  name: z.string(),
  type: z.enum(['text', 'pdf']),
  content: z.string(), // text content if type=text, base64 PDF if type=pdf
})

// New shape: { files: [...] }
const NewBody = z.object({
  files: z.array(FileItem).min(1).max(PDF_MAX_COUNT + SUBMISSIONS_MAX_COUNT),
})

// Legacy shape: { submissions: [...] } — preserved for existing tests
const LegacyBody = z.object({
  submissions: z
    .array(z.string().min(SUBMISSION_MIN_CHARS).max(SUBMISSION_MAX_CHARS))
    .min(SUBMISSIONS_MIN_COUNT)
    .max(SUBMISSIONS_MAX_COUNT),
})

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Detect legacy vs new shape
  const isLegacy =
    rawBody != null && typeof rawBody === 'object' && 'submissions' in (rawBody as object)

  if (isLegacy) {
    // Legacy path: { submissions: string[] } — run existing pipeline unchanged
    const parsed = LegacyBody.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    try {
      const result = await runBootstrap(parsed.data.submissions)
      return NextResponse.json(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return NextResponse.json({ error: 'Extraction failed', details: message }, { status: 500 })
    }
  }

  // New path: { files: FileItem[] }
  const parsed = NewBody.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.message }, { status: 400 })
  }

  const files = parsed.data.files

  // Validate per-file constraints
  for (const file of files) {
    if (file.type === 'text') {
      if (file.content.length < SUBMISSION_MIN_CHARS) {
        return NextResponse.json(
          { error: 'Invalid input', details: 'Text submission too short' },
          { status: 400 }
        )
      }
      if (file.content.length > SUBMISSION_MAX_CHARS) {
        return NextResponse.json(
          { error: 'Invalid input', details: 'Text submission too long' },
          { status: 400 }
        )
      }
    } else {
      if (file.content.length > PDF_MAX_BASE64_CHARS) {
        return NextResponse.json(
          { error: 'Invalid input', details: `PDF ${file.name} too large` },
          { status: 400 }
        )
      }
    }
  }

  const pdfFiles = files.filter((f) => f.type === 'pdf')
  if (pdfFiles.length > PDF_MAX_COUNT) {
    return NextResponse.json(
      { error: 'Invalid input', details: `Max ${PDF_MAX_COUNT} PDFs allowed` },
      { status: 400 }
    )
  }

  try {
    // Per-file extraction: vision for PDF, text-pipe for txt
    const perSubmission = await Promise.all(
      files.map(async (file) => {
        if (file.type === 'pdf') {
          const pdfBytes = Uint8Array.from(Buffer.from(file.content, 'base64'))
          const pages = await pdfToPagePngs(pdfBytes, { maxPages: 15, scale: 2.0 })
          const extracted = await extractFromPdfPages(pages)
          // Soft quote validation for handwritten content: keep deductions with non-empty quote
          const validated = extracted.deductions.filter((d) => d.quote.length > 3)
          return {
            filename: file.name,
            original: extracted.student_answer,
            extracted: { ...extracted, deductions: validated },
          }
        } else {
          const extracted = await extractFromSubmission(file.content)
          return {
            filename: file.name,
            original: file.content,
            extracted,
          }
        }
      })
    )

    // Aggregate deductions for rubric inference
    const allDeductions = perSubmission.flatMap((s) =>
      s.extracted.deductions.map((d) => ({
        rubric_text: d.rubric_text,
        reason: d.reason,
      }))
    )

    const rubric = await inferRubric(allDeductions)

    const conceptResults = await Promise.all(
      rubric.rubric_items.map(
        async (item) => [item.id, await extractConcepts(item.description)] as const
      )
    )
    const conceptsByItem = Object.fromEntries(conceptResults)

    return NextResponse.json({ perSubmission, rubric, conceptsByItem })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'extraction_failed', details: message }, { status: 500 })
  }
}
