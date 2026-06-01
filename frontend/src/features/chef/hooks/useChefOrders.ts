import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ordersApi, type OrderStatus } from '@/api/orders'

export function useChefOrders() {
  const queryClient = useQueryClient()

  // ── UI state ───────────────────────────────────────────────────────────────

  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'All'>('Pending')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // ── Query ──────────────────────────────────────────────────────────────────

  const queryKey = ['chef', 'orders', statusFilter]

  const { data: orders = [], isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: () =>
      ordersApi.getChefOrders(statusFilter === 'All' ? undefined : statusFilter),
    refetchInterval: 30_000,
  })

  // ── Action runner ──────────────────────────────────────────────────────────

  const runAction = async (actionKey: string, fn: () => Promise<unknown>) => {
    setLoadingAction(actionKey)
    setError(null)
    try {
      await fn()
      await queryClient.invalidateQueries({ queryKey: ['chef', 'orders'] })
    } catch (e: any) {
      setError(
        e?.response?.data?.detail ??
          e?.response?.data ??
          'Something went wrong. Please try again.',
      )
    } finally {
      setLoadingAction(null)
    }
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (!search.trim()) return orders
    const q = search.trim().toLowerCase()
    return orders.filter(
      (o) =>
        o.orderId.toLowerCase().includes(q) ||
        o.items.some((i) => i.mealName.toLowerCase().includes(q)),
    )
  }, [orders, search])

  // ── Order actions ──────────────────────────────────────────────────────────

  const confirmOrder = (orderId: string) =>
    runAction(`confirm-${orderId}`, () => ordersApi.confirm(orderId))

  const rejectOrder = (orderId: string, reason: string) =>
    runAction(`reject-${orderId}`, () => ordersApi.reject(orderId, reason))

  const startPreparing = (orderId: string) =>
    runAction(`prepare-${orderId}`, () => ordersApi.startPreparing(orderId))

  const markReadyForPickup = (orderId: string) =>
    runAction(`ready-${orderId}`, () => ordersApi.markReadyForPickup(orderId))

  return {
    // query state
    isLoading,
    isError,
    refetch,
    // data
    orders,
    filtered,
    // filter state
    statusFilter, setStatusFilter,
    search, setSearch,
    // ui state
    expandedId, setExpandedId,
    rejectTarget, setRejectTarget,
    loadingAction,
    error, setError,
    // actions
    confirmOrder,
    rejectOrder,
    startPreparing,
    markReadyForPickup,
  }
}
