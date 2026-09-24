import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { collection, getDocs, getDoc, doc, query, where } from 'firebase/firestore';
import { ArrowLeft, Check, Loader2, Home } from 'lucide-react';
import { db } from '../../lib/firebase';
import type { Listing, PublicProfile } from '../../types/models';
import { ListingCard } from '../listings/ListingCard';

export function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const profileId = id;
    async function load() {
      try {
        const [profileSnap, listingsSnap] = await Promise.all([
          getDoc(doc(db, 'publicProfiles', profileId)),
          getDocs(query(collection(db, 'listings'), where('status', '==', 'published'))),
        ]);
        if (profileSnap.exists()) setProfile(profileSnap.data() as PublicProfile);
        const publicListings = listingsSnap.docs
          .map((listingDoc) => ({ id: listingDoc.id, ...(listingDoc.data() as Omit<Listing, 'id'>) }))
          .filter((listing) => listing.ownerId === profileId && listing.expiresAt > Date.now());
        publicListings.sort((a, b) => b.createdAt - a.createdAt);
        setListings(publicListings);
      } catch (error) {
        console.error('Error cargando perfil público:', error);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [id]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-cream text-ink-400"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!profile || profile.isBanned) return <div className="flex min-h-screen items-center justify-center bg-cream px-4 text-center"><div><Home className="mx-auto h-10 w-10 text-ink-400" /><h1 className="mt-4 text-2xl font-bold text-ink">Perfil no disponible</h1><Link to="/" className="mt-5 inline-flex items-center gap-2 text-brand-600"><ArrowLeft className="h-4 w-4" /> Volver al inicio</Link></div></div>;

  return (
    <main className="min-h-screen bg-cream px-4 pb-16 pt-24">
      <div className="mx-auto max-w-6xl py-8">
        <Link to="/" className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-ink-500 hover:text-ink-700"><ArrowLeft className="h-4 w-4" /> Volver al inicio</Link>
        <section className="mb-8 rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            {profile.photoURL ? <img src={profile.photoURL} alt="" className="h-20 w-20 rounded-full object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-700">{profile.displayName.slice(0, 2).toUpperCase()}</div>}
            <div><h1 className="text-2xl font-extrabold text-ink">{profile.displayName}</h1>{profile.emailVerified && <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"><Check className="h-3.5 w-3.5" /> Correo verificado</span>}<p className="mt-2 text-sm text-ink-500">Propietario en IxmiPlace</p></div>
          </div>
        </section>
        <h2 className="mb-4 text-2xl font-extrabold text-ink">Propiedades publicadas</h2>
        {listings.length === 0 ? <p className="rounded-2xl border border-cream-200 bg-white p-10 text-center text-ink-500">Este propietario no tiene publicaciones activas.</p> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{listings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}</div>}
      </div>
    </main>
  );
}