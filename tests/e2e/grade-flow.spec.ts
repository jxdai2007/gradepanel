// tests/e2e/grade-flow.spec.ts
// Happy-path E2E: drop a graded submission, see extraction progress, reach approval gate.
// Uses live API (OPENROUTER_API_KEY must be set in .env.local).
import { test, expect } from '@playwright/test'
import path from 'path'

test('drag-drop graded submission triggers extraction pipeline', async ({ page }) => {
  await page.goto('/')

  // The DragDropZone renders a hidden file input
  const fileInput = page.locator('input[type="file"]')

  // Upload the sample fixture
  await fileInput.setInputFiles(
    path.join(__dirname, '..', '..', 'fixtures', 'sample-graded.txt')
  )

  // Within 5s the DragDropZone should show "Extracting..." text
  await expect(page.locator('text=Extracting')).toBeVisible({ timeout: 5000 })

  // Within 90s the approval gate should appear (shows "submissions parsed")
  await expect(page.locator('text=submissions parsed')).toBeVisible({ timeout: 90_000 })
})
