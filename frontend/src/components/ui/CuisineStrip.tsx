import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef } from 'react'
import { cn } from '@/lib/utils'

const CUISINES = [
  { label: 'American',      img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=120&h=120&fit=crop' },
  { label: 'Latin American',img: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=120&h=120&fit=crop' },
  { label: 'Chinese',       img: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=120&h=120&fit=crop' },
  { label: 'Maghrby',       img: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=120&h=120&fit=crop' },
  { label: 'Pakistania',    img: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=120&h=120&fit=crop' },
  { label: 'Italian',       img: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=120&h=120&fit=crop' },
  { label: 'Egyptian',      img: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=120&h=120&fit=crop' },
  { label: 'Japanese',      img: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=120&h=120&fit=crop' },
  { label: 'Indian',        img: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=120&h=120&fit=crop' },
  { label: 'Turkish',       img: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=120&h=120&fit=crop' },
]

interface CuisineStripProps {
  selected: string | null
  onSelect: (cuisine: string | null) => void
}

export default function CuisineStrip({ selected, onSelect }: CuisineStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({ left: dir === 'right' ? 240 : -240, behavior: 'smooth' })
  }

  return (
    <div className="relative flex items-center gap-2 py-2">
      {/* Left arrow */}
      <button
        onClick={() => scroll('left')}
        className="shrink-0 w-9 h-9 rounded-full bg-white border border-[--border] shadow-sm flex items-center justify-center hover:bg-brand-50 transition-colors z-10"
      >
        <ChevronLeft size={18} className="text-[--text-primary]" />
      </button>

      {/* Scrollable strip */}
      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto scrollbar-hide flex-1 py-1"
      >
        {CUISINES.map(c => (
          <button
            key={c.label}
            onClick={() => onSelect(selected === c.label ? null : c.label)}
            className="flex flex-col items-center gap-2 shrink-0 group"
          >
            <div className={cn(
              'w-[72px] h-[72px] rounded-full overflow-hidden border-2 transition-all duration-200 shadow-sm',
              selected === c.label
                ? 'border-brand-500 scale-105 shadow-md'
                : 'border-transparent group-hover:border-brand-300'
            )}>
              <img
                src={c.img}
                alt={c.label}
                className="w-full h-full object-cover"
              />
            </div>
            <span className={cn(
              'text-xs font-medium whitespace-nowrap transition-colors',
              selected === c.label ? 'text-brand-500' : 'text-[--text-muted] group-hover:text-brand-500'
            )}>
              {c.label}
            </span>
          </button>
        ))}
      </div>

      {/* Right arrow */}
      <button
        onClick={() => scroll('right')}
        className="shrink-0 w-9 h-9 rounded-full bg-white border border-[--border] shadow-sm flex items-center justify-center hover:bg-brand-50 transition-colors z-10"
      >
        <ChevronRight size={18} className="text-[--text-primary]" />
      </button>
    </div>
  )
}
