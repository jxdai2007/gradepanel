// tests/stats.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { resetDb, getDb } from '@/lib/graph/db'
import { inter_grader_sigma_per_rubric } from '@/lib/stats/consistency'
import { cross_assignment_sigma_per_concept } from '@/lib/stats/crosstest'
import { GET } from '@/app/api/stats/route'

describe('inter_grader_sigma_per_rubric', () => {
  beforeEach(() => {
    resetDb()
  })

  it('returns empty array for assignment with no deductions', () => {
    const db = getDb()
    db.prepare("INSERT INTO courses (id, name) VALUES ('c1','Math')").run()
    db.prepare("INSERT INTO assignments (id, course_id, name, type) VALUES ('mt1','c1','MT1','midterm')").run()
    db.prepare("INSERT INTO rubric_items (id, assignment_id, description, max_points) VALUES ('r1','mt1','Chain rule', 3)").run()
    const result = inter_grader_sigma_per_rubric('mt1')
    expect(result).toEqual([])
  })

  it('returns sigma=0 when all deductions are equal', () => {
    const db = getDb()
    db.prepare("INSERT INTO courses (id, name) VALUES ('c1','Math')").run()
    db.prepare("INSERT INTO assignments (id, course_id, name, type) VALUES ('mt1','c1','MT1','midterm')").run()
    db.prepare("INSERT INTO rubric_items (id, assignment_id, description, max_points) VALUES ('r1','mt1','Chain rule', 3)").run()
    db.prepare("INSERT INTO submissions (id, assignment_id, content) VALUES ('s1','mt1','text1')").run()
    db.prepare("INSERT INTO submissions (id, assignment_id, content) VALUES ('s2','mt1','text2')").run()
    db.prepare("INSERT INTO deductions (id, submission_id, rubric_item_id, points_deducted, reason, source) VALUES ('d1','s1','r1',2,'err','panel')").run()
    db.prepare("INSERT INTO deductions (id, submission_id, rubric_item_id, points_deducted, reason, source) VALUES ('d2','s2','r1',2,'err','panel')").run()
    const result = inter_grader_sigma_per_rubric('mt1')
    expect(result).toHaveLength(1)
    expect(result[0].sigma).toBeCloseTo(0)
    expect(result[0].n).toBe(2)
  })

  it('returns nonzero sigma when deductions differ', () => {
    const db = getDb()
    db.prepare("INSERT INTO courses (id, name) VALUES ('c1','Math')").run()
    db.prepare("INSERT INTO assignments (id, course_id, name, type) VALUES ('mt1','c1','MT1','midterm')").run()
    db.prepare("INSERT INTO rubric_items (id, assignment_id, description, max_points) VALUES ('r1','mt1','Chain rule', 3)").run()
    db.prepare("INSERT INTO submissions (id, assignment_id, content) VALUES ('s1','mt1','text1')").run()
    db.prepare("INSERT INTO submissions (id, assignment_id, content) VALUES ('s2','mt1','text2')").run()
    db.prepare("INSERT INTO deductions (id, submission_id, rubric_item_id, points_deducted, reason, source) VALUES ('d1','s1','r1',1,'err','panel')").run()
    db.prepare("INSERT INTO deductions (id, submission_id, rubric_item_id, points_deducted, reason, source) VALUES ('d2','s2','r1',3,'err','panel')").run()
    const result = inter_grader_sigma_per_rubric('mt1')
    expect(result).toHaveLength(1)
    expect(result[0].sigma).toBeGreaterThan(0)
  })
})

describe('cross_assignment_sigma_per_concept', () => {
  beforeEach(() => {
    resetDb()
  })

  it('returns empty array for course with no concepts', () => {
    const db = getDb()
    db.prepare("INSERT INTO courses (id, name) VALUES ('c1','Math')").run()
    const result = cross_assignment_sigma_per_concept('c1')
    expect(result).toEqual([])
  })

  it('returns concepts with perAssignment sigma', () => {
    const db = getDb()
    db.prepare("INSERT INTO courses (id, name) VALUES ('c1','Math')").run()
    db.prepare("INSERT INTO assignments (id, course_id, name, type) VALUES ('mt1','c1','MT1','midterm')").run()
    db.prepare("INSERT INTO rubric_items (id, assignment_id, description, max_points) VALUES ('r1','mt1','Chain rule', 3)").run()
    db.prepare("INSERT INTO submissions (id, assignment_id, content) VALUES ('s1','mt1','text1')").run()
    db.prepare("INSERT INTO concepts (id, course_id, name) VALUES ('cn1','c1','Derivatives')").run()
    db.prepare("INSERT INTO deductions (id, submission_id, rubric_item_id, points_deducted, reason, source) VALUES ('d1','s1','r1',2,'err','panel')").run()
    db.prepare("INSERT INTO deduction_concepts (deduction_id, concept_id) VALUES ('d1','cn1')").run()
    const result = cross_assignment_sigma_per_concept('c1')
    expect(result).toHaveLength(1)
    expect(result[0].concept_id).toBe('cn1')
    expect(result[0].perAssignment).toHaveLength(1)
  })
})

describe('GET /api/stats', () => {
  beforeEach(() => {
    resetDb()
    const db = getDb()
    db.prepare("INSERT INTO courses (id, name) VALUES ('c1','Math')").run()
    db.prepare("INSERT INTO assignments (id, course_id, name, type) VALUES ('mt1','c1','MT1','midterm')").run()
  })

  it('returns interGrader and crossTest', async () => {
    const req = new Request('http://localhost/api/stats?courseId=c1&assignmentId=mt1')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('interGrader')
    expect(json).toHaveProperty('crossTest')
    expect(Array.isArray(json.interGrader)).toBe(true)
    expect(Array.isArray(json.crossTest)).toBe(true)
  })

  it('uses default courseId and assignmentId when not provided', async () => {
    const req = new Request('http://localhost/api/stats')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('interGrader')
    expect(json).toHaveProperty('crossTest')
  })
})
