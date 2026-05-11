// lib/extract/pdf.ts
// Convert a PDF Buffer/Uint8Array to an array of PNG data URLs (one per page).
// Uses pdfjs-dist (legacy ESM build) + @napi-rs/canvas for server-side rasterization.
// Works in Node.js (Next.js API routes); NOT intended for browser use.

import { createCanvas } from '@napi-rs/canvas'
import { fileURLToPath } from 'url'
import path from 'path'

export interface PdfPagePng {
  pageNumber: number
  dataUrl: string // data:image/png;base64,...
  width: number
  height: number
}

export async function pdfToPagePngs(
  pdfBytes: Uint8Array,
  opts?: { maxPages?: number; scale?: number }
): Promise<PdfPagePng[]> {
  const { getDocument, GlobalWorkerOptions } = await import(
    'pdfjs-dist/legacy/build/pdf.mjs'
  )

  // Point pdfjs at its bundled worker — required in Node (no browser worker thread)
  if (!GlobalWorkerOptions.workerSrc) {
    // Resolve relative to this module's location at runtime
    const workerUrl = path.resolve(
      process.cwd(),
      'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'
    )
    GlobalWorkerOptions.workerSrc = `file://${workerUrl}`
  }

  const loadingTask = getDocument({
    data: pdfBytes,
    useSystemFonts: true,
    verbosity: 0, // suppress console noise
  })
  const doc = await loadingTask.promise

  const maxPages = Math.min(doc.numPages, opts?.maxPages ?? 20)
  const scale = opts?.scale ?? 2.0

  const results: PdfPagePng[] = []
  for (let p = 1; p <= maxPages; p++) {
    const page = await doc.getPage(p)
    const viewport = page.getViewport({ scale })
    const width = Math.round(viewport.width)
    const height = Math.round(viewport.height)

    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')

    // pdfjs v5 render() requires canvas in addition to canvasContext
    const renderTask = page.render({
      canvas: canvas as unknown as HTMLCanvasElement,
      canvasContext: ctx as unknown as CanvasRenderingContext2D,
      viewport,
    })
    await renderTask.promise

    const dataUrl = canvas.toDataURL('image/png')
    results.push({ pageNumber: p, dataUrl, width, height })
  }

  await doc.destroy()
  return results
}
