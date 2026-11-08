// Shrinks a phone photo before it is sent for grading. A smaller image costs
// less to grade and uploads faster on a weak connection, while staying sharp
// enough to read handwriting.

const MAX_EDGE_PX = 1600;
const JPEG_QUALITY = 0.82;

export interface PreparedImage {
  /** Base64 data without the data-URL prefix (what the grading API needs). */
  base64: string;
  /** Full data URL, used to show the paper on the review screen. */
  dataUrl: string;
  mediaType: 'image/jpeg';
}

export async function prepareImageForGrading(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('not_an_image');
  }
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no_canvas');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    return { base64: dataUrl.slice(dataUrl.indexOf(',') + 1), dataUrl, mediaType: 'image/jpeg' };
  } finally {
    bitmap.close();
  }
}
