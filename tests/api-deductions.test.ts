// tests/api-deductions.test.ts
// Tests for GET /api/deductions endpoint (node environment).
// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { resetDb, getDb } from '@/lib/graph/db'
import { GET } from '@/app/api/deductions/route'

describe('GET /api/deductions', () => {
  beforeEach(() => {
    resetDb()
    const db = getDb()
    db.prepare("INSERT INTO courses (id, name) VALUES ('c1','Math')").run()
    db.prepare(
      "INSERT INTO assignments (id, course_id, name, type) VALUES ('mt1','c1','MT1','midterm')"
    ).run()
    db.prepare(
      "INSERT INTO submissions (id, assignment_id, content) VALUES ('s1','mt1','student work')"
    ).run()
    db.prepare(
      "INSERT INTO rubric_items (id, assignment_id, description, max_points) VALUES ('r1','mt1','Chain rule',2)"
    ).run()
  })

  it('400 when submissionId missing', async () => {
    const req = new Request('http://localhost/api/deductions')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('404 on unknown submission', async () => {
    const req = new Request('http://localhost/api/deductions?submissionId=ghost')
    const res = await GET(req)
    expect(res.status).toBe(404)
  })

  it('200 with empty deductions for submission with no graph entries', async () => {
    const req = new Request('http://localhost/api/deductions?submissionId=s1')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.deductions).toEqual([])
  })

  it('200 with deductions after inserting one', async () => {
    const db = getDb()
    db.prepare(
      `INSERT INTO deductions
         (id, submission_id, rubric_item_id, points_deducted, reason, source)
       VALUES ('d1','s1','r1',2,'Wrong inner derivative','ta_override')`
    ).run()

    const req = new Request('http://localhost/api/deductions?submissionId=s1')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.deductions).toHaveLength(1)
    expect(json.deductions[0].id).toBe('d1')
    expect(json.deductions[0].reason).toBe('Wrong inner derivative')
  })
})
