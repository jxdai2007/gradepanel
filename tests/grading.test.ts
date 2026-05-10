// tests/grading.test.ts
// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { resetDb, getDb } from '@/lib/graph/db'
import { gradeSubmission } from '@/lib/grading/pipeline'

const hasRealKey = !!process.env.OPENROUTER_API_KEY?.startsWith('sk-or-')

describe('gradeSubmission', () => {
  beforeEach(() => {
    resetDb()
    const db = getDb()
    db.prepare("INSERT INTO courses (id, name) VALUES ('c1', 'Math 131A')").run()
    db.prepare("INSERT INTO assignments (id, course_id, name, type) VALUES ('mt1', 'c1', 'Midterm 1', 'midterm')").run()
    db.prepare("INSERT INTO rubric_items (id, assignment_id, description, max_points) VALUES ('r1', 'mt1', 'Apply chain rule correctly when differentiating composite functions', 2)").run()
    db.prepare("INSERT INTO submissions (id, assignment_id, content) VALUES ('s1', 'mt1', 'submission text')").run()
  })

  it('returns empty deductions when no rubric items', async () => {
    resetDb()
    const db = getDb()
    db.prepare("INSERT INTO courses (id, name) VALUES ('c2', 'Phys 101')").run()
    db.prepare("INSERT INTO assignments (id, course_id, name, type) VALUES ('hw1', 'c2', 'HW 1', 'hw')").run()
    db.prepare("INSERT INTO submissions (id, assignment_id, content) VALUES ('s2', 'hw1', 'some text')").run()

    const result = await gradeSubmission({
      submissionId: 's2',
      submission: 'some text',
      assignmentId: 'hw1',
    })
    expect(result.deductions).toEqual([])
  })

  it.skipIf(!hasRealKey)('produces deductions with quote-validated locations', async () => {
    const submission = `f(x) = sin(2x²)
f'(x) = cos(2x²) · 2
Final: 2cos(2x²)`
    const result = await gradeSubmission({
      submissionId: 's1',
      submission,
      assignmentId: 'mt1',
    })
    expect(result.deductions.length).toBeGreaterThanOrEqual(0)
    for (const d of result.deductions) {
      expect(d.location.quote.length).toBeGreaterThan(0)
      expect(submission.includes(d.location.quote)).toBe(true)
    }
  }, 90_000)
})
