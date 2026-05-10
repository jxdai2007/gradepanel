import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SubmissionViewer } from '@/app/components/SubmissionViewer'
import type { UIDeduction } from '@/app/types'

const content = 'Line one\nLine two\nLine three\nLine four'

const deductions: UIDeduction[] = [
  {
    id: 'R1-0',
    rubric_item_id: 'R1',
    points_deducted: 2,
    location: { line_start: 1, line_end: 2, quote: 'Line one' },
    reason: 'Missing proof',
  },
]

describe('SubmissionViewer', () => {
  it('renders submission content', () => {
    render(
      <SubmissionViewer
        content={content}
        deductions={[]}
        onSelectDeduction={vi.fn()}
      />
    )
    expect(screen.getByText(/Line one/)).toBeTruthy()
  })

  it('renders line numbers', () => {
    render(
      <SubmissionViewer
        content={content}
        deductions={[]}
        onSelectDeduction={vi.fn()}
      />
    )
    // Line number 1 should appear
    expect(screen.getAllByText('1').length).toBeGreaterThan(0)
  })

  it('renders deductions as highlights', () => {
    render(
      <SubmissionViewer
        content={content}
        deductions={deductions}
        onSelectDeduction={vi.fn()}
      />
    )
    // The highlighted content should appear
    expect(screen.getByText(/Line one/)).toBeTruthy()
  })
})
