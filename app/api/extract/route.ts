// app/api/extract/route.ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { runBootstrap } from '@/lib/extract/bootstrap'
import {
  SUBMISSION_MIN_CHARS,
  SUBMISSION_MAX_CHARS,
  SUBMISSIONS_MIN_COUNT,
  SUBMISSIONS_MAX_COUNT,
} from '@/lib/security/inputCaps'

const Body = z.object({
  submissions: z
    .array(z.string().min(SUBMISSION_MIN_CHARS).max(SUBMISSION_MAX_CHARS))
    .min(SUBMISSIONS_MIN_COUNT)
    .max(SUBMISSIONS_MAX_COUNT),
})

export async function POST(req: Request) {
  let body: z.infer<typeof Body>
  try {
    body = Body.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  try {
    const result = await runBootstrap(body.submissions)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Extraction failed', details: message }, { status: 500 })
  }
}
