import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BootstrapProgress } from '@/app/components/BootstrapProgress'

describe('BootstrapProgress', () => {
  it('shows running step for extracting', () => {
    render(<BootstrapProgress currentStep="extracting" submissionCount={3} />)
    expect(screen.getByText(/extracting deductions/i)).toBeTruthy()
    expect(screen.getByText(/·· running/i)).toBeTruthy()
  })

  it('shows checkmarks for completed steps', () => {
    render(<BootstrapProgress currentStep="inferring_rubric" />)
    // reading + extracting should be done (✓)
    const checks = screen.getAllByText('✓')
    expect(checks.length).toBeGreaterThanOrEqual(2)
  })

  it('shows file count when provided', () => {
    render(<BootstrapProgress currentStep="extracting" submissionCount={7} />)
    expect(screen.getByText(/7 files/i)).toBeTruthy()
  })
})
