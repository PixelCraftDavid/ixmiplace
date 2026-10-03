import type { ReactNode } from 'react';
import { ArrowUpRight, MapPin } from 'lucide-react';
import { HouseScene } from '@/components/three/HouseScene';

interface AuthLayoutProps {
  eyebrow: string;
  title: string;
  description: string;
  visualTitle: string;
  visualDescription: string;
  children: ReactNode;
}

export function AuthLayout({
  eyebrow,
  title,
  description,
  visualTitle,
  visualDescription,
  children,
}: AuthLayoutProps) {
  return (
    <main className="auth-layout relative isolate grid min-h-[100svh] overflow-hidden bg-[#f4f1e9] pt-20 dark:bg-[#1c211a] lg:grid-cols-[minmax(440px,0.92fr)_minmax(0,1.08fr)]">
      <section className="flex items-center justify-center px-5 py-10 sm:px-10 sm:py-14 lg:px-12 xl:px-20">
        <div className="auth-form-enter w-full max-w-[440px]">
          <LinkBrand />
          <div className="mb-8 mt-10 sm:mt-12">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-700 dark:text-brand-200">
              {eyebrow}
            </p>
            <h1 className="text-3xl font-semibold leading-tight tracking-[-0.045em] text-ink-800 dark:text-white sm:text-[2.65rem]">
              {title}
            </h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-ink-500 dark:text-ink-300 sm:text-base">
              {description}
            </p>
          </div>
          {children}
        </div>
      </section>

      <aside className="auth-visual relative hidden min-h-[620px] overflow-hidden lg:block">
        <div className="auth-sun pointer-events-none absolute right-[24%] top-[18%] z-0 h-24 w-24 rounded-full" aria-hidden="true" />
        <div className="auth-visual-wash pointer-events-none absolute inset-0 z-[1]" aria-hidden="true" />
        <div className="absolute inset-0 z-[2]">
          <HouseScene />
        </div>
        <div className="absolute left-10 top-28 z-10 inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/25 px-3 py-2 text-xs font-medium text-ink-800 shadow-sm backdrop-blur-md dark:border-white/15 dark:bg-black/20 dark:text-white/85 xl:left-14">
          <MapPin className="h-3.5 w-3.5 text-[#e7bd79]" aria-hidden="true" />
          Ixmiquilpan, Hidalgo
        </div>
        <div className="absolute inset-x-0 bottom-0 z-10 p-10 xl:p-14">
          <div className="max-w-xl border-l border-[#9a692d]/70 pl-5 dark:border-[#e7bd79]/70 xl:pl-7">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#78521f] dark:text-[#e7bd79]">
              Un espacio para encontrar
            </p>
            <h2 className="max-w-lg text-3xl font-semibold leading-tight tracking-[-0.04em] text-[#203528] dark:text-white xl:text-4xl">
              {visualTitle}
            </h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-[#34473b] dark:text-white/75 xl:text-base">
              {visualDescription}
            </p>
          </div>
        </div>
      </aside>
    </main>
  );
}

function LinkBrand() {
  return (
    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-500 dark:text-ink-300">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#344a36] text-[#f4e9d3] shadow-sm dark:bg-[#d49a4a] dark:text-[#1c211a]">
        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
      </span>
      IxmiPlace <span className="text-ink-400/70">/</span> Vivienda local
    </div>
  );
}
