import { Link, useNavigate } from "react-router-dom";
import { Search, ShoppingCart, Menu, X } from "lucide-react";
import { useState, useRef } from "react";
import { useAuthStore } from "@/store/auth.store";
import { useUserStore } from "@/store/user.store";
import { useCartStore } from "@/store/cart.store";
import { authApi } from "@/api/auth";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const closeTimeout = useRef<number>();

  const { isAuthenticated, clearAuth } = useAuthStore();
  const { firstName, avatarSmallUrl } = useUserStore();
  const totalItems = useCartStore((s) => s.totalItems());
  const navigate = useNavigate();

  const handleLogout = async () => {
    await authApi.logout();
    clearAuth();
    navigate("/");
  };

  const handleMouseEnter = () => {
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
    setDropdownOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimeout.current = window.setTimeout(() => {
      setDropdownOpen(false);
    }, 150);
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[--border] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src="/logo.svg" alt="Ta'am Beit" className="h-8 w-auto" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              to="/"
              className="text-sm font-medium text-brand-500 hover:text-brand-600 transition-colors"
            >
              Home
            </Link>
            <button
              onClick={() => {
                if (window.location.pathname === "/") {
                  document
                    .getElementById("hero-search")
                    ?.scrollIntoView({ behavior: "smooth" });
                } else {
                  navigate("/");
                }
              }}
              className="text-sm font-medium text-[--text-primary] hover:text-brand-500 transition-colors"
            >
              See Menu
            </button>
            <Link
              to="/how-it-works"
              className="text-sm font-medium text-[--text-primary] hover:text-brand-500 transition-colors"
            >
              How it Works
            </Link>
            <Link
              to="/about"
              className="text-sm font-medium text-[--text-primary] hover:text-brand-500 transition-colors"
            >
              About Us
            </Link>
            <Link
              to="/become-a-chef"
              className="text-sm font-medium text-[--text-primary] hover:text-brand-500 transition-colors"
            >
              Become a Chef
            </Link>
          </nav>

          {/* Right actions */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link
                  to="/cart"
                  className="relative p-2 text-[--text-muted] hover:text-brand-500 transition-colors"
                >
                  <ShoppingCart size={20} />
                  {totalItems > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-brand-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {totalItems > 9 ? "9+" : totalItems}
                    </span>
                  )}
                </Link>

                <div
                  className="relative"
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                >
                  <button className="flex items-center gap-2 text-sm font-medium text-[--text-primary] hover:text-brand-500 transition-colors">
                    {/* Avatar or fallback initial */}
                    <UserAvatar name={firstName} avatarUrl={avatarSmallUrl()} />
                    <span>
                      {firstName ? `Welcome, ${firstName}!` : "My Account"}
                    </span>
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  {dropdownOpen && (
                    <div
                      className="absolute right-0 top-full mt-2 w-44 bg-white border border-[--border] rounded-xl shadow-card overflow-hidden z-50"
                      onMouseEnter={handleMouseEnter}
                      onMouseLeave={handleMouseLeave}
                    >
                      <Link
                        to="/orders"
                        className="block px-4 py-2.5 text-sm text-[--text-primary] hover:bg-brand-50 transition-colors"
                        onClick={() => setDropdownOpen(false)}
                      >
                        My Orders
                      </Link>
                      <Link
                        to="/profile"
                        className="block px-4 py-2.5 text-sm text-[--text-primary] hover:bg-brand-50 transition-colors"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Profile
                      </Link>
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          handleLogout();
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                      >
                        Log Out
                      </button>
                    </div>
                  )}
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
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-[--border] px-4 py-4 flex flex-col gap-4">
          <Link
            to="/"
            onClick={() => setMobileOpen(false)}
            className="text-sm font-medium text-brand-500"
          >
            Home
          </Link>
          <button
            onClick={() => {
              setMobileOpen(false);
              if (window.location.pathname === "/") {
                document
                  .getElementById("hero-search")
                  ?.scrollIntoView({ behavior: "smooth" });
              } else {
                navigate("/");
              }
            }}
            className="text-sm font-medium text-[--text-primary] text-left"
          >
            See Menu
          </button>
          <Link
            to="/how-it-works"
            onClick={() => setMobileOpen(false)}
            className="text-sm font-medium text-[--text-primary]"
          >
            How it Works
          </Link>
          <Link
            to="/about"
            onClick={() => setMobileOpen(false)}
            className="text-sm font-medium text-[--text-primary]"
          >
            About Us
          </Link>
          <Link
            to="/become-a-chef"
            onClick={() => setMobileOpen(false)}
            className="text-sm font-medium text-[--text-primary]"
          >
            Become a Chef
          </Link>
          <div className="flex gap-3 pt-2 border-t border-[--border]">
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="btn-outline text-sm py-2 flex-1"
              >
                Log Out
              </button>
            ) : (
              <>
                <Link
                  to="/register"
                  className="btn-primary text-sm py-2 flex-1 text-center"
                >
                  Sign Up
                </Link>
                <Link
                  to="/login"
                  className="btn-outline text-sm py-2 flex-1 text-center"
                >
                  Log In
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

// ── Small helper component ────────────────────────────────────────────────────

function UserAvatar({
  name,
  avatarUrl,
}: {
  name: string | null;
  avatarUrl: string | null;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name ?? "avatar"}
        className="w-7 h-7 rounded-full object-cover border border-[--border]"
      />
    );
  }

  // Fallback: coloured circle with first initial
  const initial = name?.[0]?.toUpperCase() ?? "?";
  return (
    <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold border border-brand-200 shrink-0">
      {initial}
    </div>
  );
}
