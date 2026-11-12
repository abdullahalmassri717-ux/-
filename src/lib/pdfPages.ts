// Turns a PDF into one JPEG image per page, in the browser, so a scanned paper
// sent as PDF goes through exactly the same path as phone photos (resize,
// offline queue, grading, marked-up paper). We use the legacy build so it also
// runs on older phones, and load it only when someone actually picks a PDF.

/** What the file pickers accept: photos and PDF files. */
export const PAGE_FILE_ACCEPT = 'image/*,application/pdf,.pdf';

export const isPdf = (f: File) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name);

const MAX_EDGE_PX = 1600;

export class PdfReadError extends Error {}

/** Renders up to `maxPages` pages of a PDF as JPEG image files. */
export async function pdfToImages(file: File, maxPages: number): Promise<{ images: File[]; totalPages: number }> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const { default: workerUrl } = await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  let doc;
  try {
    doc = await task.promise;
  } catch (e) {
    void task.destroy();
    const locked = (e as { name?: string })?.name === 'PasswordException';
    throw new PdfReadError(locked ? `الملف ${file.name} محمي بكلمة سر. افتحه واحفظه بدونها.` : `تعذّرت قراءة الملف ${file.name}.`);
  }
  try {
    const count = Math.min(doc.numPages, Math.max(0, maxPages));
    const images: File[] = [];
    for (let n = 1; n <= count; n++) {
      const page = await doc.getPage(n);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: MAX_EDGE_PX / Math.max(base.width, base.height) });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new PdfReadError('المتصفح لا يدعم قراءة ملفات PDF.');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.9));
      if (!blob) throw new PdfReadError(`تعذّرت قراءة الصفحة ${n} من ${file.name}.`);
      images.push(new File([blob], `${file.name.replace(/\.pdf$/i, '')}-${n}.jpg`, { type: 'image/jpeg' }));
      page.cleanup();
    }
    return { images, totalPages: doc.numPages };
  } finally {
    void task.destroy();
  }
}

/**
 * Replaces every PDF in the list with its pages as images (keeping order) and
 * stops at `maxPages` images in total. Other non-image files are skipped.
 */
export async function filesToPageImages(
  files: File[],
  maxPages: number,
): Promise<{ images: File[]; truncated: boolean; skipped: number }> {
  const images: File[] = [];
  let truncated = false;
  let skipped = 0;
  for (const f of files) {
    const room = maxPages - images.length;
    if (room <= 0) {
      truncated = true;
      break;
    }
    if (isPdf(f)) {
      const r = await pdfToImages(f, room);
      images.push(...r.images);
      if (r.totalPages > r.images.length) truncated = true;
    } else if (f.type.startsWith('image/')) {
      images.push(f);
    } else {
      skipped++;
    }
  }
  return { images, truncated, skipped };
}

export const pdfErrorText = (e: unknown, fallback: string) => (e instanceof PdfReadError ? e.message : fallback);
