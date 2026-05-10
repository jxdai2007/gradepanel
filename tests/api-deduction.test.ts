// tests/api-deduction.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { resetDb, getDb } from '@/lib/graph/db'
import { POST } from '@/app/api/deduction/route'

describe('POST /api/deduction', () => {
  beforeEach(() => {
    resetDb()
    const db = getDb()
    db.prepare("INSERT INTO courses (id, name) VALUES ('c1','Math')").run()
    db.prepare("INSERT INTO assignments (id, course_id, name, type) VALUES ('mt1','c1','MT1','midterm')").run()
    db.prepare("INSERT INTO rubric_items (id, assignment_id, description, max_points) VALUES ('r1','mt1','Chain rule', 3)").run()
    db.prepare("INSERT INTO submissions (id, assignment_id, content) VALUES ('s1','mt1','student wrote the answer here on this line')").run()
  })

  it('400 on empty body', async () => {
    const req = new Request('http://localhost/api/deduction', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('400 on missing required fields', async () => {
    const req = new Request('http://localhost/api/deduction', {
      method: 'POST',
      body: JSON.stringify({ action: 'accept_add' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('400 on invalid action', async () => {
    const req = new Request('http://localhost/api/deduction', {
      method: 'POST',
      body: JSON.stringify({
        action: 'invalid_action',
        submissionId: 's1',
        rubricItemId: 'r1',
        pointsDeducted: 2,
        reason: 'missed chain rule',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns ok=true for reject action (no persistence)', async () => {
    const req = new Request('http://localhost/api/deduction', {
      method: 'POST',
      body: JSON.stringify({
        action: 'reject',
        submissionId: 's1',
        rubricItemId: 'r1',
        pointsDeducted: 2,
        reason: 'missed chain rule',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.action).toBe('reject')
    // verify nothing was written to DB
    const db = getDb()
    const count = (db.prepare('SELECT COUNT(*) as c FROM deductions').get() as { c: number }).c
    expect(count).toBe(0)
  })

  it('returns ok=true for accept_once action (no persistence)', async () => {
    const req = new Request('http://localhost/api/deduction', {
      method: 'POST',
      body: JSON.stringify({
        action: 'accept_once',
        submissionId: 's1',
        rubricItemId: 'r1',
        pointsDeducted: 2,
        reason: 'missed chain rule',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.action).toBe('accept_once')
  })

  it('400 on quote not found in submission', async () => {
    const req = new Request('http://localhost/api/deduction', {
      method: 'POST',
      body: JSON.stringify({
        action: 'accept_once',
        submissionId: 's1',
        rubricItemId: 'r1',
        pointsDeducted: 2,
        reason: 'missed chain rule',
        locationQuote: 'this text does not appear in the submission at all',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('quote_validation_failed')
  })

  it.skipIf(!process.env.OPENROUTER_API_KEY)(
    'persists deduction for accept_add action',
    async () => {
      const req = new Request('http://localhost/api/deduction', {
        method: 'POST',
        body: JSON.stringify({
          action: 'accept_add',
          submissionId: 's1',
          rubricItemId: 'r1',
          pointsDeducted: 2,
          reason: 'missed chain rule',
          locationQuote: 'student wrote the answer here',
        }),
      })
      const res = await POST(req)
      expect(res.status).toBe(201)
      const json = await res.json()
      expect(json).toHaveProperty('id')
      // verify it was written to DB
      const db = getDb()
      const count = (db.prepare('SELECT COUNT(*) as c FROM deductions').get() as { c: number }).c
      expect(count).toBe(1)
    },
    30_000
  )
})
