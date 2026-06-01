import { ShoppingCart, User, CreditCard, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export type CheckoutStep = 1 | 2 | 3

const STEPS = [
  { label: 'Checkout',             icon: ShoppingCart },
  { label: 'Customer Information', icon: User },
  { label: 'Review & Pay',         icon: CreditCard },
]

interface CheckoutStepperProps {
  currentStep: CheckoutStep
}

export default function CheckoutStepper({ currentStep }: CheckoutStepperProps) {
  return (
    <div className="flex items-center justify-center gap-0 w-full max-w-lg mx-auto">
      {STEPS.map((step, i) => {
        const stepNum   = (i + 1) as CheckoutStep
        const isActive  = stepNum === currentStep
        const isDone    = stepNum < currentStep
        const isLast    = i === STEPS.length - 1

        return (
          <div key={step.label} className="flex items-center flex-1">
            {/* Circle */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all',
                isDone
                  ? 'bg-brand-500 border-brand-500 text-white'
                  : isActive
                  ? 'bg-brand-500 border-brand-500 text-white'
                  : 'bg-white border-[--border] text-[--text-muted]'
              )}>
                {isDone
                  ? <Check size={20} strokeWidth={2.5} />
                  : <step.icon size={20} />
                }
              </div>
              <span className={cn(
                'text-xs font-medium whitespace-nowrap',
                isActive || isDone ? 'text-[--text-primary]' : 'text-[--text-muted]'
              )}>
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div className={cn(
                'h-0.5 flex-1 mx-2 mb-5 transition-colors',
                isDone ? 'bg-brand-500' : 'bg-[--border]'
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}
