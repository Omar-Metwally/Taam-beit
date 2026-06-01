import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { authApi } from "@/api/auth";
import { useAuthStore } from "@/store/auth.store";
import { Field, Input } from "@/components/ui/FormField";
import { redirectByRole } from "@/lib/redirectByRole";

const schema = z
  .object({
    firstName: z.string().min(1, "Required"),
    lastName: z.string().min(1, "Required"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [showPw, setShowPw] = useState(false);
  const [showConf, setShowConf] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      authApi.register({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        password: data.password,
      }),
    onSuccess: () => {
      navigate("/login");
    },
  });

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
          <form
            onSubmit={handleSubmit((d) => mutation.mutate(d))}
            className="flex flex-col gap-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <Field label="First Name" error={errors.firstName?.message}>
                <Input
                  placeholder="First Name"
                  hasError={!!errors.firstName}
                  {...register("firstName")}
                />
              </Field>
              <Field label="Last Name" error={errors.lastName?.message}>
                <Input
                  placeholder="Last Name"
                  hasError={!!errors.lastName}
                  {...register("lastName")}
                />
              </Field>
            </div>

            <Field label="Email Address" error={errors.email?.message}>
              <Input
                type="email"
                placeholder="Email address"
                hasError={!!errors.email}
                {...register("email")}
              />
            </Field>

            <Field label="Password" error={errors.password?.message}>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  placeholder="Password (min 8 characters)"
                  hasError={!!errors.password}
                  className="pr-10"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[--text-muted]"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            <Field
              label="Confirm Password"
              error={errors.confirmPassword?.message}
            >
              <div className="relative">
                <Input
                  type={showConf ? "text" : "password"}
                  placeholder="Confirm password"
                  hasError={!!errors.confirmPassword}
                  className="pr-10"
                  {...register("confirmPassword")}
                />
                <button
                  type="button"
                  onClick={() => setShowConf((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[--text-muted]"
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
              <p className="text-sm text-red-500 text-center">
                Registration failed. This email may already be in use.
              </p>
            )}

            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn-primary w-full py-4 text-base mt-1"
            >
              {mutation.isPending ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm text-[--text-muted] mt-6">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-brand-500 font-semibold hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
