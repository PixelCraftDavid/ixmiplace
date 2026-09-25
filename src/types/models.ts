export type UserRole = 'user' | 'owner' | 'admin';

export interface AppUser {
  uid: string;
  email: string;
  emailVerified?: boolean;
  displayName: string;
  phone?: string;
  role: UserRole;
  photoURL?: string;
  createdAt: number;
  isBanned?: boolean;
}

export type ListingCategory =
  | 'casa'
  | 'departamento'
  | 'cuarto'
  | 'terreno'
  | 'local'
  | 'hotel'
  | 'motel';

export type ListingOperation = 'renta' | 'venta' | 'hospedaje';

export type PriceUnit = 'mes' | 'noche' | 'total' | 'estancia';

export type ListingStatus =
  | 'draft'      // borrador (no usado en V1, pero útil después)
  | 'pending'    // en revisión del admin
  | 'published'  // aprobada y visible al público
  | 'rejected'   // rechazada con motivo
  | 'archived';  // caducada o retirada por el dueño

export type AvailabilityStatus =
  | 'available'    // 🟢
  | 'occupied'     // habitación ocupada
  | 'reserved'     // 🟡 apartada
  | 'rented'       // 🔴 rentada
  | 'sold'         // 🔴 vendida
  | 'unavailable'  // ⚫ no disponible
  | 'unconfirmed'; // 🟡 sin confirmar por el dueño

export interface Listing {
  id: string;
  ownerId: string;

  // Información básica
  title: string;
  description: string;
  category: ListingCategory;
  operation: ListingOperation;

  // Precio
  price: number;
  priceUnit?: PriceUnit;

  // Ubicación
  colonia: string;
  address?: string;   // opcional: dirección exacta, solo visible al dueño y admin
  lat?: number;
  lng?: number;

  // Detalles de la propiedad
  bedrooms?: number;
  bathrooms?: number;
  parkingSpots?: number;
  areaM2?: number;
  amenities?: string[];   // ej. ["agua", "luz", "internet", "amueblado"]

  // Datos adicionales para anuncios de habitaciones de hotel o motel
  establishmentName?: string;
  roomType?: string;
  stayDurationHours?: number;
  checkInTime?: string;
  checkOutTime?: string;
  reception24h?: boolean;
  foodAvailable?: boolean;
  foodDescription?: string;

  // Estado
  status: ListingStatus;
  availability: AvailabilityStatus;
  availabilityConfirmedAt: number;   // timestamp
  expiresAt: number;                 // timestamp

  // Fotos: URLs completas de Cloudinary y opcionalmente IDs públicos para borrado seguro
  photos: string[];
  photoPublicIds?: string[];
  ownerEmailVerified?: boolean;

  // Contacto
  whatsapp: string;      // solo visible cuando status === 'published'
  showPhone: boolean;

  // Moderación
  reportsCount: number;
  viewsCount?: number;
  whatsappContactsCount?: number;
  approvedBy?: string;
  approvedAt?: number;
  rejectionReason?: string;

  // 🆕 Favoritos: opcional porque publicaciones antiguas no lo tienen.
  // Trátalo siempre como `listing.favoritesCount ?? 0` en la UI.
  favoritesCount?: number;

  // Timestamps
  createdAt: number;
  updatedAt: number;
}

// Reportes
export type ReportReason =
  | 'spam'
  | 'fraude'
  | 'no_existe'
  | 'duplicado'
  | 'otro';

export interface Report {
  id: string;
  listingId: string;
  reporterId: string;
  reason: ReportReason;
  comment?: string;
  status: 'open' | 'reviewed' | 'dismissed';
  createdAt: number;
}

// Favoritos
export interface Favorite {
  id: string;              // `${userId}_${listingId}`
  userId: string;
  listingId: string;
  createdAt: number;
}

export interface AppNotification {
  id: string;
  recipientId: string;
  type: 'listing_approved' | 'listing_rejected';
  title: string;
  message: string;
  listingId: string;
  isRead: boolean;
  createdAt: number;
}

export interface InternalMessage {
  id: string;
  listingId: string;
  senderId: string;
  recipientId: string;
  senderName: string;
  subject: string;
  message: string;
  status: 'unread' | 'read';
  createdAt: number;
}

export interface ListingHistoryEntry {
  id: string;
  listingId: string;
  actorId: string;
  actorRole: 'owner' | 'admin';
  action: 'created' | 'updated' | 'approved' | 'rejected' | 'renewed';
  changedFields: string[];
  summary: string;
  createdAt: number;
}

export interface PublicProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  emailVerified: boolean;
  createdAt: number;
  isBanned?: boolean;
}
