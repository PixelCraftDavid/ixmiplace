import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Heart, Home, ChevronDown, User, ShieldCheck, Bell, Moon, Sun, Mail, Settings } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/features/auth/AuthContext';
import { listenForForegroundPush } from '@/lib/push-notifications';

export function Navbar() {
  const { fbUser, profile } = useAuth();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const overDarkHero = pathname === '/';
  const [menuOpen, setMenuOpen] = useState(false);
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

  function toggleTheme() {
    const nextDarkMode = !darkMode;
    setDarkMode(nextDarkMode);
    document.documentElement.classList.toggle('dark', nextDarkMode);
    localStorage.setItem('ixmiplace:theme', nextDarkMode ? 'dark' : 'light');
  }

  return (
    <header className={`absolute inset-x-0 top-0 z-40 ${overDarkHero ? 'bg-transparent' : 'border-b border-cream-200 bg-cream/95 shadow-sm backdrop-blur-xl dark:border-[#4b5847] dark:bg-[#1c211a]/95'}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className={`text-xl font-extrabold ${overDarkHero ? 'text-white drop-shadow-md' : 'text-ink-700 dark:text-ink-50'}`}>
          Ixmi<span className={overDarkHero ? 'text-brand-400' : 'text-brand-600 dark:text-brand-300'}>Place</span>
        </Link>

        <nav aria-label="Navegación principal" className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={darkMode ? 'Activar modo claro' : 'Activar modo oscuro'}
            title={darkMode ? 'Modo claro' : 'Modo oscuro'}
            className={`flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-md transition ${overDarkHero ? 'border-white/30 bg-white/10 text-white hover:bg-white/20' : 'border-cream-300 bg-white text-ink-700 shadow-sm hover:bg-cream-50 dark:border-white/20 dark:bg-white/10 dark:text-ink-50 dark:hover:bg-white/20'}`}
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <Link
            to="/apoyar"
            aria-label="Apoyar a IxmiPlace"
            title="Apoyar a IxmiPlace"
            className="motion-ease group inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-rose-300/40 bg-[#d95848] text-white shadow-[0_4px_16px_rgba(117,35,28,0.22)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#c94d40] hover:shadow-[0_8px_22px_rgba(117,35,28,0.28)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1c211a] sm:w-auto sm:gap-1.5 sm:px-3"
          >
            <Heart className="h-4 w-4 fill-current transition-transform duration-300 group-hover:scale-110 group-active:scale-95" />
            <span className="hidden text-sm font-semibold sm:inline">Apoyar</span>
          </Link>
          {fbUser ? (
            <div className="relative" ref={menuRef}>
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
                  className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl
                             border border-cream-200 bg-white py-2 shadow-xl"
                >
                  <div className="border-b border-cream-100 px-4 py-2">
                    <p className="truncate text-sm font-semibold text-ink">
                      {profile?.displayName ?? 'Usuario'}
                    </p>
                    <p className="truncate text-xs text-ink-400">{fbUser.email}</p>
                  </div>

                  <Link
                    to="/perfil"
                    onClick={closeMenu}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-600 transition hover:bg-cream-100"
                  >
                    <Settings className="h-4 w-4 text-ink-400" />
                    Editar perfil
                  </Link>

                  <Link
                    to="/mis-publicaciones"
                    onClick={closeMenu}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm
                               text-ink-600 transition hover:bg-cream-100"
                  >
                    <Home className="h-4 w-4 text-ink-400" />
                    Mis publicaciones
                  </Link>

                  <Link
                    to="/favoritos"
                    onClick={closeMenu}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm
                               text-ink-600 transition hover:bg-cream-100"
                  >
                    <Heart className="h-4 w-4 text-ink-400" />
                    Mis favoritos
                  </Link>

                  <Link
                    to="/notificaciones"
                    onClick={closeMenu}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-600 transition hover:bg-cream-100"
                  >
                    <Bell className="h-4 w-4 text-ink-400" />
                    Notificaciones
                  </Link>

                  <Link
                    to="/mensajes"
                    onClick={closeMenu}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-600 transition hover:bg-cream-100"
                  >
                    <Mail className="h-4 w-4 text-ink-400" />
                    Mensajes
                  </Link>

                  {profile?.role === 'admin' && (
                    <Link
                      to="/admin"
                      onClick={closeMenu}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm
                                 text-ink-600 transition hover:bg-cream-100"
                    >
                      <ShieldCheck className="h-4 w-4 text-ink-400" />
                      Panel de administrador
                    </Link>
                  )}

                  <div className="my-1 border-t border-cream-100" />

                  <button
                    type="button"
                    onClick={() => {
                      closeMenu();
                      logout();
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left
                               text-sm text-red-600 transition hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Salir
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className={`text-sm ${overDarkHero ? 'text-white' : 'text-ink-700 dark:text-ink-50'} hover:underline`}>
                Entrar
              </Link>
              <Link
                to="/register"
                className="motion-ease rounded-full border border-[#e4cfaa] bg-[#f4e9d3] px-4 py-2 text-sm font-semibold text-[#263629] shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-[#d49a4a] hover:bg-white active:translate-y-0 dark:border-[#d49a4a]/50 dark:bg-[#d49a4a] dark:text-[#1c211a] dark:hover:bg-[#e4b66e]"
              >
                Registrarse
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
