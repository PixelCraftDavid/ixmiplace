import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Archive, BarChart3, ImagePlus, LoaderCircle, Megaphone, Pencil, Plus, ShieldCheck, Upload } from 'lucide-react';
import { businessAdAdminRequest, uploadBusinessAdImage, type BusinessAd, type BusinessAdStatus } from '../../lib/business-ads';

const blank = (): Partial<BusinessAd> => ({
  businessName: '', category: '', headline: '', description: '', offerText: '', ctaLabel: 'Conocer negocio', ctaUrl: '',
  desktopImageUrl: '', desktopImagePublicId: '', mobileImageUrl: '', mobileImagePublicId: '',
  startsAt: Date.now() + 60_000, endsAt: Date.now() + 30 * 86_400_000, status: 'draft',
  contactName: '', contactPhone: '', contactEmail: '', agreedPriceMxn: 0, paymentStatus: 'unpaid', metrics: { impressions: 0, clicks: 0 },
});

const localDateValue = (value?: number) => {
  if (!value || !Number.isFinite(value)) return '';
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

function statusName(status: BusinessAdStatus) {
  return ({ draft: 'Borrador', scheduled: 'Programado', active: 'Activo', paused: 'Pausado', archived: 'Archivado' })[status];
}

export function BusinessAdsAdmin() {
  const [ads, setAds] = useState<BusinessAd[]>([]);
  const [form, setForm] = useState<Partial<BusinessAd>>(blank());
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'desktop' | 'mobile' | ''>('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function refresh() {
    try {
      const result = await businessAdAdminRequest<{ ads: BusinessAd[] }>({ action: 'list' });
      setAds(result.ads ?? []);
      setNow(Date.now());
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar las campañas.');
    } finally { setLoading(false); }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function update<K extends keyof BusinessAd>(key: K, value: BusinessAd[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function selectImage(kind: 'desktop' | 'mobile', file?: File) {
    if (!file) return;
    setUploading(kind); setError(''); setNotice('');
    try {
      const image = await uploadBusinessAdImage(file);
      setForm((current) => ({ ...current, [`${kind}ImageUrl`]: image.url, [`${kind}ImagePublicId`]: image.publicId }));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'No se pudo subir la imagen.');
    } finally { setUploading(''); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    try {
      const start = Number(form.startsAt);
      const end = Number(form.endsAt);
      await businessAdAdminRequest({
        action: 'save', ...(form.id ? { adId: form.id } : {}),
        businessName: form.businessName, category: form.category, headline: form.headline,
        description: form.description, offerText: form.offerText || '', ctaLabel: form.ctaLabel,
        ctaUrl: form.ctaUrl, desktopImageUrl: form.desktopImageUrl, desktopImagePublicId: form.desktopImagePublicId,
        mobileImageUrl: form.mobileImageUrl, mobileImagePublicId: form.mobileImagePublicId,
        startsAt: start, endsAt: end, status: form.status,
        contactName: form.contactName, contactPhone: form.contactPhone, contactEmail: form.contactEmail || '',
        agreedPriceMxn: Number(form.agreedPriceMxn), paymentStatus: form.paymentStatus, consentConfirmed: consent,
      });
      setNotice('Campaña guardada. La portada mostrará los anuncios dentro de su periodo activo.');
      setForm(blank()); setConsent(false); await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar la campaña.');
    } finally { setSaving(false); }
  }

  function edit(ad: BusinessAd) {
    setForm({ ...ad }); setConsent(false); setNotice(''); setError('');
    document.getElementById('business-ad-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function archive(ad: BusinessAd) {
    if (!window.confirm(`¿Archivar el anuncio de ${ad.businessName}?`)) return;
    setError(''); setNotice('');
    try {
      await businessAdAdminRequest({ action: 'archive', adId: ad.id });
      setNotice('Anuncio archivado; su espacio quedó disponible.'); await refresh();
      if (form.id === ad.id) setForm(blank());
    } catch (archiveError) { setError(archiveError instanceof Error ? archiveError.message : 'No se pudo archivar.'); }
  }

  const activeCount = ads.filter((ad) => ['active', 'scheduled'].includes(ad.status) && ad.endsAt > now).length;
  const editMode = Boolean(form.id);

  return <div className="space-y-6">
    <section className="overflow-hidden rounded-3xl bg-[#203126] p-6 text-white shadow-[0_18px_44px_rgba(25,39,29,.16)] sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="max-w-2xl"><span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-[#f2cb86]"><Megaphone className="h-4 w-4"/> PUBLICIDAD LOCAL</span>
          <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Anuncios de negocios de Ixmiquilpan</h2>
          <p className="mt-2 text-sm leading-6 text-white/75">Administra las campañas, las dos imágenes por formato y su alcance agregado. Cada negocio puede ocupar un espacio durante sus fechas contratadas.</p>
        </div>
        <div className="rounded-2xl border border-white/15 bg-white/[.07] px-5 py-4"><p className="text-xs uppercase tracking-wider text-white/65">Espacios ocupados</p><p className="mt-1 text-3xl font-bold">{activeCount}<span className="text-lg text-white/60"> / 10</span></p></div>
      </div>
      <div className="mt-6 flex items-start gap-2 rounded-xl border border-white/10 bg-black/10 p-3 text-xs leading-5 text-white/70"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#f2cb86]"/>Las métricas son conteos aproximados de cargas visibles y clics. Se limitan por dispositivo de red y día para reducir automatizaciones; no identifican visitantes como personas únicas.</div>
    </section>

    {(error || notice) && <p role={error ? 'alert' : 'status'} className={`rounded-2xl border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{error || notice}</p>}

    <section id="business-ad-form" className="scroll-mt-24 rounded-3xl border border-cream-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="mb-6 flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-widest text-brand-700">{editMode ? 'Editar campaña' : 'Nueva campaña'}</p><h2 className="mt-1 text-xl font-bold text-ink-900">Información y creatividad</h2></div>{!editMode && <button type="button" onClick={() => { setForm(blank()); setError(''); }} className="inline-flex items-center gap-2 rounded-xl border border-cream-300 px-3 py-2 text-sm font-semibold text-ink-700"><Plus className="h-4 w-4"/>Limpiar</button>}</div>
      <form onSubmit={(event) => void submit(event)} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre del negocio"><input required maxLength={80} value={form.businessName ?? ''} onChange={(e) => update('businessName', e.target.value)} /></Field>
          <Field label="Categoría"><input required maxLength={40} placeholder="Café, comida, servicios…" value={form.category ?? ''} onChange={(e) => update('category', e.target.value)} /></Field>
          <Field label="Título del anuncio"><input required minLength={4} maxLength={80} value={form.headline ?? ''} onChange={(e) => update('headline', e.target.value)} /></Field>
          <Field label="Texto de promoción (opcional)"><input maxLength={160} value={form.offerText ?? ''} onChange={(e) => update('offerText', e.target.value)} /></Field>
          <Field label="Descripción"><textarea required minLength={10} maxLength={320} rows={3} value={form.description ?? ''} onChange={(e) => update('description', e.target.value)} /></Field>
          <div className="grid gap-4"><Field label="Texto del botón"><input required maxLength={32} value={form.ctaLabel ?? ''} onChange={(e) => update('ctaLabel', e.target.value)} /></Field><Field label="Enlace seguro (https)"><input required type="url" placeholder="https://…" value={form.ctaUrl ?? ''} onChange={(e) => update('ctaUrl', e.target.value)} /></Field></div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ImageUpload title="Banner de escritorio" detail="Recomendado: 5120 × 1080 px · JPG, PNG o WebP · máximo 5 MB" src={form.desktopImageUrl} busy={uploading === 'desktop'} onFile={(file) => void selectImage('desktop', file)} />
          <ImageUpload title="Imagen para celular" detail="Recomendado: vertical o cuadrada · JPG, PNG o WebP · máximo 5 MB" src={form.mobileImageUrl} busy={uploading === 'mobile'} onFile={(file) => void selectImage('mobile', file)} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Nombre de contacto"><input required maxLength={80} value={form.contactName ?? ''} onChange={(e) => update('contactName', e.target.value)} /></Field>
          <Field label="Teléfono de contacto"><input required type="tel" maxLength={24} value={form.contactPhone ?? ''} onChange={(e) => update('contactPhone', e.target.value)} /></Field>
          <Field label="Correo (opcional)"><input type="email" maxLength={160} value={form.contactEmail ?? ''} onChange={(e) => update('contactEmail', e.target.value)} /></Field>
          <Field label="Inicio"><input required type="datetime-local" value={localDateValue(form.startsAt)} onChange={(e) => update('startsAt', new Date(e.target.value).getTime())} /></Field>
          <Field label="Fin"><input required type="datetime-local" value={localDateValue(form.endsAt)} onChange={(e) => update('endsAt', new Date(e.target.value).getTime())} /></Field>
          <Field label="Estado"><select value={form.status ?? 'draft'} onChange={(e) => update('status', e.target.value as BusinessAdStatus)}><option value="draft">Borrador</option><option value="scheduled">Programado</option><option value="active">Activo</option><option value="paused">Pausado</option></select></Field>
          <Field label="Precio acordado (MXN)"><input required type="number" min="0" max="1000000" step="1" value={form.agreedPriceMxn ?? 0} onChange={(e) => update('agreedPriceMxn', Number(e.target.value))} /></Field>
          <Field label="Pago"><select value={form.paymentStatus ?? 'unpaid'} onChange={(e) => update('paymentStatus', e.target.value as BusinessAd['paymentStatus'])}><option value="unpaid">Pendiente</option><option value="paid">Pagado</option><option value="complimentary">Cortesía</option></select></Field>
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-cream-300 bg-cream-50 p-4 text-sm leading-5 text-ink-700"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required className="mt-0.5 h-4 w-4 accent-[#52634a]"/><span>Confirmo que el negocio autorizó publicar su nombre, promoción, imágenes y enlace, y que acordamos las fechas y el precio indicados.</span></label>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">{editMode && <button type="button" onClick={() => { setForm(blank()); setConsent(false); }} className="rounded-xl border border-cream-300 px-5 py-3 text-sm font-semibold text-ink-700">Cancelar edición</button>}<button type="submit" disabled={saving || Boolean(uploading)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#426b4d] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#34583f] disabled:cursor-not-allowed disabled:opacity-60">{saving ? <LoaderCircle className="h-4 w-4 animate-spin"/> : <ShieldCheck className="h-4 w-4"/>}{saving ? 'Guardando…' : editMode ? 'Guardar campaña' : 'Guardar anuncio'}</button></div>
      </form>
    </section>

    <section className="rounded-3xl border border-cream-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="mb-5 flex items-center justify-between gap-3"><div><h2 className="text-xl font-bold text-ink-900">Campañas</h2><p className="mt-1 text-sm text-ink-500">El contacto y el precio solo se muestran aquí, en administración.</p></div><button type="button" onClick={() => void refresh()} className="rounded-xl border border-cream-300 px-3 py-2 text-sm font-semibold text-ink-700">Actualizar</button></div>
      {loading ? <p className="flex items-center gap-2 py-8 text-sm text-ink-500"><LoaderCircle className="h-4 w-4 animate-spin"/> Cargando campañas…</p> : ads.length === 0 ? <div className="rounded-2xl border border-dashed border-cream-300 px-5 py-10 text-center"><ImagePlus className="mx-auto h-8 w-8 text-ink-400"/><p className="mt-3 font-semibold text-ink-700">Aún no hay anuncios</p><p className="mt-1 text-sm text-ink-500">Las campañas activas aparecerán en la portada.</p></div> : <div className="space-y-3">{ads.map((ad) => <article key={ad.id} className="grid gap-4 rounded-2xl border border-cream-200 p-4 md:grid-cols-[8rem_1fr_auto] md:items-center">
        <img src={ad.desktopImageUrl} alt="" className="aspect-[16/7] w-full rounded-xl bg-cream-100 object-cover md:aspect-[4/3]"/>
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-cream-100 px-2.5 py-1 text-xs font-semibold text-ink-700">{statusName(ad.status)}</span><span className="text-xs text-ink-400">{new Date(ad.startsAt).toLocaleDateString('es-MX')} – {new Date(ad.endsAt).toLocaleDateString('es-MX')}</span></div><h3 className="mt-2 truncate font-bold text-ink-900">{ad.businessName} · {ad.headline}</h3><p className="mt-1 truncate text-sm text-ink-500">{ad.contactName} · {ad.contactPhone} · ${ad.agreedPriceMxn.toLocaleString('es-MX')} MXN</p><div className="mt-2 flex flex-wrap gap-4 text-xs text-ink-600"><span className="inline-flex items-center gap-1"><EyeIcon/> {ad.metrics?.impressions ?? 0} impresiones</span><span className="inline-flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5"/> {ad.metrics?.clicks ?? 0} clics</span><span>{ad.paymentStatus === 'paid' ? 'Pagado' : ad.paymentStatus === 'complimentary' ? 'Cortesía' : 'Pendiente'}</span></div></div>
        <div className="flex gap-2 md:flex-col"><button type="button" onClick={() => edit(ad)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-cream-300 px-3 py-2 text-sm font-semibold text-ink-700"><Pencil className="h-4 w-4"/>Editar</button>{ad.status !== 'archived' && <button type="button" onClick={() => void archive(ad)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700"><Archive className="h-4 w-4"/>Archivar</button>}</div>
      </article>)}</div>}
    </section>
  </div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-sm font-semibold text-ink-700">{label}<span className="mt-1.5 block [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-cream-300 [&_input]:bg-cream-50 [&_input]:px-3.5 [&_input]:py-3 [&_input]:text-sm [&_input]:font-normal [&_input]:text-ink-900 [&_input]:outline-none [&_input]:focus:border-brand-500 [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-cream-300 [&_textarea]:bg-cream-50 [&_textarea]:px-3.5 [&_textarea]:py-3 [&_textarea]:text-sm [&_textarea]:font-normal [&_textarea]:text-ink-900 [&_textarea]:outline-none [&_textarea]:focus:border-brand-500 [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-cream-300 [&_select]:bg-cream-50 [&_select]:px-3.5 [&_select]:py-3 [&_select]:text-sm [&_select]:font-normal [&_select]:text-ink-900 [&_select]:outline-none">{children}</span></label>;
}

function ImageUpload({ title, detail, src, busy, onFile }: { title: string; detail: string; src?: string; busy: boolean; onFile: (file?: File) => void }) {
  return <div className="rounded-2xl border border-cream-300 bg-cream-50 p-4"><div className="mb-3"><h3 className="font-bold text-ink-800">{title}</h3><p className="mt-1 text-xs leading-5 text-ink-500">{detail}</p></div>{src ? <img src={src} alt={`Vista previa: ${title}`} className="mb-3 h-36 w-full rounded-xl bg-cream-200 object-cover"/> : <div className="mb-3 flex h-36 items-center justify-center rounded-xl border border-dashed border-cream-300 bg-white text-ink-400"><ImagePlus className="h-7 w-7"/></div>}<label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-cream-100">{busy ? <LoaderCircle className="h-4 w-4 animate-spin"/> : <Upload className="h-4 w-4"/>}{busy ? 'Subiendo…' : src ? 'Cambiar imagen' : 'Elegir imagen'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} className="sr-only" onChange={(event) => { onFile(event.target.files?.[0]); event.currentTarget.value = ''; }}/></label></div>;
}

function EyeIcon() { return <span aria-hidden="true">◉</span>; }
