import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, Heart, Minus, Plus, ShoppingCart } from 'lucide-react'
import { mealsApi, type ToppingGroup, type SideDish } from '@/api/meals'
import { chefsApi } from '@/api/chefs'
import { useCartStore } from '@/store/cart.store'
import StarRating from '@/components/ui/StarRating'
import { getImageUrl, getAvatarUrl, cn } from '@/lib/utils'
import Footer from '@/components/layout/Footer'

const MOCK_REVIEWS = [
  { id: '1', author: 'Ahmed Ibrahim',   rating: 4.5, date: '1/3/2024', text: 'Great Dessert with variety of toppings!' },
  { id: '2', author: 'Youssef Mohamed', rating: 4.5, date: '1/3/2024', text: 'It was delicious, I recommend to get it with...' },
  { id: '3', author: 'Ahmed Ibrahim',   rating: 4.5, date: '1/3/2024', text: 'Great Dessert with variety of toppings!' },
  { id: '4', author: 'Youssef Mohamed', rating: 4.5, date: '1/3/2024', text: 'It was delicious, I recommend to get it with...' },
]

function ReviewCard({ review }: { review: typeof MOCK_REVIEWS[0] }) {
  return (
    <div className="bg-white rounded-2xl border border-[--border] p-4">
      <p className="font-semibold text-sm text-[--text-primary] mb-1">{review.author}</p>
      <div className="flex items-center gap-2 mb-2">
        <StarRating rating={review.rating} size="sm" />
        <span className="text-xs text-[--text-muted]">{review.date}</span>
      </div>
      <p className="text-sm text-[--text-muted] leading-relaxed">{review.text}</p>
    </div>
  )
}

// Renders one topping group (either radio or checkbox based on min/max)
function ToppingGroupSection({
  group,
  selected,
  onToggle,
}: {
  group: ToppingGroup
  selected: Set<string>
  onToggle: (id: string, groupId: string, maxSelections: number) => void
}) {
  const isRadio = group.maxSelections === 1
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="font-semibold text-sm text-[--text-primary]">{group.name}</h3>
        {group.minSelections > 0 && (
          <span className="text-xs bg-red-50 text-red-500 font-medium px-2 py-0.5 rounded-full">
            Required
          </span>
        )}
        {!isRadio && (
          <span className="text-xs text-[--text-muted]">
            (choose up to {group.maxSelections})
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {group.options.map(opt => {
          const isSelected = selected.has(opt.toppingOptionId)
          return (
            <label
              key={opt.toppingOptionId}
              className="flex items-center gap-2 cursor-pointer text-sm"
            >
              <div className={cn(
                'w-4 h-4 flex items-center justify-center shrink-0 transition-all border-2',
                isRadio ? 'rounded-full' : 'rounded',
                isSelected ? 'border-brand-500 bg-brand-500' : 'border-[--border]'
              )}>
                {isSelected && (
                  isRadio
                    ? <div className="w-1.5 h-1.5 bg-white rounded-full" />
                    : <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                        <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5"
                          strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                )}
              </div>
              <input
                type={isRadio ? 'radio' : 'checkbox'}
                className="sr-only"
                checked={isSelected}
                onChange={() => onToggle(opt.toppingOptionId, group.toppingGroupId, group.maxSelections)}
              />
              <span className="text-[--text-primary]">{opt.name}</span>
              {opt.extraPrice > 0 && (
                <span className="text-brand-500 text-xs font-medium ml-auto">
                  +{opt.extraPrice.toFixed(0)} {opt.currency}
                </span>
              )}
            </label>
          )
        })}
      </div>
    </div>
  )
}

function SideDishSection({
  sideDishes,
  selected,
  onToggle,
}: {
  sideDishes: SideDish[]
  selected: Set<string>
  onToggle: (id: string) => void
}) {
  if (sideDishes.length === 0) return null
  return (
    <div className="mb-5">
      <h3 className="font-semibold text-sm text-[--text-primary] mb-3">Side Dishes</h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {sideDishes.map(s => {
          const isSelected = selected.has(s.sideDishId)
          return (
            <label key={s.sideDishId} className="flex items-center gap-2 cursor-pointer text-sm">
              <div className={cn(
                'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                isSelected ? 'border-brand-500 bg-brand-500' : 'border-[--border]'
              )}>
                {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
              </div>
              <input type="checkbox" className="sr-only"
                checked={isSelected} onChange={() => onToggle(s.sideDishId)} />
              <span className="text-[--text-primary]">{s.name}</span>
              {s.price > 0 && (
                <span className="text-brand-500 text-xs font-medium ml-auto">
                  +{s.price.toFixed(0)} {s.currency}
                </span>
              )}
            </label>
          )
        })}
      </div>
    </div>
  )
}

export default function MealDetailPage() {
  const { id }    = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const addToCart = useCartStore(s => s.addItem)

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [selectedToppings,  setSelectedToppings]  = useState<Set<string>>(new Set())
  const [selectedSides,     setSelectedSides]     = useState<Set<string>>(new Set())
  const [quantity,          setQuantity]          = useState(1)
  const [liked,             setLiked]             = useState(false)
  const [addedFeedback,     setAddedFeedback]     = useState(false)

  const { data: meal, isLoading } = useQuery({
    queryKey: ['meal', id],
    queryFn:  () => mealsApi.getMealById(id!),
    enabled:  !!id,
  })

  // Find chef from nearby query
  const { data: nearbyChefs = [] } = useQuery({
    queryKey: ['nearby-chefs-for-meal'],
    queryFn:  () => chefsApi.getNearby({ latitude: 30.0444, longitude: 31.2357, radiusKm: 50 }),
    enabled:  !!meal,
  })

  // Auto-select default variant when meal loads
  useEffect(() => {
    if (meal && !selectedVariantId) {
      const def = meal.variants.find(v => v.isDefault) ?? meal.variants[0]
      if (def) setSelectedVariantId(def.variantId)
    }
  }, [meal])

  // Auto-select required side dishes
  useEffect(() => {
    if (meal) {
      const required = meal.sideDishes.filter(s => s.isRequired).map(s => s.sideDishId)
      if (required.length > 0) setSelectedSides(new Set(required))
    }
  }, [meal])

  const toggleTopping = (optionId: string, groupId: string, maxSelections: number) => {
    setSelectedToppings(prev => {
      const next = new Set(prev)
      if (next.has(optionId)) {
        next.delete(optionId)
      } else {
        if (maxSelections === 1) {
          // Radio behaviour — deselect others in same group
          const group = meal?.toppingGroups.find(g => g.toppingGroupId === groupId)
          group?.options.forEach(o => next.delete(o.toppingOptionId))
        }
        next.add(optionId)
      }
      return next
    })
  }

  const toggleSide = (id: string) => {
    setSelectedSides(prev => {
      const sd = meal?.sideDishes.find(s => s.sideDishId === id)
      if (sd?.isRequired) return prev // can't deselect required
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const activeVariant = meal?.variants.find(v => v.variantId === selectedVariantId)

  // Calculate extra costs
  const sideDishTotal = meal?.sideDishes
    .filter(s => selectedSides.has(s.sideDishId))
    .reduce((sum, s) => sum + s.price, 0) ?? 0

  const toppingTotal = meal?.toppingGroups
    .flatMap(g => g.options)
    .filter(o => selectedToppings.has(o.toppingOptionId))
    .reduce((sum, o) => sum + o.extraPrice, 0) ?? 0

  const unitPrice = (activeVariant?.price ?? 0) + sideDishTotal + toppingTotal
  const lineTotal = unitPrice * quantity

  const chef = meal ? nearbyChefs.find(c =>
    c.mealPreviews.some(m => m.mealId === meal.mealId)
  ) : undefined

  const handleAddToCart = () => {
    if (!meal || !activeVariant) return

    addToCart({
      mealId:     meal.mealId,
      mealName:   meal.name,
      mealImageUrl: meal.imageUrl,
      chefId:     chef?.chefUserId ?? '',
      chefName:   chef?.fullName ?? 'Chef',
      variantId:  activeVariant.variantId,
      variantName: activeVariant.name,
      variantPrice: activeVariant.price,
      currency:   activeVariant.currency,
      quantity,
      selectedSideDishIds:       Array.from(selectedSides),
      selectedToppingOptionIds:  Array.from(selectedToppings),
      sideDishTotal,
      toppingTotal,
    })

    setAddedFeedback(true)
    setTimeout(() => setAddedFeedback(false), 2000)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!meal) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-5xl">🍽</p>
        <p className="font-semibold text-[--text-primary]">Meal not found</p>
        <button onClick={() => navigate(-1)} className="btn-outline text-sm">Go back</button>
      </div>
    )
  }

  return (
    <main className="flex flex-col min-h-screen">
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-[--text-muted] hover:text-brand-500 transition-colors mb-6"
        >
          <ChevronLeft size={18} /> Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">

          {/* ── LEFT — order form ── */}
          <div>
            <h1 className="font-display text-3xl font-bold text-[--text-primary] mb-2">
              {meal.name}
            </h1>

            <div className="mb-3">
              <StarRating rating={4.5} count={50} size="md" />
            </div>

            {meal.description && (
              <p className="text-sm text-[--text-muted] leading-relaxed mb-4">
                {meal.description}
              </p>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-2xl font-bold text-[--text-primary]">
                {unitPrice.toFixed(0)}
              </span>
              <span className="text-sm text-[--text-muted]">
                {activeVariant?.currency ?? 'EGP'}
              </span>
            </div>
            {activeVariant && (
              <p className="text-xs text-[--text-muted] mb-5">
                base serving for {activeVariant.name.toLowerCase()} size
              </p>
            )}

            {/* Size variants */}
            {meal.variants.length > 1 && (
              <div className="mb-6">
                <h3 className="font-semibold text-sm text-[--text-primary] mb-3">Size:</h3>
                <div className="flex gap-2 flex-wrap">
                  {meal.variants.map(v => (
                    <button
                      key={v.variantId}
                      onClick={() => setSelectedVariantId(v.variantId)}
                      className={cn(
                        'px-5 py-2 rounded-full text-sm font-medium border-2 transition-all',
                        selectedVariantId === v.variantId
                          ? 'bg-brand-500 border-brand-500 text-white'
                          : 'bg-white border-[--border] text-[--text-primary] hover:border-brand-300'
                      )}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Topping groups from API */}
            {meal.toppingGroups.map(group => (
              <ToppingGroupSection
                key={group.toppingGroupId}
                group={group}
                selected={selectedToppings}
                onToggle={toggleTopping}
              />
            ))}

            {/* Side dishes from API */}
            <SideDishSection
              sideDishes={meal.sideDishes}
              selected={selectedSides}
              onToggle={toggleSide}
            />

            {/* Quantity */}
            <div className="flex items-center gap-3 mb-8">
              <span className="text-sm font-medium text-[--text-primary]">Qty:</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-full border-2 border-[--border] flex items-center justify-center hover:border-brand-500 transition-colors"
                >
                  <Minus size={14} />
                </button>
                <span className="w-8 text-center font-semibold">{quantity}</span>
                <button
                  onClick={() => setQuantity(q => q + 1)}
                  className="w-8 h-8 rounded-full border-2 border-[--border] flex items-center justify-center hover:border-brand-500 transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
              <span className="text-sm text-[--text-muted] ml-auto">
                Total: <span className="font-bold text-[--text-primary]">
                  {lineTotal.toFixed(0)} {activeVariant?.currency ?? 'EGP'}
                </span>
              </span>
            </div>

            {/* CTA */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleAddToCart}
                className={cn(
                  'btn-primary flex-1 py-4 text-base gap-3',
                  addedFeedback && 'bg-brand-600 scale-95'
                )}
              >
                <ShoppingCart size={20} />
                {addedFeedback ? 'Added to cart!' : 'Add to Cart'}
              </button>
              <button
                onClick={() => setLiked(l => !l)}
                className="flex items-center gap-2 text-sm text-[--text-muted] hover:text-brand-500 transition-colors shrink-0"
              >
                <Heart size={20} className={liked ? 'fill-red-500 text-red-500' : ''} />
                Add to favourite
              </button>
            </div>
          </div>

          {/* ── RIGHT — image + reviews ── */}
          <div>
            {/* Chef attribution */}
            {chef && (
              <Link
                to={`/chef/${chef.chefUserId}`}
                className="flex items-center gap-3 mb-4 group"
              >
                <img
                  src={getAvatarUrl(chef.avatarUrl, 'sm')}
                  alt={chef.fullName}
                  className="w-12 h-12 rounded-full object-cover border-2 border-[--border] group-hover:border-brand-400 transition-colors"
                  onError={e => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1607631568010-a87245c0daf8?w=80&h=80&fit=crop&crop=face'
                  }}
                />
                <span className="text-sm text-[--text-muted]">
                  By Chef{' '}
                  <span className="font-semibold text-[--text-primary] group-hover:text-brand-500 transition-colors underline underline-offset-2">
                    {chef.fullName}
                  </span>
                </span>
              </Link>
            )}

            {/* Meal image */}
            <div className="rounded-2xl overflow-hidden mb-8 shadow-card">
              <img
                src={getImageUrl(meal.imageUrl, 'lg')}
                alt={meal.name}
                className="w-full h-80 object-cover"
                onError={e => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1565299543923-37dd37887442?w=700&h=500&fit=crop'
                }}
              />
            </div>

            {/* Reviews */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-semibold text-[--text-primary]">
                  Reviews
                </h2>
                <button className="text-sm text-brand-500 font-medium hover:underline flex items-center gap-1">
                  View all <ChevronLeft size={14} className="rotate-180" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {MOCK_REVIEWS.map(r => <ReviewCard key={r.id} review={r} />)}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  )
}
