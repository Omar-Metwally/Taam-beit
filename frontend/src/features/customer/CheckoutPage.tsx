import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import CheckoutStepper, { type CheckoutStep } from '@/components/ui/CheckoutStepper'
import { useCheckoutStore } from '@/store/checkout.store'
import Step1Cart from './checkout/Step1Cart'
import Step2CustomerInfo from './checkout/Step2CustomerInfo'
import Step3ReviewPay from './checkout/Step3ReviewPay'
import Footer from '@/components/layout/Footer'

export default function CheckoutPage() {
  const navigate   = useNavigate()
  const { step, setStep } = useCheckoutStore()

  const handleBack = () => {
    if (step === 1) navigate(-1)
    else setStep((step - 1) as CheckoutStep)
  }

  return (
    <main className="flex flex-col min-h-screen bg-[--bg]">
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">

        {/* Back + Stepper */}
        <div className="flex items-start gap-6 mb-10">
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-sm text-[--text-muted] hover:text-brand-500 transition-colors mt-1 shrink-0"
          >
            <ChevronLeft size={16} /> Back
          </button>
          <div className="flex-1">
            <CheckoutStepper currentStep={step} />
          </div>
        </div>

        {/* Step content */}
        {step === 1 && <Step1Cart />}
        {step === 2 && <Step2CustomerInfo />}
        {step === 3 && <Step3ReviewPay />}
      </div>

      <Footer />
    </main>
  )
}
