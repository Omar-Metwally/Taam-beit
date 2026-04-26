import { useNavigate } from 'react-router-dom'
import { Minus, Plus, Trash2, ShoppingBag, ChevronRight } from 'lucide-react'
import { useCartStore } from '@/store/cart.store'
import { useCheckoutStore } from '@/store/checkout.store'
import { getImageUrl } from '@/lib/utils'
import Footer from '@/components/layout/Footer'

export default function CartPage() {
  const { items, updateQuantity, removeItem, grandTotal, clearCart } = useCartStore()
  const navigate = useNavigate()

  if (items.length === 0) {
    return (
      <main className="flex flex-col min-h-screen">
        <div className="flex-1 flex flex-col items-center justify-center gap-6 py-24">
          <ShoppingBag size={64} className="text-gray-200" />
          <div className="text-center">
            <h2 className="font-display text-2xl font-semibold text-[--text-primary] mb-2">
              Your cart is empty
            </h2>
            <p className="text-[--text-muted] mb-6">
              Add some delicious meals from our nearby chefs.
            </p>
          </div>
          <button onClick={() => navigate('/menu')} className="btn-primary px-8">
            Browse Meals
          </button>
        </div>
        <Footer />
      </main>
    )
  }

  const total = grandTotal()
  const deliveryFee = 15
  const orderTotal = total + deliveryFee

  return (
    <main className="flex flex-col min-h-screen">
      <div className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="font-display text-3xl font-bold text-[--text-primary] mb-8">
          Your Cart
        </h1>

        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* ── Items list ── */}
          <div className="flex-1 flex flex-col gap-4">
            {items.map(item => (
              <div key={`${item.mealId}-${item.variantId}`}
                className="card p-4 flex gap-4">

                {/* Image */}
                <img
                  src={getImageUrl(item.mealImageUrl, 'sm')}
                  alt={item.mealName}
                  className="w-20 h-20 rounded-xl object-cover shrink-0"
                  onError={e => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=120&h=120&fit=crop'
                  }}
                />

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-[--text-primary] truncate">{item.mealName}</h3>
                      <p className="text-xs text-[--text-muted]">{item.chefName} · {item.variantName}</p>
                    </div>
                    <button
                      onClick={() => removeItem(item.mealId, item.variantId)}
                      className="text-gray-300 hover:text-red-400 transition-colors shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    {/* Qty controls */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.mealId, item.variantId, item.quantity - 1)}
                        className="w-7 h-7 rounded-full border border-[--border] flex items-center justify-center hover:border-brand-500 transition-colors"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.mealId, item.variantId, item.quantity + 1)}
                        className="w-7 h-7 rounded-full border border-[--border] flex items-center justify-center hover:border-brand-500 transition-colors"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    {/* Line total */}
                    <span className="font-bold text-[--text-primary]">
                      {((item.variantPrice + item.sideDishTotal + item.toppingTotal) * item.quantity).toFixed(1)}{' '}
                      <span className="text-sm font-medium text-[--text-muted]">{item.currency}</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={clearCart}
              className="text-sm text-red-400 hover:text-red-500 transition-colors self-start mt-1"
            >
              Clear cart
            </button>
          </div>

          {/* ── Order summary ── */}
          <div className="w-full lg:w-80 shrink-0 card p-6 sticky top-24">
            <h2 className="font-display text-xl font-semibold text-[--text-primary] mb-5">
              Order Summary
            </h2>

            <div className="flex flex-col gap-3 mb-5 text-sm">
              <div className="flex justify-between">
                <span className="text-[--text-muted]">Subtotal</span>
                <span className="font-medium">{total.toFixed(1)} EGP</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[--text-muted]">Delivery fee</span>
                <span className="font-medium">{deliveryFee.toFixed(1)} EGP</span>
              </div>
              <div className="border-t border-[--border] pt-3 flex justify-between">
                <span className="font-semibold text-[--text-primary]">Total</span>
                <span className="font-bold text-lg text-[--text-primary]">{orderTotal.toFixed(1)} EGP</span>
              </div>
            </div>

            <button
              onClick={() => { useCheckoutStore.getState().setStep(1); navigate('/checkout') }}
              className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2"
            >
              Proceed to Checkout
              <ChevronRight size={18} />
            </button>

            <button
              onClick={() => navigate('/menu')}
              className="w-full text-center text-sm text-brand-500 hover:underline mt-4"
            >
              + Add more items
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  )
}
