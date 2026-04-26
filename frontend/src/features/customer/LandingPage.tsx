import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Locate, ChevronRight, Star, Shield, Utensils } from 'lucide-react'
import Footer from '@/components/layout/Footer'

// Hero background — food photography overlay
const HERO_BG = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1600&q=80'

const CUISINE_CATEGORIES = [
  { label: 'American',      emoji: '🍔' },
  { label: 'Latin American',emoji: '🌮' },
  { label: 'Chinese',       emoji: '🥡' },
  { label: 'Maghrby',       emoji: '🫕' },
  { label: 'Pakistani',     emoji: '🍛' },
  { label: 'Italian',       emoji: '🍝' },
  { label: 'Egyptian',      emoji: '🧆' },
  { label: 'Japanese',      emoji: '🍣' },
]

const HOW_IT_WORKS = [
  { icon: MapPin,   title: 'Share your location',  desc: 'Tell us where you are and we find chefs cooking nearby.' },
  { icon: Utensils, title: 'Browse home kitchens', desc: 'Explore menus from certified local chefs in your area.' },
  { icon: Star,     title: 'Order & enjoy',         desc: 'Place your order and get it delivered fresh to your door.' },
]

export default function LandingPage() {
  const [address, setAddress] = useState('')
  const [locating, setLocating] = useState(false)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDetectLocation = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocating(false)
        navigate(`/menu?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`)
      },
      () => setLocating(false)
    )
  }

  const handleFindMeals = () => {
    if (!address.trim()) return inputRef.current?.focus()
    navigate(`/menu?address=${encodeURIComponent(address)}`)
  }

  return (
    <main>
      {/* ── Hero ── */}
      <section className="relative min-h-[88vh] flex items-center justify-center overflow-hidden">
        {/* Background */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_BG})` }}
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/40" />

        {/* Hero card */}
        <div id="hero-search" className="relative z-10 w-full max-w-xl mx-4 bg-black/55 backdrop-blur-sm rounded-3xl p-10 text-center shadow-2xl fade-up">
          <h1 className="text-white text-4xl sm:text-5xl font-display font-bold leading-tight mb-3">
            Flavors from Home,<br />Delivered to Your Door.
          </h1>
          <p className="text-white/80 text-base mb-8 font-body">
            Healthy, high quality meals made with love by local chefs in your community.
          </p>

          {/* Search bar */}
          <div className="flex items-center bg-white rounded-full shadow-lg overflow-hidden">
            <MapPin size={18} className="ml-4 text-[--text-muted] shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleFindMeals()}
              placeholder="Search for area, street name, etc..."
              className="flex-1 px-3 py-4 text-sm text-[--text-primary] bg-transparent outline-none font-body placeholder:text-[--text-muted]"
            />
            <button
              onClick={handleDetectLocation}
              disabled={locating}
              className="p-3 mr-1 text-[--text-muted] hover:text-brand-500 transition-colors"
              title="Detect my location"
            >
              <Locate size={18} className={locating ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleFindMeals}
              className="btn-primary rounded-full m-1 text-sm px-6 py-3 shrink-0"
            >
              Find Meals
            </button>
          </div>
        </div>
      </section>

      {/* ── Cuisine categories ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <h2 className="text-2xl font-display font-semibold text-[--text-primary] mb-6">
          Explore by cuisine
        </h2>
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
          {CUISINE_CATEGORIES.map(c => (
            <button
              key={c.label}
              onClick={() => navigate(`/menu?cuisine=${encodeURIComponent(c.label)}`)}
              className="flex flex-col items-center gap-2 shrink-0 group"
            >
              <div className="w-20 h-20 rounded-full bg-brand-50 border-2 border-transparent group-hover:border-brand-400 transition-all flex items-center justify-center text-3xl shadow-sm group-hover:shadow-md">
                {c.emoji}
              </div>
              <span className="text-xs font-medium text-[--text-muted] group-hover:text-brand-500 transition-colors">
                {c.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="bg-brand-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-display font-semibold text-center mb-12">
            How it Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-brand-500 text-white flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <step.icon size={28} />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{step.title}</h3>
                <p className="text-[--text-muted] text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Become a chef CTA ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-forest rounded-3xl p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Shield size={18} className="text-brand-300" />
              <span className="text-brand-300 text-sm font-semibold uppercase tracking-wide">Verified & Certified</span>
            </div>
            <h2 className="text-white font-display text-3xl font-bold mb-3">
              Love to cook? Share your passion.
            </h2>
            <p className="text-white/70 text-base max-w-md">
              Join our community of home chefs. Set your own menu, hours, and prices — we handle the rest.
            </p>
          </div>
          <a
            href="/become-a-chef"
            className="btn-primary shrink-0 flex items-center gap-2 text-base px-8 py-4"
          >
            Become a Chef
            <ChevronRight size={18} />
          </a>
        </div>
      </section>

      <Footer />
    </main>
  )
}
