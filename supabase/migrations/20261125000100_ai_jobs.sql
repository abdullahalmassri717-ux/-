-- توليد الأسئلة بالذكاء الاصطناعي يعمل في الخلفية: الخادم يحفظ الطلب هنا ويكمل
-- حتى لو أغلق المدرّس الصفحة، والمتصفح يقرأ النتيجة من هذا الجدول عند الرجوع.
-- يكتبه الخادم فقط، وكل مستخدم يرى طلباته فقط. تُحذف الطلبات بعد يومين.
create table if not exists public.ai_jobs (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  task             text not null,
  status           text not null default 'running' check (status in ('running', 'done', 'failed')),
  result           jsonb,
  error            text,
  created_at       timestamptz not null default now(),
  finished_at      timestamptz
);
create index if not exists ai_jobs_user_idx on public.ai_jobs (user_id, created_at desc);

alter table public.ai_jobs enable row level security;
drop policy if exists ai_jobs_select on public.ai_jobs;
create policy ai_jobs_select on public.ai_jobs for select to authenticated
  using (user_id = (select auth.uid()));
revoke insert, update, delete on public.ai_jobs from authenticated;
revoke all on public.ai_jobs from anon;
