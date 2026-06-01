import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, ChevronRight, Loader2 } from "lucide-react";
import { authApi } from "@/api/auth";
import { useAuthStore } from "@/store/auth.store";
import { Field, Input } from "@/components/ui/FormField";

// ── Schema ────────────────────────────────────────────────────────────────────

const accountSchema = z
  .object({
    firstName: z.string().min(1, "Required").max(100),
    lastName: z.string().min(1, "Required").max(100),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type AccountData = z.infer<typeof accountSchema>;

// ── Props ─────────────────────────────────────────────────────────────────────

interface AccountStepProps {
  role: string;
  onSuccess: (data: AccountData) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AccountStep({ onSuccess }: AccountStepProps) {
  const [showPw, setShowPw] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AccountData>({ resolver: zodResolver(accountSchema) });

  const mutation = useMutation({
    mutationFn: (data: AccountData) =>
      authApi.register({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        password: data.password,
      }),
    onSuccess: (res, data) => {
      setAuth(res.userId, res.roles);
      onSuccess(data);
    },
  });

  return (
    <form
      onSubmit={handleSubmit((d) => mutation.mutate(d))}
      className="flex flex-col gap-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="First Name" error={errors.firstName?.message}>
          <Input
            placeholder="Ahmed"
            hasError={!!errors.firstName}
            {...register("firstName")}
          />
        </Field>
        <Field label="Last Name" error={errors.lastName?.message}>
          <Input
            placeholder="Ibrahim"
            hasError={!!errors.lastName}
            {...register("lastName")}
          />
        </Field>
      </div>

      <Field label="Email Address" error={errors.email?.message}>
        <Input
          type="email"
          placeholder="you@example.com"
          hasError={!!errors.email}
          {...register("email")}
        />
      </Field>

      <Field label="Password" error={errors.password?.message}>
        <div className="relative">
          <Input
            type={showPw ? "text" : "password"}
            placeholder="At least 8 characters"
            hasError={!!errors.password}
            className="pr-10"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPw((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[--text-muted] hover:text-brand-500 transition-colors"
          >
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </Field>

      <Field label="Confirm Password" error={errors.confirmPassword?.message}>
        <div className="relative">
          <Input
            type={showConf ? "text" : "password"}
            placeholder="Repeat your password"
            hasError={!!errors.confirmPassword}
            className="pr-10"
            {...register("confirmPassword")}
          />
          <button
            type="button"
            onClick={() => setShowConf((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[--text-muted] hover:text-brand-500 transition-colors"
          >
            {showConf ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </Field>

      <p className="text-xs text-[--text-muted]">
        By signing up you agree to our{" "}
        <a href="#" className="text-brand-500 hover:underline">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="#" className="text-brand-500 hover:underline">
          Privacy Policy
        </a>
        .
      </p>

      {mutation.isError && (
        <p className="text-sm text-red-500 text-center bg-red-50 rounded-xl py-2 px-3">
          Registration failed — this email may already be in use.
        </p>
      )}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="btn-primary w-full py-3.5 mt-1"
      >
        {mutation.isPending ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" /> Creating account…
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            Continue <ChevronRight size={16} />
          </span>
        )}
      </button>

      <p className="text-center text-sm text-[--text-muted]">
        Already have an account?{" "}
        <Link
          to="/login"
          className="text-brand-500 font-semibold hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
