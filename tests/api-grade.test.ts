// tests/api-grade.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { resetDb, getDb } from '@/lib/graph/db'
import { POST } from '@/app/api/grade/route'

describe('POST /api/grade', () => {
  beforeEach(() => {
    resetDb()
    const db = getDb()
    db.prepare("INSERT INTO courses (id, name) VALUES ('c1','Math')").run()
    db.prepare("INSERT INTO assignments (id, course_id, name, type) VALUES ('mt1','c1','MT1','midterm')").run()
    db.prepare("INSERT INTO rubric_items (id, assignment_id, description, max_points) VALUES ('r1','mt1','Chain rule', 3)").run()
    db.prepare("INSERT INTO submissions (id, assignment_id, content) VALUES ('s1','mt1','dummy content here')").run()
  })

  it('400 on missing fields', async () => {
    const req = new Request('http://localhost/api/grade', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('400 on missing submissionId', async () => {
    const req = new Request('http://localhost/api/grade', {
      method: 'POST',
      body: JSON.stringify({ submission: 'x'.repeat(30), assignmentId: 'mt1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('400 on submission too large', async () => {
    const req = new Request('http://localhost/api/grade', {
      method: 'POST',
      body: JSON.stringify({
        submissionId: 's1',
        submission: 'x'.repeat(50_001),
        assignmentId: 'mt1',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it.skipIf(!process.env.OPENROUTER_API_KEY?.startsWith('sk-or-'))(
    'returns deductions for valid input',
    async () => {
      const submission = `1: f'(x) = cos(2x²) · 2`
      const req = new Request('http://localhost/api/grade', {
        method: 'POST',
        body: JSON.stringify({ submissionId: 's1', submission, assignmentId: 'mt1' }),
      })
      const res = await POST(req)
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toHaveProperty('deductions')
    },
    90_000
  )
})
