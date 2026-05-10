'use client'
import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

export interface DragDropZoneProps {
  onFiles: (files: File[]) => void
  state: 'idle' | 'extracting' | 'done'
}

export function DragDropZone({ onFiles, state }: DragDropZoneProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (state === 'idle' && accepted.length > 0) {
        onFiles(accepted)
      }
    },
    [onFiles, state]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/plain': ['.txt'] },
    multiple: true,
    disabled: state !== 'idle',
  })

  const borderColor = isDragActive
    ? 'border-accent'
    : 'border-tertiary'

  const bgColor = isDragActive ? 'bg-accent-subtle' : 'bg-surface-raised'

  return (
    <div
      {...getRootProps()}
      className={[
        'rounded-lg border-2 border-dashed px-8 py-12 text-center cursor-pointer',
        'transition-[border-color,background-color] duration-[120ms] ease-out',
        state === 'idle' ? `${borderColor} ${bgColor}` : 'border-border bg-surface cursor-default',
      ].join(' ')}
    >
      <input {...getInputProps()} />
      {state === 'idle' && (
        <>
          <p className="text-[15px] font-medium text-primary">
            Drop graded submissions here
          </p>
          <p className="mt-1 text-[13px] text-secondary">
            .txt files — one submission per file
          </p>
        </>
      )}
      {state === 'extracting' && (
        <p className="text-[13px] text-secondary font-mono">Extracting...</p>
      )}
      {state === 'done' && (
        <p className="text-[13px] text-success">
          Bootstrap complete. Confirm rubric below.
        </p>
      )}
    </div>
  )
}
