import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight,
  ChevronLeft,
  X,
  Check,
  Plus,
  Upload,
  Image as ImageIcon,
  Info,
  Trash2,
  GripVertical,
  Settings2,
  Loader2,
  UtensilsCrossed,
  Layers,
  ArrowRight,
} from "lucide-react";
import { chefMealsApi, type DishType } from "@/api/chefMeals";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface VariantDraft {
  clientId: string;
  serverId: string | null; // null until POST /variants succeeds
  name: string;
  price: string;
  isDefault: boolean;
}

interface SideDishDraft {
  clientId: string;
  serverId: string | null;
  name: string;
  price: string;
  isFree: boolean;
  isRequired: boolean;
}

interface ToppingOptionDraft {
  clientId: string;
  serverId: string | null;
  name: string;
  extraPrice: string;
  isFree: boolean;
}

interface ToppingGroupDraft {
  clientId: string;
  serverId: string | null;
  name: string;
  minSelections: number;
  maxSelections: number;
  options: ToppingOptionDraft[];
  isOpen: boolean; // UI accordion state only
}

interface WizardState {
  // Step 0 — Basics
  name: string;
  description: string;
  dishType: DishType | null;
  cuisineType: string;

  // Step 1 — Variants (live sync)
  variants: VariantDraft[];

  // Step 2 — Extras (live sync)
  hasSideDishes: boolean;
  sideDishes: SideDishDraft[];
  hasToppings: boolean;
  toppingGroups: ToppingGroupDraft[];

  // Step 3 — Photo
  imageFile: File | null;
  imagePreview: string | null;

  // Server state
  mealId: string | null;
}

const STEPS = ["Basics", "Variants", "Extras", "Photo", "Review"];
const CURRENCY = "EGP";

const DISH_TYPES: { value: DishType; label: string; icon: string }[] = [
  { value: "MainDish", label: "Main Dish", icon: "🍽️" },
  { value: "SideDish", label: "Side Dish", icon: "🥗" },
  { value: "Dessert", label: "Dessert", icon: "🎂" },
  { value: "Appetizer", label: "Appetizer", icon: "🥟" },
];

const CUISINES = [
  "Egyptian",
  "Lebanese",
  "Syrian",
  "Moroccan",
  "Turkish",
  "Italian",
  "Indian",
  "Chinese",
  "American",
  "French",
  "Other",
];

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function StepHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6">
      <h2 className="font-display text-2xl font-bold text-[--text-primary]">
        {title}
      </h2>
      {subtitle && (
        <p className="text-sm text-[--text-muted] mt-1">{subtitle}</p>
      )}
    </div>
  );
}

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-semibold text-[--text-primary] mb-1">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function InlineError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
      <X size={11} className="shrink-0" /> {message}
    </p>
  );
}

// ── Step 0: Basics ────────────────────────────────────────────────────────────

function StepBasics({
  state,
  set,
}: {
  state: WizardState;
  set: (p: Partial<WizardState>) => void;
}) {
  const [showCuisine, setShowCuisine] = useState(false);
  const MAX_DESC = 600;

  return (
    <div className="flex flex-col gap-5">
      <StepHeading
        title="Basics"
        subtitle="Name, category, and a description."
      />

      {/* Name */}
      <div>
        <FieldLabel required>Dish Name</FieldLabel>
        <input
          autoFocus
          type="text"
          value={state.name}
          onChange={(e) => set({ name: e.target.value.slice(0, 200) })}
          placeholder="E.g. Chicken Shawarma"
          className="w-full border border-[--border] rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-500 transition-colors bg-white"
        />
      </div>

      {/* Dish Type */}
      <div>
        <FieldLabel required>Category</FieldLabel>
        <div className="grid grid-cols-4 gap-2">
          {DISH_TYPES.map((dt) => (
            <button
              key={dt.value}
              onClick={() => set({ dishType: dt.value })}
              className={cn(
                "flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 text-xs font-medium transition-all",
                state.dishType === dt.value
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-[--border] text-[--text-muted] hover:border-brand-300",
              )}
            >
              <span className="text-2xl">{dt.icon}</span>
              {dt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cuisine */}
      <div className="relative">
        <FieldLabel>Cuisine</FieldLabel>
        <button
          onClick={() => setShowCuisine((s) => !s)}
          className="w-full flex items-center justify-between px-4 py-3 border border-[--border] rounded-xl bg-white text-sm text-[--text-muted] hover:border-brand-400 transition-colors"
        >
          <span>{state.cuisineType || "Select a cuisine (optional)"}</span>
          <ChevronRight
            size={16}
            className={cn("transition-transform", showCuisine && "rotate-90")}
          />
        </button>
        {showCuisine && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-[--border] rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
            {CUISINES.map((c) => (
              <button
                key={c}
                onClick={() => {
                  set({ cuisineType: c });
                  setShowCuisine(false);
                }}
                className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-brand-50 text-left transition-colors"
              >
                {c}
                {state.cuisineType === c && (
                  <Check size={14} className="text-brand-500" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Description */}
      <div>
        <FieldLabel required>Description</FieldLabel>
        <textarea
          value={state.description}
          onChange={(e) =>
            set({ description: e.target.value.slice(0, MAX_DESC) })
          }
          placeholder="Describe your dish — ingredients, flavours, what makes it special."
          rows={4}
          className="w-full border border-[--border] rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-500 transition-colors resize-none bg-white"
        />
        <p className="text-xs text-[--text-muted] mt-1 text-right">
          {state.description.length} / {MAX_DESC}
        </p>
      </div>
    </div>
  );
}

// ── Step 1: Variants (live sync) ──────────────────────────────────────────────

function StepVariants({
  state,
  set,
  mealId,
}: {
  state: WizardState;
  set: (p: Partial<WizardState>) => void;
  mealId: string | null;
}) {
  const [nameInput, setNameInput] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addVariant = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed || !priceInput || parseFloat(priceInput) <= 0 || !mealId)
      return;
    if (
      state.variants.some((v) => v.name.toLowerCase() === trimmed.toLowerCase())
    ) {
      setError(`A variant named "${trimmed}" already exists.`);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await chefMealsApi.addVariant(mealId, {
        name: trimmed,
        price: parseFloat(priceInput),
        currency: CURRENCY,
      });
      set({
        variants: [
          ...state.variants,
          {
            clientId: uid(),
            serverId: res.variantId,
            name: trimmed,
            price: priceInput,
            isDefault: state.variants.length === 0,
          },
        ],
      });
      setNameInput("");
      setPriceInput("");
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Could not add variant.");
    } finally {
      setPending(false);
    }
  };

  const removeVariant = async (clientId: string) => {
    const v = state.variants.find((x) => x.clientId === clientId);
    if (!v || !mealId) return;
    if (state.variants.length <= 1) {
      setError("You must have at least one variant.");
      return;
    }
    if (v.serverId) {
      try {
        await chefMealsApi.removeVariant(mealId, v.serverId);
      } catch (e: any) {
        setError(e?.response?.data?.detail ?? "Could not remove variant.");
        return;
      }
    }
    const remaining = state.variants.filter((x) => x.clientId !== clientId);
    // Auto-promote first remaining if we deleted the default
    if (v.isDefault && remaining.length > 0) {
      remaining[0] = { ...remaining[0], isDefault: true };
      if (remaining[0].serverId) {
        chefMealsApi
          .setDefaultVariant(mealId, remaining[0].serverId)
          .catch(() => {});
      }
    }
    set({ variants: remaining });
  };

  const setDefault = async (clientId: string) => {
    const v = state.variants.find((x) => x.clientId === clientId);
    if (!v?.serverId || !mealId) return;
    try {
      await chefMealsApi.setDefaultVariant(mealId, v.serverId);
      set({
        variants: state.variants.map((x) => ({
          ...x,
          isDefault: x.clientId === clientId,
        })),
      });
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Could not set default.");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <StepHeading
        title="Variants & Pricing"
        subtitle="Add every size or format you offer. The first variant becomes the default."
      />

      {/* Existing variants */}
      {state.variants.length > 0 && (
        <div className="flex flex-col gap-2">
          {state.variants.map((v) => (
            <div
              key={v.clientId}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all",
                v.isDefault
                  ? "border-brand-400 bg-brand-50"
                  : "border-[--border] bg-white",
              )}
            >
              <GripVertical
                size={16}
                className="text-[--text-muted] shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[--text-primary] truncate">
                  {v.name}
                </p>
                <p className="text-xs text-[--text-muted]">
                  {v.price} {CURRENCY}
                </p>
              </div>
              {v.isDefault ? (
                <span className="text-xs font-semibold text-brand-600 bg-brand-100 px-2.5 py-1 rounded-full shrink-0">
                  Default
                </span>
              ) : (
                <button
                  onClick={() => setDefault(v.clientId)}
                  className="text-xs text-[--text-muted] hover:text-brand-600 transition-colors shrink-0"
                >
                  Set default
                </button>
              )}
              <button
                onClick={() => removeVariant(v.clientId)}
                disabled={v.isDefault && state.variants.length === 1}
                className="text-[--text-muted] hover:text-red-500 transition-colors disabled:opacity-30 shrink-0"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add row */}
      <div className="flex flex-col gap-3 p-4 border border-dashed border-[--border] rounded-xl bg-brand-50/30">
        <p className="text-sm font-semibold text-[--text-primary]">
          Add a variant
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addVariant()}
            placeholder="E.g. Regular, Family Pack, 500ml…"
            maxLength={100}
            className="flex-1 border border-[--border] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 bg-white"
          />
          <div className="relative w-32">
            <input
              type="number"
              min="0"
              step="0.5"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              placeholder="0.00"
              className="w-full border border-[--border] rounded-xl px-4 py-2.5 pr-12 text-sm outline-none focus:border-brand-500 bg-white"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[--text-muted] pointer-events-none">
              {CURRENCY}
            </span>
          </div>
          <button
            onClick={addVariant}
            disabled={
              pending ||
              !nameInput.trim() ||
              !priceInput ||
              parseFloat(priceInput) <= 0
            }
            className="btn-primary px-4 py-2.5 rounded-xl disabled:opacity-40 shrink-0"
          >
            {pending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Plus size={16} />
            )}
          </button>
        </div>
        <InlineError message={error} />
      </div>

      {state.variants.length === 0 && (
        <p className="text-center text-sm text-[--text-muted] py-4 border border-dashed border-[--border] rounded-xl">
          No variants yet — add at least one to continue.
        </p>
      )}
    </div>
  );
}

// ── Step 2: Extras — Side Dishes + Topping Groups (live sync) ─────────────────

function StepExtras({
  state,
  set,
  mealId,
}: {
  state: WizardState;
  set: (p: Partial<WizardState>) => void;
  mealId: string | null;
}) {
  const [error, setError] = useState<string | null>(null);

  // ── Side dishes ───────────────────────────────────────────────────────────

  const [sdName, setSdName] = useState("");
  const [sdPrice, setSdPrice] = useState("");
  const [sdFree, setSdFree] = useState(true);
  const [sdRequired, setSdRequired] = useState(false);

  const addSideDish = async () => {
    const trimmed = sdName.trim();
    if (!trimmed || !mealId) return;
    setError(null);
    try {
      const res = await chefMealsApi.addSideDish(mealId, {
        name: trimmed,
        description: null,
        price: sdFree ? 0 : parseFloat(sdPrice) || 0,
        currency: CURRENCY,
        isRequired: sdRequired,
      });
      set({
        sideDishes: [
          ...state.sideDishes,
          {
            clientId: uid(),
            serverId: res.sideDishId,
            name: trimmed,
            price: sdFree ? "0" : sdPrice,
            isFree: sdFree,
            isRequired: sdRequired,
          },
        ],
      });
      setSdName("");
      setSdPrice("");
      setSdFree(true);
      setSdRequired(false);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Could not add side dish.");
    }
  };

  const removeSideDish = async (clientId: string) => {
    const sd = state.sideDishes.find((x) => x.clientId === clientId);
    if (!sd || !mealId) return;
    if (sd.serverId) {
      try {
        await chefMealsApi.removeSideDish(mealId, sd.serverId);
      } catch (e: any) {
        setError(e?.response?.data?.detail ?? "Could not remove side dish.");
        return;
      }
    }
    set({
      sideDishes: state.sideDishes.filter((x) => x.clientId !== clientId),
    });
  };

  // ── Topping groups ────────────────────────────────────────────────────────

  const [tgName, setTgName] = useState("");
  const [tgMin, setTgMin] = useState(0);
  const [tgMax, setTgMax] = useState(1);

  const addToppingGroup = async () => {
    const trimmed = tgName.trim();
    if (!trimmed || !mealId || tgMin > tgMax) return;
    setError(null);
    try {
      const res = await chefMealsApi.addToppingGroup(mealId, {
        name: trimmed,
        minSelections: tgMin,
        maxSelections: tgMax,
      });
      set({
        toppingGroups: [
          ...state.toppingGroups,
          {
            clientId: uid(),
            serverId: res.toppingGroupId,
            name: trimmed,
            minSelections: tgMin,
            maxSelections: tgMax,
            options: [],
            isOpen: true,
          },
        ],
      });
      setTgName("");
      setTgMin(0);
      setTgMax(1);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Could not add topping group.");
    }
  };

  const removeToppingGroup = async (clientId: string) => {
    const tg = state.toppingGroups.find((x) => x.clientId === clientId);
    if (!tg || !mealId) return;
    if (tg.serverId) {
      try {
        await chefMealsApi.removeToppingGroup(mealId, tg.serverId);
      } catch (e: any) {
        setError(e?.response?.data?.detail ?? "Could not remove group.");
        return;
      }
    }
    set({
      toppingGroups: state.toppingGroups.filter((x) => x.clientId !== clientId),
    });
  };

  const addToppingOption = async (
    groupClientId: string,
    name: string,
    price: string,
    isFree: boolean,
  ) => {
    const tg = state.toppingGroups.find((x) => x.clientId === groupClientId);
    if (!tg?.serverId || !mealId) return;
    setError(null);
    try {
      const res = await chefMealsApi.addToppingOption(mealId, tg.serverId, {
        name: name.trim(),
        extraPrice: isFree ? 0 : parseFloat(price) || 0,
        currency: CURRENCY,
      });
      set({
        toppingGroups: state.toppingGroups.map((g) =>
          g.clientId === groupClientId
            ? {
                ...g,
                options: [
                  ...g.options,
                  {
                    clientId: uid(),
                    serverId: res.optionId,
                    name: name.trim(),
                    extraPrice: isFree ? "0" : price,
                    isFree,
                  },
                ],
              }
            : g,
        ),
      });
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Could not add option.");
    }
  };

  const removeToppingOption = async (
    groupClientId: string,
    optionClientId: string,
  ) => {
    const tg = state.toppingGroups.find((x) => x.clientId === groupClientId);
    const opt = tg?.options.find((o) => o.clientId === optionClientId);
    if (!tg || !opt || !mealId) return;
    if (tg.serverId && opt.serverId) {
      try {
        await chefMealsApi.removeToppingOption(
          mealId,
          tg.serverId,
          opt.serverId,
        );
      } catch (e: any) {
        setError(e?.response?.data?.detail ?? "Could not remove option.");
        return;
      }
    }
    set({
      toppingGroups: state.toppingGroups.map((g) =>
        g.clientId === groupClientId
          ? {
              ...g,
              options: g.options.filter((o) => o.clientId !== optionClientId),
            }
          : g,
      ),
    });
  };

  const toggleGroup = (clientId: string) =>
    set({
      toppingGroups: state.toppingGroups.map((g) =>
        g.clientId === clientId ? { ...g, isOpen: !g.isOpen } : g,
      ),
    });

  return (
    <div className="flex flex-col gap-8">
      <StepHeading
        title="Extras"
        subtitle="Optional side dishes and topping customisations."
      />

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
          <X size={14} className="shrink-0" /> {error}
        </div>
      )}

      {/* ── Side dishes ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[--text-primary]">
            Side Dishes
          </p>
          <div className="flex gap-4">
            {[true, false].map((v) => (
              <label
                key={String(v)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="radio"
                  checked={state.hasSideDishes === v}
                  onChange={() => set({ hasSideDishes: v })}
                  className="w-4 h-4 accent-brand-500"
                />
                <span className="text-sm">{v ? "Yes" : "No"}</span>
              </label>
            ))}
          </div>
        </div>

        {state.hasSideDishes && (
          <>
            {state.sideDishes.map((sd) => (
              <div
                key={sd.clientId}
                className="flex items-center gap-3 px-4 py-3 border border-[--border] rounded-xl bg-white"
              >
                <UtensilsCrossed
                  size={15}
                  className="text-brand-500 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[--text-primary] truncate">
                    {sd.name}
                  </p>
                  <p className="text-xs text-[--text-muted]">
                    {sd.isFree ? "Free" : `${sd.price} ${CURRENCY}`}
                    {sd.isRequired && " · Required"}
                  </p>
                </div>
                <button
                  onClick={() => removeSideDish(sd.clientId)}
                  className="text-[--text-muted] hover:text-red-500 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>
            ))}

            {/* Add side dish */}
            <div className="flex flex-col gap-2 p-4 border border-dashed border-[--border] rounded-xl bg-brand-50/30">
              <div className="flex gap-2">
                <input
                  value={sdName}
                  onChange={(e) => setSdName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addSideDish()}
                  placeholder="Side dish name"
                  className="flex-1 border border-[--border] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 bg-white"
                />
                {!sdFree && (
                  <div className="relative w-28">
                    <input
                      type="number"
                      min="0"
                      value={sdPrice}
                      onChange={(e) => setSdPrice(e.target.value)}
                      placeholder="0"
                      className="w-full border border-[--border] rounded-xl px-4 py-2.5 pr-12 text-sm outline-none focus:border-brand-500 bg-white"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[--text-muted] pointer-events-none">
                      {CURRENCY}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => setSdFree((s) => !s)}
                  className={cn(
                    "px-3 py-2.5 text-xs font-semibold rounded-xl border transition-colors shrink-0",
                    sdFree
                      ? "bg-brand-50 text-brand-700 border-brand-200"
                      : "text-[--text-muted] border-[--border]",
                  )}
                >
                  {sdFree ? "Free" : "Paid"}
                </button>
                <button
                  onClick={addSideDish}
                  disabled={!sdName.trim()}
                  className="btn-primary px-4 py-2.5 rounded-xl disabled:opacity-40 shrink-0"
                >
                  <Plus size={16} />
                </button>
              </div>
              {/* Required toggle */}
              <div className="flex items-center gap-3 text-xs text-[--text-muted]">
                <span className="font-medium">Required?</span>
                {[false, true].map((v) => (
                  <label
                    key={String(v)}
                    className="flex items-center gap-1.5 cursor-pointer"
                  >
                    <input
                      type="radio"
                      checked={sdRequired === v}
                      onChange={() => setSdRequired(v)}
                      className="w-3 h-3 accent-brand-500"
                    />
                    {v ? "Yes" : "No"}
                  </label>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Topping groups ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[--text-primary]">
            Topping Groups
          </p>
          <div className="flex gap-4">
            {[true, false].map((v) => (
              <label
                key={String(v)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="radio"
                  checked={state.hasToppings === v}
                  onChange={() => set({ hasToppings: v })}
                  className="w-4 h-4 accent-brand-500"
                />
                <span className="text-sm">{v ? "Yes" : "No"}</span>
              </label>
            ))}
          </div>
        </div>

        {state.hasToppings && (
          <>
            {/* Existing groups */}
            {state.toppingGroups.map((tg) => (
              <div
                key={tg.clientId}
                className="border border-[--border] rounded-xl bg-white overflow-hidden"
              >
                <button
                  onClick={() => toggleGroup(tg.clientId)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                >
                  <div>
                    <p className="text-sm font-semibold text-[--text-primary]">
                      {tg.name}
                    </p>
                    <p className="text-xs text-[--text-muted]">
                      {tg.minSelections === 0 ? "Optional" : "Required"} · pick{" "}
                      {tg.minSelections === tg.maxSelections
                        ? tg.minSelections
                        : `${tg.minSelections}–${tg.maxSelections}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ChevronRight
                      size={15}
                      className={cn(
                        "text-[--text-muted] transition-transform",
                        tg.isOpen && "rotate-90",
                      )}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeToppingGroup(tg.clientId);
                      }}
                      className="text-[--text-muted] hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </button>

                {tg.isOpen && (
                  <div className="px-4 pb-4 flex flex-col gap-2 border-t border-[--border]">
                    {tg.options.map((opt) => (
                      <div
                        key={opt.clientId}
                        className="flex items-center gap-2 pl-3 py-1.5"
                      >
                        <Layers size={13} className="text-brand-500 shrink-0" />
                        <span className="flex-1 text-sm text-[--text-primary]">
                          {opt.name}
                        </span>
                        <span className="text-xs text-[--text-muted]">
                          {parseFloat(opt.extraPrice) === 0
                            ? "Free"
                            : `+${opt.extraPrice} ${CURRENCY}`}
                        </span>
                        <button
                          onClick={() =>
                            removeToppingOption(tg.clientId, opt.clientId)
                          }
                          className="text-[--text-muted] hover:text-red-500 transition-colors"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                    <ToppingOptionInput
                      onAdd={(name, price, isFree) =>
                        addToppingOption(tg.clientId, name, price, isFree)
                      }
                    />
                  </div>
                )}
              </div>
            ))}

            {/* Add group */}
            <div className="flex flex-col gap-3 p-4 border border-dashed border-[--border] rounded-xl bg-brand-50/30">
              <p className="text-sm font-semibold text-[--text-primary] flex items-center gap-2">
                <Settings2 size={14} /> New topping group
              </p>
              <input
                value={tgName}
                onChange={(e) => setTgName(e.target.value)}
                placeholder="Group name, e.g. Spice level"
                className="w-full border border-[--border] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 bg-white"
              />
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-[--text-muted] font-medium">
                    Min
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={tgMin}
                    onChange={(e) =>
                      setTgMin(Math.max(0, parseInt(e.target.value) || 0))
                    }
                    className="w-16 border border-[--border] rounded-lg px-2 py-2 text-sm text-center outline-none focus:border-brand-500 bg-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-[--text-muted] font-medium">
                    Max
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={tgMax}
                    onChange={(e) =>
                      setTgMax(Math.max(1, parseInt(e.target.value) || 1))
                    }
                    className="w-16 border border-[--border] rounded-lg px-2 py-2 text-sm text-center outline-none focus:border-brand-500 bg-white"
                  />
                </div>
                <p className="text-xs text-[--text-muted] self-center">
                  Min 0 = optional
                </p>
              </div>
              <button
                onClick={addToppingGroup}
                disabled={!tgName.trim() || tgMin > tgMax}
                className="btn-primary py-2.5 rounded-xl text-sm disabled:opacity-40 flex items-center justify-center gap-1"
              >
                <Plus size={15} /> Add Group
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ToppingOptionInput({
  onAdd,
}: {
  onAdd: (name: string, price: string, isFree: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [isFree, setIsFree] = useState(true);

  const submit = () => {
    if (!name.trim()) return;
    onAdd(name.trim(), price, isFree);
    setName("");
    setPrice("");
    setIsFree(true);
  };

  return (
    <div className="flex gap-2 mt-1 pt-2 border-t border-[--border]">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Option name"
        className="flex-1 border border-[--border] rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-500 bg-white"
      />
      {!isFree && (
        <div className="relative w-24">
          <input
            type="number"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0"
            className="w-full border border-[--border] rounded-lg px-3 py-2 pr-8 text-sm outline-none focus:border-brand-500 bg-white"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[--text-muted] pointer-events-none">
            {CURRENCY}
          </span>
        </div>
      )}
      <button
        onClick={() => setIsFree((s) => !s)}
        className={cn(
          "px-3 py-2 text-xs font-semibold rounded-lg border transition-colors shrink-0",
          isFree
            ? "bg-brand-50 text-brand-700 border-brand-200"
            : "text-[--text-muted] border-[--border]",
        )}
      >
        {isFree ? "Free" : "Paid"}
      </button>
      <button
        onClick={submit}
        disabled={!name.trim()}
        className="btn-primary px-3 py-2 rounded-lg disabled:opacity-40 shrink-0"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

// ── Step 3: Photo ─────────────────────────────────────────────────────────────

function StepPhoto({
  state,
  set,
}: {
  state: WizardState;
  set: (p: Partial<WizardState>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (state.imagePreview) URL.revokeObjectURL(state.imagePreview);
    set({ imageFile: file, imagePreview: URL.createObjectURL(file) });
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [state.imagePreview],
  );

  const clearImage = () => {
    if (state.imagePreview) URL.revokeObjectURL(state.imagePreview);
    set({ imageFile: null, imagePreview: null });
  };

  return (
    <div className="flex flex-col gap-5">
      <StepHeading
        title="Add a Photo"
        subtitle="A great photo makes customers 3× more likely to order."
      />

      {state.imagePreview ? (
        <div className="relative rounded-2xl overflow-hidden aspect-video">
          <img
            src={state.imagePreview}
            alt="Preview"
            className="w-full h-full object-cover"
          />
          <button
            onClick={clearImage}
            className="absolute top-3 right-3 w-8 h-8 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
          >
            <X size={14} />
          </button>
          <div className="absolute bottom-3 left-3 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full truncate max-w-[60%]">
            {state.imageFile?.name}
          </div>
        </div>
      ) : (
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-[--border] rounded-2xl p-12 flex flex-col items-center gap-4 cursor-pointer hover:border-brand-400 hover:bg-brand-50/50 transition-all"
        >
          <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center">
            <ImageIcon size={28} className="text-brand-600" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-[--text-primary]">
              Drag & drop or click to upload
            </p>
            <p className="text-xs text-[--text-muted] mt-1">
              JPG, PNG or WebP — max 15 MB
            </p>
          </div>
          <button className="btn-outline py-2 px-5 text-sm flex items-center gap-2">
            <Upload size={14} /> Choose file
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      <div className="p-3 bg-brand-50 rounded-xl text-xs text-[--text-muted] flex gap-2">
        <Info size={14} className="shrink-0 text-brand-500 mt-0.5" />
        <span>
          You can skip this and add a photo later from your menu dashboard.
        </span>
      </div>
    </div>
  );
}

// ── Step 4: Review ────────────────────────────────────────────────────────────

function ReviewCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-4 border border-[--border] rounded-xl bg-white">
      <p className="text-xs font-semibold text-[--text-muted] uppercase tracking-wider mb-3">
        {title}
      </p>
      {children}
    </div>
  );
}

function StepReview({ state }: { state: WizardState }) {
  return (
    <div className="flex flex-col gap-5">
      <StepHeading
        title="Review"
        subtitle="Double-check everything before publishing."
      />

      <ReviewCard title="Basics">
        <p className="text-sm font-semibold text-[--text-primary]">
          {state.name}
        </p>
        <p className="text-xs text-[--text-muted] mt-0.5">
          {state.dishType} · {state.cuisineType || "No cuisine"}
        </p>
        <p className="text-sm text-[--text-primary] mt-2 whitespace-pre-wrap">
          {state.description}
        </p>
      </ReviewCard>

      <ReviewCard title="Variants">
        {state.variants.length === 0 ? (
          <p className="text-sm text-[--text-muted]">No variants added.</p>
        ) : (
          state.variants.map((v) => (
            <div
              key={v.clientId}
              className="flex items-center justify-between py-1"
            >
              <span className="text-sm text-[--text-primary]">
                {v.name}
                {v.isDefault && (
                  <span className="text-xs text-brand-600 font-medium ml-2">
                    (default)
                  </span>
                )}
              </span>
              <span className="text-sm font-medium text-[--text-primary]">
                {v.price} {CURRENCY}
              </span>
            </div>
          ))
        )}
      </ReviewCard>

      {state.hasSideDishes && state.sideDishes.length > 0 && (
        <ReviewCard title="Side Dishes">
          {state.sideDishes.map((sd) => (
            <div
              key={sd.clientId}
              className="flex items-center justify-between py-1"
            >
              <span className="text-sm text-[--text-primary]">
                {sd.name}
                {sd.isRequired && (
                  <span className="text-xs text-orange-600 ml-1">
                    (required)
                  </span>
                )}
              </span>
              <span className="text-xs text-[--text-muted]">
                {sd.isFree ? "Free" : `${sd.price} ${CURRENCY}`}
              </span>
            </div>
          ))}
        </ReviewCard>
      )}

      {state.hasToppings && state.toppingGroups.length > 0 && (
        <ReviewCard title="Toppings">
          {state.toppingGroups.map((tg) => (
            <div key={tg.clientId} className="py-2 first:pt-0">
              <p className="text-sm font-semibold text-[--text-primary]">
                {tg.name}
              </p>
              <p className="text-xs text-[--text-muted] mb-1.5">
                {tg.minSelections === 0 ? "Optional" : "Required"} ·{" "}
                {tg.minSelections}–{tg.maxSelections} selections
              </p>
              <div className="flex flex-wrap gap-1.5">
                {tg.options.map((opt) => (
                  <span
                    key={opt.clientId}
                    className="text-xs bg-[--bg] border border-[--border] px-2 py-1 rounded-lg text-[--text-muted]"
                  >
                    {opt.name}
                    {parseFloat(opt.extraPrice) > 0 && ` (+${opt.extraPrice})`}
                  </span>
                ))}
                {tg.options.length === 0 && (
                  <span className="text-xs text-[--text-muted]">
                    No options added.
                  </span>
                )}
              </div>
            </div>
          ))}
        </ReviewCard>
      )}

      <ReviewCard title="Photo">
        {state.imagePreview ? (
          <img
            src={state.imagePreview}
            alt="Meal"
            className="w-full h-44 object-cover rounded-xl"
          />
        ) : (
          <p className="text-sm text-[--text-muted]">
            No photo — you can add one from the dashboard.
          </p>
        )}
      </ReviewCard>
    </div>
  );
}

// ── Wizard shell ──────────────────────────────────────────────────────────────

const initialState: WizardState = {
  name: "",
  description: "",
  dishType: null,
  cuisineType: "",
  variants: [],
  hasSideDishes: false,
  sideDishes: [],
  hasToppings: false,
  toppingGroups: [],
  imageFile: null,
  imagePreview: null,
  mealId: null,
};

export default function CreateMealWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const set = useCallback(
    (patch: Partial<WizardState>) => setState((s) => ({ ...s, ...patch })),
    [],
  );

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (state.imagePreview) URL.revokeObjectURL(state.imagePreview);
    };
  }, []);

  const canAdvance = (): boolean => {
    if (step === 0)
      return (
        state.name.trim().length > 0 &&
        state.dishType !== null &&
        state.description.trim().length > 0
      );
    if (step === 1) return state.variants.length > 0;
    return true;
  };

  const submitStep = async () => {
    setError(null);
    setLoading(true);
    try {
      // Step 0: create or update the meal core
      if (step === 0) {
        if (!state.mealId) {
          const res = await chefMealsApi.create({
            name: state.name,
            description: state.description || null,
            dishType: state.dishType || "MainDish",
            cuisineType: state.cuisineType || null,
          });
          set({ mealId: res.mealId });
        } else {
          // Chef went back and changed basics — sync update
          await chefMealsApi.update(state.mealId, {
            name: state.name,
            description: state.description || null,
            dishType: state.dishType || "MainDish",
            cuisineType: state.cuisineType || null,
          });
        }
      }

      // Step 3: upload photo if provided
      if (step === 3 && state.mealId && state.imageFile) {
        await chefMealsApi.uploadImage(state.mealId, state.imageFile);
      }

      // Step 4 (Review): publish and navigate away
      if (step === 4 && state.mealId) {
        await chefMealsApi.publish(state.mealId);
        navigate("/chef/menu");
        return;
      }

      setCompletedSteps((prev) => new Set([...prev, step]));
      setStep((s) => s + 1);
    } catch (e: any) {
      setError(
        e?.response?.data?.detail ??
          e?.response?.data?.title ??
          "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const isLastStep = step === STEPS.length - 1;

  return (
    <div className="flex flex-col h-full bg-[--bg]">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-[--border] shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-display font-bold text-brand-600 text-lg">
            Ta'am Beit
          </span>
          <span className="bg-[--bg] text-[--text-muted] text-xs font-medium px-2.5 py-1 rounded-full border border-[--border]">
            {isLastStep
              ? "Ready to publish"
              : state.mealId
                ? "Draft saved"
                : "New meal"}
          </span>
        </div>
        <button
          onClick={() => navigate("/chef/menu")}
          className="text-sm text-[--text-muted] hover:text-[--text-primary] transition-colors px-4 py-2 rounded-xl hover:bg-[--bg] border border-transparent hover:border-[--border]"
        >
          Exit
        </button>
      </header>

      {/* Step breadcrumb */}
      <div className="flex items-center gap-1 px-6 py-3 bg-white border-b border-[--border] overflow-x-auto scrollbar-hide shrink-0">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => completedSteps.has(i) && setStep(i)}
              className={cn(
                "flex items-center gap-1.5 text-sm font-medium px-2 py-1 rounded-lg transition-colors",
                i === step
                  ? "text-brand-600 bg-brand-50"
                  : completedSteps.has(i)
                    ? "text-brand-500 hover:text-brand-600 cursor-pointer"
                    : "text-[--text-muted] cursor-default",
              )}
            >
              {completedSteps.has(i) && i !== step && <Check size={12} />}
              {label}
            </button>
            {i < STEPS.length - 1 && (
              <ChevronRight size={14} className="text-[--border]" />
            )}
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-[--border] shrink-0">
        <div
          className="h-full bg-brand-500 transition-all duration-500"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-xl mx-auto w-full px-6 py-8">
          {step === 0 && <StepBasics state={state} set={set} />}
          {step === 1 && (
            <StepVariants state={state} set={set} mealId={state.mealId} />
          )}
          {step === 2 && (
            <StepExtras state={state} set={set} mealId={state.mealId} />
          )}
          {step === 3 && <StepPhoto state={state} set={set} />}
          {step === 4 && <StepReview state={state} />}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mb-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2 shrink-0">
          <X size={14} className="shrink-0" /> {error}
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Footer */}
      <footer className="px-6 py-4 bg-white border-t border-[--border] flex items-center justify-between shrink-0">
        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === step
                  ? "w-6 bg-brand-500"
                  : completedSteps.has(i)
                    ? "w-3 bg-brand-300"
                    : "w-3 bg-[--border]",
              )}
            />
          ))}
        </div>

        <div className="flex items-center gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="btn-outline py-2.5 px-5 text-sm flex items-center gap-1"
            >
              <ChevronLeft size={16} /> Back
            </button>
          )}
          <button
            onClick={submitStep}
            disabled={!canAdvance() || loading}
            className="btn-primary py-2.5 px-8 text-sm disabled:opacity-40 flex items-center gap-1.5"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : isLastStep ? (
              <>
                <Check size={15} /> Publish <ArrowRight size={15} />
              </>
            ) : (
              <>
                Next <ChevronRight size={16} />
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}
