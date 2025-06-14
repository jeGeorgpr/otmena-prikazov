// components/dashboard/Stepper.tsx
'use client'

import { Check } from 'lucide-react'

interface Step {
  id: number
  name: string
  status: 'complete' | 'current' | 'upcoming'
}

interface StepperProps {
  steps: Step[]
}

export default function Stepper({ steps }: StepperProps) {
  return (
    <nav aria-label="Progress" className="mb-8">
      <ol role="list" className="flex items-center justify-center">
        {steps.map((step, stepIdx) => (
          <li 
            key={step.name} 
            className={`relative ${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}
          >
            {/* Connecting line */}
            {stepIdx !== steps.length - 1 && (
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className={`h-0.5 w-full ${
                  step.status === 'complete' ? 'bg-green-600' : 'bg-gray-200'
                }`} />
              </div>
            )}

            {/* Step circle */}
            <div className="relative flex flex-col items-center">
              {step.status === 'complete' ? (
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-green-600">
                  <Check className="h-6 w-6 text-white" aria-hidden="true" />
                  <span className="sr-only">{step.name}</span>
                </div>
              ) : step.status === 'current' ? (
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#005bff] bg-white">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#005bff]" aria-hidden="true" />
                  <span className="sr-only">{step.name}</span>
                </div>
              ) : (
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-gray-300 bg-white">
                  <span className="h-2.5 w-2.5 rounded-full bg-transparent" aria-hidden="true" />
                  <span className="sr-only">{step.name}</span>
                </div>
              )}

              {/* Step label */}
              <span className={`mt-3 text-sm font-medium text-center whitespace-nowrap ${
                step.status === 'complete' 
                  ? 'text-green-600' 
                  : step.status === 'current' 
                  ? 'text-[#005bff]' 
                  : 'text-gray-500'
              }`}>
                {step.name}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  )
}