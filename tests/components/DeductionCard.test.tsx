import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DeductionCard } from '@/app/components/DeductionCard'
import type { UIDeduction } from '@/app/types'

const deduction: UIDeduction = {
  id: 'R1-0',
  rubric_item_id: 'R1',
  points_deducted: 2,
  location: { line_start: 3, line_end: 5, quote: 'missing chain rule step' },
  reason: 'Did not apply chain rule correctly',
}

describe('DeductionCard', () => {
  it('renders reason text', () => {
    render(
      <DeductionCard
        deduction={deduction}
        onAccept={vi.fn()}
        onEdit={vi.fn()}
        onReject={vi.fn()}
      />
    )
    expect(screen.getByText(/Did not apply chain rule correctly/i)).toBeTruthy()
  })

  it('renders points deducted', () => {
    render(
      <DeductionCard
        deduction={deduction}
        onAccept={vi.fn()}
        onEdit={vi.fn()}
        onReject={vi.fn()}
      />
    )
    expect(screen.getByText(/2 pts/i)).toBeTruthy()
  })

  it('renders quote', () => {
    render(
      <DeductionCard
        deduction={deduction}
        onAccept={vi.fn()}
        onEdit={vi.fn()}
        onReject={vi.fn()}
      />
    )
    expect(screen.getByText(/missing chain rule step/i)).toBeTruthy()
  })

  it('renders action buttons', () => {
    render(
      <DeductionCard
        deduction={deduction}
        onAccept={vi.fn()}
        onEdit={vi.fn()}
        onReject={vi.fn()}
      />
    )
    expect(screen.getByText(/Accept/i)).toBeTruthy()
    expect(screen.getByText(/Reject/i)).toBeTruthy()
    expect(screen.getByText(/Edit/i)).toBeTruthy()
  })

  it('renders model agreement when provided', () => {
    render(
      <DeductionCard
        deduction={deduction}
        modelAgreement={{ gpt: true, cld: true, gem: false }}
        onAccept={vi.fn()}
        onEdit={vi.fn()}
        onReject={vi.fn()}
      />
    )
    expect(screen.getByText(/gpt ✓/i)).toBeTruthy()
    expect(screen.getByText(/gem ✗/i)).toBeTruthy()
  })
})
