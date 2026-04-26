import { useState } from 'react'
import { ChevronRight, ChevronDown, Clock } from 'lucide-react'
import { useCheckoutStore } from '@/store/checkout.store'
import { useCartStore } from '@/store/cart.store'
import { useAuthStore } from '@/store/auth.store'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import api from '@/api/client'

const DELIVERY_SLOTS = [
  'Today 9:00 PM - 10:00 PM',
  'Today 10:00 PM - 11:00 PM',
  'Tomorrow 12:00 PM - 1:00 PM',
  'Tomorrow 2:00 PM - 3:00 PM',
]

function CardVisual({ name }: { name: string }) {
  return (
    <div className="rounded-2xl p-5 text-white shadow-lg"
      style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>
      <div className="flex justify-between items-start mb-8">
        <span className="text-sm font-semibold opacity-80">Credit</span>
        <div className="flex">
          <div className="w-7 h-7 rounded-full bg-red-500 opacity-90" />
          <div className="w-7 h-7 rounded-full bg-yellow-400 opacity-90 -ml-3" />
        </div>
      </div>
      <p className="font-semibold text-base mb-1">{name || 'Card Holder'}</p>
      <p className="text-sm opacity-70 font-mono tracking-widest">
        •••• - •••• - •••• - ••••
      </p>
    </div>
  )
}

export default function Step3ReviewPay() {
  const { customerInfo, paymentMethod, setPaymentMethod, deliveryTime, setDeliveryTime, setStep, promoDiscount } = useCheckoutStore()
  const { items, grandTotal, clearCart, chefId }    = useCartStore()
  const { userId }                                   = useAuthStore()
  const navigate                                     = useNavigate()

  const [cardName,    setCardName]    = useState('')
  const [cardNumber,  setCardNumber]  = useState('')
  const [expiry,      setExpiry]      = useState('')
  const [ccv,         setCcv]         = useState('')
  const [timeOpen,    setTimeOpen]    = useState(false)
  const [cardType,    setCardType]    = useState('Mastercard')

  const subtotal    = grandTotal()
  const deliveryFee = 20
  const total       = subtotal + deliveryFee - promoDiscount

  const placeOrderMutation = useMutation({
    mutationFn: async () => {
      if (!customerInfo || !userId || !chefId) throw new Error('Missing order data')

      const response = await api.post('/orders', {
        chefId,
        deliveryLatitude:   30.0444, // would come from geocoded address in production
        deliveryLongitude:  31.2357,
        deliveryAddressLine: `${customerInfo.district}, ${customerInfo.street}, Floor ${customerInfo.floorNo}, Apt ${customerInfo.apartmentNo}`,
        paymentMethod:      paymentMethod === 'Card' ? 0 : 0, // CashOnDelivery = 0
        items: items.map(item => ({
          mealId:                  item.mealId,
          mealVariantId:           item.variantId,
          quantity:                item.quantity,
          selectedSideDishIds:     item.selectedSideDishIds,
          selectedToppingOptionIds: item.selectedToppingOptionIds,
        })),
      })
      return response.data
    },
    onSuccess: (data) => {
      clearCart()
      navigate(`/order/${data.orderId}/track`)
    },
  })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      {/* ── Left column ── */}
      <div className="flex flex-col gap-4">

        {/* Review information */}
        <div className="bg-white rounded-2xl border border-[--border] p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-[--text-primary]">Review Information</h3>
            <button
              onClick={() => setStep(2)}
              className="text-sm text-brand-500 font-medium flex items-center gap-1 hover:underline"
            >
              Edit <ChevronRight size={14} />
            </button>
          </div>
          {customerInfo && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[--text-muted] text-xs mb-1">Personal Information:</p>
                <p className="font-medium">{customerInfo.firstName} {customerInfo.lastName}</p>
                <p className="text-[--text-muted]">{customerInfo.phoneNumber}</p>
              </div>
              <div>
                <p className="text-[--text-muted] text-xs mb-1">Location Address:</p>
                <p className="font-medium">{customerInfo.district}, {customerInfo.street}</p>
                <p className="text-[--text-muted]">
                  Floor No. {customerInfo.floorNo}, Apartment No. {customerInfo.apartmentNo}.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Time of delivery */}
        <div className="bg-white rounded-2xl border border-[--border] p-5">
          <h3 className="font-semibold text-[--text-primary] mb-3">Time of Delivery</h3>
          <div className="relative">
            <button
              onClick={() => setTimeOpen(o => !o)}
              className="w-full border border-[--border] rounded-xl px-4 py-3 flex items-center justify-between text-sm hover:border-brand-400 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Clock size={15} className="text-[--text-muted]" />
                <span>{deliveryTime}</span>
              </div>
              <ChevronDown size={15} className={cn('text-[--text-muted] transition-transform', timeOpen && 'rotate-180')} />
            </button>
            {timeOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[--border] rounded-xl shadow-card overflow-hidden z-10">
                {DELIVERY_SLOTS.map(slot => (
                  <button
                    key={slot}
                    onClick={() => { setDeliveryTime(slot); setTimeOpen(false) }}
                    className={cn(
                      'w-full px-4 py-3 text-left text-sm hover:bg-brand-50 transition-colors',
                      deliveryTime === slot && 'text-brand-500 font-medium'
                    )}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Payment methods */}
        <div className="bg-white rounded-2xl border border-[--border] p-5">
          <h3 className="font-semibold text-[--text-primary] mb-4">Payment methods</h3>
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <div className={cn(
                'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all',
                paymentMethod === 'Card' ? 'border-brand-500 bg-brand-500' : 'border-[--border]'
              )}>
                {paymentMethod === 'Card' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
              </div>
              <input type="radio" className="sr-only" checked={paymentMethod === 'Card'}
                onChange={() => setPaymentMethod('Card')} />
              <div className="flex items-center gap-2">
                {/* Card logos */}
                <span className="text-lg">💳</span>
                <span className="text-sm font-medium">Mastercard / Visa / PayPal</span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <div className={cn(
                'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all',
                paymentMethod === 'CashOnDelivery' ? 'border-brand-500 bg-brand-500' : 'border-[--border]'
              )}>
                {paymentMethod === 'CashOnDelivery' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
              </div>
              <input type="radio" className="sr-only" checked={paymentMethod === 'CashOnDelivery'}
                onChange={() => setPaymentMethod('CashOnDelivery')} />
              <div className="flex items-center gap-2">
                <span className="text-lg">💵</span>
                <span className="text-sm font-medium">Cash On Delivery</span>
              </div>
            </label>
          </div>
        </div>

        {/* Order summary + place order */}
        <div className="bg-white rounded-2xl border border-[--border] p-5">
          <h3 className="font-semibold text-[--text-primary] mb-4">Order summary</h3>
          <div className="flex flex-col gap-2 text-sm mb-4">
            {items.map(item => (
              <div key={`${item.mealId}-${item.variantId}`} className="flex justify-between">
                <span className="text-[--text-muted] truncate pr-2">
                  {item.mealName} ({item.variantName})
                  {item.quantity > 1 && ` x${item.quantity}`}
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
                <span>Promo Code</span>
                <span className="font-medium">-{promoDiscount} EGP</span>
              </div>
            )}
          </div>
          <div className="border-t border-[--border] pt-3 flex justify-between mb-4">
            <span className="font-semibold text-[--text-primary]">Total</span>
            <span className="font-bold text-[--text-primary] text-lg">{total.toFixed(0)} EGP</span>
          </div>
          <button
            onClick={() => placeOrderMutation.mutate()}
            disabled={placeOrderMutation.isPending}
            className="btn-primary w-full py-4 text-base"
          >
            {placeOrderMutation.isPending ? 'Placing order...' : 'Place Order'}
          </button>
          {placeOrderMutation.isError && (
            <p className="text-xs text-red-500 text-center mt-2">
              Failed to place order. Please try again.
            </p>
          )}
        </div>
      </div>

      {/* ── Right column — card form ── */}
      {paymentMethod === 'Card' && (
        <div className="flex flex-col gap-4">
          <CardVisual name={cardName} />

          {/* Card type */}
          <div className="bg-white rounded-2xl border border-[--border] p-5 flex flex-col gap-4">
            <select
              value={cardType}
              onChange={e => setCardType(e.target.value)}
              className="w-full border border-[--border] rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-400 transition-colors appearance-none bg-white"
            >
              <option>Mastercard</option>
              <option>Visa</option>
              <option>PayPal</option>
            </select>

            <div className="grid grid-cols-2 gap-4">
              <input
                value={cardName}
                onChange={e => setCardName(e.target.value)}
                placeholder="Name on card"
                className="border border-[--border] rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-400 transition-colors"
              />
              <input
                value={cardNumber}
                onChange={e => setCardNumber(e.target.value.replace(/\D/g,'').slice(0,16)
                  .replace(/(.{4})/g,'$1 ').trim())}
                placeholder="Card number"
                className="border border-[--border] rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-400 transition-colors font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <input
                value={expiry}
                onChange={e => setExpiry(e.target.value)}
                placeholder="Expiry Date MM/YY"
                className="border border-[--border] rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-400 transition-colors"
              />
              <input
                value={ccv}
                onChange={e => setCcv(e.target.value.slice(0,4))}
                placeholder="CCV"
                type="password"
                className="border border-[--border] rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-400 transition-colors"
              />
            </div>
          </div>
        </div>
      )}

      {paymentMethod === 'CashOnDelivery' && (
        <div className="flex items-center justify-center bg-white rounded-2xl border border-[--border] p-10">
          <div className="text-center">
            <p className="text-5xl mb-4">💵</p>
            <p className="font-display font-semibold text-lg text-[--text-primary] mb-1">
              Cash on Delivery
            </p>
            <p className="text-sm text-[--text-muted]">
              You'll pay when your order arrives at your door.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
