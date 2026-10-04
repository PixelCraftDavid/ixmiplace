import { LISTING_LIMITS } from './constants';

// URL base de la API de subida de Cloudinary
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

// ============================================================
// Tipos
// ============================================================

export interface CloudinaryResponse {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  created_at: string;
}

export interface UploadProgress {
  fileName: string;
  loaded: number;
  total: number;
  percent: number;
}


  const MAX_UPLOAD_DIMENSION = 2400;
  const UPLOAD_QUALITY = 0.82;
  const MAX_IMAGE_PIXELS = 25_000_000;
// ============================================================
// Validación local (defensa en profundidad)
// ============================================================


  async function compressImage(file: File): Promise<File> {
    const objectUrl = URL.createObjectURL(file);

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error('No se pudo preparar la imagen'));
        element.src = objectUrl;
      });

      if (image.naturalWidth * image.naturalHeight > MAX_IMAGE_PIXELS) {
        throw new Error('La imagen tiene una resolución demasiado grande.');
      }

      const scale = Math.min(
        1,
        MAX_UPLOAD_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight)
      );
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');

      if (!context) throw new Error('Este navegador no pudo rasterizar la imagen.');

      context.drawImage(image, 0, 0, width, height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', UPLOAD_QUALITY)
      );

      if (!blob) throw new Error('No se pudo convertir la imagen a un formato seguro.');

      return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
        type: 'image/jpeg',
        lastModified: file.lastModified,
      });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

export function validateImageFile(file: File): { ok: true } | { ok: false; error: string } {
  // 1. Tipo MIME
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      ok: false,
      error: `${file.name}: formato no permitido. Usa JPG, PNG o WebP.`,
    };
  }

  // 2. Extensión (por si el MIME está mal)
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      ok: false,
      error: `${file.name}: extensión no permitida. Usa .jpg, .png o .webp`,
    };
  }

  // 3. Tamaño
  const maxBytes = LISTING_LIMITS.photoMaxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
    return {
      ok: false,
      error: `${file.name}: pesa ${sizeMB} MB. Máximo ${LISTING_LIMITS.photoMaxSizeMB} MB.`,
    };
  }

  // 4. No vacío
  if (file.size === 0) {
    return { ok: false, error: `${file.name}: el archivo está vacío.` };
  }

  return { ok: true };
}

async function hasValidImageSignature(file: File): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const isWebp = String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF'
    && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  return (file.type === 'image/jpeg' && isJpeg)
    || (file.type === 'image/png' && isPng)
    || (file.type === 'image/webp' && isWebp);
}

// ============================================================
// Subida individual (con progreso)
// ============================================================

export async function uploadImage(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<CloudinaryResponse> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('La subida de imágenes no está configurada.');
  }

  // Validar antes de subir
  const validation = validateImageFile(file);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  if (!(await hasValidImageSignature(file))) {
    throw new Error(`${file.name}: el contenido no coincide con un JPG, PNG o WebP válido.`);
  }

  const uploadFile = await compressImage(file);

  const formData = new FormData();
  formData.append('file', uploadFile);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'ixmiplace/listings');

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', UPLOAD_URL);

    // Progreso de subida
    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress({
            fileName: file.name,
            loaded: event.loaded,
            total: event.total,
            percent: Math.round((event.loaded / event.total) * 100),
          });
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as CloudinaryResponse;
          const expectedPrefix = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/`;
          if (
            typeof data.secure_url !== 'string'
            || !data.secure_url.startsWith(expectedPrefix)
            || typeof data.public_id !== 'string'
            || data.bytes > LISTING_LIMITS.photoMaxSizeMB * 1024 * 1024
            || data.format !== 'jpg'
          ) {
            reject(new Error('Cloudinary devolvió una respuesta fuera de la configuración esperada.'));
            return;
          }
          resolve(data);
        } catch {
          reject(new Error('Respuesta inválida de Cloudinary'));
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.error?.message ?? `Error ${xhr.status}`));
        } catch {
          reject(new Error(`Error ${xhr.status} al subir imagen`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Error de red al subir imagen'));
    xhr.onabort = () => reject(new Error('Subida cancelada'));

    xhr.send(formData);
  });
}

// ============================================================
// Subida múltiple (paralela con progreso combinado)
// ============================================================

export interface MultiUploadResult {
  successful: CloudinaryResponse[];
  failed: { fileName: string; error: string }[];
}

export async function uploadImages(
  files: File[],
  onProgress?: (fileName: string, percent: number) => void
): Promise<MultiUploadResult> {
  const successful: CloudinaryResponse[] = [];
  const failed: { fileName: string; error: string }[] = [];

  // Subir todas en paralelo
  const results = await Promise.allSettled(
    files.map((file) =>
      uploadImage(file, (p) => onProgress?.(p.fileName, p.percent)).then(
        (res) => ({ file, res }),
        (err: Error) => ({ file, err })
      )
    )
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { file, res, err } = result.value as {
        file: File;
        res?: CloudinaryResponse;
        err?: Error;
      };
      if (res) successful.push(res);
      else if (err) failed.push({ fileName: file.name, error: err.message });
    }
  }

  return { successful, failed };
}

// ============================================================
// Helper: URLs optimizadas para mostrar en el feed
// ============================================================

export function optimizedUrl(
  url: string,
  width = 800,
  height = 600
): string {
  if (!url.includes('/image/upload/')) return url;
  return url.replace(
    '/image/upload/',
    `/image/upload/c_fill,g_auto,w_${width},h_${height},q_auto,f_auto/`
  );
}

export function thumbnailUrl(url: string, size = 300): string {
  if (!url.includes('/image/upload/')) return url;
  return url.replace(
    '/image/upload/',
    `/image/upload/c_fill,g_auto,w_${size},h_${size},q_auto,f_auto/`
  );
}
