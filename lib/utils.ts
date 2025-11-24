import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatTimeAgo(date: Date | string): string {
  const d = new Date(date)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000)

  if (seconds < 60) return 'az önce'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} dakika önce`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} saat önce`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} gün önce`
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)} hafta önce`
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)} ay önce`
  return `${Math.floor(seconds / 31536000)} yıl önce`
}

export function calculateDuration(startDate: Date | string, endDate?: Date | string): string {
  const start = new Date(startDate)
  const end = endDate ? new Date(endDate) : new Date()
  const seconds = Math.floor((end.getTime() - start.getTime()) / 1000)

  if (seconds < 60) return `${seconds} saniye`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} dakika`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} saat ${Math.floor((seconds % 3600) / 60)} dakika`
  return `${Math.floor(seconds / 86400)} gün ${Math.floor((seconds % 86400) / 3600)} saat`
}
