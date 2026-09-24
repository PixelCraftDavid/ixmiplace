const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const cloudinary = require('cloudinary').v2;

admin.initializeApp();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.deleteListing = onCall(
  {
    region: 'us-central1',
    cors: ['http://localhost:5173', 'http://localhost:4173'],
  },
  async (request) => {
  const authUser = request.auth;
  if (!authUser?.uid) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión para borrar una publicación.');
  }

  const listingId = request.data?.listingId;
  if (typeof listingId !== 'string' || !listingId.trim()) {
    throw new HttpsError('invalid-argument', 'Falta el identificador de la publicación.');
  }

  const listingRef = admin.firestore().collection('listings').doc(listingId);
  const snap = await listingRef.get();

  if (!snap.exists) {
    throw new HttpsError('not-found', 'La publicación ya no existe.');
  }

  const listing = snap.data();
  if (listing?.ownerId !== authUser.uid) {
    throw new HttpsError('permission-denied', 'Solo el propietario puede borrar esta publicación.');
  }

  const publicIds = Array.isArray(listing?.photoPublicIds)
    ? listing.photoPublicIds.filter(Boolean)
    : [];

  await Promise.all(
    publicIds.map(async (publicId) => {
      try {
        await cloudinary.uploader.destroy(publicId, {
          invalidate: true,
          resource_type: 'image',
        });
      } catch (error) {
        console.warn(`No se pudo borrar Cloudinary ${publicId}:`, error);
        throw new HttpsError(
          'internal',
          'No se pudieron limpiar todas las imágenes. La publicación no fue eliminada.'
        );
      }
    })
  );

  await listingRef.delete();

  return {
    ok: true,
    listingId,
    deletedPublicIds: publicIds,
  };
  }
);