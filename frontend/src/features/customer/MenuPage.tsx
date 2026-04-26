import { useState } from 'react'
import { useSearchParams, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SlidersHorizontal, Star, Search } from 'lucide-react'
import { chefsApi, type ChefSortOrder, type DishType } from '@/api/chefs'
import ChefCardComponent from '@/components/ui/ChefCard'
import CuisineStrip from '@/components/ui/CuisineStrip'
import { cn } from '@/lib/utils'
import Footer from '@/components/layout/Footer'

// ── Types & constants ─────────────────────────────────────────────────────────

type SortOption = { value: ChefSortOrder; label: string }

const SORT_OPTIONS: SortOption[] = [
  { value: 'Closest',      label: 'Closest to me' },
  { value: 'HighestRated', label: 'Highest rated' },
  { value: 'NewArrivals',  label: 'New arrivals' },
  { value: 'PriceLowHigh', label: 'Price low to high' },
  { value: 'PriceHighLow', label: 'Price high to low' },
]

const DISH_TYPES: { value: DishType; label: string; emoji: string }[] = [
  { value: 'MainDish',  label: 'Main Dish',  emoji: '🍽' },
  { value: 'SideDish',  label: 'Side Dish',  emoji: '🥗' },
  { value: 'Dessert',   label: 'Dessert',    emoji: '🍰' },
  { value: 'Appetizer', label: 'Appetizer',  emoji: '🥙' },
]

// ── Small reusable atoms ──────────────────────────────────────────────────────

function RadioDot({ active }: { active: boolean }) {
  return (
    <div className={cn(
      'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
      active ? 'border-brand-500 bg-brand-500' : 'border-[--border]'
    )}>
      {active && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
    </div>
  )
}

function CheckDot({ active }: { active: boolean }) {
  return (
    <div className={cn(
      'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all',
      active ? 'border-brand-500 bg-brand-500' : 'border-[--border]'
    )}>
      {active && (
        <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
          <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  )
}

// ── Sidebars ─────────────────────────────────────────────────────────────────

function SortSidebar({
  value, onChange
}: {
  value: ChefSortOrder
  onChange: (v: ChefSortOrder) => void
}) {
  return (
    <div className="bg-white rounded-2xl border border-[--border] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[--text-primary]">Sort by</h3>
        <SlidersHorizontal size={16} className="text-[--text-muted]" />
      </div>
      <div className="flex flex-col gap-3">
        {SORT_OPTIONS.map(opt => (
          <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
            <RadioDot active={value === opt.value} />
            <input type="radio" name="sort" value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="sr-only" />
            <span className={cn(
              'text-sm',
              value === opt.value ? 'text-[--text-primary] font-medium' : 'text-[--text-muted]'
            )}>
              {opt.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}

function FilterSidebar({
  selectedDishTypes, onDishTypeToggle,
  minRating, onRatingChange,
  maxPrice, onMaxPriceChange,
}: {
  selectedDishTypes: DishType[]
  onDishTypeToggle: (v: DishType) => void
  minRating: number
  onRatingChange: (v: number) => void
  maxPrice: string
  onMaxPriceChange: (v: string) => void
}) {
  return (
    <div className="bg-white rounded-2xl border border-[--border] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[--text-primary]">Filter by</h3>
        <SlidersHorizontal size={16} className="text-[--text-muted]" />
      </div>

      {/* Dish type */}
      <h4 className="text-sm font-semibold text-[--text-primary] mb-3">Dish type</h4>
      <div className="flex flex-col gap-3 mb-6">
        {DISH_TYPES.map(d => (
          <label key={d.value} className="flex items-center gap-3 cursor-pointer">
            <CheckDot active={selectedDishTypes.includes(d.value)} />
            <input type="checkbox" checked={selectedDishTypes.includes(d.value)}
              onChange={() => onDishTypeToggle(d.value)} className="sr-only" />
            <span className="text-sm text-[--text-muted] flex items-center gap-2">
              {d.label} <span className="text-base">{d.emoji}</span>
            </span>
          </label>
        ))}
      </div>

      {/* Max price */}
      <div className="border-t border-[--border] pt-5 mb-5">
        <h4 className="text-sm font-semibold text-[--text-primary] mb-3">Max price (EGP)</h4>
        <div className="relative">
          <input
            type="number"
            min={0}
            value={maxPrice}
            onChange={e => onMaxPriceChange(e.target.value)}
            placeholder="e.g. 200"
            className="w-full border border-[--border] rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-400 transition-colors"
          />
        </div>
      </div>

      {/* Rating */}
      <div className="border-t border-[--border] pt-5">
        <h4 className="text-sm font-semibold text-[--text-primary] mb-3">Min. rating</h4>
        <div className="flex flex-col gap-3">
          {[5, 4, 3, 2, 1].map(stars => (
            <label key={stars} className="flex items-center gap-3 cursor-pointer">
              <RadioDot active={minRating === stars} />
              <input type="radio" name="rating" checked={minRating === stars}
                onChange={() => onRatingChange(stars)} className="sr-only" />
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={14} className={
                    i < stars
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-200 fill-gray-200'
                  } />
                ))}
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ChefCardSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="h-44 bg-gray-200 rounded-t-2xl" />
      <div className="pt-8 px-4 pb-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-3 bg-gray-200 rounded w-1/3" />
        <div className="flex justify-between">
          <div className="h-3 bg-gray-200 rounded w-1/4" />
          <div className="h-4 bg-gray-200 rounded w-1/4" />
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MenuPage() {
  const [searchParams] = useSearchParams()

  const lat = parseFloat(searchParams.get('lat') ?? '')
  const lng = parseFloat(searchParams.get('lng') ?? '')

  // Guard — redirect to homepage if no coordinates
  if (isNaN(lat) || isNaN(lng)) {
    return <Navigate to="/" replace />
  }

  const [sort,             setSort]             = useState<ChefSortOrder>('Closest')
  const [selectedDishTypes, setSelectedDishTypes] = useState<DishType[]>([])
  const [minRating,        setMinRating]        = useState(0)
  const [maxPrice,         setMaxPrice]         = useState('')
  const [cuisine,          setCuisine]          = useState<string | null>(
    searchParams.get('cuisine')
  )
  const [search,           setSearch]           = useState('')

  // Only send one DishType to backend (first selected), rest are client-side
  const primaryDishType = selectedDishTypes.length === 1 ? selectedDishTypes[0] : null

  const { data: chefs = [], isLoading } = useQuery({
    queryKey: ['nearby-chefs', lat, lng, sort, primaryDishType, cuisine, maxPrice],
    queryFn: () => chefsApi.getNearby({
      latitude:    lat,
      longitude:   lng,
      radiusKm:    10,
      sortOrder:   sort,
      dishType:    primaryDishType,
      cuisineType: cuisine,
      maxPrice:    maxPrice ? parseFloat(maxPrice) : null,
    }),
  })

  // Client-side: search by name, multi-dishtype filter, min rating
  const filtered = chefs.filter(c => {
    if (search && !c.fullName.toLowerCase().includes(search.toLowerCase())) return false
    if (minRating > 0 && c.rating < minRating) return false
    return true
  })

  const toggleDishType = (v: DishType) =>
    setSelectedDishTypes(p =>
      p.includes(v) ? p.filter(d => d !== v) : [...p, v]
    )

  return (
    <main className="flex flex-col min-h-screen">
      <div className="flex-1">

        {/* Cuisine strip */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
          <CuisineStrip selected={cuisine} onSelect={setCuisine} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="flex gap-8 items-start">

            {/* ── Sidebar ── */}
            <aside className="w-64 shrink-0 hidden lg:flex flex-col gap-4 sticky top-24">
              <SortSidebar value={sort} onChange={setSort} />
              <FilterSidebar
                selectedDishTypes={selectedDishTypes}
                onDishTypeToggle={toggleDishType}
                minRating={minRating}
                onRatingChange={setMinRating}
                maxPrice={maxPrice}
                onMaxPriceChange={setMaxPrice}
              />
            </aside>

            {/* ── Main ── */}
            <div className="flex-1 min-w-0">

              {/* Header + search */}
              <div className="flex items-center justify-between gap-4 mb-6">
                <h2 className="font-display text-2xl font-semibold text-[--text-primary]">
                  {cuisine
                    ? `${cuisine} chefs near you`
                    : 'Chefs near you'}
                  {!isLoading && (
                    <span className="text-base font-body font-normal text-[--text-muted] ml-2">
                      ({filtered.length})
                    </span>
                  )}
                </h2>

                {/* Search by chef name */}
                <div className="relative hidden sm:block w-52">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[--text-muted]" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search chef..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-[--border] rounded-full outline-none focus:border-brand-400 transition-colors bg-white"
                  />
                </div>
              </div>

              {/* Chef grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => <ChefCardSkeleton key={i} />)
                ) : filtered.length === 0 ? (
                  <div className="col-span-3 py-20 text-center text-[--text-muted]">
                    <p className="text-5xl mb-4">👨‍🍳</p>
                    <p className="font-semibold text-lg text-[--text-primary]">
                      No chefs found nearby
                    </p>
                    <p className="text-sm mt-1">
                      Try widening your search or adjusting filters.
                    </p>
                  </div>
                ) : (
                  filtered.map(chef => (
                    <ChefCardComponent key={chef.chefUserId} chef={chef} />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
