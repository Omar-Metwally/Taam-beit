import api from './client'

export type DishType = 'MainDish' | 'SideDish' | 'Dessert' | 'Appetizer'
export type ChefSortOrder = 'Closest' | 'HighestRated' | 'NewArrivals' | 'PriceLowHigh' | 'PriceHighLow'

export interface MealPreview {
  mealId: string
  name: string
  imageUrl: string | null
}

export interface ChefCard {
  chefUserId: string
  fullName: string
  avatarUrl: string | null
  cuisineTypes: string[]
  rating: number
  distanceKm: number
  operationAddressLine: string | null
  totalMeals: number
  fromPrice: number
  currency: string
  isCertified: boolean
  mealPreviews: MealPreview[]
}

export interface NearbyParams {
  latitude: number
  longitude: number
  radiusKm?: number
  dishType?: DishType | null
  cuisineType?: string | null
  maxPrice?: number | null
  sortOrder?: ChefSortOrder
}

export const chefsApi = {
  getNearby: (params: NearbyParams) =>
    api.get<ChefCard[]>('/meals/nearby', { params }).then(r => r.data),
}
