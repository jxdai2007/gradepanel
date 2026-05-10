// lib/stats/consistency.ts
import { getDb } from '@/lib/graph/db'

export function inter_grader_sigma_per_rubric(
  assignmentId: string
): Array<{ rubric_item_id: string; sigma: number; n: number }> {
  const db = getDb()
  const rows = db
    .prepare(
      `SELECT rubric_item_id,
              SUM((points_deducted - avg_pts) * (points_deducted - avg_pts)) / COUNT(*) as variance,
              COUNT(*) as n
       FROM deductions d
       JOIN (SELECT rubric_item_id, AVG(points_deducted) as avg_pts
             FROM deductions
             WHERE rubric_item_id IN (SELECT id FROM rubric_items WHERE assignment_id = ?)
             GROUP BY rubric_item_id) m USING (rubric_item_id)
       WHERE rubric_item_id IN (SELECT id FROM rubric_items WHERE assignment_id = ?)
       GROUP BY rubric_item_id`
    )
    .all(assignmentId, assignmentId) as Array<{
    rubric_item_id: string
    variance: number
    n: number
  }>
  return rows.map((r) => ({
    rubric_item_id: r.rubric_item_id,
    sigma: Math.sqrt(r.variance || 0),
    n: r.n,
  }))
}
