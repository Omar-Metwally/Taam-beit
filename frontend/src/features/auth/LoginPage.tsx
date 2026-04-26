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
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const navigate   = useNavigate()
  const setAuth    = useAuthStore(s => s.setAuth)
  const [showPw, setShowPw] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: data => {
      setAuth(data.userId, ['Customer'])
      navigate('/')
    },
  })

  return (
    <main className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-[--text-primary] mb-2">
            Welcome back
          </h1>
          <p className="text-[--text-muted]">
            Sign in to your Ta'am Beit account
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-[--border] p-8 shadow-card">
          <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="flex flex-col gap-4">

            {/* Email */}
            <div>
              <input
                type="email"
                placeholder="Email address"
                className={cn(
                  'w-full border rounded-xl px-4 py-3 text-sm outline-none transition-colors placeholder:text-[--text-muted]',
                  errors.email ? 'border-red-400 focus:border-red-400' : 'border-[--border] focus:border-brand-400'
                )}
                {...register('email')}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Password"
                  className={cn(
                    'w-full border rounded-xl px-4 py-3 pr-10 text-sm outline-none transition-colors placeholder:text-[--text-muted]',
                    errors.password ? 'border-red-400 focus:border-red-400' : 'border-[--border] focus:border-brand-400'
                  )}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[--text-muted] hover:text-brand-500 transition-colors"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            </div>

            <div className="flex justify-end">
              <a href="#" className="text-sm text-brand-500 hover:underline">
                Forgot password?
              </a>
            </div>

            {mutation.isError && (
              <p className="text-sm text-red-500 text-center">
                Invalid email or password. Please try again.
              </p>
            )}

            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn-primary w-full py-4 text-base mt-1"
            >
              {mutation.isPending ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-[--text-muted] mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-500 font-semibold hover:underline">
              Sign up
            </Link>
          </p>
        </div>

        {/* Social divider — visual only */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-[--border]" />
          <span className="text-xs text-[--text-muted]">or continue with</span>
          <div className="flex-1 h-px bg-[--border]" />
        </div>

        <div className="flex gap-3">
          {['Google', 'Apple', 'Facebook'].map(provider => (
            <button
              key={provider}
              className="flex-1 py-3 border border-[--border] rounded-xl text-sm font-medium text-[--text-primary] hover:border-brand-400 hover:bg-brand-50 transition-all"
            >
              {provider === 'Google' && '🇬'}
              {provider === 'Apple' && '🍎'}
              {provider === 'Facebook' && '🔵'}
              {' '}{provider}
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}
