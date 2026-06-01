import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Save,
  Trash2,
  Plus,
  X,
  ChevronRight,
  Upload,
  Image as ImageIcon,
  Check,
  Info,
  Settings2,
  GripVertical,
  AlertCircle,
  Loader2,
  UtensilsCrossed,
  Layers,
} from "lucide-react";
import api from "@/api/client";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type DishType = "MainDish" | "SideDish" | "Dessert" | "Appetizer";

interface MealDetailResponse {
  id: string;
  name: string;
  description: string | null;
  dishType: DishType;
  cuisineType: string | null;
  isAvailable: boolean;
  imageUrl: string | null;
  variants: {
    id: string;
    name: string;
    price: number;
    currency: string;
    isDefault: boolean;
  }[];
  sideDishes: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    currency: string;
    isRequired: boolean;
  }[];
  toppingGroups: {
    id: string;
    name: string;
    minSelections: number;
    maxSelections: number;
    options: {
      id: string;
      name: string;
      extraPrice: number;
      currency: string;
    }[];
  }[];
}

// Edit-specific entries: server ID is always present (loaded from API),
// pendingDelete means it will be removed on save
interface VariantEntry {
  clientId: string;
  serverId: string;
  name: string;
  price: string;
  isDefault: boolean;
  dirty: boolean;
  pendingDelete: boolean;
}

interface SideDishEntry {
  clientId: string;
  serverId: string;
  name: string;
  price: string;
  isFree: boolean;
  isRequired: boolean;
  dirty: boolean;
  pendingDelete: boolean;
}

interface ToppingOptionEntry {
  clientId: string;
  serverId: string;
  name: string;
  price: string;
  isFree: boolean;
  pendingDelete: boolean;
}

interface ToppingGroupEntry {
  clientId: string;
  serverId: string;
  name: string;
  minSelections: number;
  maxSelections: number;
  options: ToppingOptionEntry[];
  isOpen: boolean;
  dirty: boolean;
  pendingDelete: boolean;
}

interface EditState {
  name: string;
  description: string;
  dishType: DishType;
  cuisineType: string;
  variants: VariantEntry[];
  sideDishes: SideDishEntry[];
  toppingGroups: ToppingGroupEntry[];
  imageFile: File | null;
  imagePreview: string | null;
  currentImageUrl: string | null;
}

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

function SectionCard({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[--border] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[--border]">
        <h3 className="font-semibold text-[--text-primary] text-sm">{title}</h3>
        {action}
      </div>
      <div className="p-5">{children}</div>
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
    <label className="block text-xs font-semibold text-[--text-muted] uppercase tracking-wide mb-1.5">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function DirtyBadge() {
  return (
    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full shrink-0">
      unsaved
    </span>
  );
}

// ── State builder from API response ──────────────────────────────────────────

function buildEditState(meal: MealDetailResponse): EditState {
  return {
    name: meal.name,
    description: meal.description ?? "",
    dishType: meal.dishType,
    cuisineType: meal.cuisineType ?? "",
    currentImageUrl: meal.imageUrl,
    imageFile: null,
    imagePreview: null,
    variants: meal.variants.map((v) => ({
      clientId: uid(),
      serverId: v.id,
      name: v.name,
      price: String(v.price),
      isDefault: v.isDefault,
      dirty: false,
      pendingDelete: false,
    })),
    sideDishes: meal.sideDishes.map((s) => ({
      clientId: uid(),
      serverId: s.id,
      name: s.name,
      price: String(s.price),
      isFree: s.price === 0,
      isRequired: s.isRequired,
      dirty: false,
      pendingDelete: false,
    })),
    toppingGroups: meal.toppingGroups.map((g) => ({
      clientId: uid(),
      serverId: g.id,
      name: g.name,
      minSelections: g.minSelections,
      maxSelections: g.maxSelections,
      isOpen: false,
      dirty: false,
      pendingDelete: false,
      options: g.options.map((o) => ({
        clientId: uid(),
        serverId: o.id,
        name: o.name,
        price: String(o.extraPrice),
        isFree: o.extraPrice === 0,
        pendingDelete: false,
      })),
    })),
  };
}

// ── Variants section ──────────────────────────────────────────────────────────

function VariantsSection({
  mealId,
  variants,
  onChange,
}: {
  mealId: string;
  variants: VariantEntry[];
  onChange: (v: VariantEntry[]) => void;
}) {
  const [nameInput, setNameInput] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = variants.filter((v) => !v.pendingDelete);

  const addVariant = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed || !priceInput || parseFloat(priceInput) <= 0) return;
    if (visible.some((v) => v.name.toLowerCase() === trimmed.toLowerCase())) {
      setError(`"${trimmed}" already exists.`);
      return;
    }
    setAdding(true);
    setError(null);
    try {
      const res = await api.post<{ variantId: string }>(
        `/meals/${mealId}/variants`,
        {
          name: trimmed,
          price: parseFloat(priceInput),
          currency: CURRENCY,
        },
      );
      onChange([
        ...variants,
        {
          clientId: uid(),
          serverId: res.data.variantId,
          name: trimmed,
          price: priceInput,
          isDefault: visible.length === 0,
          dirty: false,
          pendingDelete: false,
        },
      ]);
      setNameInput("");
      setPriceInput("");
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Could not add variant.");
    } finally {
      setAdding(false);
    }
  };

  const markDelete = async (clientId: string) => {
    const v = variants.find((x) => x.clientId === clientId);
    if (!v) return;
    if (visible.length <= 1) {
      setError("A meal must have at least one variant.");
      return;
    }
    // Mark pending — will be deleted on Save
    const updated = variants.map((x) =>
      x.clientId === clientId ? { ...x, pendingDelete: true } : x,
    );
    // Promote default if needed
    if (v.isDefault) {
      const next = updated.find((x) => !x.pendingDelete);
      if (next)
        onChange(
          updated.map((x) =>
            x.clientId === next.clientId
              ? { ...x, isDefault: true, dirty: true }
              : x,
          ),
        );
      else onChange(updated);
    } else {
      onChange(updated);
    }
  };

  const updateVariant = (clientId: string, patch: Partial<VariantEntry>) =>
    onChange(
      variants.map((v) =>
        v.clientId === clientId ? { ...v, ...patch, dirty: true } : v,
      ),
    );

  const setDefault = async (clientId: string) => {
    const v = variants.find((x) => x.clientId === clientId);
    if (!v) return;
    try {
      await api.put(`/meals/${mealId}/variants/${v.serverId}/set-default`, {});
      onChange(
        variants.map((x) => ({ ...x, isDefault: x.clientId === clientId })),
      );
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Could not set default.");
    }
  };

  return (
    <SectionCard title="Variants & Pricing">
      <div className="flex flex-col gap-3">
        {visible.map((v) => (
          <div
            key={v.clientId}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all",
              v.isDefault
                ? "border-brand-400 bg-brand-50"
                : "border-[--border] bg-white",
            )}
          >
            <GripVertical size={15} className="text-[--text-muted] shrink-0" />
            <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2">
              <input
                type="text"
                value={v.name}
                onChange={(e) =>
                  updateVariant(v.clientId, { name: e.target.value })
                }
                maxLength={100}
                className="flex-1 text-sm font-medium bg-transparent outline-none border-b border-transparent focus:border-[--border] transition-colors min-w-0"
              />
              <div className="relative w-32 shrink-0">
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={v.price}
                  onChange={(e) =>
                    updateVariant(v.clientId, { price: e.target.value })
                  }
                  className="w-full border border-[--border] rounded-xl px-3 py-2 pr-12 text-sm outline-none focus:border-brand-500 bg-white"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[--text-muted] pointer-events-none">
                  {CURRENCY}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {v.dirty && <DirtyBadge />}
              {v.isDefault ? (
                <span className="text-xs font-semibold text-brand-600 bg-brand-100 px-2 py-0.5 rounded-full">
                  Default
                </span>
              ) : (
                <button
                  onClick={() => setDefault(v.clientId)}
                  className="text-xs text-[--text-muted] hover:text-brand-600 transition-colors whitespace-nowrap"
                >
                  Set default
                </button>
              )}
              <button
                onClick={() => markDelete(v.clientId)}
                disabled={v.isDefault && visible.length === 1}
                className="text-[--text-muted] hover:text-red-500 transition-colors disabled:opacity-30"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}

        {/* Add row */}
        <div className="flex gap-2 pt-2 border-t border-[--border]">
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addVariant()}
            placeholder="New variant name…"
            maxLength={100}
            className="flex-1 border border-[--border] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 bg-white"
          />
          <div className="relative w-32 shrink-0">
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
              adding ||
              !nameInput.trim() ||
              !priceInput ||
              parseFloat(priceInput) <= 0
            }
            className="btn-primary px-4 py-2.5 rounded-xl disabled:opacity-40 shrink-0 flex items-center gap-1 text-sm"
          >
            {adding ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Plus size={15} />
            )}{" "}
            Add
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </SectionCard>
  );
}

// ── Side dishes section ───────────────────────────────────────────────────────

function SideDishesSection({
  mealId,
  sideDishes,
  onChange,
}: {
  mealId: string;
  sideDishes: SideDishEntry[];
  onChange: (s: SideDishEntry[]) => void;
}) {
  const [nameInput, setNameInput] = useState("");
  const [price, setPrice] = useState("");
  const [isFree, setIsFree] = useState(true);
  const [isRequired, setIsRequired] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = sideDishes.filter((s) => !s.pendingDelete);

  const addSideDish = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setAdding(true);
    setError(null);
    try {
      const res = await api.post<{ sideDishId: string }>(
        `/meals/${mealId}/side-dishes`,
        {
          name: trimmed,
          description: null,
          price: isFree ? 0 : parseFloat(price) || 0,
          currency: CURRENCY,
          isRequired,
        },
      );
      onChange([
        ...sideDishes,
        {
          clientId: uid(),
          serverId: res.data.sideDishId,
          name: trimmed,
          price: isFree ? "0" : price,
          isFree,
          isRequired,
          dirty: false,
          pendingDelete: false,
        },
      ]);
      setNameInput("");
      setPrice("");
      setIsFree(true);
      setIsRequired(false);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Could not add side dish.");
    } finally {
      setAdding(false);
    }
  };

  // Deferred delete: mark locally, send DELETE on Save
  const markDelete = (clientId: string) =>
    onChange(
      sideDishes.map((s) =>
        s.clientId === clientId ? { ...s, pendingDelete: true } : s,
      ),
    );

  return (
    <SectionCard title="Side Dishes">
      <div className="flex flex-col gap-3">
        {visible.length === 0 && (
          <p className="text-sm text-[--text-muted] py-2">
            No side dishes. Add one below.
          </p>
        )}

        {visible.map((sd) => (
          <div
            key={sd.clientId}
            className="flex items-center gap-3 px-4 py-3 border border-[--border] rounded-xl bg-white"
          >
            <UtensilsCrossed size={14} className="text-brand-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[--text-primary] truncate">
                {sd.name}
              </p>
              <p className="text-xs text-[--text-muted]">
                {sd.isFree ? "Free" : `${sd.price} ${CURRENCY}`}
                {sd.isRequired && " · Required"}
              </p>
            </div>
            {sd.dirty && <DirtyBadge />}
            <button
              onClick={() => markDelete(sd.clientId)}
              className="text-[--text-muted] hover:text-red-500 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}

        {/* Add row */}
        <div className="flex flex-col gap-2 pt-3 border-t border-[--border]">
          <div className="flex gap-2">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSideDish()}
              placeholder="Side dish name…"
              className="flex-1 border border-[--border] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 bg-white"
            />
            {!isFree && (
              <div className="relative w-28 shrink-0">
                <input
                  type="number"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0"
                  className="w-full border border-[--border] rounded-xl px-3 py-2.5 pr-10 text-sm outline-none focus:border-brand-500 bg-white"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[--text-muted] pointer-events-none">
                  {CURRENCY}
                </span>
              </div>
            )}
            <button
              onClick={() => setIsFree((s) => !s)}
              className={cn(
                "px-3 py-2.5 text-xs font-semibold rounded-xl border transition-colors shrink-0",
                isFree
                  ? "bg-brand-50 text-brand-700 border-brand-200"
                  : "text-[--text-muted] border-[--border]",
              )}
            >
              {isFree ? "Free" : "Paid"}
            </button>
            <button
              onClick={addSideDish}
              disabled={adding || !nameInput.trim()}
              className="btn-primary px-4 py-2.5 rounded-xl disabled:opacity-40 shrink-0"
            >
              {adding ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Plus size={15} />
              )}
            </button>
          </div>
          <div className="flex items-center gap-3 text-xs text-[--text-muted]">
            <span className="font-medium">Required?</span>
            {[false, true].map((v) => (
              <label
                key={String(v)}
                className="flex items-center gap-1.5 cursor-pointer"
              >
                <input
                  type="radio"
                  checked={isRequired === v}
                  onChange={() => setIsRequired(v)}
                  className="w-3 h-3 accent-brand-500"
                />
                {v ? "Yes" : "No"}
              </label>
            ))}
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </div>
    </SectionCard>
  );
}

// ── Topping groups section ────────────────────────────────────────────────────

function ToppingGroupsSection({
  mealId,
  toppingGroups,
  onChange,
}: {
  mealId: string;
  toppingGroups: ToppingGroupEntry[];
  onChange: (g: ToppingGroupEntry[]) => void;
}) {
  const [groupName, setGroupName] = useState("");
  const [minInput, setMinInput] = useState(0);
  const [maxInput, setMaxInput] = useState(1);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optionInputs, setOptionInputs] = useState<Record<string, string>>({});

  const visibleGroups = toppingGroups.filter((g) => !g.pendingDelete);

  const addGroup = async () => {
    const trimmed = groupName.trim();
    if (!trimmed || minInput > maxInput) return;
    setAdding(true);
    setError(null);
    try {
      const res = await api.post<{ toppingGroupId: string }>(
        `/meals/${mealId}/topping-groups`,
        {
          name: trimmed,
          minSelections: minInput,
          maxSelections: maxInput,
        },
      );
      onChange([
        ...toppingGroups,
        {
          clientId: uid(),
          serverId: res.data.toppingGroupId,
          name: trimmed,
          minSelections: minInput,
          maxSelections: maxInput,
          options: [],
          isOpen: true,
          dirty: false,
          pendingDelete: false,
        },
      ]);
      setGroupName("");
      setMinInput(0);
      setMaxInput(1);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Could not add group.");
    } finally {
      setAdding(false);
    }
  };

  // Deferred delete — sent on Save
  const markDeleteGroup = (clientId: string) =>
    onChange(
      toppingGroups.map((g) =>
        g.clientId === clientId ? { ...g, pendingDelete: true } : g,
      ),
    );

  const toggleGroup = (clientId: string) =>
    onChange(
      toppingGroups.map((g) =>
        g.clientId === clientId ? { ...g, isOpen: !g.isOpen } : g,
      ),
    );

  const addOption = async (groupClientId: string) => {
    const name = (optionInputs[groupClientId] || "").trim();
    const group = toppingGroups.find((g) => g.clientId === groupClientId);
    if (!name || !group) return;
    setError(null);
    try {
      const res = await api.post<{ optionId: string }>(
        `/meals/${mealId}/topping-groups/${group.serverId}/options`,
        { name, extraPrice: 0, currency: CURRENCY },
      );
      onChange(
        toppingGroups.map((g) =>
          g.clientId === groupClientId
            ? {
                ...g,
                options: [
                  ...g.options,
                  {
                    clientId: uid(),
                    serverId: res.data.optionId,
                    name,
                    price: "0",
                    isFree: true,
                    pendingDelete: false,
                  },
                ],
              }
            : g,
        ),
      );
      setOptionInputs((prev) => ({ ...prev, [groupClientId]: "" }));
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Could not add option.");
    }
  };

  // Deferred option delete — sent on Save
  const markDeleteOption = (groupClientId: string, optionClientId: string) =>
    onChange(
      toppingGroups.map((g) =>
        g.clientId !== groupClientId
          ? g
          : {
              ...g,
              options: g.options.map((o) =>
                o.clientId === optionClientId
                  ? { ...o, pendingDelete: true }
                  : o,
              ),
            },
      ),
    );

  return (
    <SectionCard title="Topping Groups">
      <div className="flex flex-col gap-4">
        {error && <p className="text-xs text-red-600">{error}</p>}

        {/* Existing groups */}
        {visibleGroups.map((group) => (
          <div
            key={group.clientId}
            className="border border-[--border] rounded-xl overflow-hidden"
          >
            <button
              onClick={() => toggleGroup(group.clientId)}
              className="w-full flex items-center justify-between px-4 py-3 bg-[--bg] text-left"
            >
              <div>
                <p className="text-sm font-bold text-[--text-primary]">
                  {group.name}
                </p>
                <p className="text-xs text-[--text-muted] mt-0.5">
                  {group.minSelections === 0 ? "Optional" : "Required"} ·{" "}
                  {group.minSelections}–{group.maxSelections}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ChevronRight
                  size={15}
                  className={cn(
                    "text-[--text-muted] transition-transform",
                    group.isOpen && "rotate-90",
                  )}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    markDeleteGroup(group.clientId);
                  }}
                  className="text-[--text-muted] hover:text-red-500 transition-colors p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </button>

            {group.isOpen && (
              <div className="p-4 flex flex-col gap-2 border-t border-[--border]">
                {group.options
                  .filter((o) => !o.pendingDelete)
                  .map((opt) => (
                    <div
                      key={opt.clientId}
                      className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-[--border]"
                    >
                      <Layers size={13} className="text-brand-500 shrink-0" />
                      <span className="flex-1 text-xs font-medium text-[--text-primary]">
                        {opt.name}
                      </span>
                      <span className="text-xs text-[--text-muted]">
                        {parseFloat(opt.price) === 0
                          ? "Free"
                          : `+${opt.price} ${CURRENCY}`}
                      </span>
                      <button
                        onClick={() =>
                          markDeleteOption(group.clientId, opt.clientId)
                        }
                        className="text-[--text-muted] hover:text-red-500 transition-colors"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}

                <div className="flex gap-2 pt-1">
                  <input
                    value={optionInputs[group.clientId] || ""}
                    onChange={(e) =>
                      setOptionInputs((prev) => ({
                        ...prev,
                        [group.clientId]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) =>
                      e.key === "Enter" && addOption(group.clientId)
                    }
                    placeholder="New option name…"
                    className="flex-1 border border-[--border] rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-500 bg-white"
                  />
                  <button
                    onClick={() => addOption(group.clientId)}
                    disabled={!(optionInputs[group.clientId] || "").trim()}
                    className="btn-outline px-4 py-2 rounded-lg disabled:opacity-40 shrink-0"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Add group */}
        <div className="flex flex-col gap-3 p-4 border border-dashed border-[--border] rounded-xl bg-[--bg]">
          <p className="text-xs font-semibold text-[--text-muted] uppercase tracking-wide flex items-center gap-1.5">
            <Settings2 size={13} /> New group
          </p>
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
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
                value={minInput}
                onChange={(e) =>
                  setMinInput(Math.max(0, parseInt(e.target.value) || 0))
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
                value={maxInput}
                onChange={(e) =>
                  setMaxInput(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="w-16 border border-[--border] rounded-lg px-2 py-2 text-sm text-center outline-none focus:border-brand-500 bg-white"
              />
            </div>
          </div>
          <button
            onClick={addGroup}
            disabled={adding || !groupName.trim() || minInput > maxInput}
            className="btn-primary py-2.5 rounded-xl text-sm disabled:opacity-40 flex items-center justify-center gap-1"
          >
            {adding ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Plus size={14} />
            )}{" "}
            Add Group
          </button>
        </div>
      </div>
    </SectionCard>
  );
}

// ── Photo section ─────────────────────────────────────────────────────────────

function PhotoSection({
  mealId,
  state,
  onChange,
}: {
  mealId: string;
  state: Pick<EditState, "imageFile" | "imagePreview" | "currentImageUrl">;
  onChange: (patch: Partial<EditState>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;
      if (state.imagePreview) URL.revokeObjectURL(state.imagePreview);
      const preview = URL.createObjectURL(file);
      onChange({ imageFile: file, imagePreview: preview });

      // Upload immediately on select
      setUploading(true);
      setError(null);
      try {
        const formData = new FormData();
        formData.append("image", file);
        await api.post(`/chef/meals/${mealId}/image`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        // Store as current URL so the preview persists after a page refresh
        onChange({
          imageFile: null,
          imagePreview: null,
          currentImageUrl: preview,
        });
      } catch (e: any) {
        setError(e?.response?.data?.detail ?? "Upload failed.");
        onChange({ imageFile: null, imagePreview: null });
      } finally {
        setUploading(false);
      }
    },
    [mealId, state.imagePreview],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const displayUrl = state.imagePreview || state.currentImageUrl;

  return (
    <SectionCard title="Photo">
      {displayUrl ? (
        <div className="relative rounded-xl overflow-hidden aspect-video">
          <img
            src={displayUrl}
            alt="Meal"
            className="w-full h-full object-cover"
          />
          {uploading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Loader2 size={28} className="animate-spin text-white" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
            <button
              onClick={() => inputRef.current?.click()}
              className="bg-white text-[--text-primary] text-sm font-semibold px-4 py-2 rounded-xl flex items-center gap-2"
            >
              <Upload size={14} /> Replace
            </button>
          </div>
        </div>
      ) : (
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-[--border] rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-brand-400 hover:bg-brand-50/50 transition-all"
        >
          <div className="w-14 h-14 bg-brand-100 rounded-full flex items-center justify-center">
            <ImageIcon size={24} className="text-brand-600" />
          </div>
          <p className="text-sm font-semibold text-[--text-primary]">
            Upload a photo
          </p>
          <p className="text-xs text-[--text-muted]">
            JPG, PNG or WebP — max 15 MB
          </p>
        </div>
      )}
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
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
    </SectionCard>
  );
}

// ── Save engine — flushes core info + pending deletes + dirty variants ────────

async function flushPendingChanges(
  mealId: string,
  state: EditState,
): Promise<void> {
  // 1. Core meal fields
  await api.put(`/meals/${mealId}`, {
    name: state.name,
    description: state.description || null,
    dishType: state.dishType,
    cuisineType: state.cuisineType || null,
  });

  // 2. Variants — deletions first, then update dirty ones
  for (const v of state.variants.filter((x) => x.pendingDelete)) {
    await api.delete(`/meals/${mealId}/variants/${v.serverId}`);
  }
  for (const v of state.variants.filter((x) => !x.pendingDelete && x.dirty)) {
    await api.put(`/meals/${mealId}/variants/${v.serverId}`, {
      name: v.name,
      price: parseFloat(v.price),
      currency: CURRENCY,
    });
  }

  // 3. Side dishes — deletions only (new ones were already POSTed live)
  for (const s of state.sideDishes.filter((x) => x.pendingDelete)) {
    await api.delete(`/meals/${mealId}/side-dishes/${s.serverId}`);
  }

  // 4. Topping groups — deletions only (new groups/options were already POSTed live)
  for (const g of state.toppingGroups.filter((x) => x.pendingDelete)) {
    await api.delete(`/meals/${mealId}/topping-groups/${g.serverId}`);
  }
  for (const g of state.toppingGroups.filter((x) => !x.pendingDelete)) {
    for (const o of g.options.filter((x) => x.pendingDelete)) {
      await api.delete(
        `/meals/${mealId}/topping-groups/${g.serverId}/options/${o.serverId}`,
      );
    }
  }
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function EditMealForm() {
  const { mealId } = useParams<{ mealId: string }>();
  const navigate = useNavigate();

  const [editState, setEditState] = useState<EditState | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [availability, setAvailability] = useState(false);
  const [togglingAvailability, setTogglingAvailability] = useState(false);
  const [showCuisineDropdown, setShowCuisineDropdown] = useState(false);

  useEffect(() => {
    if (!mealId) return;
    api
      .get<MealDetailResponse>(`/meals/${mealId}`)
      .then((res) => {
        setEditState(buildEditState(res.data));
        setAvailability(res.data.isAvailable);
      })
      .catch(() =>
        setFetchError("Could not load meal. Please go back and try again."),
      );
  }, [mealId]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (editState?.imagePreview) URL.revokeObjectURL(editState.imagePreview);
    };
  }, []);

  const set = useCallback(
    (patch: Partial<EditState>) =>
      setEditState((s) => (s ? { ...s, ...patch } : s)),
    [],
  );

  const hasPendingChanges = (): boolean => {
    if (!editState) return false;
    return (
      editState.variants.some((v) => v.dirty || v.pendingDelete) ||
      editState.sideDishes.some((s) => s.pendingDelete) ||
      editState.toppingGroups.some(
        (g) => g.pendingDelete || g.options.some((o) => o.pendingDelete),
      )
    );
  };

  const handleSave = async () => {
    if (!mealId || !editState) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await flushPendingChanges(mealId, editState);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      // Refresh to get clean state
      const res = await api.get<MealDetailResponse>(`/meals/${mealId}`);
      setEditState(buildEditState(res.data));
    } catch (e: any) {
      setSaveError(
        e?.response?.data?.detail ?? "Save failed. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAvailability = async () => {
    if (!mealId) return;
    setTogglingAvailability(true);
    try {
      await api.patch(`/meals/${mealId}/availability`, {
        isAvailable: !availability,
      });
      setAvailability((a) => !a);
    } catch (e: any) {
      setSaveError(
        e?.response?.data?.detail ?? "Could not update availability.",
      );
    } finally {
      setTogglingAvailability(false);
    }
  };

  if (fetchError) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <AlertCircle size={32} className="text-red-500" />
          <p className="text-[--text-primary] font-semibold">{fetchError}</p>
          <button
            onClick={() => navigate(-1)}
            className="btn-outline px-6 py-2.5 text-sm"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  if (!editState) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={28} className="animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[--bg]">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-[--border] shrink-0 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/chef/menu")}
            className="text-[--text-muted] hover:text-[--text-primary] transition-colors"
          >
            <ChevronRight size={20} className="rotate-180" />
          </button>
          <div>
            <h1 className="font-display font-bold text-[--text-primary]">
              {editState.name}
            </h1>
            <p className="text-xs text-[--text-muted]">Edit meal</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Availability toggle */}
          <button
            onClick={handleToggleAvailability}
            disabled={togglingAvailability}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all",
              availability
                ? "border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                : "border-[--border] bg-white text-[--text-muted] hover:bg-[--bg]",
            )}
          >
            {togglingAvailability ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <span
                className={cn(
                  "w-2 h-2 rounded-full",
                  availability ? "bg-green-500" : "bg-gray-400",
                )}
              />
            )}
            {availability ? "Available" : "Hidden"}
          </button>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving || !hasPendingChanges()}
            className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={15} className="animate-spin" />
            ) : saveSuccess ? (
              <>
                <Check size={15} /> Saved!
              </>
            ) : (
              <>
                <Save size={15} /> Save Changes
              </>
            )}
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto w-full px-6 py-8 flex flex-col gap-5">
          {saveError && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              {saveError}
              <button
                onClick={() => setSaveError(null)}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {hasPendingChanges() && (
            <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 flex items-center gap-2">
              <Info size={14} className="shrink-0" />
              You have unsaved changes — press "Save Changes" when done.
            </div>
          )}

          {/* Basic Info */}
          <SectionCard title="Basic Info">
            <div className="flex flex-col gap-4">
              <div>
                <FieldLabel required>Dish Name</FieldLabel>
                <input
                  type="text"
                  value={editState.name}
                  onChange={(e) => set({ name: e.target.value.slice(0, 200) })}
                  className="w-full border border-[--border] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 bg-white"
                />
              </div>

              <div>
                <FieldLabel required>Category</FieldLabel>
                <div className="grid grid-cols-4 gap-2">
                  {DISH_TYPES.map((dt) => (
                    <button
                      key={dt.value}
                      onClick={() => set({ dishType: dt.value })}
                      className={cn(
                        "flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 text-xs font-medium transition-all",
                        editState.dishType === dt.value
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : "border-[--border] text-[--text-muted] hover:border-brand-300",
                      )}
                    >
                      <span className="text-xl">{dt.icon}</span>
                      {dt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <FieldLabel>Cuisine</FieldLabel>
                <button
                  onClick={() => setShowCuisineDropdown((s) => !s)}
                  className="w-full flex items-center justify-between px-4 py-2.5 border border-[--border] rounded-xl bg-white text-sm text-[--text-muted] hover:border-brand-400 transition-colors"
                >
                  <span>
                    {editState.cuisineType || "Select a cuisine (optional)"}
                  </span>
                  <ChevronRight
                    size={15}
                    className={cn(
                      "transition-transform",
                      showCuisineDropdown && "rotate-90",
                    )}
                  />
                </button>
                {showCuisineDropdown && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-[--border] rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                    {CUISINES.map((c) => (
                      <button
                        key={c}
                        onClick={() => {
                          set({ cuisineType: c });
                          setShowCuisineDropdown(false);
                        }}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-brand-50 text-left transition-colors"
                      >
                        {c}
                        {editState.cuisineType === c && (
                          <Check size={13} className="text-brand-500" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <FieldLabel required>Description</FieldLabel>
                <textarea
                  value={editState.description}
                  onChange={(e) =>
                    set({ description: e.target.value.slice(0, 600) })
                  }
                  rows={4}
                  className="w-full border border-[--border] rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-500 transition-colors resize-none bg-white"
                />
                <p className="text-xs text-[--text-muted] mt-1 text-right">
                  {editState.description.length} / 600
                </p>
              </div>
            </div>
          </SectionCard>

          {mealId && (
            <>
              <VariantsSection
                mealId={mealId}
                variants={editState.variants}
                onChange={(variants) => set({ variants })}
              />
              <SideDishesSection
                mealId={mealId}
                sideDishes={editState.sideDishes}
                onChange={(sideDishes) => set({ sideDishes })}
              />
              <ToppingGroupsSection
                mealId={mealId}
                toppingGroups={editState.toppingGroups}
                onChange={(toppingGroups) => set({ toppingGroups })}
              />
              <PhotoSection
                mealId={mealId}
                state={editState}
                onChange={(patch) => set(patch)}
              />
            </>
          )}

          {/* Mobile save */}
          <div className="sm:hidden pb-4">
            <button
              onClick={handleSave}
              disabled={saving || !hasPendingChanges()}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
