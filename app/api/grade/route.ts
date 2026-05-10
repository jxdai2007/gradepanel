// app/api/grade/route.ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { gradeSubmission } from '@/lib/grading/pipeline'
import { SUBMISSION_MAX_CHARS } from '@/lib/security/inputCaps'

const Body = z.object({
  submissionId: z.string().min(1),
  submission: z.string().min(1).max(SUBMISSION_MAX_CHARS),
  assignmentId: z.string().min(1),
})

export async function POST(req: Request) {
  let body: z.infer<typeof Body>
  try {
    body = Body.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  try {
    const result = await gradeSubmission({
      submissionId: body.submissionId,
      submission: body.submission,
      assignmentId: body.assignmentId,
    })
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Grading failed', details: message }, { status: 500 })
  }
}
