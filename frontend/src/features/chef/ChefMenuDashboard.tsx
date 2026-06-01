import { useNavigate } from "react-router-dom";
import { useChefMeals } from "./hooks/useChefMeals";
import {
  Plus,
  Search,
  ChefHat,
  Pencil,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  UtensilsCrossed,
  Layers,
  ImageOff,
  X,
  Archive,
  ArchiveRestore,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { QueryState } from "@/components/ui/QueryState";
import {
  chefMealsApi,
  type DishType,
  type MealStatus,
  type ChefMealSummary,
} from "@/api/chefMeals";

// ── Helpers ───────────────────────────────────────────────────────────────────

const DISH_TYPE_META: Record<
  DishType,
  { label: string; icon: string; color: string }
> = {
  MainDish: {
    label: "Main",
    icon: "🍽️",
    color: "bg-orange-50 text-orange-700 border-orange-200",
  },
  SideDish: {
    label: "Side",
    icon: "🥗",
    color: "bg-green-50 text-green-700 border-green-200",
  },
  Dessert: {
    label: "Dessert",
    icon: "🎂",
    color: "bg-pink-50 text-pink-700 border-pink-200",
  },
  Appetizer: {
    label: "Appetizer",
    icon: "🥟",
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
};

function priceRange(
  min: number | null,
  max: number | null,
  currency: string | null,
): string {
  if (min === null) return "No variants";
  const c = currency ?? "";
  return min === max ? `${min} ${c}` : `${min}–${max} ${c}`;
}

function formatArchivedAt(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ filtered }: { filtered: boolean }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center col-span-full">
      <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mb-5">
        <ChefHat size={36} className="text-brand-400" />
      </div>
      <h3 className="font-display text-xl font-bold text-[--text-primary] mb-2">
        {filtered ? "No meals match your filters" : "Your menu is empty"}
      </h3>
      <p className="text-sm text-[--text-muted] max-w-xs mb-6">
        {filtered
          ? "Try adjusting your search or filter."
          : "Add your first dish and start receiving orders."}
      </p>
      {!filtered && (
        <button
          onClick={() => navigate("/chef/menu/create")}
          className="btn-primary flex items-center gap-2 py-3 px-6"
        >
          <Plus size={18} /> Add Your First Meal
        </button>
      )}
    </div>
  );
}

// ── Meal card ─────────────────────────────────────────────────────────────────

function MealCard({
  meal,
  onToggleAvailability,
  onArchive,
  togglingAvailability,
  archiving,
}: {
  meal: ChefMealSummary;
  onToggleAvailability: () => void;
  onArchive: () => void;
  togglingAvailability: boolean;
  archiving: boolean;
}) {
  const navigate = useNavigate();
  const meta = DISH_TYPE_META[meal.dishType];
  const isActive = meal.status === "Active";
  const isDraft = meal.status === "Draft";

  return (
    <div
      className={cn(
        "group bg-white rounded-2xl border overflow-hidden transition-all duration-200",
        "hover:shadow-md hover:-translate-y-0.5",
        isActive ? "border-[--border]" : "border-[--border] opacity-80",
      )}
    >
      {/* Photo */}
      <div className="relative h-44 bg-[--bg] overflow-hidden">
        {meal.imageUrl ? (
          <img
            src={meal.imageUrl}
            alt={meal.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <ImageOff size={28} className="text-[--border]" />
            <span className="text-xs text-[--text-muted]">No photo</span>
          </div>
        )}

        {/* Status badge */}
        <div className="absolute top-3 left-3">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border backdrop-blur-sm",
              isActive
                ? "bg-green-50/90 text-green-700 border-green-200"
                : isDraft
                  ? "bg-white/90 text-[--text-muted] border-[--border]"
                  : "bg-amber-50/90 text-amber-700 border-amber-200",
            )}
          >
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full shrink-0",
                isActive
                  ? "bg-green-500"
                  : isDraft
                    ? "bg-gray-400"
                    : "bg-amber-500",
              )}
            />
            {isActive ? "Available" : isDraft ? "Draft" : "Archived"}
          </span>
        </div>

        {/* Dish type badge */}
        <div className="absolute top-3 right-3">
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border backdrop-blur-sm",
              meta.color,
            )}
          >
            {meta.icon} {meta.label}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="mb-3">
          <h3 className="font-display font-bold text-[--text-primary] text-base leading-tight line-clamp-1">
            {meal.name}
          </h3>
          {meal.cuisineType && (
            <p className="text-xs text-[--text-muted] mt-0.5">
              {meal.cuisineType} cuisine
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 mb-4 text-xs text-[--text-muted]">
          <div className="flex items-center gap-1">
            <Layers size={12} className="text-brand-400" />
            <span>
              {meal.variantCount}{" "}
              {meal.variantCount === 1 ? "variant" : "variants"}
            </span>
          </div>
          <span className="text-[--border]">·</span>
          <div className="flex items-center gap-1">
            <UtensilsCrossed size={12} className="text-brand-400" />
            <span className="font-semibold text-[--text-primary]">
              {priceRange(meal.minPrice, meal.maxPrice, meal.currency)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/chef/menu/edit/${meal.id}`)}
            className="flex-1 btn-outline flex items-center justify-center gap-1.5 py-2 text-sm rounded-xl"
          >
            <Pencil size={14} /> Edit
          </button>

          {/* Availability toggle — Draft ↔ Active */}
          <button
            onClick={onToggleAvailability}
            disabled={togglingAvailability}
            title={isActive ? "Hide from customers" : "Make available"}
            className={cn(
              "px-3 py-2 rounded-xl border text-sm font-medium flex items-center gap-1.5 transition-all disabled:opacity-50",
              isActive
                ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                : "border-[--border] bg-white text-[--text-muted] hover:bg-[--bg]",
            )}
          >
            {togglingAvailability ? (
              <Loader2 size={14} className="animate-spin" />
            ) : isActive ? (
              <EyeOff size={14} />
            ) : (
              <Eye size={14} />
            )}
          </button>

          {/* Archive */}
          <button
            onClick={onArchive}
            disabled={archiving}
            title="Archive meal"
            className="px-3 py-2 rounded-xl border border-[--border] bg-white text-[--text-muted] hover:text-amber-600 hover:border-amber-300 hover:bg-amber-50 text-sm flex items-center transition-all disabled:opacity-50"
          >
            {archiving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Archive size={14} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Archived row (compact list, not card) ─────────────────────────────────────

function ArchivedRow({
  meal,
  onRestore,
  restoring,
}: {
  meal: ChefMealSummary;
  onRestore: () => void;
  restoring: boolean;
}) {
  const navigate = useNavigate();
  const meta = DISH_TYPE_META[meal.dishType];

  return (
    <div className="flex items-center gap-4 px-4 py-3 bg-white rounded-xl border border-[--border] hover:border-amber-200 transition-colors">
      {/* Thumbnail */}
      <div className="w-12 h-12 rounded-lg bg-[--bg] overflow-hidden shrink-0">
        {meal.imageUrl ? (
          <img
            src={meal.imageUrl}
            alt={meal.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff size={16} className="text-[--border]" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[--text-primary] truncate">
          {meal.name}
        </p>
        <div className="flex items-center gap-2 text-xs text-[--text-muted] mt-0.5">
          <span>
            {meta.icon} {meta.label}
          </span>
          <span>·</span>
          <span>
            {meal.variantCount} variant{meal.variantCount !== 1 ? "s" : ""}
          </span>
          {meal.archivedAt && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock size={11} /> Archived {formatArchivedAt(meal.archivedAt)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => navigate(`/chef/meals/${meal.id}/edit`)}
          className="btn-outline text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"
        >
          <Pencil size={12} /> View
        </button>
        <button
          onClick={onRestore}
          disabled={restoring}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors disabled:opacity-50"
        >
          {restoring ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <ArchiveRestore size={12} />
          )}
          Restore
        </button>
      </div>
    </div>
  );
}

// ── Filter bar ────────────────────────────────────────────────────────────────

type FilterAvailability = "all" | "active" | "draft"; // mirrors useChefMeals

const DISH_FILTERS: { value: DishType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "MainDish", label: "🍽️ Main" },
  { value: "SideDish", label: "🥗 Side" },
  { value: "Dessert", label: "🎂 Dessert" },
  { value: "Appetizer", label: "🥟 App." },
];

function FilterBar({
  search,
  onSearch,
  status,
  onStatus,
  dishType,
  onDishType,
  totalCount,
  filteredCount,
}: {
  search: string;
  onSearch: (v: string) => void;
  status: FilterAvailability;
  onStatus: (v: FilterAvailability) => void;
  dishType: DishType | "all";
  onDishType: (v: DishType | "all") => void;
  totalCount: number;
  filteredCount: number;
}) {
  const hasActive =
    search.trim() !== "" || status !== "all" || dishType !== "all";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[--text-muted] pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search meals…"
            className="w-full pl-9 pr-4 py-2.5 border border-[--border] rounded-xl text-sm outline-none focus:border-brand-500 bg-white transition-colors"
          />
          {search && (
            <button
              onClick={() => onSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[--text-muted] hover:text-[--text-primary] transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status filter */}
        <div className="flex border border-[--border] rounded-xl overflow-hidden bg-white shrink-0">
          {(
            [
              ["all", "All"],
              ["active", "Available"],
              ["draft", "Draft"],
            ] as const
          ).map(([v, l]) => (
            <button
              key={v}
              onClick={() => onStatus(v)}
              className={cn(
                "px-3 py-2.5 text-xs font-medium transition-colors",
                status === v
                  ? "bg-brand-500 text-white"
                  : "text-[--text-muted] hover:bg-[--bg]",
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Dish type pills */}
      <div className="flex gap-1.5 flex-wrap items-center">
        {DISH_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => onDishType(f.value as DishType | "all")}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
              dishType === f.value
                ? "bg-brand-500 text-white border-brand-500"
                : "bg-white text-[--text-muted] border-[--border] hover:border-brand-300",
            )}
          >
            {f.label}
          </button>
        ))}
        {hasActive && (
          <span className="ml-auto text-xs text-[--text-muted]">
            {filteredCount} of {totalCount}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ChefMenuDashboard() {
  const navigate = useNavigate();
  const {
    isLoading, isError, refetch,
    meals, archivedMeals, filtered, activeCount,
    search, setSearch,
    status, setStatus,
    dishType, setDishType,
    showArchived, setShowArchived,
    toggleAvailability, isToggling, togglingVars,
    doArchive, isArchiving, archivingId,
    doRestore, restoringId,
    archiveError, setArchiveError,
    menuError, setMenuError,
  } = useChefMeals();

  // ── Render ────────────────────────────────────────────────────────────────

  const qs = <QueryState isLoading={isLoading} isError={isError} onRetry={refetch} />;
  if (isLoading || isError) return qs;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[--text-primary]">
            My Menu
          </h1>
          <p className="text-sm text-[--text-muted] mt-0.5">
            {meals.length === 0
              ? "No meals yet"
              : `${meals.length} meal${meals.length !== 1 ? "s" : ""} · ${activeCount} available`}
          </p>
        </div>
        <button
          onClick={() => navigate("/chef/menu/create")}
          className="btn-primary flex items-center gap-2 py-2.5 px-5 shrink-0"
        >
          <Plus size={18} /> Add Meal
        </button>
      </div>

      {/* Archive error banner */}
      {archiveError && (
        <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 flex items-center gap-2">
          <AlertCircle size={14} className="shrink-0" />
          {archiveError}
          <button
            onClick={() => setArchiveError(null)}
            className="ml-auto text-amber-500 hover:text-amber-700"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Menu error banner */}
      {menuError && (
        <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 flex items-center gap-2">
          <AlertCircle size={14} className="shrink-0" />
          {menuError}
          <button
            onClick={() => setMenuError(null)}
            className="ml-auto text-amber-500 hover:text-amber-700"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filters */}
      {meals.length > 0 && (
        <div className="mb-6">
          <FilterBar
            search={search}
            onSearch={setSearch}
            status={status}
            onStatus={setStatus}
            dishType={dishType}
            onDishType={setDishType}
            totalCount={meals.length}
            filteredCount={filtered.length}
          />
        </div>
      )}

      {/* Active / Draft grid */}
      {meals.length === 0 || filtered.length === 0 ? (
        <div className="grid">
          <EmptyState filtered={meals.length > 0 && filtered.length === 0} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              togglingAvailability={isToggling && togglingVars?.id === meal.id}
              archiving={isArchiving && archivingId === meal.id}
              onToggleAvailability={() =>
                toggleAvailability({
                  id: meal.id,
                  isAvailable: meal.status !== "Active",
                })
              }
              onArchive={() => doArchive(meal.id)}
            />
          ))}
        </div>
      )}

      {/* ── Archived section ─────────────────────────────────────────────────── */}
      {archivedMeals.length > 0 && (
        <div className="mt-10">
          <button
            onClick={() => setShowArchived((s) => !s)}
            className="flex items-center gap-2 text-sm font-semibold text-[--text-muted] hover:text-[--text-primary] transition-colors mb-4"
          >
            <Archive size={15} className="text-amber-500" />
            Archived meals ({archivedMeals.length})
            {showArchived ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>

          {showArchived && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-[--text-muted] mb-2">
                Archived meals are hidden from customers but preserved for order
                history. Restore a meal to make it editable and available again.
              </p>
              {archivedMeals.map((meal) => (
                <ArchivedRow
                  key={meal.id}
                  meal={meal}
                  restoring={restoringId === meal.id}
                  onRestore={() => doRestore(meal.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
