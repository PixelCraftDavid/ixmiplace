import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Heart, Home, ChevronDown, User, ShieldCheck, Bell, Moon, Sun, Mail } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/features/auth/AuthContext';

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
                className="rounded-full bg-white px-4 py-1.5
                           text-sm font-semibold text-gray-900
                           hover:bg-gray-100"
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
