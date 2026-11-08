// Support tickets: a teacher/owner opens a ticket, the platform admin answers.
// Not tied to one organization's data store because the admin sees every ticket.
import { supabase } from '../lib/supabase';
import { MOCK_SUPPORT_TICKETS } from '../mockData';
import type { SupportTicket } from '../types';

export interface NewTicket {
  organizationId: string | null;
  subject: string;
  category: SupportTicket['category'];
  priority: SupportTicket['priority'];
  body: string;
}

export interface SupportApi {
  listTickets(): Promise<SupportTicket[]>;
  createTicket(input: NewTicket): Promise<string>;
  /** asAdmin only matters in demo mode; on the server the database decides who is support. */
  reply(ticketId: string, body: string, asAdmin?: boolean): Promise<void>;
  setStatus(ticketId: string, status: SupportTicket['status']): Promise<void>;
}

const timeLabel = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
};

function localPhone(p: string | null | undefined): string {
  if (!p) return '';
  const cc = String(import.meta.env.VITE_DEFAULT_COUNTRY_CODE ?? '970');
  return p.startsWith(`+${cc}`) ? `0${p.slice(cc.length + 1)}` : p;
}

class SupportError extends Error {}

function realApi(): SupportApi {
  const db = supabase!;
  const fail = (e: { message?: string } | null, fallback: string): never => {
    const msg = e?.message ?? '';
    throw new SupportError(/[؀-ۿ]/.test(msg) ? msg : fallback);
  };
  return {
    async listTickets() {
      const { data, error } = await db
        .from('support_tickets')
        .select(
          'id, subject, category, priority, status, created_at, profiles(full_name, phone), organizations(name, kind), support_messages(id, from_admin, body, created_at, sender:profiles(full_name))',
        )
        .order('updated_at', { ascending: false })
        .limit(300);
      if (error) fail(error, 'تعذّر تحميل التذاكر.');
      type P = { full_name: string | null; phone?: string | null };
      type Row = {
        id: string; subject: string; category: string | null; priority: SupportTicket['priority']; status: SupportTicket['status']; created_at: string;
        profiles: P | P[] | null;
        organizations: { name: string; kind: SupportTicket['entityType'] } | { name: string; kind: SupportTicket['entityType'] }[] | null;
        support_messages: { id: string; from_admin: boolean; body: string; created_at: string; sender: P | P[] | null }[];
      };
      const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);
      return ((data ?? []) as unknown as Row[]).map((t) => {
        const p = one(t.profiles);
        const o = one(t.organizations);
        const msgs = [...(t.support_messages ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
        const first = msgs.find((m) => !m.from_admin);
        return {
          id: t.id,
          ticketNumber: `T-${t.id.slice(0, 6).toUpperCase()}`,
          senderName: p?.full_name ?? 'مستخدم',
          senderRole: o?.kind === 'individual_teacher' || !o ? 'teacher' : 'school',
          entityName: o?.name ?? '',
          entityType: o?.kind ?? 'individual_teacher',
          phone: localPhone(p?.phone),
          subject: t.subject,
          category: (t.category ?? 'other') as SupportTicket['category'],
          priority: t.priority,
          status: t.status,
          createdAt: timeLabel(t.created_at),
          description: first?.body ?? '',
          replies: msgs
            .filter((m) => m !== first)
            .map((m) => ({
              id: m.id,
              sender: m.from_admin ? 'support_agent' : 'user',
              senderName: m.from_admin ? 'فريق دعم دقة' : one(m.sender)?.full_name ?? 'المستخدم',
              message: m.body,
              time: timeLabel(m.created_at),
            })),
        };
      });
    },
    async createTicket({ organizationId, subject, category, priority, body }) {
      const { data, error } = await db
        .from('support_tickets')
        .insert({ organization_id: organizationId, subject: subject.trim(), category, priority })
        .select('id')
        .single();
      if (error) fail(error, 'تعذّر إنشاء التذكرة.');
      const id = (data as { id: string }).id;
      const msg = await db.from('support_messages').insert({ ticket_id: id, body: body.trim() });
      if (msg.error) fail(msg.error, 'تعذّر حفظ وصف المشكلة.');
      return id;
    },
    async reply(ticketId, body) {
      const { error } = await db.from('support_messages').insert({ ticket_id: ticketId, body: body.trim() });
      if (error) fail(error, 'تعذّر إرسال الرد.');
    },
    async setStatus(ticketId, status) {
      const { error } = await db.from('support_tickets').update({ status: status === 'closed' ? 'resolved' : status }).eq('id', ticketId);
      if (error) fail(error, 'تعذّر تحديث حالة التذكرة.');
    },
  };
}

function demoApi(): SupportApi {
  const tickets: SupportTicket[] = MOCK_SUPPORT_TICKETS.map((t) => ({ ...t, replies: [...(t.replies ?? [])] }));
  const wait = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 120));
  return {
    listTickets: () => wait(tickets.map((t) => ({ ...t, replies: [...(t.replies ?? [])] }))),
    async createTicket({ subject, category, priority, body }) {
      const id = `tkt_${Date.now()}`;
      tickets.unshift({
        id,
        ticketNumber: `T-${id.slice(-6).toUpperCase()}`,
        senderName: 'أنت',
        senderRole: 'teacher',
        entityName: '',
        entityType: 'individual_teacher',
        phone: '',
        subject,
        category,
        priority,
        status: 'open',
        createdAt: 'الآن',
        description: body,
        replies: [],
      });
      return wait(id);
    },
    async reply(ticketId, body, asAdmin) {
      const t = tickets.find((x) => x.id === ticketId);
      t?.replies?.push({
        id: `r${Date.now()}`,
        sender: asAdmin ? 'support_agent' : 'user',
        senderName: asAdmin ? 'فريق دعم دقة' : 'أنت',
        message: body,
        time: 'الآن',
      });
      await wait(null);
    },
    async setStatus(ticketId, status) {
      const t = tickets.find((x) => x.id === ticketId);
      if (t) t.status = status;
      await wait(null);
    },
  };
}

let api: SupportApi | null = null;
/** The support API for this session (demo when no Supabase project is set). */
export function supportApi(): SupportApi {
  api ??= supabase ? realApi() : demoApi();
  return api;
}
