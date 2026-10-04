import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Heart, Home, ChevronDown, User, ShieldCheck, Bell, Moon, Sun, Mail, Settings, Languages, Plus, Menu, X, MapPin } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/features/auth/AuthContext';
import { listenForForegroundPush } from '@/lib/push-notifications';
import { useLanguage, type Locale } from '@/lib/i18n';

export function Navbar() {
  const { locale, setLocale, t } = useLanguage();
  const { fbUser, profile } = useAuth();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const overDarkHero = pathname === '/';
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains('dark'));
  const menuRef = useRef<HTMLDivElement>(null);

  async function logout() {
    await signOut(auth);
    nav('/login');
  }

  // Cierra el menú al hacer clic fuera de él
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let generation = 0;
    let stopListening: (() => void) | undefined;

    const subscribe = async () => {
      const currentGeneration = ++generation;
      const unsubscribe = await listenForForegroundPush((payload) => {
        if (Notification.permission !== 'granted') return;
        const targetUrl = new URL(payload.data?.url || '/notificaciones', window.location.origin);
        if (targetUrl.origin !== window.location.origin) return;
        void navigator.serviceWorker.ready.then((registration) => registration.showNotification(
          payload.data?.title || payload.notification?.title || 'IxmiPlace',
          {
            body: payload.data?.body || payload.notification?.body || 'Tienes una novedad en IxmiPlace.',
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            data: { url: targetUrl.href },
          }
        )).catch((error) => console.warn('No se pudo mostrar la notificación en primer plano:', error));
      });
      if (currentGeneration !== generation) unsubscribe();
      else {
        stopListening?.();
        stopListening = unsubscribe;
      }
    };

    const handleEnabled = () => void subscribe();
    const handleDisabled = () => {
      generation += 1;
      stopListening?.();
      stopListening = undefined;
    };
    window.addEventListener('ixmiplace:push-enabled', handleEnabled);
    window.addEventListener('ixmiplace:push-disabled', handleDisabled);
    void subscribe();

    return () => {
      generation += 1;
      stopListening?.();
      window.removeEventListener('ixmiplace:push-enabled', handleEnabled);
      window.removeEventListener('ixmiplace:push-disabled', handleDisabled);
    };
  }, [fbUser?.uid]);

  // Cierra el menú al navegar a cualquier link dentro de él
  function closeMenu() {
    setMenuOpen(false);
  }

  function closeMobileDrawer() {
    setMobileDrawerOpen(false);
  }

  useEffect(() => {
    if (!mobileDrawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMobileDrawer();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileDrawerOpen]);

  useEffect(() => {
    closeMobileDrawer();
    closeMenu();
  }, [pathname]);

  function toggleTheme() {
    const nextDarkMode = !darkMode;
    setDarkMode(nextDarkMode);
    document.documentElement.classList.toggle('dark', nextDarkMode);
    localStorage.setItem('ixmiplace:theme', nextDarkMode ? 'dark' : 'light');
  }

  return (
    <>
    <header className={`absolute inset-x-0 top-0 z-40 ${overDarkHero ? 'bg-transparent' : 'border-b border-cream-200 bg-cream/95 shadow-sm backdrop-blur-xl dark:border-[#4b5847] dark:bg-[#1c211a]/95'}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <img
            src="/logo-ixmiplace.jpg"
            alt=""
            aria-hidden="true"
            className="h-10 w-10 rounded-xl border border-cream-200 bg-cream object-cover object-[center_34%] shadow-sm"
          />
          <span className={`text-xl font-extrabold ${overDarkHero ? 'text-white drop-shadow-md' : 'text-ink-700 dark:text-ink-50'}`}>
            Ixmi<span className={overDarkHero ? 'text-brand-400' : 'text-brand-600 dark:text-brand-300'}>Place</span>
          </span>
        </Link>

        <nav aria-label={t('nav.primary')} className="flex items-center gap-2 sm:gap-3">
          <label className={`hidden h-10 items-center gap-1.5 rounded-full border px-2 sm:inline-flex sm:px-3 ${overDarkHero ? 'border-white/30 bg-white/10 text-white' : 'border-cream-300 bg-white text-ink-700 dark:border-white/20 dark:bg-white/10 dark:text-ink-50'}`}>
            <Languages className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="sr-only">{t('language.label')}</span>
            <select
              aria-label={t('language.label')}
              value={locale}
              onChange={(event) => setLocale(event.target.value as Locale)}
              className="max-w-[5.5rem] cursor-pointer appearance-none bg-transparent text-xs font-semibold outline-none sm:max-w-none sm:text-sm"
            >
              <option className="text-ink-800" value="es">{t('language.spanish')}</option>
              <option className="text-ink-800" value="en">{t('language.english')}</option>
              <option className="text-ink-800" value="ote">{t('language.hnahnu')}</option>
            </select>
          </label>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={darkMode ? t('nav.light') : t('nav.dark')}
            title={darkMode ? t('nav.lightMode') : t('nav.darkMode')}
            className={`flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-md transition ${overDarkHero ? 'border-white/30 bg-white/10 text-white hover:bg-white/20' : 'border-cream-300 bg-white text-ink-700 shadow-sm hover:bg-cream-50 dark:border-white/20 dark:bg-white/10 dark:text-ink-50 dark:hover:bg-white/20'}`}
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <Link
            to="/apoyar"
            aria-label={t('nav.support')}
            title={t('nav.support')}
            className="motion-ease group inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-rose-300/40 bg-[#d95848] text-white shadow-[0_4px_16px_rgba(117,35,28,0.22)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#c94d40] hover:shadow-[0_8px_22px_rgba(117,35,28,0.28)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1c211a] sm:w-auto sm:gap-1.5 sm:px-3"
          >
            <Heart className="h-4 w-4 fill-current transition-transform duration-300 group-hover:scale-110 group-active:scale-95" />
            <span className="sr-only sm:not-sr-only sm:text-sm sm:font-semibold">{t('nav.supportShort')}</span>
          </Link>
          {fbUser ? (
            <div className="relative hidden sm:block" ref={menuRef}>
              {/* Botón que abre/cierra el menú */}
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="true"
                aria-expanded={menuOpen}
                className={`flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 text-sm backdrop-blur-md transition ${overDarkHero ? 'border-white/30 bg-white/10 text-white hover:bg-white/20' : 'border-cream-300 bg-white text-ink-700 shadow-sm hover:bg-cream-50 dark:border-white/20 dark:bg-white/10 dark:text-ink-50 dark:hover:bg-white/20'}`}
              >
                {profile?.photoURL ? (
                  <img
                    src={profile.photoURL}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-7 w-7 rounded-full border-2 border-white/40"
                  />
                ) : (
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full ${overDarkHero ? 'bg-white/20' : 'bg-brand-50 text-brand-700 dark:bg-white/15 dark:text-white'}`}>
                    <User className="h-4 w-4" />
                  </span>
                )}
                <span className="hidden sm:inline">
                  {profile?.displayName ?? fbUser.email}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${
                    menuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Menú desplegable */}
              {menuOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-cream-200 bg-white py-2 text-ink-700 shadow-xl dark:border-[#4b5847] dark:bg-[#242a22] dark:text-ink-50"
                >
                  <div className="border-b border-cream-100 px-4 py-2 dark:border-white/10">
                    <p className="truncate text-sm font-semibold text-ink dark:text-ink-50">
                      {profile?.displayName ?? t('nav.user')}
                    </p>
                    <p className="truncate text-xs text-ink-400">{fbUser.email}</p>
                  </div>

                  <label className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-ink-600 dark:text-ink-200">
                    <span className="inline-flex items-center gap-2"><Languages className="h-4 w-4 text-ink-400" aria-hidden="true" />{t('language.label')}</span>
                    <select
                      aria-label={t('language.label')}
                      value={locale}
                      onChange={(event) => setLocale(event.target.value as Locale)}
                      className="max-w-32 rounded-lg border border-cream-200 bg-cream-50 px-2 py-1.5 text-xs text-ink-700 outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                    >
                      <option value="es">{t('language.spanish')}</option>
                      <option value="en">{t('language.english')}</option>
                      <option value="ote">{t('language.hnahnu')}</option>
                    </select>
                  </label>

                  <Link
                    to="/perfil"
                    onClick={closeMenu}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-600 transition hover:bg-cream-100 dark:text-ink-200 dark:hover:bg-white/[0.07]"
                  >
                    <Settings className="h-4 w-4 text-ink-400" />
                    {t('nav.editProfile')}
                  </Link>

                  <Link
                    to="/mis-publicaciones"
                    onClick={closeMenu}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-600 transition hover:bg-cream-100 dark:text-ink-200 dark:hover:bg-white/[0.07]"
                  >
                    <Home className="h-4 w-4 text-ink-400" />
                    {t('nav.myListings')}
                  </Link>

                  <Link
                    to="/favoritos"
                    onClick={closeMenu}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-600 transition hover:bg-cream-100 dark:text-ink-200 dark:hover:bg-white/[0.07]"
                  >
                    <Heart className="h-4 w-4 text-ink-400" />
                    {t('nav.favorites')}
                  </Link>

                  <Link
                    to="/notificaciones"
                    onClick={closeMenu}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-600 transition hover:bg-cream-100 dark:text-ink-200 dark:hover:bg-white/[0.07]"
                  >
                    <Bell className="h-4 w-4 text-ink-400" />
                    {t('nav.notifications')}
                  </Link>

                  <Link
                    to="/mensajes"
                    onClick={closeMenu}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-600 transition hover:bg-cream-100 dark:text-ink-200 dark:hover:bg-white/[0.07]"
                  >
                    <Mail className="h-4 w-4 text-ink-400" />
                    {t('nav.messages')}
                  </Link>

                  {profile?.role === 'admin' && (
                    <Link
                      to="/admin"
                      onClick={closeMenu}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-600 transition hover:bg-cream-100 dark:text-ink-200 dark:hover:bg-white/[0.07]"
                    >
                      <ShieldCheck className="h-4 w-4 text-ink-400" />
                      {t('nav.admin')}
                    </Link>
                  )}

                  <Link to="/apoyar" onClick={closeMenu} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-600 transition hover:bg-cream-100 dark:text-ink-200 dark:hover:bg-white/[0.07] sm:hidden">
                    <Heart className="h-4 w-4 text-rose-500" />{t('nav.supportShort')}
                  </Link>

                  <div className="my-1 border-t border-cream-100 dark:border-white/10" />

                  <button
                    type="button"
                    onClick={() => {
                      closeMenu();
                      logout();
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30"
                  >
                    <LogOut className="h-4 w-4" />
                    {t('nav.logout')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className={`hidden text-sm sm:inline ${overDarkHero ? 'text-white' : 'text-ink-700 dark:text-ink-50'} hover:underline`}>
                {t('nav.login')}
              </Link>
              <Link
                to="/register"
                className="motion-ease hidden rounded-full border border-[#e4cfaa] bg-[#f4e9d3] px-4 py-2 text-sm font-semibold text-[#263629] shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-[#d49a4a] hover:bg-white active:translate-y-0 dark:border-[#d49a4a]/50 dark:bg-[#d49a4a] dark:text-[#1c211a] dark:hover:bg-[#e4b66e] sm:inline-flex"
              >
                {t('nav.register')}
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={() => setMobileDrawerOpen((open) => !open)}
            aria-label={t('nav.account')}
            aria-expanded={mobileDrawerOpen}
            aria-controls="mobile-navigation-drawer"
            className={`flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-md transition sm:hidden ${overDarkHero ? 'border-white/30 bg-white/10 text-white hover:bg-white/20' : 'border-cream-300 bg-white text-ink-700 shadow-sm hover:bg-cream-50 dark:border-white/20 dark:bg-white/10 dark:text-ink-50 dark:hover:bg-white/20'}`}
          >
            {mobileDrawerOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </nav>
      </div>
    </header>
      <div
        className={`fixed inset-0 z-[60] transition-opacity duration-300 ease-out motion-reduce:transition-none sm:hidden ${mobileDrawerOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        aria-hidden={!mobileDrawerOpen}
      >
        <button
          type="button"
          tabIndex={mobileDrawerOpen ? 0 : -1}
          onClick={closeMobileDrawer}
          aria-label={t('nav.closeMenu')}
          className="absolute inset-0 h-full w-full bg-[#142019]/45 backdrop-blur-[2px]"
        />
        <aside
          id="mobile-navigation-drawer"
          role="dialog"
          aria-modal={mobileDrawerOpen}
          aria-label={t('nav.primary')}
          inert={!mobileDrawerOpen}
          className={`absolute inset-y-0 left-0 flex w-[min(84vw,21rem)] flex-col overflow-hidden rounded-r-[2rem] bg-[#7eaa9b] text-white shadow-[12px_0_45px_rgba(19,39,31,0.22)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none dark:bg-[#26392f] ${mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="flex items-center gap-3 border-b border-white/20 px-5 pb-5 pt-[max(1.5rem,env(safe-area-inset-top))]">
            {profile?.photoURL ? (
              <img src={profile.photoURL} alt="" referrerPolicy="no-referrer" className="h-12 w-12 rounded-full border-2 border-white/50 object-cover shadow-sm" />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-white"><User className="h-6 w-6" /></span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold">{profile?.displayName ?? (fbUser ? t('nav.user') : t('nav.guest'))}</p>
              <p className="truncate text-xs text-white/75">{fbUser?.email ?? t('nav.explore')}</p>
            </div>
            <button type="button" onClick={closeMobileDrawer} aria-label={t('nav.closeMenu')} className="flex h-9 w-9 items-center justify-center rounded-full text-white/85 transition hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <label className="mx-4 mt-4 flex items-center justify-between gap-3 rounded-xl bg-white/10 px-3 py-2.5 text-sm">
            <span className="inline-flex items-center gap-2"><Languages className="h-4 w-4" aria-hidden="true" />{t('language.label')}</span>
            <select aria-label={t('language.label')} value={locale} onChange={(event) => setLocale(event.target.value as Locale)} className="max-w-32 rounded-lg border border-white/30 bg-white/95 px-2 py-1.5 text-xs text-ink-700 outline-none focus-visible:ring-2 focus-visible:ring-white">
              <option value="es">{t('language.spanish')}</option>
              <option value="en">{t('language.english')}</option>
              <option value="ote">{t('language.hnahnu')}</option>
            </select>
          </label>

          <nav aria-label={t('nav.primary')} className="mt-4 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
            <Link to="/" onClick={closeMobileDrawer} aria-current={pathname === '/' ? 'page' : undefined} className={`flex items-center gap-3 rounded-full px-4 py-3 text-sm transition duration-200 hover:bg-white/15 ${pathname === '/' ? 'bg-white text-[#426c5f] shadow-sm' : 'text-white/95'}`}><MapPin className="h-4 w-4" aria-hidden="true" />{t('nav.explore')}</Link>
            {fbUser ? <>
              <Link to="/perfil" onClick={closeMobileDrawer} className="flex items-center gap-3 rounded-full px-4 py-3 text-sm text-white/95 transition duration-200 hover:bg-white/15"><Settings className="h-4 w-4" aria-hidden="true" />{t('nav.editProfile')}</Link>
              <Link to="/mis-publicaciones" onClick={closeMobileDrawer} className="flex items-center gap-3 rounded-full px-4 py-3 text-sm text-white/95 transition duration-200 hover:bg-white/15"><Home className="h-4 w-4" aria-hidden="true" />{t('nav.myListings')}</Link>
              <Link to="/favoritos" onClick={closeMobileDrawer} className="flex items-center gap-3 rounded-full px-4 py-3 text-sm text-white/95 transition duration-200 hover:bg-white/15"><Heart className="h-4 w-4" aria-hidden="true" />{t('nav.favorites')}</Link>
              <Link to="/notificaciones" onClick={closeMobileDrawer} className="flex items-center gap-3 rounded-full px-4 py-3 text-sm text-white/95 transition duration-200 hover:bg-white/15"><Bell className="h-4 w-4" aria-hidden="true" />{t('nav.notifications')}</Link>
              <Link to="/mensajes" onClick={closeMobileDrawer} className="flex items-center gap-3 rounded-full px-4 py-3 text-sm text-white/95 transition duration-200 hover:bg-white/15"><Mail className="h-4 w-4" aria-hidden="true" />{t('nav.messages')}</Link>
              {profile?.role === 'admin' && <Link to="/admin" onClick={closeMobileDrawer} className="flex items-center gap-3 rounded-full px-4 py-3 text-sm text-white/95 transition duration-200 hover:bg-white/15"><ShieldCheck className="h-4 w-4" aria-hidden="true" />{t('nav.admin')}</Link>}
            </> : <>
              <Link to="/login" onClick={closeMobileDrawer} className="flex items-center gap-3 rounded-full px-4 py-3 text-sm text-white/95 transition duration-200 hover:bg-white/15"><User className="h-4 w-4" aria-hidden="true" />{t('nav.login')}</Link>
              <Link to="/register" onClick={closeMobileDrawer} className="flex items-center gap-3 rounded-full px-4 py-3 text-sm text-white/95 transition duration-200 hover:bg-white/15"><Plus className="h-4 w-4" aria-hidden="true" />{t('nav.register')}</Link>
            </>}
            <div className="mx-4 my-3 border-t border-white/25" />
            <Link to="/apoyar" onClick={closeMobileDrawer} className="flex items-center gap-3 rounded-full px-4 py-3 text-sm text-white/95 transition duration-200 hover:bg-white/15"><Heart className="h-4 w-4 text-rose-100" aria-hidden="true" />{t('nav.supportShort')}</Link>
          </nav>

          {fbUser && <div className="border-t border-white/20 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button type="button" onClick={() => { closeMobileDrawer(); void logout(); }} className="flex w-full items-center gap-3 rounded-full px-4 py-3 text-left text-sm text-white/95 transition hover:bg-white/15"><LogOut className="h-4 w-4" aria-hidden="true" />{t('nav.logout')}</button>
          </div>}
        </aside>
      </div>
      {fbUser && (
        <nav aria-label={t('nav.primary')} className="fixed inset-x-0 bottom-0 z-50 border-t border-cream-200 bg-cream/95 shadow-[0_-8px_28px_rgba(27,32,24,0.09)] backdrop-blur-xl dark:border-[#4b5847] dark:bg-[#1c211a]/95 sm:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="mx-auto grid h-[4.25rem] max-w-lg grid-cols-5 items-center px-1">
            <Link to="/" aria-current={pathname === '/' ? 'page' : undefined} className={`flex min-w-0 flex-col items-center justify-center gap-1 px-1 py-1 text-[10px] font-medium transition ${pathname === '/' ? 'text-brand-700 dark:text-brand-300' : 'text-ink-500 dark:text-ink-300'}`}>
              <Home className="h-5 w-5" aria-hidden="true" />
              <span className="truncate">{t('nav.explore')}</span>
            </Link>
            <Link to="/favoritos" aria-current={pathname === '/favoritos' ? 'page' : undefined} className={`flex min-w-0 flex-col items-center justify-center gap-1 px-1 py-1 text-[10px] font-medium transition ${pathname === '/favoritos' ? 'text-brand-700 dark:text-brand-300' : 'text-ink-500 dark:text-ink-300'}`}>
              <Heart className="h-5 w-5" aria-hidden="true" />
              <span className="truncate">{t('nav.favorites')}</span>
            </Link>
            <Link to="/publicar" aria-current={pathname === '/publicar' ? 'page' : undefined} aria-label={t('nav.publish')} className="-mt-3 flex min-w-0 flex-col items-center justify-center gap-1 text-[10px] font-semibold text-ink-800 dark:text-ink-50">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-400 text-ink-900 shadow-[0_6px_16px_rgba(212,154,74,0.3)] transition active:scale-95 dark:bg-accent-300">
                <Plus className="h-6 w-6" aria-hidden="true" />
              </span>
              <span className="truncate">{t('nav.publish')}</span>
            </Link>
            <Link to="/mensajes" aria-current={pathname === '/mensajes' ? 'page' : undefined} className={`flex min-w-0 flex-col items-center justify-center gap-1 px-1 py-1 text-[10px] font-medium transition ${pathname === '/mensajes' ? 'text-brand-700 dark:text-brand-300' : 'text-ink-500 dark:text-ink-300'}`}>
              <Mail className="h-5 w-5" aria-hidden="true" />
              <span className="truncate">{t('nav.messages')}</span>
            </Link>
            <Link to="/perfil" aria-current={pathname === '/perfil' ? 'page' : undefined} className={`flex min-w-0 flex-col items-center justify-center gap-1 px-1 py-1 text-[10px] font-medium transition ${pathname === '/perfil' ? 'text-brand-700 dark:text-brand-300' : 'text-ink-500 dark:text-ink-300'}`}>
              <User className="h-5 w-5" aria-hidden="true" />
              <span className="truncate">{t('nav.account')}</span>
            </Link>
          </div>
        </nav>
      )}
    </>
  );
}
