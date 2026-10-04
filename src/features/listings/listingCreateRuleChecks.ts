/**
 * Client-side mirror of the data predicates in firestore.rules for listing
 * creation. Firestore remains authoritative; these checks make rejected
 * payloads actionable instead of returning a generic permission-denied.
 */
type RuleDocument = Record<string, unknown>;

const has = (document: RuleDocument, key: string) => Object.hasOwn(document, key);
const isInt = (value: unknown): value is number => Number.isSafeInteger(value);
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isText = (value: unknown, max: number, min = 0) =>
  typeof value === 'string' && value.length >= min && value.length <= max && !/[<>]/.test(value);
const isBoolean = (value: unknown) => typeof value === 'boolean';
const inSet = (value: unknown, values: readonly string[]) =>
  typeof value === 'string' && values.includes(value);
const optional = (document: RuleDocument, key: string, predicate: (value: unknown) => boolean) =>
  !has(document, key) || predicate(document[key]);

const ALLOWED_LISTING_KEYS = new Set([
  'ownerId', 'ownerEmailVerified', 'title', 'description', 'category', 'operation',
  'price', 'priceUnit', 'colonia', 'lat', 'lng', 'bedrooms', 'bathrooms',
  'parkingSpots', 'areaM2', 'amenities', 'status', 'availability', 'nearbyPlaces',
  'nearbyServices', 'nearbyServicesOther', 'safetyLevel', 'safetyDetails',
  'waterIssueLevel', 'waterIssueDetails', 'transportAvailability',
  'transportDestinations', 'availabilityConfirmedAt', 'expiresAt', 'photos',
  'photoPublicIds', 'showPhone', 'reportsCount', 'viewsCount',
  'publicationConsentVersion', 'publicationConsentAt', 'establishmentName',
  'roomType', 'stayDurationHours', 'checkInTime', 'checkOutTime', 'reception24h',
  'foodAvailable', 'foodDescription', 'maxGuests', 'childrenAllowed', 'petsAllowed',
  'smokingAllowed', 'whatsappContactsCount', 'favoritesCount', 'createdAt',
  'updatedAt', 'alcoholConsumptionAllowed', 'alcoholSalesAllowed',
  'commercialActivityAllowed', 'commercialActivityNotes', 'shortStayUse',
  'shortStayNotes', 'securityDepositMonths', 'guarantorRequired',
  'proofIncomeRequired', 'minimumLeaseMonths', 'rentalRequirementsNotes',
  'waterBilling', 'waterMonthlyCost', 'electricityBilling', 'electricityMonthlyCost',
  'internetBilling', 'internetMonthlyCost', 'stepFreeAccess', 'rampAccess',
  'accessibleBathroom', 'elevatorAccess', 'visitAvailability', 'openHouseStartAt',
  'openHouseEndAt', 'openHouseCapacity', 'openHouseNotes', 'roommateWanted',
  'roommatePreferences', 'roommatesWantedCount', 'currentOccupants',
  'roommatePrivateRoom', 'roommateFurnished', 'roommateSharedBathroom',
  'roommateSharedKitchen', 'roommateAuthorizationConfirmed',
]);

export function listingCreateRuleErrors(
  listing: RuleDocument,
  privateDetails: RuleDocument,
  uid: string,
  now = Date.now(),
): string[] {
  const errors: string[] = [];
  const check = (condition: boolean, message: string) => { if (!condition) errors.push(message); };
  const enumField = (key: string, allowed: readonly string[]) =>
    optional(listing, key, (value) => inSet(value, allowed));
  const boundedInt = (key: string, min: number, max: number) =>
    optional(listing, key, (value) => isInt(value) && value >= min && value <= max);
  const boundedNumber = (key: string, min: number, max: number) =>
    optional(listing, key, (value) => isNumber(value) && value >= min && value <= max);
  const boundedText = (key: string, max: number, min = 0) =>
    optional(listing, key, (value) => isText(value, max, min));
  const booleanField = (key: string) => optional(listing, key, isBoolean);

  check(Object.keys(listing).every((key) => ALLOWED_LISTING_KEYS.has(key)), 'Hay campos del anuncio que las reglas actuales no permiten.');
  check(listing.ownerId === uid && listing.ownerEmailVerified === true, 'La propiedad o verificación del dueño no coincide con la sesión.');
  check(isText(listing.title, 80, 8) && isText(listing.description, 1500, 30) && isText(listing.colonia, 80, 2), 'Título, descripción o colonia no cumplen los límites de Firestore (incluidos < y >).');
  check(inSet(listing.category, ['casa', 'departamento', 'cuarto', 'terreno', 'local', 'hotel', 'motel']), 'La categoría enviada no es válida.');
  check(inSet(listing.operation, ['renta', 'venta', 'hospedaje']), 'La operación enviada no es válida.');
  check(isNumber(listing.price) && listing.price > 0 && listing.price <= 10_000_000, 'El precio enviado debe ser mayor que 0 y no exceder $10,000,000.');
  check(isNumber(listing.lat) && listing.lat >= -90 && listing.lat <= 90 && isNumber(listing.lng) && listing.lng >= -180 && listing.lng <= 180, 'La ubicación del mapa está fuera de rango.');
  check(listing.status === 'pending' && inSet(listing.availability, ['available', 'occupied', 'reserved', 'rented', 'sold', 'unavailable', 'unconfirmed']), 'El estado de publicación o disponibilidad no es válido.');
  check(listing.publicationConsentVersion === '2026-09-26', 'La versión del consentimiento de publicación no coincide con las reglas activas.');
  check(['reportsCount', 'viewsCount', 'favoritesCount', 'whatsappContactsCount'].every((key) => listing[key] === 0), 'Los contadores iniciales del anuncio deben ser cero.');
  check(isInt(listing.expiresAt) && listing.expiresAt > now, 'La vigencia del anuncio ya venció o no es un número entero.');
  check(Array.isArray(listing.photos) && listing.photos.length >= 1 && listing.photos.length <= 10
    && listing.photos.every((photo) => typeof photo === 'string' && /^https:\/\/res\.cloudinary\.com\/ckaf3htn\/image\/upload\/.*$/.test(photo)),
  'Las fotos deben ser de Cloudinary ckaf3htn y debe haber entre 1 y 10.');

  const priceUnits: Record<string, readonly string[]> = {
    renta: ['mes', 'total'], venta: ['total'], hospedaje: ['dia', 'noche', 'mes', 'estancia'],
  };
  check(!has(listing, 'priceUnit') || (inSet(listing.operation, Object.keys(priceUnits))
    && priceUnits[String(listing.operation)].includes(String(listing.priceUnit))), 'La unidad del precio no corresponde a la operación.');

  check(boundedInt('bedrooms', 0, 50) && boundedInt('bathrooms', 0, 50)
    && boundedInt('parkingSpots', 0, 50) && boundedNumber('areaM2', 0, 100_000), 'Algún detalle numérico de la propiedad está fuera de rango.');
  check(boundedInt('maxGuests', 1, 50) && ['childrenAllowed', 'petsAllowed', 'smokingAllowed',
    'alcoholConsumptionAllowed', 'alcoholSalesAllowed', 'commercialActivityAllowed'].every(booleanField), 'Alguna regla de ocupación o casa tiene tipo o valor inválido.');
  check(boundedText('commercialActivityNotes', 240)
    && (!has(listing, 'shortStayUse') || (listing.operation === 'hospedaje'
      && ['casa', 'departamento', 'cuarto'].includes(String(listing.category))
      && inSet(listing.shortStayUse, ['vacation', 'events', 'both', 'other'])))
    && boundedText('shortStayNotes', 240), 'Las notas o el uso temporal no cumplen las reglas.');

  check(enumField('priceUnit', ['mes', 'dia', 'noche', 'total', 'estancia'])
    && boundedInt('securityDepositMonths', 0, 12) && boundedInt('minimumLeaseMonths', 1, 120)
    && booleanField('guarantorRequired') && booleanField('proofIncomeRequired')
    && boundedText('rentalRequirementsNotes', 300), 'Los requisitos de renta no cumplen los límites de Firestore.');
  for (const key of ['waterBilling', 'electricityBilling', 'internetBilling']) {
    check(enumField(key, ['included', 'extra', 'unknown']), `El estado de cobro de ${key} no es válido.`);
  }
  for (const [billingKey, costKey] of [
    ['waterBilling', 'waterMonthlyCost'], ['electricityBilling', 'electricityMonthlyCost'], ['internetBilling', 'internetMonthlyCost'],
  ]) {
    check(boundedNumber(costKey, 0, 100_000)
      && (!has(listing, billingKey) || listing[billingKey] !== 'extra' || has(listing, costKey)), `Falta un costo válido para ${billingKey}.`);
  }
  check(['stepFreeAccess', 'rampAccess', 'accessibleBathroom', 'elevatorAccess'].every(booleanField)
    && boundedText('visitAvailability', 160)
    && boundedInt('openHouseStartAt', 1, Number.MAX_SAFE_INTEGER)
    && boundedInt('openHouseEndAt', 1, Number.MAX_SAFE_INTEGER)
    && (has(listing, 'openHouseStartAt') === has(listing, 'openHouseEndAt'))
    && (!has(listing, 'openHouseStartAt') || Number(listing.openHouseEndAt) > Number(listing.openHouseStartAt))
    && boundedInt('openHouseCapacity', 1, 500) && boundedText('openHouseNotes', 240), 'Los datos de accesibilidad o visita no cumplen los límites de Firestore.');

  check(boundedText('nearbyPlaces', 240)
    && optional(listing, 'nearbyServices', (value) => Array.isArray(value) && value.length <= 10
      && value.every((item) => ['hospital-clinic', 'schools', 'market', 'public-transport', 'shops', 'parks', 'university', 'downtown', 'balnearios', 'other'].includes(String(item))))
    && boundedText('nearbyServicesOther', 120)
    && enumField('safetyLevel', ['quiet', 'mixed', 'caution', 'unknown', 'other'])
    && boundedText('safetyDetails', 240)
    && enumField('waterIssueLevel', ['none', 'occasional', 'frequent', 'severe', 'unknown', 'other'])
    && boundedText('waterIssueDetails', 240)
    && enumField('transportAvailability', ['nearby', 'limited', 'none', 'unknown'])
    && boundedText('transportDestinations', 200), 'Algún dato de servicios cercanos, agua, seguridad o transporte no cumple las reglas.');

  const roommateFields = ['roommatesWantedCount', 'currentOccupants', 'roommatePrivateRoom', 'roommateFurnished', 'roommateSharedBathroom', 'roommateSharedKitchen', 'roommateAuthorizationConfirmed'];
  check(booleanField('roommateWanted') && boundedText('roommatePreferences', 300)
    && boundedInt('roommatesWantedCount', 1, 10) && boundedInt('currentOccupants', 1, 30)
    && ['roommatePrivateRoom', 'roommateFurnished', 'roommateSharedBathroom', 'roommateSharedKitchen', 'roommateAuthorizationConfirmed'].every(booleanField)
    && (listing.roommateWanted !== true || (['casa', 'departamento', 'cuarto'].includes(String(listing.category))
      && listing.operation === 'renta' && (!has(listing, 'roommatesWantedCount') || (listing.lat === 20.4833 && listing.lng === -99.2167))))
    && (listing.roommateWanted !== true || roommateFields.every((key) => has(listing, key)))
    && (!has(listing, 'roommatesWantedCount') || (listing.roommateWanted === true
      && listing.roommateAuthorizationConfirmed === true)), 'La configuración de búsqueda de roomie está incompleta o no corresponde a esta propiedad.');

  check(listing.category !== 'hotel' || (listing.operation === 'hospedaje' && listing.priceUnit === 'noche'
    && isText(listing.establishmentName, 100, 2) && isText(listing.roomType, 80, 2)
    && typeof listing.checkInTime === 'string' && typeof listing.checkOutTime === 'string'), 'Faltan datos obligatorios del hotel.');
  check(listing.category !== 'motel' || (listing.operation === 'hospedaje'
    && inSet(listing.priceUnit, ['estancia', 'noche']) && isText(listing.establishmentName, 100, 2)
    && isText(listing.roomType, 80, 2) && typeof listing.checkInTime === 'string' && typeof listing.checkOutTime === 'string'
    && (listing.priceUnit !== 'estancia' || (isInt(listing.stayDurationHours) && listing.stayDurationHours >= 1 && listing.stayDurationHours <= 24))), 'Faltan datos obligatorios del motel.');
  check(booleanField('reception24h') && booleanField('foodAvailable')
    && (!has(listing, 'foodAvailable') || listing.foodAvailable !== true || isText(listing.foodDescription, 300, 3)), 'La descripción de alimentos no cumple las reglas.');

  check(privateDetails.ownerId === uid && has(privateDetails, 'updatedAt')
    && Object.keys(privateDetails).every((key) => ['ownerId', 'address', 'whatsapp', 'updatedAt'].includes(key))
    && (has(privateDetails, 'address') || has(privateDetails, 'whatsapp'))
    && optional(privateDetails, 'address', (value) => isText(value, 200))
    && typeof privateDetails.whatsapp === 'string' && /^\d{10}$/.test(privateDetails.whatsapp), 'Los datos privados (dirección/WhatsApp) no cumplen las reglas de Firestore.');

  return [...new Set(errors)];
}
