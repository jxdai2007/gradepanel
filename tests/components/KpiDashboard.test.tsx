import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { KpiDashboard } from '@/app/components/KpiDashboard'

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ interGrader: [], crossTest: [] }),
  } as unknown as Response)
})

describe('KpiDashboard', () => {
  it('renders KPI labels', () => {
    render(<KpiDashboard courseId="c1" assignmentId="mt1" />)
    expect(screen.getByText(/time\/sub/i)).toBeTruthy()
    expect(screen.getByText(/σ\(TAs\)/i)).toBeTruthy()
    expect(screen.getByText(/σ\(concept\)/i)).toBeTruthy()
    expect(screen.getByText(/calls saved/i)).toBeTruthy()
  })

  it('renders graded count when provided', () => {
    render(
      <KpiDashboard
        courseId="c1"
        assignmentId="mt1"
        gradedCount={5}
        totalCount={20}
      />
    )
    expect(screen.getByText(/5 \/ 20/i)).toBeTruthy()
  })

  it('calls /api/stats on mount', () => {
    render(<KpiDashboard courseId="c1" assignmentId="mt1" />)
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/api/stats')
    )
  })
})
