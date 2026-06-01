import { Link } from 'react-router-dom'
import { Star, ShieldCheck, MapPin, UtensilsCrossed } from 'lucide-react'
import { type ChefCard } from '@/api/chefs'
import { getAvatarUrl, getImageUrl, cn } from '@/lib/utils'

interface ChefCardProps {
  chef: ChefCard
  className?: string
}

export default function ChefCardComponent({ chef, className }: ChefCardProps) {
  return (
    <Link
      to={`/chef/${chef.chefUserId}`}
      className={cn('card block group cursor-pointer hover:-translate-y-0.5 transition-transform duration-200', className)}
    >
      {/* ── Meal preview strip ── */}
      <div className="relative h-44 rounded-t-2xl overflow-hidden bg-gray-100">
        {chef.mealPreviews.length > 0 ? (
          <div className="grid h-full"
            style={{ gridTemplateColumns: `repeat(${Math.min(chef.mealPreviews.length, 3)}, 1fr)` }}>
            {chef.mealPreviews.slice(0, 3).map((meal, i) => (
              <div key={meal.mealId} className={cn(
                'relative overflow-hidden',
                // First image slightly larger when only 2 previews
                chef.mealPreviews.length === 2 && i === 0 && 'col-span-1'
              )}>
                <img
                  src={getImageUrl(meal.imageUrl, 'sm')}
                  alt={meal.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={e => {
                    (e.target as HTMLImageElement).src =
                      `https://images.unsplash.com/photo-150467490024${i}-0877df9cc836?w=200&h=180&fit=crop`
                  }}
                />
                {/* Subtle separator */}
                {i > 0 && <div className="absolute inset-y-0 left-0 w-px bg-white/40" />}
              </div>
            ))}
          </div>
        ) : (
          // No meals yet — placeholder
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <UtensilsCrossed size={40} />
          </div>
        )}

        {/* Chef avatar — bottom-left overlap */}
        <div className="absolute bottom-0 left-4 translate-y-1/2 z-10">
          <img
            src={getAvatarUrl(chef.avatarUrl, 'sm')}
            alt={chef.fullName}
            className="w-12 h-12 rounded-full border-3 border-white object-cover shadow-lg"
            onError={e => {
              (e.target as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1607631568010-a87245c0daf8?w=80&h=80&fit=crop&crop=face'
            }}
          />
        </div>

        {/* Certified badge */}
        {chef.isCertified && (
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full p-1.5 shadow-sm">
            <ShieldCheck size={14} className="text-brand-500" />
          </div>
        )}
      </div>

      {/* ── Card body ── */}
      <div className="pt-8 px-4 pb-4">

        {/* Name + rating row */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-display font-semibold text-base text-[--text-primary] leading-tight">
            {chef.fullName}
          </h3>
          {chef.rating > 0 && (
            <div className="flex items-center gap-1 shrink-0">
              <Star size={13} className="fill-yellow-400 text-yellow-400" />
              <span className="text-xs font-semibold text-[--text-primary]">
                {chef.rating.toFixed(1)}
              </span>
            </div>
          )}
        </div>

        {/* Cuisine tags */}
        {chef.cuisineTypes.length > 0 && (
          <p className="text-xs text-[--text-muted] mb-2 truncate">
            {chef.cuisineTypes.slice(0, 3).join(' · ')}
          </p>
        )}

        {/* Distance */}
        <div className="flex items-center gap-1 text-xs text-[--text-muted] mb-3">
          <MapPin size={11} />
          <span>
            {chef.distanceKm < 1
              ? `${Math.round(chef.distanceKm * 1000)} m away`
              : `${chef.distanceKm.toFixed(1)} km away`}
          </span>
          {chef.operationAddressLine && (
            <span className="truncate">· {chef.operationAddressLine}</span>
          )}
        </div>

        {/* Footer row — total meals + from price */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-[--text-muted]">
            {chef.totalMeals} {chef.totalMeals === 1 ? 'meal' : 'meals'}
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-xs text-[--text-muted]">from</span>
            <span className="font-bold text-[--text-primary] text-base">
              {chef.fromPrice.toFixed(0)}
            </span>
            <span className="text-xs text-[--text-muted]">{chef.currency}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
