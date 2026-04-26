import { Link, useNavigate } from 'react-router-dom'
import { Search, ShoppingCart, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { useCartStore } from '@/store/cart.store'
import { authApi } from '@/api/auth'

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { isAuthenticated, clearAuth, userId } = useAuthStore()
  const totalItems = useCartStore(s => s.totalItems())
  const navigate = useNavigate()

  const handleLogout = async () => {
    await authApi.logout()
    clearAuth()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[--border] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="font-display font-bold text-2xl text-brand-500 tracking-tight">
              T<span className="inline-block -mx-0.5">🍽</span>'AM BEIT
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/"        className="text-sm font-medium text-brand-500 hover:text-brand-600 transition-colors">Home</Link>
            <button
              onClick={() => {
                if (window.location.pathname === '/') {
                  document.getElementById('hero-search')?.scrollIntoView({ behavior: 'smooth' })
                } else {
                  navigate('/')
                }
              }}
              className="text-sm font-medium text-[--text-primary] hover:text-brand-500 transition-colors"
            >
              See Menu
            </button>
            <Link to="/how-it-works" className="text-sm font-medium text-[--text-primary] hover:text-brand-500 transition-colors">How it Works</Link>
            <Link to="/about"   className="text-sm font-medium text-[--text-primary] hover:text-brand-500 transition-colors">About Us</Link>
            <Link to="/become-a-chef" className="text-sm font-medium text-[--text-primary] hover:text-brand-500 transition-colors">Become a Chef</Link>
          </nav>

          {/* Right actions */}
          <div className="hidden md:flex items-center gap-3">
            <button className="p-2 text-[--text-muted] hover:text-brand-500 transition-colors">
              <Search size={20} />
            </button>

            <span className="text-sm text-[--text-muted] cursor-pointer hover:text-brand-500 transition-colors">
              عربي
            </span>

            {isAuthenticated ? (
              <>
                <Link to="/cart" className="relative p-2 text-[--text-muted] hover:text-brand-500 transition-colors">
                  <ShoppingCart size={20} />
                  {totalItems > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-brand-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {totalItems > 9 ? '9+' : totalItems}
                    </span>
                  )}
                </Link>
                {/* Welcome dropdown — matches design */}
                <div className="relative group">
                  <button className="flex items-center gap-1.5 text-sm font-medium text-[--text-primary] hover:text-brand-500 transition-colors">
                    Welcome, Ahmed!
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <div className="absolute right-0 top-full mt-2 w-44 bg-white border border-[--border] rounded-xl shadow-card overflow-hidden opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all z-50">
                    <Link to="/orders" className="block px-4 py-2.5 text-sm text-[--text-primary] hover:bg-brand-50 transition-colors">My Orders</Link>
                    <Link to="/profile" className="block px-4 py-2.5 text-sm text-[--text-primary] hover:bg-brand-50 transition-colors">Profile</Link>
                    <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors">Log Out</button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link to="/register" className="btn-primary text-sm py-2 px-5">
                  Sign Up
                </Link>
                <Link to="/login" className="btn-outline text-sm py-2 px-5">
                  Log In
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-[--text-primary]"
            onClick={() => setMobileOpen(o => !o)}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-[--border] px-4 py-4 flex flex-col gap-4">
          <Link to="/"        onClick={() => setMobileOpen(false)} className="text-sm font-medium text-brand-500">Home</Link>
          <button
            onClick={() => {
              setMobileOpen(false)
              if (window.location.pathname === '/') {
                document.getElementById('hero-search')?.scrollIntoView({ behavior: 'smooth' })
              } else {
                navigate('/')
              }
            }}
            className="text-sm font-medium text-[--text-primary] text-left"
          >
            See Menu
          </button>
          <Link to="/how-it-works" onClick={() => setMobileOpen(false)} className="text-sm font-medium text-[--text-primary]">How it Works</Link>
          <Link to="/about"   onClick={() => setMobileOpen(false)} className="text-sm font-medium text-[--text-primary]">About Us</Link>
          <Link to="/become-a-chef" onClick={() => setMobileOpen(false)} className="text-sm font-medium text-[--text-primary]">Become a Chef</Link>
          <div className="flex gap-3 pt-2 border-t border-[--border]">
            {isAuthenticated ? (
              <button onClick={handleLogout} className="btn-outline text-sm py-2 flex-1">Log Out</button>
            ) : (
              <>
                <Link to="/register" className="btn-primary text-sm py-2 flex-1 text-center">Sign Up</Link>
                <Link to="/login"    className="btn-outline text-sm py-2 flex-1 text-center">Log In</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
