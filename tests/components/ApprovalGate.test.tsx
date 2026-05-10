import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ApprovalGate } from '@/app/components/ApprovalGate'

const sampleItems = [
  { id: 'R1', description: 'Proof completeness', max_points: 5, matches: [0, 1, 2, 3] },
  { id: 'R2', description: 'Correct notation', max_points: 3, matches: [0] },
]

const sampleConceptsByItem = {
  R1: ['limits', 'completeness'],
  R2: ['notation'],
}

describe('ApprovalGate', () => {
  it('renders submission count header', () => {
    render(
      <ApprovalGate
        submissionCount={12}
        rubricItems={sampleItems}
        conceptsByItem={sampleConceptsByItem}
        totalConcepts={3}
        onConfirm={vi.fn()}
        onDiscard={vi.fn()}
      />
    )
    expect(screen.getByText(/12 submissions parsed/i)).toBeTruthy()
  })

  it('renders rubric items in table', () => {
    render(
      <ApprovalGate
        submissionCount={5}
        rubricItems={sampleItems}
        conceptsByItem={sampleConceptsByItem}
        totalConcepts={3}
        onConfirm={vi.fn()}
        onDiscard={vi.fn()}
      />
    )
    expect(screen.getByText('Proof completeness')).toBeTruthy()
    expect(screen.getByText('Correct notation')).toBeTruthy()
  })

  it('renders concept tags', () => {
    render(
      <ApprovalGate
        submissionCount={5}
        rubricItems={sampleItems}
        conceptsByItem={sampleConceptsByItem}
        totalConcepts={3}
        onConfirm={vi.fn()}
        onDiscard={vi.fn()}
      />
    )
    expect(screen.getByText('limits')).toBeTruthy()
  })

  it('renders confirm and discard buttons', () => {
    render(
      <ApprovalGate
        submissionCount={5}
        rubricItems={sampleItems}
        conceptsByItem={sampleConceptsByItem}
        totalConcepts={3}
        onConfirm={vi.fn()}
        onDiscard={vi.fn()}
      />
    )
    expect(screen.getByText(/confirm and build graph/i)).toBeTruthy()
    expect(screen.getByText(/discard and re-upload/i)).toBeTruthy()
  })
})
