import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { chefMealsApi, type DishType, type ChefMealsResponse } from '@/api/chefMeals'

type FilterAvailability = 'all' | 'active' | 'draft'

const QUERY_KEY = ['chef', 'meals', 'mine'] as const

export function useChefMeals() {
  const queryClient = useQueryClient()

  // ── Filter state ───────────────────────────────────────────────────────────

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<FilterAvailability>('all')
  const [dishType, setDishType] = useState<DishType | 'all'>('all')
  const [showArchived, setShowArchived] = useState(false)
  const [archiveError, setArchiveError] = useState<string | null>(null)
  const [menuError, setMenuError] = useState<string | null>(null)

  // ── Query ──────────────────────────────────────────────────────────────────

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: chefMealsApi.getMyMeals,
  })

  const meals = data?.meals ?? []
  const archivedMeals = data?.archivedMeals ?? []

  // ── Mutations ──────────────────────────────────────────────────────────────

  const { mutate: toggleAvailability, isPending: isToggling, variables: togglingVars } =
    useMutation({
      mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
        chefMealsApi.setAvailability(id, isAvailable),
      onMutate: async ({ id, isAvailable }) => {
        await queryClient.cancelQueries({ queryKey: QUERY_KEY })
        const previous = queryClient.getQueryData<ChefMealsResponse>(QUERY_KEY)
        queryClient.setQueryData<ChefMealsResponse>(QUERY_KEY, (old) => {
          if (!old) return old
          return {
            ...old,
            meals: old.meals.map((m) =>
              m.id === id ? { ...m, status: isAvailable ? 'Active' : 'Draft' } : m,
            ),
          }
        })
        return { previous }
      },
      onError: (err: any, _v, ctx) => {
        if (ctx?.previous) queryClient.setQueryData(QUERY_KEY, ctx.previous)
        setMenuError(
          err?.response?.data?.detail ?? 'Failed to update availability. Please try again.',
        )
      },
      onSuccess: () => setMenuError(null),
      onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
    })

  const { mutate: doArchive, isPending: isArchiving, variables: archivingId } = useMutation({
    mutationFn: (id: string) => chefMealsApi.archive(id),
    onSuccess: () => {
      setArchiveError(null)
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
    onError: (e: any) =>
      setArchiveError(e?.response?.data?.detail ?? 'Could not archive meal.'),
  })

  const { mutate: doRestore, variables: restoringId } = useMutation({
    mutationFn: (id: string) => chefMealsApi.restore(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
    onError: (e: any) =>
      setArchiveError(e?.response?.data?.detail ?? 'Could not restore meal.'),
  })

  // ── Derived ────────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return meals.filter((m) => {
      if (q && !m.name.toLowerCase().includes(q) && !m.cuisineType?.toLowerCase().includes(q))
        return false
      if (status === 'active' && m.status !== 'Active') return false
      if (status === 'draft' && m.status !== 'Draft') return false
      if (dishType !== 'all' && m.dishType !== dishType) return false
      return true
    })
  }, [meals, search, status, dishType])

  const activeCount = meals.filter((m) => m.status === 'Active').length

  return {
    // query state
    isLoading,
    isError,
    refetch,
    // data
    meals,
    archivedMeals,
    filtered,
    activeCount,
    // filter state
    search, setSearch,
    status, setStatus,
    dishType, setDishType,
    showArchived, setShowArchived,
    // mutations
    toggleAvailability, isToggling, togglingVars,
    doArchive, isArchiving, archivingId,
    doRestore, restoringId,
    // errors
    archiveError, setArchiveError,
    menuError, setMenuError,
  }
}
