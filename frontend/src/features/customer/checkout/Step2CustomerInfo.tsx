import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Shield } from 'lucide-react'
import { useCheckoutStore, type CustomerInfo } from '@/store/checkout.store'
import { cn } from '@/lib/utils'

const schema = z.object({
  firstName:   z.string().min(1, 'Required'),
  lastName:    z.string().min(1, 'Required'),
  phoneNumber: z.string().min(8, 'Enter a valid phone number'),
  district:    z.string().min(1, 'Select a district'),
  street:      z.string().min(1, 'Required'),
  building:    z.string().min(1, 'Required'),
  floorNo:     z.string().min(1, 'Required'),
  apartmentNo: z.string().min(1, 'Required'),
  notes:       z.string().optional().default(''),
})

const DISTRICTS = [
  'Sporting', 'Ibrahimiya', 'Camp Caesar', 'El-Shatby',
  'Smouha', 'Sidi Gaber', 'Stanley', 'Miami',
]

function Field({ error, children }: { error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full border border-[--border] rounded-xl px-4 py-3 text-sm',
        'outline-none focus:border-brand-400 transition-colors',
        'placeholder:text-[--text-muted]',
        className
      )}
      {...props}
    />
  )
}

export default function Step2CustomerInfo() {
  const { setCustomerInfo, customerInfo } = useCheckoutStore()

  const { register, handleSubmit, formState: { errors } } = useForm<CustomerInfo>({
    resolver: zodResolver(schema),
    defaultValues: customerInfo ?? undefined,
  })

  const onSubmit = (data: CustomerInfo) => {
    setCustomerInfo(data) // advances to step 3 automatically
  }

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="bg-white rounded-2xl border border-[--border] p-8 mb-6">

          {/* Personal Information */}
          <h2 className="font-display text-lg font-semibold text-[--text-primary] mb-5">
            Personal Information
          </h2>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <Field error={errors.firstName?.message}>
              <Input placeholder="First Name" {...register('firstName')} />
            </Field>
            <Field error={errors.lastName?.message}>
              <Input placeholder="Last Name" {...register('lastName')} />
            </Field>
          </div>

          {/* Phone with country prefix */}
          <Field error={errors.phoneNumber?.message}>
            <div className="flex">
              <div className="flex items-center gap-2 border border-r-0 border-[--border] rounded-l-xl px-3 py-3 bg-gray-50 text-sm text-[--text-muted] shrink-0">
                <span>🇪🇬</span>
                <span>EG +20</span>
              </div>
              <Input
                placeholder="Phone Number"
                type="tel"
                className="rounded-l-none border-l-0"
                {...register('phoneNumber')}
              />
            </div>
          </Field>

          {/* Shipping Address */}
          <h2 className="font-display text-lg font-semibold text-[--text-primary] mt-8 mb-5">
            Shipping Address
          </h2>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <Field error={errors.district?.message}>
              <div className="relative">
                <select
                  className={cn(
                    'w-full border border-[--border] rounded-xl px-4 py-3 text-sm',
                    'outline-none focus:border-brand-400 transition-colors appearance-none bg-white',
                    'text-[--text-muted]'
                  )}
                  {...register('district')}
                >
                  <option value="">District</option>
                  {DISTRICTS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none w-4 h-4 text-[--text-muted]" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </div>
            </Field>
            <Field error={errors.street?.message}>
              <Input placeholder="Street" {...register('street')} />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <Field error={errors.building?.message}>
              <Input placeholder="Building" {...register('building')} />
            </Field>
            <Field error={errors.floorNo?.message}>
              <Input placeholder="Floor No" {...register('floorNo')} />
            </Field>
            <Field error={errors.apartmentNo?.message}>
              <Input placeholder="Apartment No" {...register('apartmentNo')} />
            </Field>
          </div>

          <textarea
            placeholder="Notes for delivery"
            rows={2}
            className={cn(
              'w-full border border-[--border] rounded-xl px-4 py-3 text-sm resize-none',
              'outline-none focus:border-brand-400 transition-colors',
              'placeholder:text-[--text-muted]'
            )}
            {...register('notes')}
          />

          {/* Security notice */}
          <div className="mt-6 text-center">
            <div className="flex items-center justify-center gap-2 text-brand-500 mb-1">
              <Shield size={16} />
              <span className="text-sm font-semibold">Security & Privacy</span>
            </div>
            <p className="text-xs text-[--text-muted]">
              We Maintain industry-Standard Physical, Administration Measures To Safeguard Your personal Information
            </p>
          </div>
        </div>

        <button type="submit" className="btn-primary w-full py-4 text-base">
          Save
        </button>
      </form>
    </div>
  )
}
