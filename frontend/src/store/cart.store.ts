import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  mealId: string
  mealName: string
  mealImageUrl: string | null
  chefId: string
  chefName: string
  variantId: string
  variantName: string
  variantPrice: number
  currency: string
  quantity: number
  selectedSideDishIds: string[]
  selectedToppingOptionIds: string[]
  // Price snapshots for display
  sideDishTotal: number
  toppingTotal: number
}

interface CartState {
  items: CartItem[]
  chefId: string | null   // enforces one-chef-per-cart rule
  addItem: (item: CartItem) => void
  removeItem: (mealId: string, variantId: string) => void
  updateQuantity: (mealId: string, variantId: string, qty: number) => void
  clearCart: () => void
  totalItems: () => number
  grandTotal: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      chefId: null,

      addItem: item => {
        const state = get()

        // If cart has items from a different chef, clear first
        if (state.chefId && state.chefId !== item.chefId) {
          set({ items: [item], chefId: item.chefId })
          return
        }

        const existing = state.items.find(
          i => i.mealId === item.mealId && i.variantId === item.variantId
        )

        if (existing) {
          set({
            items: state.items.map(i =>
              i.mealId === item.mealId && i.variantId === item.variantId
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            ),
          })
        } else {
          set({ items: [...state.items, item], chefId: item.chefId })
        }
      },

      removeItem: (mealId, variantId) =>
        set(s => ({
          items: s.items.filter(i => !(i.mealId === mealId && i.variantId === variantId)),
          chefId: s.items.length === 1 ? null : s.chefId,
        })),

      updateQuantity: (mealId, variantId, qty) =>
        set(s => ({
          items: qty <= 0
            ? s.items.filter(i => !(i.mealId === mealId && i.variantId === variantId))
            : s.items.map(i =>
                i.mealId === mealId && i.variantId === variantId ? { ...i, quantity: qty } : i
              ),
        })),

      clearCart: () => set({ items: [], chefId: null }),

      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      grandTotal: () =>
        get().items.reduce(
          (sum, i) =>
            sum + (i.variantPrice + i.sideDishTotal + i.toppingTotal) * i.quantity,
          0
        ),
    }),
    { name: 'taambeit-cart' }
  )
)
