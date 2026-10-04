import type { FieldValue, Timestamp } from 'firebase/firestore';

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

  // Consentimientos legales: versión aceptada por el usuario.
  // Opcionales: las cuentas anteriores no los tienen y por eso
  // RequireAuth las redirige a /aceptacion-legal.
  termsAcceptedVersion?: string;
  adultConfirmedVersion?: string;
  privacyConsentVersion?: string;
  phoneConsentVersion?: string;
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

export type PriceUnit = 'mes' | 'dia' | 'noche' | 'total' | 'estancia';
export type NearbyService =
  | 'hospital-clinic'
  | 'schools'
  | 'market'
  | 'public-transport'
  | 'shops'
  | 'parks'
  | 'university'
  | 'downtown'
  | 'balnearios'
  | 'other';

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

  // Entorno del inmueble, declarado por quien publica (opcional en registros anteriores).
  nearbyPlaces?: string;
  nearbyServices?: NearbyService[];
  nearbyServicesOther?: string;
  safetyLevel?: 'quiet' | 'mixed' | 'caution' | 'unknown' | 'other';
  safetyDetails?: string;
  waterIssueLevel?: 'none' | 'occasional' | 'frequent' | 'severe' | 'unknown' | 'other';
  waterIssueDetails?: string;
  transportAvailability?: 'nearby' | 'limited' | 'none' | 'unknown';
  transportDestinations?: string;

  // Reglas de la casa (solo rentas y hospedaje).
  // Opcionales: los anuncios anteriores no las tienen.
  // En la UI trátalas como `listing.petsAllowed ?? false`, etc.
  maxGuests?: number;
  childrenAllowed?: boolean;
  petsAllowed?: boolean;
  smokingAllowed?: boolean;
  alcoholConsumptionAllowed?: boolean;
  alcoholSalesAllowed?: boolean;
  commercialActivityAllowed?: boolean;
  commercialActivityNotes?: string;
  shortStayUse?: 'vacation' | 'events' | 'both' | 'other';
  shortStayNotes?: string;

  // Condiciones de renta y servicios (opcionales para anuncios anteriores).
  securityDepositMonths?: number;
  guarantorRequired?: boolean;
  proofIncomeRequired?: boolean;
  minimumLeaseMonths?: number;
  rentalRequirementsNotes?: string;
  waterBilling?: 'included' | 'extra' | 'unknown';
  waterMonthlyCost?: number;
  electricityBilling?: 'included' | 'extra' | 'unknown';
  electricityMonthlyCost?: number;
  internetBilling?: 'included' | 'extra' | 'unknown';
  internetMonthlyCost?: number;

  // Accesibilidad declarada por quien publica.
  stepFreeAccess?: boolean;
  rampAccess?: boolean;
  accessibleBathroom?: boolean;
  elevatorAccess?: boolean;

  // Visitas y casa abierta. Las solicitudes requieren confirmación del dueño.
  visitAvailability?: string;
  openHouseStartAt?: number;
  openHouseEndAt?: number;
  openHouseCapacity?: number;
  openHouseNotes?: string;

  // Posibilidad de compartir el espacio y buscar roomie.
  roommateWanted?: boolean;
  roommatePreferences?: string;
  roommatesWantedCount?: number;
  currentOccupants?: number;
  roommatePrivateRoom?: boolean;
  roommateFurnished?: boolean;
  roommateSharedBathroom?: boolean;
  roommateSharedKitchen?: boolean;
  roommateAuthorizationConfirmed?: boolean;

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
  whatsapp?: string;     // legado; mover a listingPrivateDetails y no exponer en lecturas públicas
  showPhone: boolean;

  // Moderación
  reportsCount: number;
  viewsCount?: number;
  whatsappContactsCount?: number;
  approvedBy?: string;
  approvedAt?: number;
  rejectionReason?: string;

  // Favoritos: opcional porque publicaciones antiguas no lo tienen.
  // Trátalo siempre como `listing.favoritesCount ?? 0` en la UI.
  favoritesCount?: number;

  // Consentimiento de publicación (auditable).
  // Opcionales: los anuncios anteriores no los tienen.
  // Al escribir se usa serverTimestamp() (FieldValue); al leer llega un Timestamp.
  publicationConsentVersion?: string;
  publicationConsentAt?: Timestamp | FieldValue;

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

// Notificaciones internas.
// Si agregas un tipo nuevo, hazlo solo aquí: el resto del código lo toma de este union.
export type NotificationType =
  | 'listing_approved'
  | 'listing_rejected'
  | 'listing_removed'
  | 'favorite_received';

export interface AppNotification {
  id: string;
  recipientId: string;
  type: NotificationType;
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
  visitRequestedAt?: number;
  openHouseRsvp?: boolean;
  visitStatus?: 'requested' | 'confirmed' | 'cancelled';
  appointmentStartAt?: number;
  appointmentEndAt?: number;
  listingTitle?: string;
  listingColonia?: string;
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
}
