import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

// Keep printable content outside the app layout so hidden screen content
// cannot reserve space or create extra pages in the print layout.
export function PrintDocument({ children }: { children: ReactNode }) {
  return createPortal(
    <div className="print-document" aria-hidden="true">{children}</div>,
    document.body,
  );
}

export async function printDocument() {
  const printable = document.querySelector('.print-document');
  if (!printable) return;
  const images = printable.querySelectorAll<HTMLImageElement>('img');
  const ready = Promise.allSettled([
    document.fonts.ready,
    ...Array.from(images, (image) => image.decode()),
  ]);
  // A failed or slow image must not prevent opening the print dialog.
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      ready,
      new Promise<void>((resolve) => { timeout = setTimeout(resolve, 3000); }),
    ]);
    if (printable.isConnected) window.print();
  } finally {
    clearTimeout(timeout);
  }
}
