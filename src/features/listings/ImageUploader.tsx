import { useCallback, useRef, useState } from 'react';
import { Upload, X, Loader2, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { uploadImage, validateImageFile } from '../../lib/cloudinary';
import { LISTING_LIMITS } from '../../lib/constants';

interface ImageUploaderProps {
  urls: string[];
  publicIds?: string[];
  onChange: (urls: string[], publicIds: string[]) => void;
  maxImages?: number;
}

interface UploadingItem {
  fileName: string;
  percent: number;
  previewUrl: string;
}

export function ImageUploader({
  urls,
  publicIds = [],
  onChange,
  maxImages = LISTING_LIMITS.photosMax,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<UploadingItem[]>([]);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const canAddMore = urls.length + uploading.length < maxImages;

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      setError('');
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;

      if (urls.length + uploading.length + fileArray.length > maxImages) {
        setError(`Máximo ${maxImages} imágenes.`);
        return;
      }

      for (const file of fileArray) {
        const v = validateImageFile(file);
        if (!v.ok) {
          setError(v.error);
          return;
        }
      }

      const newUploads: UploadingItem[] = fileArray.map((file) => ({
        fileName: file.name,
        percent: 0,
        previewUrl: URL.createObjectURL(file),
      }));
      setUploading((prev) => [...prev, ...newUploads]);

      const results = await Promise.allSettled(
        fileArray.map(async (file) => {
          const res = await uploadImage(file, (p) => {
            setUploading((prev) =>
              prev.map((u) =>
                u.fileName === file.name ? { ...u, percent: p.percent } : u
              )
            );
          });

          setUploading((prev) => prev.filter((u) => u.fileName !== file.name));
          const upload = newUploads.find((u) => u.fileName === file.name);
          if (upload) URL.revokeObjectURL(upload.previewUrl);

          return { url: res.secure_url, publicId: res.public_id };
        })
      );

      const successes: Array<{ url: string; publicId: string }> = [];
      const failures: string[] = [];
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') successes.push(r.value);
        else failures.push(fileArray[i].name);
      });

      if (successes.length > 0) {
        onChange(
          [...urls, ...successes.map((item) => item.url)],
          [...publicIds, ...successes.map((item) => item.publicId)]
        );
      }
      if (failures.length > 0)
        setError(`No se pudieron subir: ${failures.join(', ')}`);
    },
    [urls, publicIds, uploading, maxImages, onChange]
  );

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) void handleFiles(e.dataTransfer.files);
  };

  const removeImage = (url: string) => {
    const index = urls.indexOf(url);
    const nextUrls = urls.filter((u) => u !== url);
    const nextPublicIds = [...publicIds];

    if (index >= 0) {
      nextPublicIds.splice(index, 1);
    }

    onChange(nextUrls, nextPublicIds);
  };

  function moveImage(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= urls.length) return;

    const nextUrls = [...urls];
    const [movedUrl] = nextUrls.splice(index, 1);
    nextUrls.splice(targetIndex, 0, movedUrl);

    const nextPublicIds = [...publicIds];
    if (publicIds.length === urls.length) {
      const [movedPublicId] = nextPublicIds.splice(index, 1);
      nextPublicIds.splice(targetIndex, 0, movedPublicId);
    }

    onChange(nextUrls, nextPublicIds);
  }

  const isUploading = uploading.length > 0;

  return (
    <div className="space-y-3">
      {/* Zona de drop */}
      <div
        onClick={() => canAddMore && !isUploading && inputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`
          relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center
          transition-all duration-200
          ${
            isDragging
              ? 'border-accent-500 bg-accent-50'
              : 'border-cream-300 bg-white hover:border-secondary-400 hover:bg-cream-50'
          }
          ${!canAddMore ? 'cursor-not-allowed opacity-50' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void handleFiles(e.target.files);
            e.target.value = '';
          }}
        />

        <div
          className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl
                      ${isDragging ? 'bg-accent-100 text-accent-600' : 'bg-brand-50 text-brand-600'}`}
        >
          <Upload className="h-6 w-6" />
        </div>

        <p className="font-medium text-ink-700">
          Arrastra imágenes aquí o haz clic para seleccionar
        </p>
        <p className="mt-1 text-sm text-ink-400">
          JPG, PNG o WebP · máx {LISTING_LIMITS.photoMaxSizeMB} MB · hasta{' '}
          {maxImages} fotos
        </p>

        {!canAddMore && (
          <p className="mt-2 text-sm text-accent-700">
            Alcanzaste el máximo de {maxImages} imágenes.
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Preview en progreso */}
      {uploading.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {uploading.map((u) => (
            <div
              key={u.fileName}
              className="relative aspect-square overflow-hidden rounded-xl bg-cream-200"
            >
              <img
                src={u.previewUrl}
                alt=""
                className="h-full w-full object-cover opacity-60"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink/50">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
                <span className="mt-1 text-xs font-medium text-white">
                  {u.percent}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview imágenes subidas */}
      {urls.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {urls.map((url, i) => (
            <div
              key={url}
              className="group relative aspect-square overflow-hidden rounded-xl
                         bg-cream-200 ring-1 ring-cream-300"
            >
              <img
                src={url}
                alt={`Imagen ${i + 1}`}
                className="h-full w-full object-cover"
              />
              {i === 0 && (
                <span
                  className="absolute left-2 top-2 rounded-full bg-brand-500
                             px-2 py-0.5 text-[10px] font-semibold text-white
                             shadow-md"
                >
                  Portada
                </span>
              )}
              <div className="absolute bottom-2 left-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => moveImage(i, -1)}
                  disabled={i === 0}
                  aria-label="Mover imagen a la izquierda"
                  title="Mover a la izquierda"
                  className="rounded-full bg-ink/70 p-1 text-white hover:bg-brand-600 disabled:hidden"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveImage(i, 1)}
                  disabled={i === urls.length - 1}
                  aria-label="Mover imagen a la derecha"
                  title="Mover a la derecha"
                  className="rounded-full bg-ink/70 p-1 text-white hover:bg-brand-600 disabled:hidden"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => removeImage(url)}
                aria-label="Eliminar imagen"
                className="absolute right-2 top-2 rounded-full bg-ink/70 p-1
                           text-white opacity-0 transition group-hover:opacity-100
                           hover:bg-red-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Contador */}
      <p className="text-right text-xs text-ink-400">
        {urls.length} / {maxImages} imágenes
      </p>
    </div>
  );
}