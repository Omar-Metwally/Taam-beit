import api from "./client";

export interface MealVariant {
  variantId: string;
  name: string;
  price: number;
  currency: string;
  isDefault: boolean;
}

export interface SideDish {
  sideDishId: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  isRequired: boolean;
}

export interface ToppingOption {
  toppingOptionId: string;
  name: string;
  extraPrice: number;
  currency: string;
}

export interface ToppingGroup {
  toppingGroupId: string;
  name: string;
  minSelections: number;
  maxSelections: number;
  options: ToppingOption[];
}

export interface Meal {
  mealId: string;
  chefId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  isAvailable: boolean;
  dishType: string;
  cuisineType: string | null;
  variants: MealVariant[];
  sideDishes: SideDish[];
  toppingGroups: ToppingGroup[];
}

export interface ChefMealsResponse {
  meals: Meal[];
}

export const mealsApi = {
  getChefMeals: (chefId: string) =>
    api.get<Meal[]>("/meals", { params: { chefId } }).then((r) => r.data),

  getMealById: (mealId: string) =>
    api.get<Meal>(`/meals/${mealId}`).then((r) => r.data),

  createMeal: (body: {
    name: string;
    description: string | null;
    defaultVariantName: string;
    defaultVariantPrice: number;
    currency: string;
    dishType: string;
    cuisineType: string | null;
  }) => api.post<{ mealId: string }>("/meals", body).then((r) => r.data),

  addVariant: (
    mealId: string,
    body: { name: string; price: number; currency: string },
  ) =>
    api
      .post<{ variantId: string }>(`/meals/${mealId}/variants`, body)
      .then((r) => r.data),

  addSideDish: (
    mealId: string,
    body: {
      name: string;
      description: string | null;
      price: number;
      currency: string;
      isRequired: boolean;
    },
  ) =>
    api
      .post<{ sideDishId: string }>(`/meals/${mealId}/side-dishes`, body)
      .then((r) => r.data),

  addToppingGroup: (
    mealId: string,
    body: { name: string; minSelections: number; maxSelections: number },
  ) =>
    api
      .post<{ toppingGroupId: string }>(`/meals/${mealId}/topping-groups`, body)
      .then((r) => r.data),

  addToppingOption: (
    mealId: string,
    groupId: string,
    body: { name: string; extraPrice: number; currency: string },
  ) =>
    api
      .post<{
        toppingOptionId: string;
      }>(`/meals/${mealId}/topping-groups/${groupId}/options`, body)
      .then((r) => r.data),

  uploadImage: (mealId: string, file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    return api
      .post(`/meals/${mealId}/image`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  setAvailability: (mealId: string, isAvailable: boolean) =>
    api.patch(`/meals/${mealId}/availability`, isAvailable).then((r) => r.data),
};
