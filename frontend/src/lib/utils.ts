import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'EGP') {
  return `${amount.toFixed(1)} ${currency}`
}

export function formatRating(rating: number) {
  return rating.toFixed(1)
}

export function getImageUrl(baseKey: string | null | undefined, size: 'sm' | 'md' | 'lg' = 'md') {
  if (!baseKey) return '/placeholder-meal.jpg'
  // If it's already a full URL (legacy), return as-is
  if (baseKey.startsWith('http')) return baseKey
  return `${import.meta.env.VITE_MINIO_PUBLIC_URL}/${baseKey}-${size}.webp`
}

export function getAvatarUrl(baseKey: string | null | undefined, size: 'sm' | 'lg' = 'sm') {
  if (!baseKey) return '/placeholder-avatar.jpg'
  if (baseKey.startsWith('http')) return baseKey
  return `${import.meta.env.VITE_MINIO_PUBLIC_URL}/${baseKey}-${size}.webp`
}

export function truncate(str: string, n: number) {
  return str.length > n ? str.slice(0, n - 1) + '…' : str
}
