-- إعادة تصحيح تلقائية للأوراق العالقة.
-- إذا أُغلقت صفحة المدرّس أثناء التصحيح، أو تعطّل الذكاء الاصطناعي لحظياً، قد تبقى
-- الورقة «مرفوعة» أو «قيد التصحيح» أو «فشلت». كل 10 دقائق تلتقط القاعدة هذه الأوراق
-- (حتى 3 محاولات تلقائية لكل ورقة) وتطلب من وظيفة الخادم grading-sweep تصحيحها.

alter table public.submissions
  add column if not exists auto_grade_attempts smallint not null default 0;

create index if not exists submissions_stuck_idx
  on public.submissions (status, updated_at)
  where status in ('uploaded', 'grading', 'failed');

-- يحجز دفعة من الأوراق العالقة ويعلّمها «قيد التصحيح» حتى لا تُصحَّح مرتين.
create or replace function public.claim_stuck_submissions(p_limit int default 10)
returns setof uuid language plpgsql security definer set search_path = '' as $$
begin
  return query
  with picked as (
    select s.id
    from public.submissions s
    where s.auto_grade_attempts < 3
      and (
        (s.status = 'uploaded' and s.updated_at < now() - interval '5 minutes')
        or (s.status = 'grading' and s.updated_at < now() - interval '15 minutes')
        or (s.status = 'failed' and s.updated_at < now() - interval '10 minutes')
      )
    order by s.updated_at
    limit greatest(1, least(p_limit, 50))
    for update skip locked
  )
  update public.submissions s
     set status = 'grading', auto_grade_attempts = s.auto_grade_attempts + 1
    from picked
   where s.id = picked.id
  returning s.id;
end $$;
revoke execute on function public.claim_stuck_submissions(int) from public, anon, authenticated;
grant execute on function public.claim_stuck_submissions(int) to service_role;

create or replace function private.run_grading_sweep()
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_url text;
  v_token text;
begin
  select value into v_url from private.app_secrets where name = 'functions_url';
  select value into v_token from private.app_secrets where name = 'weekly_reports_token';
  if v_url is null or to_regnamespace('net') is null then
    return;
  end if;
  -- لا نوقظ الخادم إن لم يكن هناك ما يُصحَّح.
  if not exists (
    select 1 from public.submissions s
    where s.auto_grade_attempts < 3
      and ((s.status = 'uploaded' and s.updated_at < now() - interval '5 minutes')
        or (s.status = 'grading' and s.updated_at < now() - interval '15 minutes')
        or (s.status = 'failed' and s.updated_at < now() - interval '10 minutes'))
  ) then
    return;
  end if;
  execute 'select net.http_post(url := $1, headers := $2, body := $3)'
    using v_url || '/grading-sweep',
          jsonb_build_object('Content-Type', 'application/json', 'x-daqa-cron', v_token),
          '{}'::jsonb;
end $$;
revoke execute on function private.run_grading_sweep() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute $cmd$select cron.schedule('daqa-grading-sweep', '*/10 * * * *', 'select private.run_grading_sweep()')$cmd$;
  end if;
exception when others then
  raise warning 'grading sweep schedule not created: %', sqlerrm;
end $$;
