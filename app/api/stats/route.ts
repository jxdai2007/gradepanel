// app/api/stats/route.ts
import { NextResponse } from 'next/server'
import { inter_grader_sigma_per_rubric } from '@/lib/stats/consistency'
import { cross_assignment_sigma_per_concept } from '@/lib/stats/crosstest'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const courseId = url.searchParams.get('courseId') ?? 'c1'
  const assignmentId = url.searchParams.get('assignmentId') ?? 'mt1'

  const interGrader = inter_grader_sigma_per_rubric(assignmentId)
  const crossTest = cross_assignment_sigma_per_concept(courseId)

  return NextResponse.json({ interGrader, crossTest })
}
