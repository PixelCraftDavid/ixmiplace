import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { onAuthStateChanged, type User as FbUser } from 'firebase/auth';
import { deleteField, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { googleProfilePhotoUrl } from '../../lib/google-profile-photo';
import type { AppUser, PublicProfile } from '../../types/models';

interface AuthContextValue {
  fbUser: FbUser | null;
  profile: AppUser | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  fbUser: null,
  profile: null,
  loading: true,
  refreshUser: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [fbUser, setFbUser] = useState<FbUser | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(user: FbUser): Promise<AppUser | null> {
    try {
      // Firestore checks the signed token, which can still predate email verification.
      const session = await user.getIdTokenResult();
      if (session.claims.email_verified !== user.emailVerified) {
        await user.getIdToken(true);
      }
      const ref = doc(db, 'users', user.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data() as AppUser;
        const googlePhotoURL = googleProfilePhotoUrl(user);
        if (googlePhotoURL && data.photoURL !== googlePhotoURL) {
          try {
            await updateDoc(ref, { photoURL: googlePhotoURL });
            data.photoURL = googlePhotoURL;
          } catch (err) {
            console.error('Error sincronizando la foto de Google:', err);
          }
        }
        if (data.emailVerified !== user.emailVerified) {
          try {
            await updateDoc(ref, { emailVerified: user.emailVerified });
            data.emailVerified = user.emailVerified;
          } catch (err) {
            console.error('Error sincronizando verificación de correo:', err);
          }
        }
        if (data.isBanned !== true) await syncPublicProfile(user, data);
        setProfile(data);
        return data;
      }

      // Crear perfil si no existe
      const newProfile: AppUser = {
        uid: user.uid,
        email: user.email ?? '',
        emailVerified: user.emailVerified,
        displayName:
          user.displayName ?? user.email?.split('@')[0] ?? 'Usuario',
        role: 'user',
        createdAt: Date.now(),
        isBanned: false,
      };
      if (user.phoneNumber) newProfile.phone = user.phoneNumber;
      const googlePhotoURL = googleProfilePhotoUrl(user);
      if (googlePhotoURL) newProfile.photoURL = googlePhotoURL;

      try {
        await setDoc(ref, newProfile, { merge: true });
        if (newProfile.isBanned !== true) await syncPublicProfile(user, newProfile);
        setProfile(newProfile);
        return newProfile;
      } catch (err) {
        console.error('Error creando perfil:', err);
        setProfile(newProfile);
        return newProfile;
      }
    } catch (err) {
      console.error('Error cargando perfil:', err);
      return null;
    }
  }

  async function syncPublicProfile(user: FbUser, profileData: AppUser) {
    const publicProfile: PublicProfile = {
      uid: user.uid,
      displayName: profileData.displayName,
    };
    if (profileData.photoURL) publicProfile.photoURL = profileData.photoURL;
    try {
      await setDoc(doc(db, 'publicProfiles', user.uid), {
        ...publicProfile,
        emailVerified: deleteField(),
        createdAt: deleteField(),
        isBanned: deleteField(),
      }, { merge: true });
    } catch (err) {
      console.error('Error sincronizando perfil público:', err);
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFbUser(user);

      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      await loadProfile(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  async function refreshUser() {
    const refreshed = auth.currentUser;
    if (!refreshed) return;
    await refreshed.reload();
    if (auth.currentUser?.uid !== refreshed.uid) return;
    // Refresh the server-visible verification claim before any profile writes.
    await refreshed.getIdToken(true);
    await loadProfile(refreshed);
    if (auth.currentUser?.uid !== refreshed.uid) return;
    setFbUser(
      Object.assign(Object.create(Object.getPrototypeOf(refreshed)), refreshed)
    );
  }

  async function refreshProfile() {
    if (!auth.currentUser) return;
    await loadProfile(auth.currentUser);
  }

  return (
    <AuthContext.Provider
      value={{ fbUser, profile, loading, refreshUser, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return ctx;
}
