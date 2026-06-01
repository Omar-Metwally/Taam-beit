import api from './client'

// ── Types ─────────────────────────────────────────────────────────────────────

export type DishType = 'MainDish' | 'SideDish' | 'Dessert' | 'Appetizer'
export type MealStatus = 'Draft' | 'Active' | 'Archived'

export interface ChefMealSummary {
  id: string
  name: string
  description: string | null
  dishType: DishType
  cuisineType: string | null
  status: MealStatus
  imageUrl: string | null
  variantCount: number
  minPrice: number | null
  maxPrice: number | null
  currency: string | null
  createdAt: string
  archivedAt: string | null
}

export interface ChefMealsResponse {
  meals: ChefMealSummary[]
  archivedMeals: ChefMealSummary[]
}

export interface CreateMealPayload {
  name: string
  description: string | null
  dishType: DishType
  cuisineType: string | null
}

export interface AddVariantPayload {
  name: string
  price: number
  currency: string
}

export interface AddSideDishPayload {
  name: string
  description: string | null
  price: number
  currency: string
  isRequired: boolean
}

export interface AddToppingGroupPayload {
  name: string
  minSelections: number
  maxSelections: number
}

export interface AddToppingOptionPayload {
  name: string
  extraPrice: number
  currency: string
}

// ── API ───────────────────────────────────────────────────────────────────────

export const chefMealsApi = {
  // Dashboard
  getMyMeals: (): Promise<ChefMealsResponse> =>
    api.get<ChefMealsResponse>('/chef/meals').then((r) => r.data),

  setAvailability: (mealId: string, isAvailable: boolean) =>
    api.patch(`/chef/meals/${mealId}/availability`, { isAvailable }),

  archive: (mealId: string) =>
    api.post(`/chef/meals/${mealId}/archive`),

  restore: (mealId: string) =>
    api.post(`/chef/meals/${mealId}/restore`),

  // Wizard — meal core
  create: (payload: CreateMealPayload) =>
    api.post<{ mealId: string }>('chef/meals', payload).then((r) => r.data),

  update: (mealId: string, payload: CreateMealPayload) =>
    api.put(`chef/meals/${mealId}`, payload),

  uploadImage: (mealId: string, file: File) => {
    const formData = new FormData()
    formData.append('image', file)
    return api.post(`chef/meals/${mealId}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  publish: (mealId: string) =>
    api.patch(`chef/meals/${mealId}/availability`, { isAvailable: true }),

  // Wizard — variants
  addVariant: (mealId: string, payload: AddVariantPayload) =>
    api
      .post<{ variantId: string }>(`chef/meals/${mealId}/variants`, payload)
      .then((r) => r.data),

  removeVariant: (mealId: string, variantId: string) =>
    api.delete(`chef/meals/${mealId}/variants/${variantId}`),

  setDefaultVariant: (mealId: string, variantId: string) =>
    api.put(`chef/meals/${mealId}/variants/${variantId}/set-default`, {}),

  // Wizard — side dishes
  addSideDish: (mealId: string, payload: AddSideDishPayload) =>
    api
      .post<{ sideDishId: string }>(`chef/meals/${mealId}/side-dishes`, payload)
      .then((r) => r.data),

  removeSideDish: (mealId: string, sideDishId: string) =>
    api.delete(`chef/meals/${mealId}/side-dishes/${sideDishId}`),

  // Wizard — topping groups
  addToppingGroup: (mealId: string, payload: AddToppingGroupPayload) =>
    api
      .post<{ toppingGroupId: string }>(`chef/meals/${mealId}/topping-groups`, payload)
      .then((r) => r.data),

  removeToppingGroup: (mealId: string, groupId: string) =>
    api.delete(`chef/meals/${mealId}/topping-groups/${groupId}`),

  // Wizard — topping options
  addToppingOption: (mealId: string, groupId: string, payload: AddToppingOptionPayload) =>
    api
      .post<{ optionId: string }>(
        `chef/meals/${mealId}/topping-groups/${groupId}/options`,
        payload,
      )
      .then((r) => r.data),

  removeToppingOption: (mealId: string, groupId: string, optionId: string) =>
    api.delete(`chef/meals/${mealId}/topping-groups/${groupId}/options/${optionId}`),
}
