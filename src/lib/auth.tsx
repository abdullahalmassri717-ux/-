import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';
import { toInternationalPhone } from './phone';
import { Entity, EntityRole, EntityType } from '../types';
import { PLATFORM_CONFIG } from '../mockData';

// Real sign-in: WhatsApp number + one-time 6-digit code, through Supabase Auth.
// When no Supabase project is configured the app stays in demo mode and this
// provider reports `mode: 'demo'`; screens then keep their old mock behaviour.

export interface AccountProfile {
  id: string;
  fullName: string | null;
  phone: string | null;
  isPlatformAdmin: boolean;
}

type AuthStatus = 'loading' | 'signed_out' | 'signed_in';

interface AuthContextValue {
  mode: 'real' | 'demo';
  status: AuthStatus;
  session: Session | null;
  profile: AccountProfile | null;
  /** Every organization the person belongs to, with their role in it. */
  entities: Entity[];
  /** Sends the 6-digit code on WhatsApp. Returns an Arabic error message, or null on success. */
  sendCode: (phoneInput: string) => Promise<string | null>;
  /** Checks the code. Returns an Arabic error message, or null on success. */
  verifyCode: (phoneInput: string, code: string) => Promise<string | null>;
  /** Creates a new organization with the signed-in person as owner. */
  createOrganization: (input: { name: string; kind: EntityType; fullName: string }) => Promise<{ id: string | null; error: string | null }>;
  /** Re-reads profile and memberships (e.g. after creating an organization). */
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ENTITY_TYPES: EntityType[] = ['individual_teacher', 'school', 'learning_center'];

function toEntity(org: { id: string; name: string; kind: string; region: string | null }, role: string, ownerName: string): Entity {
  const type = ENTITY_TYPES.includes(org.kind as EntityType) ? (org.kind as EntityType) : 'individual_teacher';
  const isTutor = type === 'individual_teacher';
  return {
    id: org.id,
    name: org.name,
    type,
    logo: '/dequa-logo.png',
    role: (role === 'owner' ? 'owner' : 'teacher') as EntityRole,
    billingPlan: isTutor ? 'monthly_per_student' : 'yearly_contract',
    pricePerStudent: isTutor ? PLATFORM_CONFIG.pricing.tutorMonthlyPerStudent : PLATFORM_CONFIG.pricing.schoolYearlyPerStudent,
    currency: PLATFORM_CONFIG.currencySymbol,
    activeStudentsCount: 0,
    region: org.region ?? '',
    principalOrOwnerName: ownerName,
  };
}

/** Turns Supabase error codes into short Arabic messages a teacher can act on. */
function friendlyError(error: { message?: string; code?: string; status?: number } | null): string {
  if (!error) return 'حدث خطأ غير متوقع. حاول مرة أخرى.';
  const code = error.code ?? '';
  const message = (error.message ?? '').toLowerCase();
  if (error.status === 429 || code.includes('rate_limit') || message.includes('rate limit')) {
    return 'طلبت رموزاً كثيرة خلال وقت قصير. انتظر دقيقة ثم حاول مرة أخرى.';
  }
  if (code === 'otp_expired' || message.includes('expired') || message.includes('invalid')) {
    return 'الرمز غير صحيح أو انتهت صلاحيته. اطلب رمزاً جديداً.';
  }
  if (code === 'phone_provider_disabled' || message.includes('provider')) {
    return 'إرسال الرموز على واتساب غير مفعّل بعد في إعدادات المنصة. تواصل مع الدعم الفني.';
  }
  if (message.includes('failed to fetch') || message.includes('network')) {
    return 'تعذّر الاتصال بالإنترنت. تأكد من الشبكة ثم حاول مرة أخرى.';
  }
  return 'تعذّر إتمام العملية الآن. حاول مرة أخرى بعد قليل.';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>(isSupabaseConfigured ? 'loading' : 'signed_out');
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);

  const loadAccount = useCallback(async (current: Session | null) => {
    if (!supabase || !current) {
      setProfile(null);
      setEntities([]);
      return;
    }
    const userId = current.user.id;
    // Platform admins are kept in their own table and checked by a server function,
    // so nobody can make themselves admin by editing their own profile.
    const [profileRes, membershipsRes, adminRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, phone').eq('id', userId).maybeSingle(),
      supabase
        .from('memberships')
        .select('role, organizations(id, name, kind, region)')
        .eq('user_id', userId)
        .eq('status', 'active'),
      supabase.rpc('is_platform_admin'),
    ]);

    const p = profileRes.data as { id: string; full_name: string | null; phone: string | null } | null;
    const fullName = p?.full_name ?? null;
    setProfile({
      id: userId,
      fullName,
      phone: p?.phone ?? current.user.phone ?? null,
      isPlatformAdmin: adminRes.data === true,
    });

    type Org = { id: string; name: string; kind: string; region: string | null };
    type Row = { role: string; organizations: Org | Org[] | null };
    const rows = (membershipsRes.data ?? []) as Row[];
    setEntities(
      rows.flatMap((row) => {
        const org = Array.isArray(row.organizations) ? row.organizations[0] : row.organizations;
        return org ? [toEntity(org, row.role, fullName ?? '')] : [];
      })
    );
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      await loadAccount(data.session);
      if (!cancelled) setStatus(data.session ? 'signed_in' : 'signed_out');
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
        setSession(next);
        return;
      }
      setSession(next);
      // Run outside the callback so Supabase isn't blocked while we query.
      setTimeout(async () => {
        await loadAccount(next);
        if (!cancelled) setStatus(next ? 'signed_in' : 'signed_out');
      }, 0);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [loadAccount]);

  const sendCode = useCallback(async (phoneInput: string) => {
    if (!supabase) return null;
    const phone = toInternationalPhone(phoneInput);
    if (!phone) return 'اكتب رقم واتساب صحيحاً، مثال: 0599123456';
    const { error } = await supabase.auth.signInWithOtp({ phone, options: { channel: 'whatsapp' } });
    return error ? friendlyError(error) : null;
  }, []);

  const verifyCode = useCallback(async (phoneInput: string, code: string) => {
    if (!supabase) return null;
    const phone = toInternationalPhone(phoneInput);
    if (!phone) return 'اكتب رقم واتساب صحيحاً، مثال: 0599123456';
    const { data, error } = await supabase.auth.verifyOtp({ phone, token: code, type: 'sms' });
    if (error) return friendlyError(error);
    // Load the account before the screen moves on, so it lands on the right dashboard.
    setSession(data.session);
    await loadAccount(data.session);
    setStatus(data.session ? 'signed_in' : 'signed_out');
    return null;
  }, [loadAccount]);

  const createOrganization = useCallback(async (input: { name: string; kind: EntityType; fullName: string }) => {
    if (!supabase) return { id: null, error: null };
    const { data, error } = await supabase.rpc('create_organization', {
      p_name: input.name.trim(),
      p_type: input.kind,
      p_full_name: input.fullName.trim(),
    });
    if (error) return { id: null, error: friendlyError(error) };
    const { data: current } = await supabase.auth.getSession();
    await loadAccount(current.session);
    return { id: (data as string) ?? null, error: null };
  }, [loadAccount]);

  const refresh = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    await loadAccount(data.session);
  }, [loadAccount]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setEntities([]);
    setStatus('signed_out');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      mode: isSupabaseConfigured ? 'real' : 'demo',
      status,
      session,
      profile,
      entities,
      sendCode,
      verifyCode,
      createOrganization,
      refresh,
      signOut,
    }),
    [status, session, profile, entities, sendCode, verifyCode, createOrganization, refresh, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
