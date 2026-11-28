// The notification bell: reads the signed-in person's own notifications
// (the database only ever returns their rows).
import { supabase } from './supabase';

export interface AppNotification {
  id: string;
  organizationId: string | null;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  createdAt: string;
  readAt: string | null;
}

type Row = {
  id: string;
  organization_id: string | null;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  created_at: string;
  read_at: string | null;
};

export async function fetchNotifications(limit = 30): Promise<AppNotification[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('notifications')
    .select('id, organization_id, kind, title, body, link, created_at, read_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as Row[]).map((r) => ({
    id: r.id,
    organizationId: r.organization_id,
    kind: r.kind,
    title: r.title,
    body: r.body,
    link: r.link,
    createdAt: r.created_at,
    readAt: r.read_at,
  }));
}

export async function markNotificationRead(id: string): Promise<void> {
  await supabase?.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id).is('read_at', null);
}

export async function markAllNotificationsRead(): Promise<void> {
  await supabase?.rpc('mark_all_notifications_read');
}
