import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Store } from 'lucide-react';

import { recordBusinessAdMetric, type PublicBusinessAd } from '../../lib/business-ads';

const MARQUEE_SPEED_PX_PER_SECOND = 58;
const MIN_MARQUEE_CYCLE_SECONDS = 20;

interface BusinessAdMarqueeProps {
  ads: PublicBusinessAd[];
  locale: string;
}

function markImpression(adId: string, seenThisMount: Set<string>) {
  if (seenThisMount.has(adId)) return;
  const key = `ixmiplace:business-ad-seen:${adId}`;
  try {
    if (sessionStorage.getItem(key)) {
      seenThisMount.add(adId);
      return;
    }
    sessionStorage.setItem(key, '1');
  } catch { /* La sesión en memoria evita repetir la métrica si el almacenamiento está bloqueado. */ }
  seenThisMount.add(adId);
  void recordBusinessAdMetric(adId, 'impressions');
}

export function BusinessAdMarquee({ ads, locale }: BusinessAdMarqueeProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const firstRunRef = useRef<HTMLDivElement>(null);
  const seenImpressionsRef = useRef(new Set<string>());
  const pointerActivatedRef = useRef(false);
  const [copiesPerGroup, setCopiesPerGroup] = useState(1);
  const [durationSeconds, setDurationSeconds] = useState(30);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [focusedCard, setFocusedCard] = useState<string | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const activeCard = hoveredCard ?? focusedCard;

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener('change', updatePreference);
    return () => mediaQuery.removeEventListener('change', updatePreference);
  }, []);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const group = groupRef.current;
    const firstRun = firstRunRef.current;
    if (!viewport || !group || !firstRun) return;
    if (prefersReducedMotion) {
      setCopiesPerGroup(1);
      return;
    }

    const updateMeasurements = () => {
      viewport.style.setProperty('--business-ad-card-width', `${viewport.clientWidth}px`);
      const runWidth = firstRun.getBoundingClientRect().width;
      if (!runWidth) return;
      const gap = Number.parseFloat(window.getComputedStyle(group).columnGap) || 0;
      const stride = runWidth + gap;
      const neededCopies = Math.max(1, Math.ceil(viewport.clientWidth / stride));
      setCopiesPerGroup((current) => current === neededCopies ? current : neededCopies);
      const groupWidth = group.scrollWidth || stride * neededCopies;
      setDurationSeconds(Math.max(MIN_MARQUEE_CYCLE_SECONDS, groupWidth / MARQUEE_SPEED_PX_PER_SECOND));
    };

    updateMeasurements();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateMeasurements);
      return () => window.removeEventListener('resize', updateMeasurements);
    }
    const observer = new ResizeObserver(updateMeasurements);
    observer.observe(viewport);
    observer.observe(firstRun);
    observer.observe(group);
    return () => observer.disconnect();
  }, [ads.length, copiesPerGroup, prefersReducedMotion]);

  useEffect(() => {
    const firstRun = firstRunRef.current;
    if (!firstRun || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.5) continue;
        const adId = (entry.target as HTMLElement).dataset.adId;
        if (adId) markImpression(adId, seenImpressionsRef.current);
      }
    }, { threshold: 0.5 });
    firstRun.querySelectorAll<HTMLElement>('[data-ad-impression]').forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [ads]);

  const groupCopies = prefersReducedMotion ? 1 : copiesPerGroup;
  const renderGroup = (groupIndex: number) => (
    <div
      key={groupIndex}
      ref={groupIndex === 0 ? groupRef : undefined}
      className="business-ad-marquee-group"
      aria-hidden={groupIndex > 0 || undefined}
    >
      {Array.from({ length: groupCopies }, (_, runIndex) => (
        <div
          key={`${groupIndex}-${runIndex}`}
          ref={groupIndex === 0 && runIndex === 0 ? firstRunRef : undefined}
          className="business-ad-marquee-run"
        >
          {ads.map((ad) => {
            const cardKey = `${groupIndex}-${runIndex}-${ad.id}`;
            const isAccessibleCopy = groupIndex === 0 && runIndex === 0;
            const popupVisible = activeCard === cardKey;
            return (
              <article
                key={cardKey}
                data-ad-impression={isAccessibleCopy ? '' : undefined}
                data-ad-id={isAccessibleCopy ? ad.id : undefined}
                data-ad-card=""
                aria-label={`${ad.businessName}: ${ad.headline}`}
                aria-roledescription={locale === 'en' ? 'advertisement' : 'anuncio'}
                aria-hidden={isAccessibleCopy ? undefined : true}
                tabIndex={isAccessibleCopy ? 0 : -1}
                onPointerEnter={(event) => {
                  if (event.pointerType !== 'touch') setHoveredCard(cardKey);
                }}
                onPointerLeave={(event) => {
                  if (event.pointerType !== 'touch') setHoveredCard(null);
                }}
                onPointerDown={() => {
                  pointerActivatedRef.current = true;
                  window.setTimeout(() => { pointerActivatedRef.current = false; }, 0);
                }}
                onFocusCapture={() => {
                  if (!pointerActivatedRef.current) setFocusedCard(cardKey);
                }}
                onBlurCapture={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusedCard(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setFocusedCard(null);
                  }
                }}
                className="business-ad-marquee-card"
              >
                <picture className="absolute inset-0 overflow-hidden rounded-[inherit]">
                  <source media="(max-width: 767px)" srcSet={ad.mobileImageUrl} />
                  <img
                    src={ad.desktopImageUrl}
                    alt={isAccessibleCopy ? `${ad.businessName}: ${ad.headline}` : ''}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </picture>
                <span className="business-ad-marquee-sponsored"><Store aria-hidden="true" />{locale === 'en' ? 'Sponsored' : 'Patrocinado'}</span>
                <div className={`business-ad-marquee-popup${popupVisible ? ' is-visible' : ''}`} aria-hidden={!popupVisible}>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#f1ca85]">{ad.businessName} · {ad.category}</p>
                  <h3 className="mt-2 text-xl font-bold leading-tight tracking-tight text-white">{ad.headline}</h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-5 text-white/85">{ad.description}</p>
                  {ad.offerText && <p className="mt-3 w-fit max-w-full rounded-full bg-[#e4b66e] px-3 py-1.5 text-xs font-bold text-[#263629]">{ad.offerText}</p>}
                  <a
                    href={ad.ctaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    tabIndex={popupVisible && isAccessibleCopy ? 0 : -1}
                    onClick={() => void recordBusinessAdMetric(ad.id, 'clicks')}
                    className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-[#203126] shadow-lg transition hover:bg-[#f1ca85] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f1ca85]"
                  >
                    {ad.ctaLabel}<span aria-hidden="true">→</span>
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      ))}
    </div>
  );

  return (
    <div
      ref={viewportRef}
      className={`business-ad-marquee-viewport${prefersReducedMotion ? ' is-static' : ''}${hoveredCard ? ' is-hover-paused' : ''}${focusedCard ? ' is-focus-paused' : ''}`}
      role="region"
      tabIndex={prefersReducedMotion ? 0 : undefined}
      aria-label={locale === 'en' ? 'Local business advertisements' : 'Anuncios de negocios locales'}
    >
      <div
        className="business-ad-marquee-track"
        data-reduced-motion={prefersReducedMotion}
        style={{
          '--business-ad-marquee-duration': `${durationSeconds}s`,
        } as CSSProperties}
      >
        {renderGroup(0)}
        {!prefersReducedMotion && renderGroup(1)}
      </div>
    </div>
  );
}
