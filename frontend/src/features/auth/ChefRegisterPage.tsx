import { useState, useCallback, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import {
  MapPin,
  Upload,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  X,
  Loader2,
} from "lucide-react";
import { chefApi } from "@/api/chef";
import { cn } from "@/lib/utils";
import MapPicker from "@/components/ui/MapPicker";
import { useAuthStore } from "@/store/auth.store";

// ── Schemas ──────────────────────────────────────────────────────────────────

const locationSchema = z.object({
  addressLine: z.string().min(3, "Enter your address"),
  latitude: z.number({ invalid_type_error: "Required" }).min(-90).max(90),
  longitude: z.number({ invalid_type_error: "Required" }).min(-180).max(180),
});

type LocationData = z.infer<typeof locationSchema>;

import { Field, Input } from "@/components/ui/FormField";
import { AccountStep } from "./components/AccountStep";

// ── Step indicator ───────────────────────────────────────────────────────────

const STEPS = ["Account", "Location", "Documents", "Done"];

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

// ── Step 1: Account ──────────────────────────────────────────────────────────

// ── Step 2: Location ─────────────────────────────────────────────────────────

function StepLocation({
  onSuccess,
  onBack,
}: {
  onSuccess: (data: LocationData) => void;
  onBack: () => void;
}) {
  const [detecting, setDetecting] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number] | undefined>();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LocationData>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      latitude: 31.224,
      longitude: 29.79,
      addressLine: "",
    },
  });

  const lat = watch("latitude");
  const lng = watch("longitude");

  const mutation = useMutation({
    mutationFn: chefApi.apply,
    onSuccess: (_, vars) => onSuccess(vars as LocationData),
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
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        setValue("latitude", newLat, { shouldValidate: true });
        setValue("longitude", newLng, { shouldValidate: true });
        setMapCenter([newLat, newLng]); // recenter map
        setDetecting(false);
      },
      () => {
        setGeoError(
          "Could not get your location. Please set your location on the map.",
        );
        setDetecting(false);
      },
    );
  }, [setValue]);

  const onSubmit = (data: LocationData) => {
    mutation.mutate({
      latitude: data.latitude,
      longitude: data.longitude,
      addressLine: data.addressLine,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {/* Detect button */}
      <button
        type="button"
        onClick={detectLocation}
        disabled={detecting}
        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-dashed border-brand-300 text-brand-600 hover:bg-brand-50 font-semibold text-sm transition-colors"
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

      {/* Map always visible */}
      <div>
        <label className="block text-xs font-semibold text-[--text-primary] mb-1.5 uppercase tracking-wide">
          Select your kitchen location *
        </label>
        <MapPicker
          position={lat != null && lng != null ? [lat, lng] : null}
          onPositionChange={(lat, lng) => {
            setValue("latitude", lat);
            setValue("longitude", lng);
          }}
          center={mapCenter}
          disabled={mutation.isPending}
        />
        {lat != null && lng != null && (
          <div className="mt-2 text-xs bg-brand-50 rounded-lg px-3 py-2 flex items-center gap-2">
            <MapPin size={14} className="text-brand-500 shrink-0" />
            <span className="text-brand-700 font-mono">
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </span>
          </div>
        )}
      </div>

      {/* Address field (unchanged) */}
      <Field label="Address (optional)" error={errors.addressLine?.message}>
        <Input
          placeholder="e.g. 12 Port Said St, Sharq, Cairo"
          hasError={!!errors.addressLine}
          {...register("addressLine")}
        />
        <p className="text-xs text-[--text-muted] mt-1">
          This helps customers find your kitchen area.
        </p>
      </Field>

      {mutation.isError && (
        <p className="text-sm text-red-500 text-center bg-red-50 rounded-xl py-2 px-3">
          Could not save your location. Please try again.
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
              <Loader2 size={16} className="animate-spin" /> Saving…
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              Continue <ChevronRight size={16} />
            </span>
          )}
        </button>
      </div>
    </form>
  );
}

// ── Step 3: Documents ────────────────────────────────────────────────────────

interface DocFile {
  file: File | null;
  uploading: boolean;
  done: boolean;
  error: string | null;
}

function FileDropZone({
  label,
  hint,
  accept,
  value,
  onChange,
  disabled,
}: {
  label: string;
  hint: string;
  accept: string;
  value: File | null;
  onChange: (f: File | null) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onChange(file);
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-[--text-primary] mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer",
          disabled
            ? "opacity-50 cursor-not-allowed"
            : value
              ? "border-brand-400 bg-brand-50"
              : "border-[--border] hover:border-brand-300 hover:bg-brand-50/50",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          disabled={disabled}
        />
        {value ? (
          <div className="flex items-center justify-center gap-3">
            <CheckCircle2 size={20} className="text-brand-500 shrink-0" />
            <div className="text-left">
              <p className="text-sm font-semibold text-brand-700 truncate max-w-[200px]">
                {value.name}
              </p>
              <p className="text-xs text-[--text-muted]">
                {(value.size / 1024).toFixed(0)} KB
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              className="ml-auto text-[--text-muted] hover:text-red-500 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <>
            <Upload size={24} className="mx-auto text-[--text-muted] mb-2" />
            <p className="text-sm text-[--text-muted]">
              <span className="text-brand-600 font-semibold">
                Click to upload
              </span>{" "}
              or drag & drop
            </p>
            <p className="text-xs text-[--text-muted] mt-1">{hint}</p>
          </>
        )}
      </div>
    </div>
  );
}

function StepDocuments({
  onSuccess,
  onBack,
}: {
  onSuccess: () => void;
  onBack: () => void;
}) {
  const [personalId, setPersonalId] = useState<DocFile>({
    file: null,
    uploading: false,
    done: false,
    error: null,
  });
  const [healthCert, setHealthCert] = useState<DocFile>({
    file: null,
    uploading: false,
    done: false,
    error: null,
  });
  const [submitting, setSubmitting] = useState(false);

  const uploadDoc = async (
    type: 0 | 1,
    doc: DocFile,
    setDoc: React.Dispatch<React.SetStateAction<DocFile>>,
  ): Promise<boolean> => {
    if (!doc.file) return false;
    setDoc((d) => ({ ...d, uploading: true, error: null }));
    try {
      await chefApi.uploadDocument(type, doc.file);
      setDoc((d) => ({ ...d, uploading: false, done: true }));
      return true;
    } catch {
      setDoc((d) => ({
        ...d,
        uploading: false,
        error: "Upload failed. Please try again.",
      }));
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!personalId.file && !personalId.done) return;
    setSubmitting(true);

    const results = await Promise.all([
      personalId.done ? true : uploadDoc(0, personalId, setPersonalId),
      healthCert.file ? uploadDoc(1, healthCert, setHealthCert) : true,
    ]);

    setSubmitting(false);
    if (results.every(Boolean)) {
      await useAuthStore.getState().refreshAuth();
    }
    onSuccess();
  };

  const canSubmit = !!personalId.file || personalId.done;

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <p className="font-semibold mb-1">📋 What you'll need</p>
        <ul className="text-xs space-y-1 list-disc list-inside text-amber-700">
          <li>
            <strong>National ID</strong> — required to verify your identity
          </li>
          <li>
            <strong>Health Certificate</strong> — optional now, required before
            going live
          </li>
          <li>Accepted formats: PDF, JPEG, PNG · Max 10 MB each</li>
        </ul>
      </div>

      <FileDropZone
        label="National ID *"
        hint="PDF, JPEG or PNG · max 10 MB"
        accept=".pdf,.jpg,.jpeg,.png"
        value={personalId.file}
        onChange={(f) =>
          setPersonalId({ file: f, uploading: false, done: false, error: null })
        }
        disabled={personalId.uploading || personalId.done}
      />
      {personalId.done && (
        <p className="text-xs text-brand-600 flex items-center gap-1 -mt-3">
          <CheckCircle2 size={12} /> Uploaded successfully
        </p>
      )}
      {personalId.error && (
        <p className="text-xs text-red-500 -mt-3">{personalId.error}</p>
      )}

      <FileDropZone
        label="Health Certificate (optional)"
        hint="PDF, JPEG or PNG · max 10 MB · Can be added later"
        accept=".pdf,.jpg,.jpeg,.png"
        value={healthCert.file}
        onChange={(f) =>
          setHealthCert({ file: f, uploading: false, done: false, error: null })
        }
        disabled={healthCert.uploading || healthCert.done}
      />
      {healthCert.done && (
        <p className="text-xs text-brand-600 flex items-center gap-1 -mt-3">
          <CheckCircle2 size={12} /> Uploaded successfully
        </p>
      )}
      {healthCert.error && (
        <p className="text-xs text-red-500 -mt-3">{healthCert.error}</p>
      )}

      <div className="flex gap-3 mt-2">
        <button
          type="button"
          onClick={onBack}
          className="btn-outline px-5 py-3 flex items-center gap-1"
        >
          <ChevronLeft size={16} /> Back
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className="btn-primary flex-1 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Uploading…
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              Submit Application <ChevronRight size={16} />
            </span>
          )}
        </button>
      </div>

      <button
        type="button"
        onClick={onSuccess}
        className="text-xs text-center text-[--text-muted] hover:text-brand-600 transition-colors"
      >
        Skip for now — I'll add documents later
      </button>
    </div>
  );
}

// ── Step 4: Done ─────────────────────────────────────────────────────────────

function StepDone() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center text-center gap-5 py-4">
      <div className="w-20 h-20 rounded-full bg-brand-50 flex items-center justify-center">
        <span className="text-4xl">🎉</span>
      </div>
      <div>
        <h2 className="font-display text-xl font-bold text-[--text-primary] mb-2">
          Application Submitted!
        </h2>
        <p className="text-[--text-muted] text-sm leading-relaxed">
          Our team will review your documents and get back to you within{" "}
          <strong className="text-[--text-primary]">2 working days</strong>.
          You'll receive a notification once approved.
        </p>
      </div>

      <div className="w-full bg-[--bg] rounded-xl p-4 text-left flex flex-col gap-2">
        {[
          { icon: "✓", text: "Account created" },
          { icon: "✓", text: "Kitchen location saved" },
          { icon: "⏳", text: "Documents under review" },
          { icon: "○", text: "Profile approval — pending" },
        ].map((item) => (
          <div key={item.text} className="flex items-center gap-3 text-sm">
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
              {item.text}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={() => navigate("/chef")}
        className="btn-primary w-full py-3.5"
      >
        Go to Dashboard
      </button>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

const STEP_TITLES = [
  {
    title: "Create your chef account",
    sub: "Start your journey with Ta'am Beit",
  },
  {
    title: "Where is your kitchen?",
    sub: "Help customers in your area find you",
  },
  {
    title: "Upload your documents",
    sub: "Required for identity and food safety verification",
  },
  { title: "You're all set!", sub: "" },
];

export default function ChefRegisterPage() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const resume = async () => {
      const { isAuthenticated } = useAuthStore.getState();
      if (!isAuthenticated) {
        setStep(0);
        return;
      }

      await useAuthStore.getState().refreshAuth();

      const { hasRole } = useAuthStore.getState();
      if (hasRole("Chef")) {
        setStep(2); // skip to Documents
      } else {
        setStep(1); // skip Account, go straight to Location
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

        {/* Step bar */}
        <StepBar current={step} />

        {/* Card */}
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
            <AccountStep role="Chef" onSuccess={() => setStep(1)} />
          )}
          {step === 1 && (
            <StepLocation
              onSuccess={async () => {
                await useAuthStore.getState().refreshAuth();
                setStep(2);
              }}
              onBack={() => setStep(0)}
            />
          )}
          {step === 2 && (
            <StepDocuments
              onSuccess={async () => {
                await useAuthStore.getState().refreshAuth();
                setStep(3);
              }}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && <StepDone />}
        </div>

        {/* Already a customer? */}
        {step === 0 && (
          <p className="text-center text-sm text-[--text-muted] mt-4">
            Signing up as a customer instead?{" "}
            <Link
              to="/register"
              className="text-brand-500 font-semibold hover:underline"
            >
              Customer sign up
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
