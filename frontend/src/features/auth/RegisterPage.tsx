import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'

const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName:  z.string().min(1, 'Required'),
  email:     z.string().email('Enter a valid email'),
  password:  z.string().min(8, 'At least 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

function Input({ error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  return (
    <div>
      <input
        className={cn(
          'w-full border rounded-xl px-4 py-3 text-sm outline-none transition-colors placeholder:text-[--text-muted]',
          error ? 'border-red-400 focus:border-red-400' : 'border-[--border] focus:border-brand-400'
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

export default function RegisterPage() {
  const navigate   = useNavigate()
  const setAuth    = useAuthStore(s => s.setAuth)
  const [showPw,   setShowPw]   = useState(false)
  const [showConf, setShowConf] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) => authApi.register({
      email:     data.email,
      firstName: data.firstName,
      lastName:  data.lastName,
      password:  data.password,
    }),
    onSuccess: data => {
      setAuth(data.userId, ['Customer'])
      navigate('/')
    },
  })

  return (
    <main className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-[--text-primary] mb-2">
            Create your account
          </h1>
          <p className="text-[--text-muted]">
            Join Ta'am Beit and enjoy home-cooked meals
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[--border] p-8 shadow-card">
          <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="flex flex-col gap-4">

            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="First Name"
                error={errors.firstName?.message}
                {...register('firstName')}
              />
              <Input
                placeholder="Last Name"
                error={errors.lastName?.message}
                {...register('lastName')}
              />
            </div>

            <Input
              type="email"
              placeholder="Email address"
              error={errors.email?.message}
              {...register('email')}
            />

            <div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Password (min 8 characters)"
                  className={cn(
                    'w-full border rounded-xl px-4 py-3 pr-10 text-sm outline-none transition-colors placeholder:text-[--text-muted]',
                    errors.password ? 'border-red-400' : 'border-[--border] focus:border-brand-400'
                  )}
                  {...register('password')}
                />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[--text-muted]">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <div className="relative">
                <input
                  type={showConf ? 'text' : 'password'}
                  placeholder="Confirm password"
                  className={cn(
                    'w-full border rounded-xl px-4 py-3 pr-10 text-sm outline-none transition-colors placeholder:text-[--text-muted]',
                    errors.confirmPassword ? 'border-red-400' : 'border-[--border] focus:border-brand-400'
                  )}
                  {...register('confirmPassword')}
                />
                <button type="button" onClick={() => setShowConf(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[--text-muted]">
                  {showConf ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            <p className="text-xs text-[--text-muted]">
              By signing up you agree to our{' '}
              <a href="#" className="text-brand-500 hover:underline">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="text-brand-500 hover:underline">Privacy Policy</a>.
            </p>

            {mutation.isError && (
              <p className="text-sm text-red-500 text-center">
                Registration failed. This email may already be in use.
              </p>
            )}

            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn-primary w-full py-4 text-base mt-1"
            >
              {mutation.isPending ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-[--text-muted] mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-500 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
