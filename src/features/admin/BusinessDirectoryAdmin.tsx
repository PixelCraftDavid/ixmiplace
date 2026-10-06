import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Archive, BadgeCheck, Building2, LoaderCircle, MapPin, Pencil, Plus, Save, Store, Upload } from 'lucide-react';
import { businessAdAdminRequest, businessPackageTotal, BUSINESS_PACKAGE_PRICES, uploadBusinessAdImage, type BusinessAdStatus, type BusinessPackage, type BusinessProfile } from '../../lib/business-ads';

const PACKAGE_NAMES: Record<BusinessPackage, string> = { listing: 'Ficha local', rotating: 'Anuncio rotativo', featured: 'Anuncio destacado' };
type DirectoryForm = Partial<BusinessProfile>;

function blankProfile(): DirectoryForm {
  return {
    businessName: '', category: '', description: '', location: '', mapUrl: '', contactUrl: '', contactLabel: 'Contactar negocio',
    package: 'listing', months: 1, startsAt: Date.now() + 60_000, status: 'draft', paymentStatus: 'unpaid',
    contactName: '', contactPhone: '', contactEmail: '', desktopImageUrl: '', desktopImagePublicId: '',
    mobileImageUrl: '', mobileImagePublicId: '', headline: '', adDescription: '', offerText: '',
    metrics: { profileViews: 0, contactClicks: 0 },
  };
}

function localDateValue(value?: number) {
  if (!value || !Number.isFinite(value)) return '';
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function packageEnd(start: number, months: number) {
  const date = new Date(start);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, last));
  return date.getTime();
}

export function BusinessDirectoryAdmin() {
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [form, setForm] = useState<DirectoryForm>(blankProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'desktop' | 'mobile' | ''>('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(0);
  const packageName = form.package ?? 'listing';
  const months = form.months ?? 1;
  const hasBanner = packageName !== 'listing';
  const total = businessPackageTotal(packageName, months);
  const reserved = businesses.filter((business) => business.status === 'active'
    && business.startsAt <= now && business.endsAt > now && business.package !== 'listing');
  const featuredThisWeek = businesses.some((business) => business.package === 'featured' && ['active', 'scheduled'].includes(business.status)
    && Number(business.featuredStartAt) <= now && Number(business.featuredEndsAt) > now);
  const endEstimate = useMemo(() => form.startsAt ? packageEnd(form.startsAt, months) : 0, [form.startsAt, months]);
  const editMode = Boolean(form.id);

  async function refresh() {
    try {
      const result = await businessAdAdminRequest<{ businesses: BusinessProfile[] }>({ action: 'directoryList' });
      setBusinesses(result.businesses ?? []);
      setNow(Date.now());
      setError('');
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el directorio.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { const timer = window.setTimeout(() => { void refresh(); }, 0); return () => window.clearTimeout(timer); }, []);

  function update<K extends keyof BusinessProfile>(key: K, value: BusinessProfile[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function selectImage(kind: 'desktop' | 'mobile', file?: File) {
    if (!file) return;
    setUploading(kind); setError(''); setNotice('');
    try {
      const image = await uploadBusinessAdImage(file);
      setForm((current) => ({ ...current, [`${kind}ImageUrl`]: image.url, [`${kind}ImagePublicId`]: image.publicId }));
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : 'No se pudo subir la imagen.'); }
    finally { setUploading(''); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    try {
      const startsAt = Number(form.startsAt);
      const packageDate = localDateValue(form.featuredStartAt ?? startsAt);
      await businessAdAdminRequest({
        action: 'directorySave', ...(form.id ? { profileId: form.id } : {}),
        businessName: form.businessName, category: form.category, description: form.description, location: form.location,
        mapUrl: form.mapUrl || '', contactUrl: form.contactUrl, contactLabel: form.contactLabel,
        package: packageName, months, startsAt,
        ...(packageName === 'featured' ? { featuredStartAt: new Date(packageDate).getTime() } : {}),
        status: form.status ?? 'draft', paymentStatus: form.paymentStatus ?? 'unpaid',
        contactName: form.contactName, contactPhone: form.contactPhone, contactEmail: form.contactEmail || '',
        desktopImageUrl: form.desktopImageUrl || '', desktopImagePublicId: form.desktopImagePublicId || '',
        mobileImageUrl: form.mobileImageUrl || '', mobileImagePublicId: form.mobileImagePublicId || '',
        headline: form.headline || '', adDescription: form.adDescription || '', offerText: form.offerText || '',
        consentConfirmed: consent,
      });
      setNotice(`Ficha guardada. Precio calculado: $${total.toLocaleString('es-MX')} MXN por ${months} ${months === 1 ? 'mes' : 'meses'}.`);
      setForm(blankProfile()); setConsent(false); await refresh();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar la ficha.'); }
    finally { setSaving(false); }
  }

  async function archive(business: BusinessProfile) {
    if (!window.confirm(`¿Archivar la ficha de ${business.businessName}? También dejará de aparecer su banner patrocinado.`)) return;
    try {
      await businessAdAdminRequest({ action: 'directoryArchive', profileId: business.id });
      if (form.id === business.id) { setForm(blankProfile()); setConsent(false); }
      setNotice('Ficha archivada y espacio liberado.'); await refresh();
    } catch (archiveError) { setError(archiveError instanceof Error ? archiveError.message : 'No se pudo archivar la ficha.'); }
  }

  return <div className="space-y-6">
    <section className="overflow-hidden rounded-3xl bg-[#203126] p-6 text-white shadow-[0_18px_44px_rgba(25,39,29,.16)] sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-5"><div className="max-w-2xl"><span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-[#f2cb86]"><Building2 className="h-4 w-4"/> DIRECTORIO LOCAL</span><h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Fichas y paquetes comerciales</h2><p className="mt-2 text-sm leading-6 text-white/75">Registra el acuerdo con cada negocio. El precio se calcula aquí con la tarifa y el descuento vigentes; las fechas, el pago y la autorización se validan antes de publicar.</p></div><div className="flex gap-3"><div className="rounded-2xl border border-white/15 bg-white/[.07] px-4 py-3"><p className="text-xs uppercase tracking-wider text-white/65">Anuncios activos hoy</p><p className="mt-1 text-2xl font-bold">{reserved.length}<span className="text-lg text-white/60"> / 10</span></p></div><div className="rounded-2xl border border-white/15 bg-white/[.07] px-4 py-3"><p className="text-xs uppercase tracking-wider text-white/65">Destacado ahora</p><p className="mt-1 text-2xl font-bold">{featuredThisWeek ? 'Ocupado' : 'Disponible'}</p></div></div></div>
      <div className="mt-5 grid gap-2 text-sm sm:grid-cols-3">{(['listing', 'rotating', 'featured'] as const).map((name) => <div key={name} className="rounded-2xl border border-white/10 bg-black/10 p-3"><p className="font-semibold">{PACKAGE_NAMES[name]}</p><p className="mt-1 text-[#f2cb86]">${BUSINESS_PACKAGE_PRICES[name]} MXN / mes</p></div>)}</div>
      <p className="mt-3 text-xs text-white/65">3 meses: 10% menos · 6 meses: 15% menos. Redondeo al peso más cercano. La campaña destacada reserva un único espacio semanal.</p>
    </section>

    {(error || notice) && <p role={error ? 'alert' : 'status'} className={`rounded-2xl border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{error || notice}</p>}

    <section id="business-directory-form" className="scroll-mt-24 rounded-3xl border border-[#e6dfcf] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#242a22] sm:p-7">
      <div className="mb-6 flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-widest text-[#477450] dark:text-[#c4d5bd]">{editMode ? 'Editar ficha local' : 'Nueva ficha local'}</p><h2 className="mt-1 text-xl font-bold">Información del negocio</h2></div>{!editMode && <button type="button" onClick={() => { setForm(blankProfile()); setConsent(false); setError(''); }} className="inline-flex items-center gap-2 rounded-xl border border-[#d9d1bd] px-3 py-2 text-sm font-semibold"><Plus className="h-4 w-4"/>Limpiar</button>}</div>
      <form onSubmit={(event) => void submit(event)} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Nombre del negocio"><input required maxLength={80} value={form.businessName ?? ''} onChange={(event) => update('businessName', event.target.value)} /></Field>
          <Field label="Categoría"><input required maxLength={40} placeholder="Café, comida, servicios…" value={form.category ?? ''} onChange={(event) => update('category', event.target.value)} /></Field>
          <Field label="Colonia o zona"><input required maxLength={120} placeholder="Centro, El Fitzhi…" value={form.location ?? ''} onChange={(event) => update('location', event.target.value)} /></Field>
          <Field label="Ubicación en mapa (opcional)"><input type="url" placeholder="https://maps.google.com/…" value={form.mapUrl ?? ''} onChange={(event) => update('mapUrl', event.target.value)} /></Field>
          <Field label="Enlace de contacto"><input required type="url" placeholder="https://wa.me/… o sitio del negocio" value={form.contactUrl ?? ''} onChange={(event) => update('contactUrl', event.target.value)} /></Field>
          <Field label="Texto del botón"><input required maxLength={32} value={form.contactLabel ?? ''} onChange={(event) => update('contactLabel', event.target.value)} /></Field>
          <div className="sm:col-span-2 lg:col-span-3"><Field label="Descripción breve"><textarea required minLength={10} maxLength={320} rows={3} value={form.description ?? ''} onChange={(event) => update('description', event.target.value)} /></Field></div>
        </div>

        <div className="rounded-2xl border border-[#e6dfcf] bg-[#fbfaf6] p-4 dark:border-white/10 dark:bg-white/[.03]">
          <h3 className="font-bold">Paquete y vigencia</h3><p className="mt-1 text-xs text-[#72776f] dark:text-white/55">El importe lo calcula el servidor; no se puede editar manualmente.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Paquete"><select value={packageName} onChange={(event) => update('package', event.target.value as BusinessPackage)}><option value="listing">Ficha local · ${BUSINESS_PACKAGE_PRICES.listing} / mes</option><option value="rotating">Anuncio rotativo · ${BUSINESS_PACKAGE_PRICES.rotating} / mes</option><option value="featured">Anuncio destacado · ${BUSINESS_PACKAGE_PRICES.featured} / mes</option></select></Field>
            <Field label="Permanencia"><select value={months} onChange={(event) => update('months', Number(event.target.value) as 1 | 3 | 6)}><option value={1}>1 mes · precio normal</option><option value={3}>3 meses · 10% de descuento</option><option value={6}>6 meses · 15% de descuento</option></select></Field>
            <Field label="Inicio"><input required type="datetime-local" value={localDateValue(form.startsAt)} onChange={(event) => update('startsAt', new Date(event.target.value).getTime())} /></Field>
            <div className="rounded-xl border border-[#e6dfcf] bg-white px-3.5 py-3 dark:border-white/10 dark:bg-white/5"><p className="text-sm font-semibold">Total del acuerdo</p><p className="mt-1 text-xl font-bold text-[#365b43] dark:text-[#c4d5bd]">${total.toLocaleString('es-MX')} MXN</p><p className="mt-1 text-xs text-[#72776f] dark:text-white/55">Termina el {endEstimate ? new Date(endEstimate).toLocaleDateString('es-MX') : '—'}</p></div>
            <Field label="Estado"><select value={form.status ?? 'draft'} onChange={(event) => update('status', event.target.value as BusinessAdStatus)}><option value="draft">Borrador</option><option value="scheduled">Programado</option><option value="active">Activo</option><option value="paused">Pausado</option></select></Field>
            <Field label="Pago"><select value={form.paymentStatus ?? 'unpaid'} onChange={(event) => update('paymentStatus', event.target.value as BusinessProfile['paymentStatus'])}><option value="unpaid">Pendiente</option><option value="paid">Pagado</option><option value="complimentary">Cortesía</option></select></Field>
            {packageName === 'featured' && <Field label="Inicio de la semana destacada"><input required type="datetime-local" min={localDateValue(form.startsAt)} max={localDateValue(endEstimate - 7 * 24 * 60 * 60 * 1000)} value={localDateValue(form.featuredStartAt ?? form.startsAt)} onChange={(event) => update('featuredStartAt', new Date(event.target.value).getTime())} /></Field>}
          </div>
        </div>

        {hasBanner && <div className="space-y-4 rounded-2xl border border-[#e6dfcf] p-4 dark:border-white/10"><div><h3 className="font-bold">Creatividad del anuncio rotativo</h3><p className="mt-1 text-xs text-[#72776f] dark:text-white/55">Este banner aparecerá en el carrusel de inicio. Se requiere una imagen para escritorio y otra para celular.</p></div><div className="grid gap-4 lg:grid-cols-2"><ImageUpload title="Banner de escritorio" detail="5120 × 1080 px recomendado · JPG, PNG o WebP · máximo 5 MB" src={form.desktopImageUrl} busy={uploading === 'desktop'} onFile={(file) => void selectImage('desktop', file)} /><ImageUpload title="Imagen para celular" detail="Vertical o cuadrada · JPG, PNG o WebP · máximo 5 MB" src={form.mobileImageUrl} busy={uploading === 'mobile'} onFile={(file) => void selectImage('mobile', file)} /></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Título del anuncio"><input required maxLength={80} value={form.headline ?? ''} onChange={(event) => update('headline', event.target.value)} /></Field><Field label="Promoción (opcional)"><input maxLength={160} value={form.offerText ?? ''} onChange={(event) => update('offerText', event.target.value)} /></Field><div className="sm:col-span-2"><Field label="Descripción del anuncio"><textarea required minLength={10} maxLength={320} rows={2} value={form.adDescription ?? ''} onChange={(event) => update('adDescription', event.target.value)} /></Field></div></div></div>}

        <div className="grid gap-4 sm:grid-cols-3"><Field label="Persona de contacto"><input required maxLength={80} value={form.contactName ?? ''} onChange={(event) => update('contactName', event.target.value)} /></Field><Field label="Teléfono privado de contacto"><input required type="tel" maxLength={24} value={form.contactPhone ?? ''} onChange={(event) => update('contactPhone', event.target.value)} /></Field><Field label="Correo privado (opcional)"><input type="email" maxLength={160} value={form.contactEmail ?? ''} onChange={(event) => update('contactEmail', event.target.value)} /></Field></div>
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#e6dfcf] bg-[#fbfaf6] p-4 text-sm leading-5 text-[#485047] dark:border-white/10 dark:bg-white/[.03] dark:text-white/75"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required className="mt-0.5 h-4 w-4 accent-[#52634a]"/><span>Confirmo que el negocio autorizó publicar su descripción, ubicación, enlace e imágenes incluidas, y que acordamos el paquete, las fechas y el precio indicados.</span></label>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">{editMode && <button type="button" onClick={() => { setForm(blankProfile()); setConsent(false); }} className="rounded-xl border border-[#d9d1bd] px-5 py-3 text-sm font-semibold">Cancelar edición</button>}<button type="submit" disabled={saving || Boolean(uploading)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#426b4d] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#34583f] disabled:cursor-not-allowed disabled:opacity-60">{saving ? <LoaderCircle className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}{saving ? 'Guardando…' : editMode ? 'Guardar ficha' : 'Crear ficha local'}</button></div>
      </form>
    </section>

    <section className="rounded-3xl border border-[#e6dfcf] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#242a22] sm:p-7">
      <div className="mb-5 flex items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Fichas registradas</h2><p className="mt-1 text-sm text-[#72776f] dark:text-white/55">Contacto privado, importe acordado y métricas agregadas solo aparecen aquí.</p></div><button type="button" onClick={() => void refresh()} className="rounded-xl border border-[#d9d1bd] px-3 py-2 text-sm font-semibold">Actualizar</button></div>
      {loading ? <p className="flex items-center gap-2 py-8 text-sm text-[#72776f]"><LoaderCircle className="h-4 w-4 animate-spin"/>Cargando fichas…</p> : businesses.length === 0 ? <div className="rounded-2xl border border-dashed border-[#d9d1bd] px-5 py-10 text-center"><Building2 className="mx-auto h-8 w-8 text-[#879083]"/><p className="mt-3 font-semibold">Aún no hay fichas locales</p><p className="mt-1 text-sm text-[#72776f]">Cuando acuerdes el primer paquete, regístralo aquí.</p></div> : <div className="space-y-3">{businesses.map((business) => <article key={business.id} className="grid gap-4 rounded-2xl border border-[#e6dfcf] p-4 dark:border-white/10 md:grid-cols-[8rem_1fr_auto] md:items-center"><div className="flex aspect-[16/8] items-center justify-center overflow-hidden rounded-xl bg-[#edf0e8] dark:bg-white/5">{business.desktopImageUrl ? <img src={business.desktopImageUrl} alt="" className="h-full w-full object-cover"/> : <Store className="h-8 w-8 text-[#658069]"/>}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#edf0e8] px-2.5 py-1 text-xs font-semibold text-[#344b37] dark:bg-white/10 dark:text-[#c4d5bd]">{business.status === 'active' ? 'Activo' : business.status === 'scheduled' ? 'Programado' : business.status === 'paused' ? 'Pausado' : business.status === 'archived' ? 'Archivado' : 'Borrador'}</span><span className="text-xs text-[#72776f]">{PACKAGE_NAMES[business.package]} · {business.months} {business.months === 1 ? 'mes' : 'meses'}</span><span className="text-xs text-[#72776f]">{new Date(business.startsAt).toLocaleDateString('es-MX')} – {new Date(business.endsAt).toLocaleDateString('es-MX')}</span></div><h3 className="mt-2 truncate font-bold">{business.businessName} · {business.category}</h3><p className="mt-1 flex items-center gap-1 truncate text-sm text-[#72776f]"><MapPin className="h-3.5 w-3.5 shrink-0"/>{business.location}, Ixmiquilpan</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#536052]"><span>${business.agreedPriceMxn.toLocaleString('es-MX')} MXN · {business.paymentStatus === 'paid' ? 'Pagado' : business.paymentStatus === 'complimentary' ? 'Cortesía' : 'Pendiente'}</span><span>{business.metrics?.profileViews ?? 0} impresiones de ficha</span><span>{business.metrics?.contactClicks ?? 0} clics en contacto</span>{business.package !== 'listing' && <><span>{business.adMetrics?.impressions ?? 0} impresiones del banner</span><span>{business.adMetrics?.clicks ?? 0} clics en el banner</span></>}</div></div><div className="flex gap-2 md:flex-col"><button type="button" onClick={() => { setForm({ ...business }); setConsent(false); setError(''); setNotice(''); document.getElementById('business-directory-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#d9d1bd] px-3 py-2 text-sm font-semibold"><Pencil className="h-4 w-4"/>Editar</button>{business.status !== 'archived' && <button type="button" onClick={() => void archive(business)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700"><Archive className="h-4 w-4"/>Archivar</button>}</div></article>)}</div>}
    </section>
  </div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-sm font-semibold text-[#343c33] dark:text-white/85">{label}<span className="mt-1.5 block [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-[#d9d1bd] [&_input]:bg-[#fbfaf6] [&_input]:px-3.5 [&_input]:py-3 [&_input]:text-sm [&_input]:font-normal [&_input]:text-[#202820] [&_input]:outline-none [&_input]:focus:border-[#477450] [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-[#d9d1bd] [&_textarea]:bg-[#fbfaf6] [&_textarea]:px-3.5 [&_textarea]:py-3 [&_textarea]:text-sm [&_textarea]:font-normal [&_textarea]:text-[#202820] [&_textarea]:outline-none [&_textarea]:focus:border-[#477450] [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-[#d9d1bd] [&_select]:bg-[#fbfaf6] [&_select]:px-3.5 [&_select]:py-3 [&_select]:text-sm [&_select]:font-normal [&_select]:text-[#202820] [&_select]:outline-none">{children}</span></label>;
}

function ImageUpload({ title, detail, src, busy, onFile }: { title: string; detail: string; src?: string; busy: boolean; onFile: (file?: File) => void }) {
  return <div className="rounded-2xl border border-[#e6dfcf] bg-[#fbfaf6] p-4 dark:border-white/10 dark:bg-white/[.03]"><div className="mb-3"><h4 className="font-bold">{title}</h4><p className="mt-1 text-xs leading-5 text-[#72776f] dark:text-white/55">{detail}</p></div>{src ? <img src={src} alt={`Vista previa: ${title}`} className="mb-3 h-32 w-full rounded-xl bg-[#e8e2d5] object-cover"/> : <div className="mb-3 flex h-32 items-center justify-center rounded-xl border border-dashed border-[#d9d1bd] bg-white text-[#879083]"><BadgeCheck className="h-7 w-7"/></div>}<label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#d9d1bd] bg-white px-4 py-2.5 text-sm font-semibold text-[#344137] hover:bg-[#f3f0e8]"><Upload className="h-4 w-4"/>{busy ? 'Subiendo…' : src ? 'Cambiar imagen' : 'Elegir imagen'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} className="sr-only" onChange={(event) => { onFile(event.target.files?.[0]); event.currentTarget.value = ''; }}/></label></div>;
}
