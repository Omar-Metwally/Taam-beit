import { Heart, Trash2, Minus, Plus } from 'lucide-react'
import { useCartStore } from '@/store/cart.store'
import { useCheckoutStore } from '@/store/checkout.store'
import { getImageUrl } from '@/lib/utils'

export default function Step1Cart() {
  const { items, updateQuantity, removeItem, grandTotal } = useCartStore()
  const { promoCode, promoDiscount, setPromoCode, applyPromo, setStep } = useCheckoutStore()

  const subtotal    = grandTotal()
  const deliveryFee = 20
  const total       = subtotal + deliveryFee - promoDiscount

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">

      {/* ── Cart items ── */}
      <div className="flex flex-col gap-4">
        {items.map(item => (
          <div
            key={`${item.mealId}-${item.variantId}`}
            className="bg-white rounded-2xl border border-[--border] p-4 flex gap-4"
          >
            <img
              src={getImageUrl(item.mealImageUrl, 'sm')}
              alt={item.mealName}
              className="w-24 h-24 rounded-xl object-cover shrink-0"
              onError={e => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=120&h=120&fit=crop'
              }}
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-[--text-primary]">
                    {item.mealName} ({item.variantName})
                  </h3>
                  {item.selectedToppingOptionIds.length > 0 && (
                    <p className="text-xs text-[--text-muted] mt-0.5">
                      Toppings: selected items
                    </p>
                  )}
                  {item.selectedSideDishIds.length > 0 && (
                    <p className="text-xs text-[--text-muted]">
                      Side dishes: selected items
                    </p>
                  )}
                </div>
                <span className="font-bold text-[--text-primary] shrink-0">
                  {((item.variantPrice + item.sideDishTotal + item.toppingTotal) * item.quantity).toFixed(0)} EGP
                </span>
              </div>

              <div className="flex items-center justify-between mt-3">
                {/* Qty stepper */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.mealId, item.variantId, item.quantity - 1)}
                    className="w-7 h-7 rounded-full border border-[--border] flex items-center justify-center hover:border-brand-500 transition-colors"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-6 text-center font-semibold text-sm">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.mealId, item.variantId, item.quantity + 1)}
                    className="w-7 h-7 rounded-full border border-[--border] flex items-center justify-center hover:border-brand-500 transition-colors"
                  >
                    <Plus size={12} />
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4">
                  <button className="flex items-center gap-1.5 text-xs text-[--text-muted] hover:text-red-400 transition-colors">
                    <Heart size={14} />
                    Add to favourite
                  </button>
                  <button
                    onClick={() => removeItem(item.mealId, item.variantId)}
                    className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="text-center py-16 text-[--text-muted]">
            <p className="text-4xl mb-3">🛒</p>
            <p className="font-medium">Your cart is empty</p>
          </div>
        )}
      </div>

      {/* ── Order summary ── */}
      <div className="bg-white rounded-2xl border border-[--border] p-5 h-fit sticky top-24">
        <h2 className="font-display text-lg font-semibold text-[--text-primary] mb-4">
          Order summary
        </h2>

        {/* Item lines */}
        <div className="flex flex-col gap-2 mb-4 text-sm">
          {items.map(item => (
            <div key={`${item.mealId}-${item.variantId}`} className="flex justify-between">
              <span className="text-[--text-muted] truncate pr-2">
                {item.mealName} ({item.variantName})
                {item.quantity > 1 && <span className="ml-1">x{item.quantity}</span>}
              </span>
              <span className="font-medium shrink-0">
                {((item.variantPrice + item.sideDishTotal + item.toppingTotal) * item.quantity).toFixed(0)} EGP
              </span>
            </div>
          ))}
          <div className="flex justify-between text-[--text-muted]">
            <span>Delivery fee</span>
            <span className="font-medium text-[--text-primary]">{deliveryFee} EGP</span>
          </div>
          {promoDiscount > 0 && (
            <div className="flex justify-between text-brand-500">
              <span>Promo code</span>
              <span className="font-medium">-{promoDiscount} EGP</span>
            </div>
          )}
        </div>

        <div className="border-t border-[--border] pt-3 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-[--text-muted]">Subtotal</span>
            <span className="font-bold text-[--text-primary]">{subtotal.toFixed(0)} EGP</span>
          </div>
        </div>

        {/* Promo code */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={promoCode}
            onChange={e => setPromoCode(e.target.value)}
            placeholder="Promo code"
            className="flex-1 border border-[--border] rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-400 transition-colors"
          />
          <button
            onClick={applyPromo}
            className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 rounded-xl transition-colors"
          >
            Apply
          </button>
        </div>

        {/* Final total */}
        {promoDiscount > 0 && (
          <div className="flex justify-between mb-4">
            <span className="font-semibold text-[--text-primary]">Subtotal</span>
            <span className="font-bold text-brand-500 text-lg">{total.toFixed(0)} EGP</span>
          </div>
        )}

        <button
          onClick={() => setStep(2)}
          disabled={items.length === 0}
          className="btn-primary w-full py-4 text-base disabled:opacity-50"
        >
          Checkout Now
        </button>
      </div>
    </div>
  )
}
