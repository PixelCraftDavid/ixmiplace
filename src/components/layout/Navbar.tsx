import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const isHome = pathname === '/';
  // En la portada la cabecera sigue el tema global.
  const overDarkHero = false;
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains('dark'));
  const menuRef = useRef<HTMLDivElement>(null);
  const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const themeTransitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    window.requestAnimationFrame(() => mobileMenuTriggerRef.current?.focus({ preventScroll: true }));
  }

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('ixmiplace:mobile-drawer-change', {
      detail: { open: mobileDrawerOpen, scrollTop: mobileDrawerOpen ? window.scrollY : undefined },
    }));
  }, [mobileDrawerOpen]);

  useEffect(() => {
    if (!mobileDrawerOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMobileDrawer();
    };
    const handleResize = () => {
      if (window.matchMedia('(min-width: 640px)').matches) closeMobileDrawer();
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [mobileDrawerOpen]);

  useEffect(() => {
    closeMenu();
  }, [pathname]);

  function toggleTheme() {
    const nextDarkMode = !darkMode;
    const root = document.documentElement;

    if (themeTransitionTimerRef.current !== null) {
      window.clearTimeout(themeTransitionTimerRef.current);
      themeTransitionTimerRef.current = null;
    }

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.classList.add('theme-transitioning');
      themeTransitionTimerRef.current = window.setTimeout(() => {
        root.classList.remove('theme-transitioning');
        themeTransitionTimerRef.current = null;
      }, 520);
    }

    setDarkMode(nextDarkMode);
    root.classList.toggle('dark', nextDarkMode);
    localStorage.setItem('ixmiplace:theme', nextDarkMode ? 'dark' : 'light');
  }

  function mobileNavItemClass(path: string) {
    const isActive = path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`);
    return `flex items-center gap-3 rounded-full px-4 py-3 text-sm transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${isActive ? 'bg-white text-[#426c5f] shadow-sm' : 'text-white/95 hover:bg-white/15'}`;
  }

  return (
    <>
    <header style={isHome ? { backgroundColor: darkMode ? 'rgba(28,33,26,0.96)' : 'rgba(245,240,229,0.96)', borderColor: darkMode ? '#4b5847' : '#e3ddce' } : undefined} className={`absolute inset-x-0 top-0 z-[60] ${overDarkHero ? 'bg-transparent' : isHome ? 'border-b shadow-sm backdrop-blur-xl' : 'border-b border-cream-200 bg-cream/95 shadow-sm backdrop-blur-xl dark:border-[#4b5847] dark:bg-[#1c211a]/95'}`}>
      <div className="mx-auto flex w-full items-center justify-between gap-2 px-5 py-4 sm:px-8 lg:gap-3 lg:px-8 xl:px-12">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <img
            src="/logo-ixmiplace.jpg"
            alt=""
            aria-hidden="true"
            className="h-10 w-10 rounded-xl border border-cream-200 bg-cream object-cover object-[center_34%] shadow-sm"
          />
          <span className={`text-xl font-extrabold ${overDarkHero ? 'text-white drop-shadow-md' : isHome ? (darkMode ? 'text-ink-50' : 'text-[#1e3023]') : 'text-ink-700 dark:text-ink-50'}`}>
            Ixmi<span className={overDarkHero ? 'text-brand-400' : isHome ? (darkMode ? 'text-brand-300' : 'text-[#477450]') : 'text-brand-600 dark:text-brand-300'}>Place</span>
          </span>
        </Link>

        <nav aria-label={t('nav.primary')} className="hidden items-center gap-1 lg:flex xl:gap-4">
          <Link to="/" aria-current={pathname === '/' ? 'page' : undefined} className={`whitespace-nowrap text-xs font-semibold transition hover:text-[#e4b66e] xl:text-sm ${overDarkHero ? 'text-white' : isHome ? (darkMode ? 'text-ink-50' : 'text-[#1e3023]') : 'text-ink-700 dark:text-ink-100'}`}>
            {t('nav.home')}
          </Link>
          <Link to="/propiedades" className={`whitespace-nowrap text-xs font-medium transition hover:text-[#e4b66e] xl:text-sm ${overDarkHero ? 'text-white/85' : isHome ? (darkMode ? 'text-ink-200' : 'text-[#555b54]') : 'text-ink-600 dark:text-ink-200'}`}>
            {t('nav.properties')}
          </Link>
          <Link to="/roomies" className={`whitespace-nowrap text-xs font-medium transition hover:text-[#e4b66e] xl:text-sm ${overDarkHero ? 'text-white/85' : isHome ? (darkMode ? 'text-ink-200' : 'text-[#555b54]') : 'text-ink-600 dark:text-ink-200'}`}>
            {t('nav.roommates')}
          </Link>
          <Link to="/negocios-locales" className={`whitespace-nowrap text-xs font-medium transition hover:text-[#e4b66e] xl:text-sm ${overDarkHero ? 'text-white/85' : isHome ? (darkMode ? 'text-ink-200' : 'text-[#555b54]') : 'text-ink-600 dark:text-ink-200'}`}>
            {t('nav.businesses')}
          </Link>
          <Link to="/publicar" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#477450] px-3 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#385f40] xl:px-5 xl:text-sm">
            <Plus className="h-4 w-4" aria-hidden="true" />{t('nav.publish')}
          </Link>
        </nav>

        <nav aria-label={t('nav.primary')} className="flex items-center gap-2">
          <label className={`hidden h-10 items-center gap-1.5 rounded-full border px-2 sm:inline-flex sm:px-3 ${overDarkHero ? 'border-white/30 bg-white/10 text-white' : isHome ? (darkMode ? 'border-white/20 bg-white/10 text-ink-50' : 'border-[#d9d3c4] bg-white/80 text-[#28352a]') : 'border-cream-300 bg-white text-ink-700 dark:border-white/20 dark:bg-white/10 dark:text-ink-50'}`}>
            <Languages className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="sr-only">{t('language.label')}</span>
            <select
              aria-label={t('language.label')}
              value={locale}
              onChange={(event) => setLocale(event.target.value as Locale)}
              className="max-w-[4rem] cursor-pointer appearance-none bg-transparent text-xs font-semibold outline-none sm:max-w-[5.5rem] sm:text-sm xl:max-w-none"
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
            className={`flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-md transition ${overDarkHero ? 'border-white/30 bg-white/10 text-white hover:bg-white/20' : isHome ? (darkMode ? 'border-white/20 bg-white/10 text-ink-50 shadow-sm hover:bg-white/20' : 'border-[#d9d3c4] bg-white/80 text-[#28352a] shadow-sm hover:bg-white') : 'border-cream-300 bg-white text-ink-700 shadow-sm hover:bg-cream-50 dark:border-white/20 dark:bg-white/10 dark:text-ink-50 dark:hover:bg-white/20'}`}
          >
            {darkMode ? <Sun key="sun" className="theme-icon-enter h-4 w-4" /> : <Moon key="moon" className="theme-icon-enter h-4 w-4" />}
          </button>
          <Link
            to="/apoyar"
            aria-label={t('nav.support')}
            title={t('nav.support')}
            className="motion-ease group inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-rose-300/40 bg-[#d95848] text-white shadow-[0_4px_16px_rgba(117,35,28,0.22)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#c94d40] hover:shadow-[0_8px_22px_rgba(117,35,28,0.28)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1c211a] sm:w-auto sm:gap-1.5 sm:px-3"
          >
            <Heart className="h-4 w-4 fill-current transition-transform duration-300 group-hover:scale-110 group-active:scale-95" />
            <span className="sr-only xl:not-sr-only xl:text-sm xl:font-semibold">{t('nav.supportShort')}</span>
          </Link>
          {fbUser ? (
            <div className="relative hidden sm:block" ref={menuRef}>
              {/* Botón que abre/cierra el menú */}
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="true"
                aria-expanded={menuOpen}
                className={`flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 text-sm backdrop-blur-md transition ${overDarkHero ? 'border-white/30 bg-white/10 text-white hover:bg-white/20' : isHome ? (darkMode ? 'border-white/20 bg-white/10 text-ink-50 shadow-sm hover:bg-white/20' : 'border-[#d9d3c4] bg-white/80 text-[#28352a] shadow-sm hover:bg-white') : 'border-cream-300 bg-white text-ink-700 shadow-sm hover:bg-cream-50 dark:border-white/20 dark:bg-white/10 dark:text-ink-50 dark:hover:bg-white/20'}`}
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
                <span className="hidden 2xl:inline">
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
            ref={mobileMenuTriggerRef}
            onClick={() => setMobileDrawerOpen((open) => !open)}
            aria-label={t('nav.account')}
            aria-expanded={mobileDrawerOpen}
            aria-controls="mobile-navigation-drawer"
            className={`flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-md transition sm:hidden ${overDarkHero ? 'border-white/30 bg-white/10 text-white hover:bg-white/20' : 'border-cream-300 bg-white text-ink-700 shadow-sm hover:bg-cream-50 dark:border-white/20 dark:bg-white/10 dark:text-ink-50 dark:hover:bg-white/20'}`}
          >
            {mobileDrawerOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </nav>
        {isHome && (
          <p className="hidden shrink-0 -rotate-3 font-serif text-[0.9rem] italic leading-tight text-[#243b2b] dark:text-[#f1ca85] 2xl:block">
            Ixmiquilpan<br />también es hogar ♡
          </p>
        )}
      </div>
    </header>
      {createPortal(<div data-open={mobileDrawerOpen} className="mobile-menu-stage pointer-events-none fixed inset-0 z-[49] sm:hidden" aria-hidden={!mobileDrawerOpen}>
        <span aria-hidden="true" className="mobile-menu-depth-tab mobile-menu-depth-tab-front absolute inset-y-8 left-[68vw] w-[16vw]" />
        <aside
          id="mobile-navigation-drawer"
          aria-label={t('nav.primary')}
          inert={!mobileDrawerOpen}
          className={`pointer-events-auto absolute inset-y-0 left-0 z-10 flex w-[min(66vw,21rem)] flex-col overflow-hidden rounded-r-[2rem] bg-[#7eaa9b] text-white shadow-[12px_0_45px_rgba(19,39,31,0.18)] transition-transform duration-[560ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none dark:bg-[#26392f] ${mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="flex items-center gap-3 border-b border-white/20 px-4 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))]">
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

          <label className="mx-3 mt-3 flex items-center justify-between gap-2 rounded-xl bg-white/10 px-3 py-2.5 text-sm">
            <span className="inline-flex items-center gap-2"><Languages className="h-4 w-4" aria-hidden="true" />{t('language.label')}</span>
            <select aria-label={t('language.label')} value={locale} onChange={(event) => setLocale(event.target.value as Locale)} className="max-w-32 rounded-lg border border-white/30 bg-white/95 px-2 py-1.5 text-xs text-ink-700 outline-none focus-visible:ring-2 focus-visible:ring-white">
              <option value="es">{t('language.spanish')}</option>
              <option value="en">{t('language.english')}</option>
              <option value="ote">{t('language.hnahnu')}</option>
            </select>
          </label>

          <nav aria-label={t('nav.primary')} className="mt-3 flex-1 space-y-0.5 overflow-y-auto px-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Link to="/" aria-current={pathname === '/' ? 'page' : undefined} className={mobileNavItemClass('/')}><MapPin className="h-4 w-4" aria-hidden="true" />{t('nav.explore')}</Link>
            {fbUser ? <>
              <Link to="/perfil" aria-current={pathname === '/perfil' ? 'page' : undefined} className={mobileNavItemClass('/perfil')}><Settings className="h-4 w-4" aria-hidden="true" />{t('nav.editProfile')}</Link>
              <Link to="/mis-publicaciones" aria-current={pathname === '/mis-publicaciones' ? 'page' : undefined} className={mobileNavItemClass('/mis-publicaciones')}><Home className="h-4 w-4" aria-hidden="true" />{t('nav.myListings')}</Link>
              <Link to="/favoritos" aria-current={pathname === '/favoritos' ? 'page' : undefined} className={mobileNavItemClass('/favoritos')}><Heart className="h-4 w-4" aria-hidden="true" />{t('nav.favorites')}</Link>
              <Link to="/notificaciones" aria-current={pathname === '/notificaciones' ? 'page' : undefined} className={mobileNavItemClass('/notificaciones')}><Bell className="h-4 w-4" aria-hidden="true" />{t('nav.notifications')}</Link>
              <Link to="/mensajes" aria-current={pathname === '/mensajes' ? 'page' : undefined} className={mobileNavItemClass('/mensajes')}><Mail className="h-4 w-4" aria-hidden="true" />{t('nav.messages')}</Link>
              {profile?.role === 'admin' && <Link to="/admin" aria-current={pathname === '/admin' ? 'page' : undefined} className={mobileNavItemClass('/admin')}><ShieldCheck className="h-4 w-4" aria-hidden="true" />{t('nav.admin')}</Link>}
            </> : <>
              <Link to="/login" aria-current={pathname === '/login' ? 'page' : undefined} className={mobileNavItemClass('/login')}><User className="h-4 w-4" aria-hidden="true" />{t('nav.login')}</Link>
              <Link to="/register" aria-current={pathname === '/register' ? 'page' : undefined} className={mobileNavItemClass('/register')}><Plus className="h-4 w-4" aria-hidden="true" />{t('nav.register')}</Link>
            </>}
            <div className="mx-4 my-3 border-t border-white/25" />
            <button type="button" onClick={toggleTheme} className="flex w-full items-center gap-3 rounded-full px-4 py-3 text-left text-sm text-white/95 transition duration-200 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80">
              {darkMode ? <Sun key="sun" className="theme-icon-enter h-4 w-4" aria-hidden="true" /> : <Moon key="moon" className="theme-icon-enter h-4 w-4" aria-hidden="true" />}
              {darkMode ? t('nav.lightMode') : t('nav.darkMode')}
            </button>
            <Link to="/apoyar" aria-current={pathname === '/apoyar' ? 'page' : undefined} className={mobileNavItemClass('/apoyar')}><Heart className="h-4 w-4 text-rose-100" aria-hidden="true" />{t('nav.supportShort')}</Link>
          {fbUser && <>
              <div className="mx-4 my-3 border-t border-white/25" />
              <button type="button" onClick={() => { closeMobileDrawer(); void logout(); }} className="flex w-full items-center gap-3 rounded-full px-4 py-3 text-left text-sm font-semibold text-white transition duration-200 hover:bg-[#a8493b]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80">
                <LogOut className="h-4 w-4" aria-hidden="true" />{t('nav.logout')}
              </button>
            </>}
          </nav>
        </aside>
      </div>, document.body)}
    </>
  );
}
