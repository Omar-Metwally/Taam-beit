import { create } from 'zustand'

export interface CustomerInfo {
  firstName:   string
  lastName:    string
  phoneNumber: string
  district:    string
  street:      string
  building:    string
  floorNo:     string
  apartmentNo: string
  notes:       string
}

export type PaymentMethodType = 'Card' | 'CashOnDelivery'

interface CheckoutState {
  step:           1 | 2 | 3
  promoCode:      string
  promoDiscount:  number
  customerInfo:   CustomerInfo | null
  paymentMethod:  PaymentMethodType
  deliveryTime:   string

  setStep:          (step: 1 | 2 | 3) => void
  setPromoCode:     (code: string) => void
  applyPromo:       () => void
  setCustomerInfo:  (info: CustomerInfo) => void
  setPaymentMethod: (m: PaymentMethodType) => void
  setDeliveryTime:  (t: string) => void
  reset:            () => void
}

export const useCheckoutStore = create<CheckoutState>((set, get) => ({
  step:          1,
  promoCode:     '',
  promoDiscount: 0,
  customerInfo:  null,
  paymentMethod: 'Card',
  deliveryTime:  'Today 9:00 PM - 10:00 PM',

  setStep:          step => set({ step }),
  setPromoCode:     promoCode => set({ promoCode }),
  applyPromo:       () => {
    const { promoCode } = get()
    // Simple demo — any code gives 70 EGP off
    set({ promoDiscount: promoCode.trim() ? 70 : 0 })
  },
  setCustomerInfo:  customerInfo => set({ customerInfo, step: 3 }),
  setPaymentMethod: paymentMethod => set({ paymentMethod }),
  setDeliveryTime:  deliveryTime => set({ deliveryTime }),
  reset:            () => set({
    step: 1, promoCode: '', promoDiscount: 0,
    customerInfo: null, paymentMethod: 'Card'
  }),
}))
