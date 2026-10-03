import { useMemo, useState } from 'react';
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  deleteUser,
  signOut,
  updatePassword,
} from 'firebase/auth';
import { getToken as getAppCheckToken } from 'firebase/app-check';
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, KeyRound, Save, Trash2, UserRound } from 'lucide-react';
import { appCheck, auth, db } from '../../lib/firebase';
import { useAuth } from './AuthContext';
import { PrivacyNoticeInline } from '../../components/legal/PrivacyNoticeInline';
import { PRIVACY_NOTICE_VERSION } from '../legal/legalVersions';
import { displayNameSchema } from '../../lib/zod-schemas';

export function EditProfilePage() {
  const navigate = useNavigate();
  const { fbUser, profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [acceptedPhoneUse, setAcceptedPhoneUse] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const phoneChanged = phone.trim() !== (profile?.phone ?? '').trim();
  const needsPhoneConsent = phoneChanged || profile?.phoneConsentVersion !== PRIVACY_NOTICE_VERSION;
  const hasPasswordProvider = useMemo(
    () => fbUser?.providerData.some((provider) => provider.providerId === 'password') ?? false,
    [fbUser],
  );

  async function saveProfile() {
    if (!fbUser || !auth.currentUser) return;
    setProfileError('');
    setProfileSuccess('');
    const nameResult = displayNameSchema.safeParse(displayName);
    const nextName = nameResult.success ? nameResult.data : '';
    const nextPhone = phone.replace(/\D/g, '');

    if (!nameResult.success) {
      setProfileError('El nombre debe tener entre 2 y 60 caracteres.');
      return;
    }
    if (!/^\d{10}$/.test(nextPhone)) {
      setProfileError('Ingresa un teléfono de 10 dígitos.');
      return;
    }
    if (needsPhoneConsent && !acceptedPhoneUse) {
      setProfileError('Confirma el uso privado de tu teléfono para guardar el perfil.');
      return;
    }

    setProfileSaving(true);
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'users', fbUser.uid), {
        displayName: nextName,
        phone: nextPhone,
        emailVerified: auth.currentUser.emailVerified,
        ...(needsPhoneConsent
          ? { phoneConsentVersion: PRIVACY_NOTICE_VERSION, phoneConsentAt: serverTimestamp() }
          : {}),
      });
      batch.update(doc(db, 'publicProfiles', fbUser.uid), {
        displayName: nextName,
        emailVerified: auth.currentUser.emailVerified,
      });
      await batch.commit();
      await refreshProfile();
      setPhone(nextPhone);
      setAcceptedPhoneUse(false);
      setProfileSuccess('Tu perfil se guardó. El teléfono de anuncios existentes no cambia automáticamente.');
    } catch (saveError) {
      console.error('Error actualizando el perfil:', saveError);
      setProfileError('No pudimos guardar el perfil. Revisa la conexión e inténtalo de nuevo.');
    } finally {
      setProfileSaving(false);
    }
  }

  async function changePassword() {
    const user = auth.currentUser;
    setPasswordError('');
    setPasswordSuccess('');
    if (!user?.email) {
      setPasswordError('Esta cuenta no tiene un correo disponible para reautenticarse.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('La confirmación no coincide con la nueva contraseña.');
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError('La nueva contraseña debe ser distinta a la actual.');
      return;
    }

    setPasswordSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess('Tu contraseña se actualizó.');
    } catch (passwordChangeError) {
      console.error('Error cambiando la contraseña:', passwordChangeError);
      const code = (passwordChangeError as { code?: string })?.code;
      setPasswordError(
        code === 'auth/wrong-password' || code === 'auth/invalid-credential'
          ? 'La contraseña actual no es correcta.'
          : code === 'auth/weak-password'
            ? 'La nueva contraseña no cumple los requisitos de Firebase.'
            : code === 'auth/requires-recent-login'
              ? 'Vuelve a iniciar sesión y prueba de nuevo.'
              : 'No pudimos cambiar la contraseña. Verifica la contraseña actual e inténtalo otra vez.',
      );
    } finally {
      setPasswordSaving(false);
    }
  }

  async function deleteAccount() {
    const user = auth.currentUser;
    setDeleteError('');
    if (!user || !user.email) {
      setDeleteError('Inicia sesión de nuevo para confirmar el borrado de la cuenta.');
      return;
    }
    if (deleteConfirmation !== 'ELIMINAR') {
      setDeleteError('Escribe ELIMINAR exactamente para confirmar.');
      return;
    }
    if (!appCheck) {
      setDeleteError('App Check no está configurado en esta versión. No se borró ningún dato.');
      return;
    }

    setDeletingAccount(true);
    try {
      const providers = user.providerData.map((provider) => provider.providerId);
      if (providers.includes('password')) {
        if (!deletePassword) throw new Error('Ingresa tu contraseña actual para confirmar tu identidad.');
        await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, deletePassword));
      } else if (providers.includes('google.com')) {
        await reauthenticateWithPopup(user, new GoogleAuthProvider());
      } else {
        throw new Error('Vuelve a iniciar sesión con tu proveedor para poder confirmar el borrado.');
      }

      const [idToken, appCheckResult] = await Promise.all([
        user.getIdToken(true),
        getAppCheckToken(appCheck),
      ]);
      const response = await fetch('/api/delete-account', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'X-Firebase-AppCheck': appCheckResult.token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ confirm: 'ELIMINAR' }),
        cache: 'no-store',
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? 'No se pudo completar el borrado.');

      // Delete the signed-in account from the client after server-side data cleanup;
      // this avoids granting the Vercel service account Firebase Auth delete privileges.
      await deleteUser(user);
      await signOut(auth);
      navigate('/login', { replace: true, state: { accountDeleted: true } });
    } catch (error) {
      console.error('Error borrando la cuenta:', error);
      const code = (error as { code?: string })?.code;
      setDeleteError(
        error instanceof Error && !code
          ? error.message
          : code === 'auth/wrong-password' || code === 'auth/invalid-credential'
            ? 'La contraseña actual no es correcta.'
            : code === 'auth/popup-closed-by-user'
              ? 'Cerraste la ventana de confirmación de Google.'
              : code === 'auth/requires-recent-login'
                ? 'No se pudo confirmar el inicio de sesión reciente. Vuelve a iniciar sesión e inténtalo otra vez.'
                : error instanceof Error ? error.message : 'No se pudo borrar la cuenta. Inténtalo de nuevo.',
      );
    } finally {
      setDeletingAccount(false);
    }
  }

  return (
    <main className="min-h-screen bg-cream px-4 pb-16 pt-24 dark:bg-[#1c211a]">
      <div className="mx-auto max-w-3xl space-y-6 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-ink-500 hover:text-brand-700 dark:text-ink-300 dark:hover:text-brand-300">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>

        <header>
          <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
            <UserRound className="h-5 w-5" />
          </div>
          <h1 className="text-3xl font-extrabold text-ink-800 dark:text-ink-50">Editar perfil</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-300">Actualiza tu nombre, WhatsApp y seguridad de acceso.</p>
        </header>

        <section className="space-y-5 rounded-2xl border border-cream-200 bg-white p-6 shadow-sm dark:border-[#4b5847] dark:bg-[#293027]">
          <h2 className="text-lg font-bold text-ink-800 dark:text-ink-50">Información del perfil</h2>
          <label className="block text-sm font-semibold text-ink-700 dark:text-ink-200">
            Nombre visible
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={60} autoComplete="name" className="mt-2 w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-3 font-normal text-ink outline-none focus:border-brand-500 dark:border-[#4b5847] dark:bg-[#20251f] dark:text-ink-50" />
          </label>
          <label className="block text-sm font-semibold text-ink-700 dark:text-ink-200">
            Correo de la cuenta
            <input value={fbUser?.email ?? ''} readOnly className="mt-2 w-full cursor-not-allowed rounded-xl border border-cream-200 bg-cream-100 px-4 py-3 font-normal text-ink-500 dark:border-[#4b5847] dark:bg-[#242b22] dark:text-ink-300" />
          </label>
          <label className="block text-sm font-semibold text-ink-700 dark:text-ink-200">
            Número de WhatsApp
            <input type="tel" inputMode="numeric" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="7711234567" maxLength={10} autoComplete="tel-national" className="mt-2 w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-3 font-normal text-ink outline-none focus:border-brand-500 dark:border-[#4b5847] dark:bg-[#20251f] dark:text-ink-50" />
          </label>
          {needsPhoneConsent && (
            <label className="flex items-start gap-2.5 text-sm leading-relaxed text-ink-600 dark:text-ink-200">
              <input type="checkbox" checked={acceptedPhoneUse} onChange={(event) => setAcceptedPhoneUse(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-brand-600" />
              <span>Consiento que IxmiPlace guarde este número de forma privada y lo entregue mediante un enlace de WhatsApp a usuarios con correo verificado cuando autorice mostrarlo en un anuncio. Las consultas tienen límites antiabuso. <Link to="/aviso-de-privacidad" target="_blank" className="font-semibold text-brand-700 underline dark:text-brand-300">Aviso de Privacidad</Link>.</span>
            </label>
          )}
          <PrivacyNoticeInline kind="profile" />
          {profileError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{profileError}</p>}
          {profileSuccess && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{profileSuccess}</p>}
          <button type="button" onClick={() => void saveProfile()} disabled={profileSaving || (needsPhoneConsent && !acceptedPhoneUse)} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50">
            <Save className="h-4 w-4" /> {profileSaving ? 'Guardando…' : 'Guardar perfil'}
          </button>
        </section>

        <section className="space-y-5 rounded-2xl border border-cream-200 bg-white p-6 shadow-sm dark:border-[#4b5847] dark:bg-[#293027]">
          <div className="flex items-center gap-3">
            <KeyRound className="h-5 w-5 text-brand-600 dark:text-brand-300" />
            <div>
              <h2 className="text-lg font-bold text-ink-800 dark:text-ink-50">Contraseña</h2>
              <p className="text-sm text-ink-500 dark:text-ink-300">Vuelve a confirmar tu identidad antes de cambiarla.</p>
            </div>
          </div>
          {hasPasswordProvider ? (
            <>
              <label className="block text-sm font-semibold text-ink-700 dark:text-ink-200">
                Contraseña actual
                <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" className="mt-2 w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-3 font-normal text-ink outline-none focus:border-brand-500 dark:border-[#4b5847] dark:bg-[#20251f] dark:text-ink-50" />
              </label>
              <label className="block text-sm font-semibold text-ink-700 dark:text-ink-200">
                Nueva contraseña
                <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength={8} className="mt-2 w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-3 font-normal text-ink outline-none focus:border-brand-500 dark:border-[#4b5847] dark:bg-[#20251f] dark:text-ink-50" />
              </label>
              <label className="block text-sm font-semibold text-ink-700 dark:text-ink-200">
                Confirmar nueva contraseña
                <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={8} className="mt-2 w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-3 font-normal text-ink outline-none focus:border-brand-500 dark:border-[#4b5847] dark:bg-[#20251f] dark:text-ink-50" />
              </label>
              {passwordError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{passwordError}</p>}
              {passwordSuccess && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{passwordSuccess}</p>}
              <button type="button" onClick={() => void changePassword()} disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword} className="w-full rounded-xl border border-brand-300 px-5 py-3 font-semibold text-brand-800 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-brand-700 dark:text-brand-200 dark:hover:bg-brand-900/30">
                {passwordSaving ? 'Actualizando…' : 'Cambiar contraseña'}
              </button>
            </>
          ) : (
            <p className="rounded-xl bg-cream-50 p-4 text-sm leading-relaxed text-ink-600 dark:bg-[#242b22] dark:text-ink-200">
              Tu cuenta inicia sesión con Google; esa contraseña se administra desde tu cuenta de Google y no puede cambiarse aquí.
            </p>
          )}
        </section>

        <section className="space-y-4 rounded-2xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-900/70 dark:bg-[#293027]">
          <div className="flex items-start gap-3">
            <Trash2 className="mt-1 h-5 w-5 shrink-0 text-red-600" />
            <div>
              <h2 className="text-lg font-bold text-red-800 dark:text-red-300">Eliminar mi cuenta</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-600 dark:text-ink-200">
                Esta acción es permanente. Se borrarán tu perfil, publicaciones, imágenes de tus anuncios, mensajes asociados, favoritos, reportes enviados, notificaciones e historial. Primero volverás a confirmar tu identidad.
              </p>
            </div>
          </div>
          {hasPasswordProvider && (
            <label className="block text-sm font-semibold text-ink-700 dark:text-ink-200">
              Contraseña actual
              <input type="password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} autoComplete="current-password" className="mt-2 w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-3 font-normal text-ink outline-none focus:border-red-500 dark:border-[#4b5847] dark:bg-[#20251f] dark:text-ink-50" />
            </label>
          )}
          <label className="block text-sm font-semibold text-ink-700 dark:text-ink-200">
            Escribe ELIMINAR para confirmar
            <input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} autoComplete="off" maxLength={20} className="mt-2 w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-3 font-normal text-ink outline-none focus:border-red-500 dark:border-[#4b5847] dark:bg-[#20251f] dark:text-ink-50" />
          </label>
          {deleteError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{deleteError}</p>}
          <button type="button" onClick={() => void deleteAccount()} disabled={deletingAccount || deleteConfirmation !== 'ELIMINAR' || (hasPasswordProvider && !deletePassword)} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">
            <Trash2 className="h-4 w-4" /> {deletingAccount ? 'Borrando cuenta y datos…' : 'Borrar permanentemente mi cuenta'}
          </button>
        </section>
      </div>
    </main>
  );
}
