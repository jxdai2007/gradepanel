// tests/components/regrade.test.tsx
// Smoke tests for the regrade page component (jsdom environment).
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock next/navigation to provide useSearchParams in jsdom (no Suspense needed in test)
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: () => null,
  }),
}))

// Mock next/link to avoid router context requirement
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    React.createElement('a', { href, className }, children),
}))

import RegradePage from '@/app/regrade/page'

describe('RegradePage', () => {
  it('renders page shell without crashing', () => {
    render(<RegradePage />)
    // "Regrade Request" appears in breadcrumb nav
    const matches = screen.getAllByText(/Regrade Request/i)
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it('shows no-submission-id message when submissionId is absent', () => {
    render(<RegradePage />)
    expect(screen.getByText(/No submission ID provided/i)).toBeTruthy()
  })
})
