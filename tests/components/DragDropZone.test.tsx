import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DragDropZone } from '@/app/components/DragDropZone'

describe('DragDropZone', () => {
  it('renders idle state', () => {
    render(<DragDropZone onFiles={vi.fn()} state="idle" />)
    expect(screen.getByText(/drop graded submissions/i)).toBeTruthy()
  })

  it('renders extracting state', () => {
    render(<DragDropZone onFiles={vi.fn()} state="extracting" />)
    expect(screen.getByText(/extracting/i)).toBeTruthy()
  })

  it('renders done state', () => {
    render(<DragDropZone onFiles={vi.fn()} state="done" />)
    expect(screen.getByText(/bootstrap complete/i)).toBeTruthy()
  })
})
