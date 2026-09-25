import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { AvailabilityStatus } from '../types/models';

// ============================================================
// Utilidad para clases de Tailwind
// ============================================================

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================================
// Formateo de precios
// ============================================================

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(price);
}

// ============================================================
// Link de WhatsApp
// ============================================================

export function whatsappLink(
  phone: string,
  message = 'Hola, vi tu anuncio en IxmiPlace. ¿Sigue disponible?'
): string {
  const cleanPhone = phone.replace(/\D/g, '');
  // México requiere el prefijo 52
  const fullPhone = cleanPhone.length === 10 ? `52${cleanPhone}` : cleanPhone;
  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
}

// ============================================================
// Fechas relativas
// ============================================================

export function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'hace unos segundos';
  if (minutes < 60) return `hace ${minutes} min`;
  if (hours < 24) return `hace ${hours} h`;
  if (days < 7) return `hace ${days} día${days === 1 ? '' : 's'}`;
  if (days < 30) return `hace ${Math.floor(days / 7)} sem`;
  if (days < 365) return `hace ${Math.floor(days / 30)} mes${Math.floor(days / 30) === 1 ? '' : 'es'}`;
  return `hace ${Math.floor(days / 365)} año${Math.floor(days / 365) === 1 ? '' : 's'}`;
}

// ============================================================
// Disponibilidad
// ============================================================

export function availabilityColor(status: AvailabilityStatus): string {
  switch (status) {
    case 'available':   return 'bg-green-500';
    case 'occupied':    return 'bg-red-500';
    case 'reserved':    return 'bg-yellow-500';
    case 'rented':      return 'bg-red-500';
    case 'sold':        return 'bg-red-500';
    case 'unavailable': return 'bg-gray-400';
    case 'unconfirmed': return 'bg-yellow-400';
    default:            return 'bg-gray-400';
  }
}

// ============================================================
// Texto truncado
// ============================================================

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '…';
}

// ============================================================
// Debounce (útil para búsquedas)
// ============================================================

export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
