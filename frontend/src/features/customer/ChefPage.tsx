import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Star, ShieldCheck, ChefHat, MoreHorizontal, Heart, MapPin } from 'lucide-react'
import { chefsApi } from '@/api/chefs'
import { mealsApi, type Meal } from '@/api/meals'
import { getAvatarUrl, getImageUrl, cn } from '@/lib/utils'
import Footer from '@/components/layout/Footer'

const TABS = ['All', 'Main Dish', 'Side Dish', 'Dessert', 'Appetizer']

const DISH_TYPE_MAP: Record<string, string> = {
  MainDish: 'Main Dish',
  SideDish: 'Side Dish',
  Dessert:  'Dessert',
  Appetizer:'Appetizer',
}

const HERO_IMGS = [
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&h=400&fit=crop',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&h=400&fit=crop',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&h=400&fit=crop',
]

function StatBadge({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 bg-white rounded-2xl border border-[--border] px-5 py-4 min-w-[100px] shadow-sm">
      <div className="text-[--text-muted] mb-0.5">{icon}</div>
      <span className="font-bold text-lg text-[--text-primary] leading-none">{value}</span>
      <span className="text-xs text-[--text-muted] text-center leading-tight">{label}</span>
    </div>
  )
}

function MealMiniCard({ meal, chefId }: { meal: Meal; chefId: string }) {
  return (
    <Link to={`/meal/${meal.mealId}`} className="card block group cursor-pointer">
      <div className="relative overflow-hidden rounded-t-2xl">
        <img
          src={getImageUrl(meal.imageUrl, 'md')}
          alt={meal.name}
          className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-500"
          onError={e => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop'
          }}
        />
      </div>
      <div className="p-3">
        <h4 className="font-semibold text-sm text-[--text-primary] truncate">{meal.name}</h4>
        {meal.variants[0] && (
          <p className="text-sm font-bold text-[--text-primary] mt-1">
            {meal.variants.find(v => v.isDefault)?.price ?? meal.variants[0].price}
            <span className="text-xs font-normal text-[--text-muted] ml-1">
              {meal.variants[0].currency}
            </span>
          </p>
        )}
        {meal.sideDishes.length > 0 && (
          <p className="text-xs text-brand-500 font-medium mt-0.5">Side Dishes Available</p>
        )}
      </div>
    </Link>
  )
}

function MealCardSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="h-44 bg-gray-200 rounded-t-2xl" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/3" />
      </div>
    </div>
  )
}

export default function ChefPage() {
  const { id }                    = useParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState('All')
  const [liked, setLiked]         = useState(false)
  const [expanded, setExpanded]   = useState(false)

  // Find chef info from nearby chefs (we pass dummy coords — in real app use stored location)
  const { data: nearbyChefs = [] } = useQuery({
    queryKey: ['nearby-chefs-for-profile'],
    queryFn: () => chefsApi.getNearby({ latitude: 30.0444, longitude: 31.2357, radiusKm: 50 }),
  })

  const chefCard = nearbyChefs.find(c => c.chefUserId === id)

  const { data: meals = [], isLoading: mealsLoading } = useQuery({
    queryKey: ['chef-meals', id],
    queryFn: () => mealsApi.getChefMeals(id!),
    enabled: !!id,
  })

  const heroImg = HERO_IMGS[parseInt(id?.slice(-1) ?? '0', 16) % HERO_IMGS.length]

  // Filter meals by tab
  const filteredMeals = activeTab === 'All'
    ? meals
    : meals.filter(m => DISH_TYPE_MAP[m.dishType] === activeTab)

  // Show tabs only for dish types that have meals
  const availableTabs = ['All', ...Array.from(
    new Set(meals.map(m => DISH_TYPE_MAP[m.dishType]).filter(Boolean))
  )]

  const bio = chefCard
    ? `Local chef specialising in ${chefCard.cuisineTypes.join(', ')} cuisine. ${chefCard.totalMeals} meals prepared with care using fresh, home-quality ingredients.`
    : 'A passionate local chef bringing authentic home-cooked flavors to your door.'

  const shortBio = bio.slice(0, 160)
  const needsExpand = bio.length > 160

  return (
    <main className="flex flex-col min-h-screen">
      <div className="flex-1">

        {/* ── Hero ── */}
        <div className="relative">
          <div className="relative h-64 sm:h-80 overflow-hidden">
            <img src={heroImg} alt="Chef cover" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            <div className="absolute top-4 right-4 flex gap-2">
              <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-105 transition-transform">
                <MoreHorizontal size={18} className="text-[--text-primary]" />
              </button>
              <button
                onClick={() => setLiked(l => !l)}
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-105 transition-transform"
              >
                <Heart size={18} className={liked ? 'fill-red-500 text-red-500' : 'text-[--text-muted]'} />
              </button>
            </div>
          </div>

          {/* Avatar */}
          <div className="absolute left-6 bottom-0 translate-y-1/2">
            <div className="relative">
              <img
                src={getAvatarUrl(chefCard?.avatarUrl ?? null, 'lg')}
                alt={chefCard?.fullName ?? 'Chef'}
                className="w-24 h-24 rounded-full border-4 border-white object-cover shadow-lg"
                onError={e => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1607631568010-a87245c0daf8?w=200&h=200&fit=crop&crop=face'
                }}
              />
              <span className="absolute bottom-1 right-1 w-4 h-4 bg-brand-500 rounded-full border-2 border-white" />
            </div>
          </div>
        </div>

        {/* ── Details ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-6">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">

            {/* Bio card */}
            <div className="flex-1 border border-[--border] rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="font-display text-2xl font-bold text-[--text-primary]">
                  {chefCard?.fullName ?? 'Chef'}
                </h1>
                <span className="text-brand-500 text-sm font-semibold">Online</span>
              </div>

              {chefCard?.cuisineTypes && chefCard.cuisineTypes.length > 0 && (
                <p className="text-sm text-[--text-muted] mb-2">
                  {chefCard.cuisineTypes.join(' · ')}
                </p>
              )}

              {chefCard?.operationAddressLine && (
                <div className="flex items-center gap-1 text-xs text-[--text-muted] mb-3">
                  <MapPin size={12} />
                  <span>{chefCard.operationAddressLine}</span>
                  <span>· {chefCard.distanceKm.toFixed(1)} km away</span>
                </div>
              )}

              <p className="text-sm text-[--text-primary] leading-relaxed">
                {expanded ? bio : shortBio}
                {needsExpand && !expanded && '...'}
                {' '}
                {needsExpand && (
                  <button
                    onClick={() => setExpanded(e => !e)}
                    className="text-brand-500 font-medium hover:underline"
                  >
                    {expanded ? 'Show less' : 'Learn More'}
                  </button>
                )}
              </p>
            </div>

            {/* Stats */}
            <div className="flex gap-3 shrink-0 flex-wrap">
              {chefCard && (
                <>
                  <StatBadge
                    icon={<Star size={18} className="fill-yellow-400 text-yellow-400" />}
                    value={chefCard.rating > 0 ? chefCard.rating.toFixed(1) : '—'}
                    label="Rating"
                  />
                  <StatBadge
                    icon={<ChefHat size={18} />}
                    value={`${chefCard.totalMeals}+`}
                    label="Meals"
                  />
                  {chefCard.isCertified && (
                    <StatBadge
                      icon={<ShieldCheck size={18} className="text-brand-500" />}
                      value="certified"
                      label="Food safety"
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {availableTabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'shrink-0 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 border',
                  activeTab === tab
                    ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                    : 'bg-white text-[--text-primary] border-[--border] hover:border-brand-300'
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* ── Meals grid ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="font-display text-2xl font-semibold text-[--text-primary] mb-6">
            {activeTab === 'All' ? 'All meals' : activeTab}
            <span className="text-base font-body font-normal text-[--text-muted] ml-2">
              ({filteredMeals.length})
            </span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {mealsLoading
              ? Array.from({ length: 8 }).map((_, i) => <MealCardSkeleton key={i} />)
              : filteredMeals.length === 0
              ? (
                <div className="col-span-4 py-12 text-center text-[--text-muted]">
                  <p className="text-4xl mb-3">🍽</p>
                  <p className="font-medium">No meals in this category yet</p>
                </div>
              )
              : filteredMeals.map(meal => (
                <MealMiniCard key={meal.mealId} meal={meal} chefId={id!} />
              ))
            }
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
