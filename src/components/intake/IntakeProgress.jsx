import React from 'react';
import { CheckCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function IntakeProgress({ currentStep, steps }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between relative">
        {/* Progress Line */}
        <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 -z-10">
          <div
            className="h-full bg-yellow transition-all duration-500"
            style={{ width: `${((currentStep) / (steps.length - 1)) * 100}%` }}
          />
        </div>

        {/* Steps */}
        {steps.map((step, index) => (
          <div key={index} className="flex flex-col items-center">
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all',
                index < currentStep
                  ? 'bg-yellow text-navy'
                  : index === currentStep
                  ? 'bg-navy text-white ring-4 ring-yellow/30'
                  : 'bg-white border-2 border-gray-300 text-gray-400'
              )}
            >
              {index < currentStep ? (
                <CheckCircle className="w-6 h-6" />
              ) : (
                <span>{index + 1}</span>
              )}
            </div>
            <p
              className={cn(
                'text-xs mt-2 font-medium text-center max-w-[100px]',
                index <= currentStep ? 'text-navy' : 'text-gray-400'
              )}
            >
              {step.title}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}