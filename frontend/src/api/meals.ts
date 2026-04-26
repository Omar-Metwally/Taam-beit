import api from './client'

export interface MealVariant {
  variantId: string
  name: string
  price: number
  currency: string
  isDefault: boolean
}

export interface SideDish {
  sideDishId: string
  name: string
  description: string | null
  price: number
  currency: string
  isRequired: boolean
}

export interface ToppingOption {
  toppingOptionId: string
  name: string
  extraPrice: number
  currency: string
}

export interface ToppingGroup {
  toppingGroupId: string
  name: string
  minSelections: number
  maxSelections: number
  options: ToppingOption[]
}

export interface Meal {
  mealId: string
  name: string
  description: string | null
  imageUrl: string | null
  isAvailable: boolean
  dishType: string
  cuisineType: string | null
  variants: MealVariant[]
  sideDishes: SideDish[]
  toppingGroups: ToppingGroup[]
}

export interface ChefMealsResponse {
  meals: Meal[]
}

export const mealsApi = {
  getChefMeals: (chefId: string) =>
    api.get<Meal[]>('/meals', { params: { chefId } }).then(r => r.data),

  getMealById: (mealId: string) =>
    api.get<Meal>(`/meals/${mealId}`).then(r => r.data),
}
