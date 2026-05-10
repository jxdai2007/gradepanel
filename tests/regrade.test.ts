// tests/regrade.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { ferpaFilter } from '@/lib/security/regradeFilter'
import { resetDb, getDb } from '@/lib/graph/db'
import { POST } from '@/app/api/regrade/route'

describe('ferpaFilter', () => {
  it('passes through quoted text from the original submission', () => {
    const original = 'Student wrote: f(x) = sin(2x)'
    const response = 'Your answer "f(x) = sin(2x)" was incorrect because...'
    expect(ferpaFilter({ response, originalSubmission: original })).toContain('f(x) = sin(2x)')
  })

  it('redacts foreign quoted content', () => {
    const original = 'Student wrote: f(x) = sin(2x)'
    const response = "Compare to Joe's answer: \"Joe wrote a different solution here\""
    const filtered = ferpaFilter({ response, originalSubmission: original })
    expect(filtered).toContain('[redacted: cross-student content]')
  })

  it('does not redact short quoted content (< 10 chars)', () => {
    const original = 'Short'
    const response = 'The answer "x=5" was wrong'
    // "x=5" is only 3 chars, should not be redacted
    const filtered = ferpaFilter({ response, originalSubmission: original })
    expect(filtered).toBe(response)
  })

  it('handles curly/typographic quotes', () => {
    const original = 'Student answer here'
    const response = 'As per “some other student wrote this text”'
    const filtered = ferpaFilter({ response, originalSubmission: original })
    expect(filtered).toContain('[redacted: cross-student content]')
  })
})

describe('POST /api/regrade', () => {
  beforeEach(() => {
    resetDb()
    const db = getDb()
    db.prepare("INSERT INTO courses (id, name) VALUES ('c1','Math')").run()
    db.prepare("INSERT INTO assignments (id, course_id, name, type) VALUES ('mt1','c1','MT1','midterm')").run()
    db.prepare("INSERT INTO rubric_items (id, assignment_id, description, max_points) VALUES ('r1','mt1','Chain rule', 3)").run()
    db.prepare("INSERT INTO submissions (id, assignment_id, content) VALUES ('s1','mt1','student submission content here')").run()
    db.prepare(
      "INSERT INTO deductions (id, submission_id, rubric_item_id, points_deducted, reason, source) VALUES ('d1','s1','r1',2,'missed chain rule','panel')"
    ).run()
    // Insert a fake embedding for the deduction (1536 floats = text-embedding-3-small dimensions)
    const fakeEmbedding = Buffer.alloc(1536 * 4) // 1536 floats of zeros
    db.prepare("INSERT INTO deduction_embeddings (deduction_id, embedding) VALUES ('d1', ?)").run(fakeEmbedding)
  })

  it('400 on missing deductionId', async () => {
    const req = new Request('http://localhost/api/regrade', {
      method: 'POST',
      body: JSON.stringify({ studentArgument: 'I think I deserve more points' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('400 on missing studentArgument', async () => {
    const req = new Request('http://localhost/api/regrade', {
      method: 'POST',
      body: JSON.stringify({ deductionId: 'd1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('404 on unknown deductionId', async () => {
    const req = new Request('http://localhost/api/regrade', {
      method: 'POST',
      body: JSON.stringify({ deductionId: 'nonexistent', studentArgument: 'I think I deserve more points because my work was correct' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(404)
  })

  it.skipIf(!process.env.OPENROUTER_API_KEY)(
    'returns filtered response for valid deduction',
    async () => {
      const req = new Request('http://localhost/api/regrade', {
        method: 'POST',
        body: JSON.stringify({
          deductionId: 'd1',
          studentArgument: 'I applied the chain rule correctly in my work and should not be deducted.',
        }),
      })
      const res = await POST(req)
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toHaveProperty('response')
      expect(json).toHaveProperty('precedent')
    },
    90_000
  )
})
