-- ============================================================================
-- سجل تشغيل التصحيح الآلي (التكلفة والنموذج) + محاولات رابط تسليم الطالب
-- كلا الجدولين يكتبهما الخادم فقط (Edge Functions بمفتاح الخادم).
-- ============================================================================

-- كل مرة يُصحَّح فيها تسليم بالذكاء الاصطناعي: أي نموذج، كم كلّف، وهل نجح.
create type public.grading_run_status as enum ('running', 'succeeded', 'failed');

create table public.grading_runs (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  submission_id    uuid not null,
  status           public.grading_run_status not null default 'running',
  model            text,                 -- النموذج الذي اعتُمدت إجابته
  attempts         jsonb not null default '[]'::jsonb,  -- كل استدعاء للنموذج مع التوكنز
  cost_usd         numeric(10,5) not null default 0,
  escalated        boolean not null default false,
  error            text,
  started_at       timestamptz not null default now(),
  finished_at      timestamptz,
  foreign key (submission_id, organization_id) references public.submissions (id, organization_id) on delete cascade
);
create index grading_runs_org_idx on public.grading_runs (organization_id, started_at desc);
create index grading_runs_submission_idx on public.grading_runs (submission_id);

alter table public.grading_runs enable row level security;

-- مالك الجهة يرى تكلفة تصحيح جهته، ومدير المنصة يرى الكل (لا بيانات طلاب هنا).
create policy grading_runs_select on public.grading_runs for select to authenticated
  using (private.is_org_owner(organization_id) or private.is_platform_admin()
         or private.can_access_submission(submission_id));
revoke insert, update, delete on public.grading_runs from authenticated;
revoke all on public.grading_runs from anon;

-- محاولات إدخال رمز الطالب في رابط التسليم (لمنع تخمين الرموز).
create table public.submission_link_attempts (
  id             bigint generated always as identity primary key,
  assessment_id  uuid not null references public.assessments (id) on delete cascade,
  client_hash    text not null,          -- بصمة مشفّرة لعنوان الجهاز، لا العنوان نفسه
  succeeded      boolean not null,
  created_at     timestamptz not null default now()
);
create index submission_link_attempts_lookup_idx
  on public.submission_link_attempts (assessment_id, client_hash, created_at desc);

alter table public.submission_link_attempts enable row level security;
-- لا سياسات: المتصفح لا يقرأ ولا يكتب هذا الجدول إطلاقاً.
revoke all on public.submission_link_attempts from anon, authenticated;

-- تنظيف المحاولات القديمة (يُستدعى من الخادم).
create or replace function private.prune_link_attempts()
returns void language sql security definer set search_path = '' as $$
  delete from public.submission_link_attempts where created_at < now() - interval '7 days'
$$;
revoke execute on function private.prune_link_attempts() from authenticated, anon;
