'use client'

export type BootstrapStep =
  | 'reading'
  | 'extracting'
  | 'inferring_rubric'
  | 'extracting_concepts'
  | 'done'

const STEPS: Array<{ key: BootstrapStep; label: string }> = [
  { key: 'reading', label: 'Reading files' },
  { key: 'extracting', label: 'Extracting deductions' },
  { key: 'inferring_rubric', label: 'Inferring rubric' },
  { key: 'extracting_concepts', label: 'Extracting concepts' },
  { key: 'done', label: 'Complete' },
]

const STEP_ORDER: BootstrapStep[] = [
  'reading',
  'extracting',
  'inferring_rubric',
  'extracting_concepts',
  'done',
]

function stepIndex(step: BootstrapStep): number {
  return STEP_ORDER.indexOf(step)
}

function stepMarker(step: BootstrapStep, current: BootstrapStep): string {
  const si = stepIndex(step)
  const ci = stepIndex(current)
  if (si < ci) return '✓'
  if (si === ci) return '·· running'
  return '—'
}

export interface BootstrapProgressProps {
  currentStep: BootstrapStep
  submissionCount?: number
}

export function BootstrapProgress({
  currentStep,
  submissionCount,
}: BootstrapProgressProps) {
  const progress = Math.round(
    (stepIndex(currentStep) / (STEP_ORDER.length - 1)) * 100
  )

  return (
    <div className="mt-4 space-y-3">
      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full bg-accent transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step list */}
      <ul className="space-y-1">
        {STEPS.map(({ key, label }) => {
          const marker = stepMarker(key, currentStep)
          const isDone = marker === '✓'
          const isRunning = marker === '·· running'
          return (
            <li
              key={key}
              className={[
                'font-mono text-[13px] flex items-center gap-2',
                isDone ? 'text-success' : isRunning ? 'text-primary' : 'text-tertiary',
              ].join(' ')}
            >
              <span className="w-16 shrink-0">{marker}</span>
              <span>{label}</span>
              {key === 'extracting' && submissionCount !== undefined && isRunning && (
                <span className="text-tertiary">({submissionCount} files)</span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
