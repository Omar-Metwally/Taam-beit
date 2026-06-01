import { useState, useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Field, Input } from "@/components/ui/FormField";
import { AccountStep } from "./components/AccountStep";
import {
  MapPin,
  ChevronRight,
  ChevronLeft,
  X,
  Loader2,
  CheckCircle2,
  Bike,
  Car,
  Motorbike,
} from "lucide-react";
import api from "@/api/client";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils";

// ── Types & enums ─────────────────────────────────────────────────────────────

enum VehicleType {
  Bike = 0,
  Motorcycle = 1,
  Car = 2,
}

const VEHICLE_OPTIONS: {
  value: VehicleType;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: VehicleType.Bike,
    label: "Bicycle",
    description: "Eco-friendly · short distances",
    icon: <Bike size={22} />,
  },
  {
    value: VehicleType.Motorcycle,
    label: "Motorcycle",
    description: "Fast · medium distances",
    icon: <Motorbike size={22} />,
  },
  {
    value: VehicleType.Car,
    label: "Car",
    description: "Spacious · all distances",
    icon: <Car size={22} />,
  },
];

// ── Schemas ───────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  personalIdNumber: z.string().min(1, "Required").max(50, "Max 50 characters"),
  vehicleType: z.nativeEnum(VehicleType, {
    errorMap: () => ({ message: "Please select a vehicle type" }),
  }),
});

const locationSchema = z.object({
  latitude: z.number({ invalid_type_error: "Required" }).min(-90).max(90),
  longitude: z.number({ invalid_type_error: "Required" }).min(-180).max(180),
});

type ProfileData = z.infer<typeof profileSchema>;
type LocationData = z.infer<typeof locationSchema>;

// ── Step bar ──────────────────────────────────────────────────────────────────

const STEPS = ["Account", "Profile", "Location", "Done"];

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        const isLast = i === STEPS.length - 1;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                  done
                    ? "bg-brand-500 text-white"
                    : active
                      ? "bg-brand-500 text-white ring-4 ring-brand-100"
                      : "bg-white border-2 border-[--border] text-[--text-muted]",
                )}
              >
                {done ? <CheckCircle2 size={16} /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-[10px] font-semibold whitespace-nowrap",
                  active
                    ? "text-brand-600"
                    : done
                      ? "text-brand-400"
                      : "text-[--text-muted]",
                )}
              >
                {label}
              </span>
            </div>
            {!isLast && (
              <div
                className={cn(
                  "w-12 sm:w-20 h-0.5 mx-1 mb-4 transition-colors",
                  done ? "bg-brand-400" : "bg-[--border]",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Step 1: Account ───────────────────────────────────────────────────────────

// ── Step 2: Profile (ID + vehicle) ────────────────────────────────────────────

function StepProfile({
  onSuccess,
  onBack,
}: {
  onSuccess: (data: ProfileData) => void;
  onBack: () => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProfileData>({ resolver: zodResolver(profileSchema) });

  const selectedVehicle = watch("vehicleType");

  return (
    <form onSubmit={handleSubmit(onSuccess)} className="flex flex-col gap-6">
      {/* Personal ID */}
      <Field
        label="National ID Number *"
        error={errors.personalIdNumber?.message}
      >
        <Input
          placeholder="e.g. 29901011234567"
          hasError={!!errors.personalIdNumber}
          {...register("personalIdNumber")}
        />
        <p className="text-xs text-[--text-muted] mt-1">
          Your national ID is used for identity verification only and is never
          shared.
        </p>
      </Field>

      {/* Vehicle picker */}
      <div>
        <label className="block text-xs font-semibold text-[--text-primary] mb-2 uppercase tracking-wide">
          Vehicle Type *
        </label>
        <div className="grid grid-cols-3 gap-3">
          {VEHICLE_OPTIONS.map((opt) => {
            const selected = selectedVehicle === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  setValue("vehicleType", opt.value, { shouldValidate: true })
                }
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-center",
                  selected
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-[--border] bg-white text-[--text-muted] hover:border-brand-300 hover:bg-brand-50/50",
                )}
              >
                <span
                  className={cn(
                    "p-2 rounded-xl transition-colors",
                    selected ? "bg-brand-100" : "bg-[--bg]",
                  )}
                >
                  {opt.icon}
                </span>
                <div>
                  <p className="text-sm font-semibold leading-tight">
                    {opt.label}
                  </p>
                  <p className="text-[10px] mt-0.5 leading-tight">
                    {opt.description}
                  </p>
                </div>
                {selected && (
                  <CheckCircle2
                    size={14}
                    className="text-brand-500 absolute"
                    style={{ marginTop: -2 }}
                  />
                )}
              </button>
            );
          })}
        </div>
        {errors.vehicleType && (
          <p className="text-xs text-red-500 mt-1">
            {errors.vehicleType.message}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="btn-outline px-5 py-3 flex items-center gap-1"
        >
          <ChevronLeft size={16} /> Back
        </button>
        <button type="submit" className="btn-primary flex-1 py-3">
          <span className="flex items-center justify-center gap-2">
            Continue <ChevronRight size={16} />
          </span>
        </button>
      </div>
    </form>
  );
}

// ── Step 3: Location ──────────────────────────────────────────────────────────

function StepLocation({
  profileData,
  onSuccess,
  onBack,
}: {
  profileData: ProfileData;
  onSuccess: () => void;
  onBack: () => void;
}) {
  const [detecting, setDetecting] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LocationData>({ resolver: zodResolver(locationSchema) });

  const lat = watch("latitude");
  const lng = watch("longitude");

  const mutation = useMutation({
    mutationFn: (loc: LocationData) =>
      api.post("/me/delivery-man-profile", {
        personalIdNumber: profileData.personalIdNumber,
        vehicleType: profileData.vehicleType,
        latitude: loc.latitude,
        longitude: loc.longitude,
      }),
    onSuccess: async () => {
      await useAuthStore.getState().refreshAuth();
      onSuccess();
    },
  });

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }
    setDetecting(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue("latitude", pos.coords.latitude, { shouldValidate: true });
        setValue("longitude", pos.coords.longitude, { shouldValidate: true });
        setDetecting(false);
      },
      () => {
        setGeoError(
          "Could not get your location. You can enter your coordinates manually below.",
        );
        setDetecting(false);
      },
    );
  }, [setValue]);

  return (
    <form
      onSubmit={handleSubmit((d) => mutation.mutate(d))}
      className="flex flex-col gap-5"
    >
      {/* Info banner */}
      <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-sm text-brand-800">
        <p className="font-semibold mb-1">📍 Why do we need your location?</p>
        <p className="text-xs text-brand-700 leading-relaxed">
          Your starting location is used to match you with nearby orders. You
          can update it anytime from your dashboard.
        </p>
      </div>

      {/* Detect button */}
      <button
        type="button"
        onClick={detectLocation}
        disabled={detecting}
        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-dashed border-brand-300 text-brand-600 hover:bg-brand-50 font-semibold text-sm transition-colors disabled:opacity-60"
      >
        {detecting ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Detecting location…
          </>
        ) : (
          <>
            <MapPin size={16} /> Use my current location
          </>
        )}
      </button>

      {geoError && (
        <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2">
          {geoError}
        </p>
      )}

      {/* Detected coordinates pill */}
      {lat && lng ? (
        <div className="bg-brand-50 rounded-xl px-4 py-3 flex items-center gap-3">
          <MapPin size={16} className="text-brand-500 shrink-0" />
          <div className="text-xs text-brand-700">
            <span className="font-semibold">Location detected: </span>
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </div>
          <button
            type="button"
            onClick={() => {
              setValue("latitude", undefined as any);
              setValue("longitude", undefined as any);
            }}
            className="ml-auto text-brand-400 hover:text-brand-600"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        /* Manual coordinate fallback */
        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitude" error={errors.latitude?.message}>
            <Input
              type="number"
              step="any"
              placeholder="e.g. 30.0444"
              hasError={!!errors.latitude}
              {...register("latitude", { valueAsNumber: true })}
            />
          </Field>
          <Field label="Longitude" error={errors.longitude?.message}>
            <Input
              type="number"
              step="any"
              placeholder="e.g. 31.2357"
              hasError={!!errors.longitude}
              {...register("longitude", { valueAsNumber: true })}
            />
          </Field>
        </div>
      )}

      {mutation.isError && (
        <p className="text-sm text-red-500 text-center bg-red-50 rounded-xl py-2 px-3">
          Could not submit your application. Please try again.
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="btn-outline px-5 py-3 flex items-center gap-1"
        >
          <ChevronLeft size={16} /> Back
        </button>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="btn-primary flex-1 py-3"
        >
          {mutation.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Submitting…
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              Submit Application <ChevronRight size={16} />
            </span>
          )}
        </button>
      </div>
    </form>
  );
}

// ── Step 4: Done ──────────────────────────────────────────────────────────────

function StepDone() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center text-center gap-5 py-4">
      <div className="w-20 h-20 rounded-full bg-brand-50 flex items-center justify-center">
        <span className="text-4xl">🛵</span>
      </div>
      <div>
        <h2 className="font-display text-xl font-bold text-[--text-primary] mb-2">
          Application Submitted!
        </h2>
        <p className="text-[--text-muted] text-sm leading-relaxed">
          Our team will review your information and get back to you within{" "}
          <strong className="text-[--text-primary]">1–2 working days</strong>.
          You'll be notified once your profile is approved.
        </p>
      </div>

      {/* Progress checklist */}
      <div className="w-full bg-[--bg] rounded-xl p-4 text-left flex flex-col gap-3">
        {[
          { icon: "✓", label: "Account created" },
          { icon: "✓", label: "Vehicle & ID saved" },
          { icon: "✓", label: "Location registered" },
          { icon: "⏳", label: "Profile under review" },
          { icon: "○", label: "Profile approval — pending" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-3 text-sm">
            <span
              className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                item.icon === "✓"
                  ? "bg-brand-500 text-white"
                  : item.icon === "⏳"
                    ? "bg-amber-100 text-amber-600"
                    : "bg-[--border] text-[--text-muted]",
              )}
            >
              {item.icon === "✓" ? "✓" : item.icon === "⏳" ? "…" : ""}
            </span>
            <span
              className={
                item.icon === "○"
                  ? "text-[--text-muted]"
                  : "text-[--text-primary]"
              }
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={() => navigate("/delivery")}
        className="btn-primary w-full py-3.5"
      >
        Go to Dashbaord
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const STEP_TITLES = [
  {
    title: "Create your account",
    sub: "Join Ta'am Beit as a delivery partner",
  },
  {
    title: "Your vehicle & ID",
    sub: "Tell us how you deliver and verify your identity",
  },
  {
    title: "Your starting location",
    sub: "We'll match you with nearby orders",
  },
  { title: "You're all set!", sub: "" },
];

export default function DeliveryManRegisterPage() {
  const [step, setStep] = useState(0);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);

  useEffect(() => {
    const resume = async () => {
      const { isAuthenticated } = useAuthStore.getState();
      if (!isAuthenticated) {
        setStep(0);
        return;
      }

      await useAuthStore.getState().refreshAuth();

      const { hasRole } = useAuthStore.getState();
      if (hasRole("DeliveryMan")) {
        setStep(3); // go to Done
      } else {
        setStep(1); // skip Account, go to Profile
      }
    };

    resume();
  }, []);

  return (
    <main className="min-h-screen bg-[--bg] flex items-start justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-display font-bold text-sm">
                TB
              </span>
            </div>
            <span className="font-display font-bold text-brand-700 text-xl">
              Ta'am Beit
            </span>
          </Link>
        </div>

        <StepBar current={step} />

        <div className="bg-white rounded-2xl border border-[--border] shadow-card p-7">
          {step < 3 && (
            <div className="mb-6">
              <h1 className="font-display text-2xl font-bold text-[--text-primary]">
                {STEP_TITLES[step].title}
              </h1>
              {STEP_TITLES[step].sub && (
                <p className="text-[--text-muted] text-sm mt-1">
                  {STEP_TITLES[step].sub}
                </p>
              )}
            </div>
          )}

          {step === 0 && (
            <AccountStep role="DeliveryMan" onSuccess={() => setStep(1)} />
          )}
          {step === 1 && (
            <StepProfile
              onSuccess={(data) => {
                setProfileData(data);
                setStep(2);
              }}
              onBack={() => setStep(0)}
            />
          )}
          {step === 2 && profileData && (
            <StepLocation
              profileData={profileData}
              onSuccess={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && <StepDone />}
        </div>

        {step === 0 && (
          <p className="text-center text-sm text-[--text-muted] mt-4">
            Signing up as a chef instead?{" "}
            <Link
              to="/register/chef"
              className="text-brand-500 font-semibold hover:underline"
            >
              Chef sign up
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
