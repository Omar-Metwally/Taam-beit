import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  rating: number
  count?: number
  size?: 'sm' | 'md'
  className?: string
}

export default function StarRating({ rating, count, size = 'sm', className }: StarRatingProps) {
  const starSize = size === 'sm' ? 13 : 16

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Star
        size={starSize}
        className="text-yellow-400 fill-yellow-400"
      />
      <span className={cn(
        'font-semibold text-[--text-primary]',
        size === 'sm' ? 'text-xs' : 'text-sm'
      )}>
        {rating.toFixed(1)}
      </span>
      {count !== undefined && (
        <span className={cn(
          'text-[--text-muted]',
          size === 'sm' ? 'text-xs' : 'text-sm'
        )}>
          ({count})
        </span>
      )}
    </div>
  )
}
