// Short Arabic «how long ago» text for the notification bell.
/** «منذ 5 دقائق»، «منذ ساعتين»، «أمس»… */
export function timeAgo(iso: string, now = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return 'الآن';
  if (minutes < 60) return minutes === 1 ? 'منذ دقيقة' : minutes === 2 ? 'منذ دقيقتين' : `منذ ${minutes} دقيقة`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? 'منذ ساعة' : hours === 2 ? 'منذ ساعتين' : `منذ ${hours} ساعات`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'أمس';
  if (days === 2) return 'منذ يومين';
  return `منذ ${days} أيام`;
}
