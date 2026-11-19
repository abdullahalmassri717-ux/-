-- سجل أخطاء المنصة: عندما يحدث خطأ عند مستخدم (في المتصفح) أو في وظائف الخادم،
-- يُحفظ هنا ليراه مدير المنصة في «جودة وتكلفة التصحيح» بدل أن يضيع.
-- أقل قدر من البيانات: نص الخطأ مختصر، والصفحة بدون رموز الطلاب، بلا أسماء.
create table if not exists public.app_errors (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  source      text not null check (source in ('web', 'function')),
  message     text not null,
  detail      text,
  page        text,
  user_id     uuid default auth.uid(),
  app_version text
);
create index if not exists app_errors_created_idx on public.app_errors (created_at desc);
alter table public.app_errors enable row level security;
revoke all on public.app_errors from anon, authenticated;
create policy app_errors_admin_read on public.app_errors for select to authenticated
  using (private.is_platform_admin());
grant select on public.app_errors to authenticated;

-- يُستدعى من المتصفح (حتى بدون حساب، مثل صفحة تسليم الطالب). يحدّ العدد حتى لا
-- يُملأ السجل: 20 خطأ في الساعة لكل مستخدم، و500 في الساعة للمنصة كلها.
create or replace function public.log_app_error(p_message text, p_detail text default null, p_page text default null, p_version text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if coalesce(trim(p_message), '') = '' then return; end if;
  if (select count(*) from public.app_errors where created_at > now() - interval '1 hour') >= 500 then return; end if;
  if v_uid is not null and (select count(*) from public.app_errors
                             where user_id = v_uid and created_at > now() - interval '1 hour') >= 20 then
    return;
  end if;
  insert into public.app_errors (source, message, detail, page, user_id, app_version)
  values ('web', left(p_message, 300), left(p_detail, 1500),
          -- رموز التسليم والتقارير في الرابط لا تُحفظ.
          left(regexp_replace(regexp_replace(coalesce(p_page, ''), '^/(s|r)/[^/?#]+', '/\1/…'), '[?#].*$', ''), 200),
          v_uid, left(p_version, 40));
end $$;
revoke execute on function public.log_app_error(text, text, text, text) from public;
grant execute on function public.log_app_error(text, text, text, text) to anon, authenticated;

-- ملخص للمدير: الأخطاء المتشابهة مجمّعة، الأحدث أولاً.
create or replace function public.admin_app_errors(p_days int default 7)
returns table (message text, source text, page text, times bigint, users bigint, last_at timestamptz, detail text)
language sql stable security definer set search_path = '' as $$
  select e.message, e.source, max(e.page), count(*), count(distinct e.user_id), max(e.created_at),
         (array_agg(e.detail order by e.created_at desc))[1]
  from public.app_errors e
  where private.is_platform_admin()
    and e.created_at > now() - make_interval(days => greatest(1, least(p_days, 90)))
  group by e.message, e.source
  order by max(e.created_at) desc
  limit 100
$$;
revoke execute on function public.admin_app_errors(int) from public, anon;
grant execute on function public.admin_app_errors(int) to authenticated;

-- يُحذف ما مضى عليه 30 يوماً.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute $cmd$select cron.schedule('daqa-app-errors-cleanup', '15 3 * * *', $c$delete from public.app_errors where created_at < now() - interval '30 days'$c$)$cmd$;
  end if;
exception when others then
  raise warning 'app errors cleanup schedule not created: %', sqlerrm;
end $$;
