import { Heart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { type Meal, type ChefWithMeals } from '@/api/meals'
import { getImageUrl, getAvatarUrl, formatCurrency, cn } from '@/lib/utils'
import StarRating from './StarRating'

interface MealCardProps {
  meal: Meal
  chef: ChefWithMeals
  className?: string
}

export default function MealCard({ meal, chef, className }: MealCardProps) {
  const [liked, setLiked] = useState(false)

  const defaultVariant = meal.variants.find(v => v.isDefault) ?? meal.variants[0]
  const hasSideDishes = false // will be real data in full integration

  return (
    <Link
      to={`/meal/${meal.mealId}`}
      className={cn('card block group cursor-pointer', className)}
    >
      {/* Image container */}
      <div className="relative overflow-hidden rounded-t-2xl">
        <img
          src={getImageUrl(meal.imageUrl, 'md')}
          alt={meal.name}
          className="meal-card-img group-hover:scale-105 transition-transform duration-500"
          onError={e => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop'
          }}
        />

        {/* Favourite button */}
        <button
          onClick={e => { e.preventDefault(); setLiked(l => !l) }}
          className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
        >
          <Heart
            size={15}
            className={liked ? 'fill-red-500 text-red-500' : 'text-[--text-muted]'}
          />
        </button>

        {/* Chef avatar — overlapping bottom edge of image */}
        <div className="absolute bottom-0 right-3 translate-y-1/2">
          <img
            src={getAvatarUrl(chef.avatarUrl, 'sm')}
            alt={chef.chefName}
            className="w-10 h-10 rounded-full border-2 border-white object-cover shadow"
            onError={e => {
              (e.target as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1607631568010-a87245c0daf8?w=80&h=80&fit=crop&crop=face'
            }}
          />
        </div>
      </div>

      {/* Card body */}
      <div className="p-4 pt-5">
        <h3 className="font-display font-semibold text-base text-[--text-primary] mb-0.5 truncate">
          {meal.name}
        </h3>

        <p className="text-xs text-[--text-muted] mb-2">{chef.chefName}</p>

        <StarRating rating={chef.rating} count={50} className="mb-2" />

        <p className={cn(
          'text-xs mb-3',
          hasSideDishes ? 'text-brand-500 font-medium' : 'text-[--text-muted]'
        )}>
          {hasSideDishes ? 'Side Dishes Available' : 'No Side Dishes Available'}
        </p>

        {/* Price */}
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold text-[--text-primary]">
            {defaultVariant?.price ?? 0}
          </span>
          <span className="text-sm font-medium text-[--text-muted]">
            {defaultVariant?.currency ?? 'EGP'}
          </span>
        </div>
      </div>
    </Link>
  )
}
