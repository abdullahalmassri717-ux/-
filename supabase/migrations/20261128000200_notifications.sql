-- ============================================================================
-- دقة — الإشعارات: جرس داخل المنصة + إشعارات على شاشة الجوال (Web Push)
-- قرار صاحب المشروع (2026-11-28): جرس + إشعار جوال فقط، بدون SMS.
--
-- ما يصل عليه إشعار:
--   للمعلم:
--     review_overdue    أوراق تنتظر اعتماده منذ أكثر من 24 ساعة (مرة يومياً بالأكثر)
--     ready_for_review  أوراق جديدة جاهزة للمراجعة (مرة يومياً لكل امتحان)
--     grading_failed    أوراق فشل تصحيحها بعد 3 محاولات تلقائية (مرة يومياً لكل امتحان)
--     closing_soon      رابط التسليم يُغلق خلال 24 ساعة وما زال طلاب لم يسلّموا
--   لمالك المدرسة/المركز (ولصاحب حساب المدرّس الخصوصي في أمور الاشتراك):
--     teachers_overdue  معلمون لديهم أوراق متأخرة أكثر من 3 أيام (ملخص يومي)
--     trial_ending      التجربة تنتهي خلال 3 أيام
--     invoice_issued / invoice_overdue  فاتورة جديدة أو متأخرة
--   لصاحب تذكرة الدعم: support_reply  ردّ الدعم الفني
--   لطاقم إدارة المنصة (حسب صلاحية كل عضو):
--     org_pending (orgs)  receipt_pending (finance)  support_message (support)
--
-- لا يُنشأ ولا يُرسل شيء ليلاً: من 8 صباحاً حتى 8 مساءً بتوقيت فلسطين فقط.
-- ما يحدث ليلاً (تذكرة دعم مثلاً) يُحفظ في الجرس ويُرسل للجوال صباحاً.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) الجداول
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  organization_id  uuid references public.organizations (id) on delete cascade,
  kind             text not null,
  title            text not null,
  body             text,
  link             text,             -- مسار داخل المنصة، يبدأ بـ /
  dedupe_key       text not null,    -- يمنع تكرار نفس الإشعار
  created_at       timestamptz not null default now(),
  read_at          timestamptz,
  pushed_at        timestamptz,      -- متى أُرسل (أو حُسم) إشعار الجوال
  unique (user_id, dedupe_key),
  check (link is null or (link like '/%' and link not like '//%'))
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_unpushed_idx on public.notifications (created_at) where pushed_at is null;

alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

drop policy if exists notifications_own_select on public.notifications;
create policy notifications_own_select on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists notifications_own_update on public.notifications;
create policy notifications_own_update on public.notifications
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- أجهزة استقبال إشعارات الجوال. الجهاز يتبع آخر شخص فعّل الإشعارات عليه.
create table if not exists public.push_subscriptions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  endpoint         text not null unique,
  p256dh           text not null,
  auth             text not null,
  user_agent       text,
  created_at       timestamptz not null default now(),
  last_success_at  timestamptz,
  failures         int not null default 0
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
grant select on public.push_subscriptions to authenticated;
drop policy if exists push_subscriptions_own_select on public.push_subscriptions;
create policy push_subscriptions_own_select on public.push_subscriptions
  for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.save_push_subscription(
  p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'سجّل الدخول أولاً';
  end if;
  if p_endpoint is null or p_endpoint !~ '^https://' or length(p_endpoint) > 1000
     or coalesce(length(p_p256dh), 0) not between 40 and 200
     or coalesce(length(p_auth), 0) not between 10 and 100 then
    raise exception 'بيانات الجهاز غير صالحة';
  end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
        user_agent = excluded.user_agent, failures = 0;
  -- حد معقول لكل شخص: آخر 10 أجهزة.
  delete from public.push_subscriptions
  where user_id = auth.uid()
    and id not in (select id from public.push_subscriptions where user_id = auth.uid()
                   order by created_at desc limit 10);
end $$;
revoke execute on function public.save_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;

create or replace function public.remove_push_subscription(p_endpoint text)
returns void language sql security definer set search_path = '' as $$
  delete from public.push_subscriptions where endpoint = p_endpoint and user_id = auth.uid()
$$;
revoke execute on function public.remove_push_subscription(text) from public, anon;
grant execute on function public.remove_push_subscription(text) to authenticated;

create or replace function public.mark_all_notifications_read()
returns void language sql security definer set search_path = '' as $$
  update public.notifications set read_at = now()
  where user_id = auth.uid() and read_at is null
$$;
revoke execute on function public.mark_all_notifications_read() from public, anon;
grant execute on function public.mark_all_notifications_read() to authenticated;

-- ---------------------------------------------------------------------------
-- 2) أدوات مساعدة
-- ---------------------------------------------------------------------------
create or replace function private.gaza_now()
returns timestamp language sql stable set search_path = '' as $$
  select now() at time zone 'Asia/Gaza'
$$;

-- ساعات النهار: 8 صباحاً – 8 مساءً بتوقيت فلسطين.
create or replace function private.is_notify_daytime()
returns boolean language sql stable set search_path = '' as $$
  select extract(hour from private.gaza_now()) between 8 and 19
$$;

-- رابط داخل المنصة مع رقم الجهة، حتى تُفتح الجهة الصحيحة عند الضغط.
create or replace function private.notify_link(p_path text, p_org uuid)
returns text language sql immutable set search_path = '' as $$
  select case when p_org is null then p_path
              else p_path || case when position('?' in p_path) > 0 then '&' else '?' end || 'org=' || p_org::text end
$$;

create or replace function private.add_notification(
  p_user uuid, p_org uuid, p_kind text, p_title text, p_body text, p_link text, p_key text)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, organization_id, kind, title, body, link, dedupe_key)
  values (p_user, p_org, p_kind, p_title, p_body, p_link, p_key)
  on conflict (user_id, dedupe_key) do nothing
$$;
revoke execute on function private.add_notification(uuid, uuid, text, text, text, text, text) from public, anon, authenticated;

-- أعضاء طاقم المنصة الذين يملكون أحد هذه الأقسام.
create or replace function private.staff_with(variadic p_keys text[])
returns setof uuid language sql stable security definer set search_path = '' as $$
  select user_id from public.platform_admins
  where is_active and (role = 'super_admin' or permissions && p_keys)
$$;
revoke execute on function private.staff_with(text[]) from public, anon, authenticated;

-- مسار صفحة داخل منطقة المدرسة أو المدرّس حسب دور الشخص في الجهة.
create or replace function private.area_path(p_user uuid, p_org uuid, p_teacher_path text, p_school_path text)
returns text language sql stable security definer set search_path = '' as $$
  select case when exists (
    select 1 from public.memberships m join public.organizations o on o.id = m.organization_id
    where m.organization_id = p_org and m.user_id = p_user and m.role = 'owner' and o.kind <> 'individual_teacher'
  ) then p_school_path else p_teacher_path end
$$;
revoke execute on function private.area_path(uuid, uuid, text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) إشعارات فورية من أحداث (لا توقف العملية الأصلية مهما حدث)
-- ---------------------------------------------------------------------------
create or replace function private.notify_on_org_pending()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'pending' and (tg_op = 'INSERT' or old.status is distinct from 'pending') then
    perform private.add_notification(s, null, 'org_pending', 'جهة جديدة بانتظار موافقتك',
      new.name, '/admin', 'org_pending:' || new.id::text)
    from private.staff_with('orgs') s;
  end if;
  return null;
exception when others then
  raise warning 'notify_on_org_pending: %', sqlerrm;
  return null;
end $$;
drop trigger if exists organizations_notify_pending on public.organizations;
create trigger organizations_notify_pending after insert or update of status on public.organizations
  for each row execute function private.notify_on_org_pending();

create or replace function private.notify_on_receipt()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_org text;
begin
  select name into v_org from public.organizations where id = new.organization_id;
  perform private.add_notification(s, null, 'receipt_pending', 'إيصال دفع بانتظار التأكيد',
    coalesce(v_org, '') || ' · ' || trim(to_char(new.amount, 'FM999999990.##')), '/admin/billing',
    'receipt:' || new.id::text)
  from private.staff_with('finance') s;
  return null;
exception when others then
  raise warning 'notify_on_receipt: %', sqlerrm;
  return null;
end $$;
drop trigger if exists payment_receipts_notify on public.payment_receipts;
create trigger payment_receipts_notify after insert on public.payment_receipts
  for each row execute function private.notify_on_receipt();

create or replace function private.notify_on_support_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  t record;
begin
  select id, organization_id, created_by, subject into t from public.support_tickets where id = new.ticket_id;
  if t.id is null then
    return null;
  end if;
  if new.from_admin then
    perform private.add_notification(t.created_by, t.organization_id, 'support_reply', 'ردّ الدعم الفني على تذكرتك',
      t.subject,
      private.notify_link(case when t.organization_id is null then '/app/support'
                               else private.area_path(t.created_by, t.organization_id, '/app/support', '/school/support') end,
                          t.organization_id),
      'support_reply:' || new.id::text);
  else
    perform private.add_notification(s, null, 'support_message', 'رسالة دعم فني جديدة',
      t.subject, '/admin/support', 'support_msg:' || new.id::text)
    from private.staff_with('support') s
    where s is distinct from new.sender_id;
  end if;
  return null;
exception when others then
  raise warning 'notify_on_support_message: %', sqlerrm;
  return null;
end $$;
drop trigger if exists support_messages_notify on public.support_messages;
create trigger support_messages_notify after insert on public.support_messages
  for each row execute function private.notify_on_support_message();

-- معلمو كل امتحان: المسندون لمجموعته + من أنشأه، وكلهم أعضاء نشطون في جهة نشطة.
create or replace function private.assessment_teachers()
returns table (assessment_id uuid, organization_id uuid, user_id uuid)
language sql stable security definer set search_path = '' as $$
  select distinct x.assessment_id, x.organization_id, x.user_id
  from (
    select a.id as assessment_id, a.organization_id, gt.user_id
    from public.assessments a join public.group_teachers gt on gt.group_id = a.group_id
    union
    select a.id, a.organization_id, a.created_by from public.assessments a where a.created_by is not null
  ) x
  join public.memberships m on m.organization_id = x.organization_id and m.user_id = x.user_id and m.status = 'active'
  join public.organizations o on o.id = x.organization_id and o.status = 'active'
$$;
revoke execute on function private.assessment_teachers() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4) الملخصات الدورية (كل ساعة، نهاراً فقط)
-- ---------------------------------------------------------------------------
create or replace function public.generate_notifications()
returns int language plpgsql security definer set search_path = '' as $$
declare
  v_day text := to_char(private.gaza_now(), 'YYYY-MM-DD');
  v_before int;
  v_after int;
begin
  if not private.is_notify_daytime() then
    return 0;
  end if;
  select count(*) into v_before from public.notifications where created_at > now() - interval '1 minute';

  -- (1) أوراق تنتظر الاعتماد منذ أكثر من 24 ساعة — تذكير واحد يومياً لكل معلم في كل جهة.
  perform private.add_notification(t.user_id, t.organization_id, 'review_overdue',
    'أوراق تنتظر اعتمادك',
    'لديك ' || count(*) || ' ورقة تنتظر اعتمادك منذ أكثر من يوم. الطلاب وأولياء الأمور ينتظرون النتائج.',
    private.notify_link('/app/review', t.organization_id),
    'review_overdue:' || t.organization_id::text || ':' || v_day)
  from public.submissions s
  join private.assessment_teachers() t on t.assessment_id = s.assessment_id
  where s.status = 'needs_review'
    and coalesce(s.graded_at, s.updated_at) < now() - interval '24 hours'
  group by t.user_id, t.organization_id;

  -- (2) أوراق جديدة جاهزة للمراجعة — مرة يومياً لكل امتحان.
  perform private.add_notification(t.user_id, t.organization_id, 'ready_for_review',
    'أوراق جاهزة للمراجعة',
    'انتهى تصحيح ' || count(*) || ' ورقة من «' || a.title || '» وهي جاهزة لمراجعتك واعتمادها.',
    private.notify_link('/app/review', t.organization_id),
    'ready:' || a.id::text || ':' || v_day)
  from public.submissions s
  join public.assessments a on a.id = s.assessment_id
  join private.assessment_teachers() t on t.assessment_id = s.assessment_id
  where s.status = 'needs_review'
    and s.graded_at > now() - interval '12 hours'
  group by t.user_id, t.organization_id, a.id, a.title;

  -- (3) أوراق فشل تصحيحها بعد كل المحاولات التلقائية.
  perform private.add_notification(t.user_id, t.organization_id, 'grading_failed',
    'أوراق لم نتمكن من تصحيحها',
    count(*) || ' ورقة من «' || a.title || '» لم يتمكن التصحيح الآلي من قراءتها. افتحها وصحّحها يدوياً أو أعد رفعها.',
    private.notify_link('/app/review', t.organization_id),
    'failed:' || a.id::text || ':' || v_day)
  from public.submissions s
  join public.assessments a on a.id = s.assessment_id
  join private.assessment_teachers() t on t.assessment_id = s.assessment_id
  where s.status = 'failed' and s.auto_grade_attempts >= 3
    and s.updated_at > now() - interval '2 days'
  group by t.user_id, t.organization_id, a.id, a.title;

  -- (4) رابط التسليم يُغلق خلال 24 ساعة وما زال طلاب لم يسلّموا.
  perform private.add_notification(t.user_id, t.organization_id, 'closing_soon',
    'رابط التسليم يُغلق قريباً',
    'رابط «' || c.title || '» يُغلق ' ||
      case when (c.closes_at at time zone 'Asia/Gaza')::date = private.gaza_now()::date then 'اليوم' else 'غداً' end ||
      ' الساعة ' || to_char(c.closes_at at time zone 'Asia/Gaza', 'HH24:MI') ||
      '، و' || c.missing || ' طالب لم يسلّموا بعد. يمكنك تمديد الوقت من قائمة الامتحانات.',
    private.notify_link('/app/assignments', t.organization_id),
    'closing:' || c.id::text || ':' || extract(epoch from c.closes_at)::bigint::text)
  from (
    select a.id, a.title, a.submission_closes_at as closes_at,
      (select count(*) from public.group_students gs
        where gs.group_id = a.group_id and gs.left_at is null
          and not exists (select 1 from public.submissions s where s.assessment_id = a.id and s.student_id = gs.student_id)
      ) as missing
    from public.assessments a
    where a.submission_mode = 'link'
      and a.submission_closes_at > now()
      and a.submission_closes_at <= now() + interval '24 hours'
      and a.status <> 'draft'
  ) c
  join private.assessment_teachers() t on t.assessment_id = c.id
  where c.missing > 0;

  -- (5) لمالك المدرسة/المركز: معلمون لديهم أوراق متأخرة أكثر من 3 أيام.
  perform private.add_notification(m.user_id, x.organization_id, 'teachers_overdue',
    'معلمون متأخرون في اعتماد الأوراق',
    case when x.teachers = 1 then 'معلم واحد لديه ' else 'لدى ' || x.teachers || ' معلمين ' end ||
      x.papers || ' ورقة تنتظر الاعتماد منذ أكثر من 3 أيام.',
    private.notify_link('/school/teachers', x.organization_id),
    'teachers_overdue:' || x.organization_id::text || ':' || v_day)
  from (
    select t.organization_id, count(distinct t.user_id) as teachers, count(distinct s.id) as papers
    from public.submissions s
    join private.assessment_teachers() t on t.assessment_id = s.assessment_id
    join public.organizations o on o.id = t.organization_id and o.kind <> 'individual_teacher'
    where s.status = 'needs_review'
      and coalesce(s.graded_at, s.updated_at) < now() - interval '3 days'
      and not exists (select 1 from public.memberships mo
                      where mo.organization_id = t.organization_id and mo.user_id = t.user_id and mo.role = 'owner')
    group by t.organization_id
  ) x
  join public.memberships m on m.organization_id = x.organization_id and m.role = 'owner' and m.status = 'active';

  -- (6) الاشتراك: التجربة تنتهي خلال 3 أيام.
  perform private.add_notification(m.user_id, sub.organization_id, 'trial_ending',
    'الفترة التجريبية تنتهي قريباً',
    case when sub.trial_ends_on = private.gaza_now()::date then 'تنتهي فترتك التجريبية اليوم.'
         else 'تنتهي فترتك التجريبية خلال ' || (sub.trial_ends_on - private.gaza_now()::date) || ' أيام.' end ||
      ' اشترك حتى يستمر التصحيح بدون توقف.',
    private.notify_link(private.area_path(m.user_id, sub.organization_id, '/app/billing', '/school/billing'), sub.organization_id),
    'trial_end:' || sub.id::text || ':' || sub.trial_ends_on::text)
  from public.subscriptions sub
  join public.memberships m on m.organization_id = sub.organization_id and m.role = 'owner' and m.status = 'active'
  where sub.status = 'trial'
    and sub.trial_ends_on between private.gaza_now()::date and private.gaza_now()::date + 3;

  -- (7) فاتورة جديدة أو متأخرة.
  perform private.add_notification(m.user_id, i.organization_id,
    case when i.status = 'overdue' then 'invoice_overdue' else 'invoice_issued' end,
    case when i.status = 'overdue' then 'فاتورة متأخرة' else 'فاتورة جديدة' end,
    'فاتورة رقم ' || i.number || ' بمبلغ ' || trim(to_char(i.amount, 'FM999999990.##')) || ' ' ||
      coalesce(nullif(i.currency_code, 'ILS'), '₪') ||
      case when i.status = 'overdue' then ' تجاوزت موعد الدفع. ادفع وارفع الإيصال حتى لا تتوقف أدوات التصحيح.'
           when i.due_on is not null then '، آخر موعد للدفع ' || to_char(i.due_on, 'DD/MM') || '.'
           else '.' end,
    private.notify_link(private.area_path(m.user_id, i.organization_id, '/app/billing', '/school/billing'), i.organization_id),
    case when i.status = 'overdue' then 'invoice_overdue:' else 'invoice_issued:' end || i.id::text)
  from public.invoices i
  join public.memberships m on m.organization_id = i.organization_id and m.role = 'owner' and m.status = 'active'
  where (i.status = 'issued' and i.created_at > now() - interval '3 days')
     or (i.status = 'overdue' and i.due_on >= current_date - 7);

  select count(*) into v_after from public.notifications where created_at > now() - interval '1 minute';
  return greatest(v_after - v_before, 0);
end $$;
revoke execute on function public.generate_notifications() from public, anon, authenticated;
grant execute on function public.generate_notifications() to service_role;

-- ---------------------------------------------------------------------------
-- 5) إرسال إشعارات الجوال (وظيفة الخادم push)
-- ---------------------------------------------------------------------------
-- يحجز الإشعارات التي لم تُرسل بعد (آخر 24 ساعة) ويعيدها مع أجهزة أصحابها.
-- ما لا جهاز له يُعلَّم أيضاً حتى لا يُعاد فحصه.
create or replace function public.claim_pending_pushes(p_limit int default 200)
returns table (notification_id uuid, kind text, title text, body text, link text,
               subscription_id uuid, endpoint text, p256dh text, auth text)
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_notify_daytime() then
    return;
  end if;
  return query
  with picked as (
    select n.id from public.notifications n
    where n.pushed_at is null and n.created_at > now() - interval '24 hours'
    order by n.created_at
    limit greatest(1, least(p_limit, 500))
    for update skip locked
  ), marked as (
    update public.notifications n set pushed_at = now()
    from picked where n.id = picked.id
    returning n.id, n.user_id, n.kind, n.title, n.body, n.link, n.read_at
  )
  select m.id, m.kind, m.title, m.body, m.link, ps.id, ps.endpoint, ps.p256dh, ps.auth
  from marked m join public.push_subscriptions ps on ps.user_id = m.user_id
  where m.read_at is null;
end $$;
revoke execute on function public.claim_pending_pushes(int) from public, anon, authenticated;
grant execute on function public.claim_pending_pushes(int) to service_role;

-- نتيجة الإرسال لكل جهاز: نجاح، أو فشل (يُحذف الجهاز إن انتهى اشتراكه أو فشل 5 مرات).
create or replace function public.record_push_result(p_subscription uuid, p_ok boolean, p_gone boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_ok then
    update public.push_subscriptions set last_success_at = now(), failures = 0 where id = p_subscription;
  elsif p_gone then
    delete from public.push_subscriptions where id = p_subscription;
  else
    update public.push_subscriptions set failures = failures + 1 where id = p_subscription;
    delete from public.push_subscriptions where id = p_subscription and failures >= 5;
  end if;
end $$;
revoke execute on function public.record_push_result(uuid, boolean, boolean) from public, anon, authenticated;
grant execute on function public.record_push_result(uuid, boolean, boolean) to service_role;

-- مفاتيح VAPID لإشعارات الجوال: تولّدها وظيفة الخادم أول مرة وتُحفظ هنا فقط
-- (لا في الكود ولا في Git). المفتاح العام ليس سراً، الخاص لا يخرج من الخادم.
create or replace function public.push_vapid_keys(p_new text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v text;
begin
  if p_new is not null then
    insert into private.app_secrets (name, value) values ('push_vapid', p_new)
    on conflict (name) do nothing;
  end if;
  select value into v from private.app_secrets where name = 'push_vapid';
  return v;
end $$;
revoke execute on function public.push_vapid_keys(text) from public, anon, authenticated;
grant execute on function public.push_vapid_keys(text) to service_role;

-- كل 10 دقائق: أنشئ الملخصات (مرة كل ساعة تكفي، والتكرار ممنوع بـ dedupe_key)،
-- ثم أيقظ وظيفة الخادم فقط إن كان هناك ما يُرسل لجهاز مسجّل.
create or replace function private.run_notifications()
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_url text;
  v_token text;
begin
  if not private.is_notify_daytime() then
    return;
  end if;
  if extract(minute from now()) < 10 then
    perform public.generate_notifications();
  end if;
  select value into v_url from private.app_secrets where name = 'functions_url';
  select value into v_token from private.app_secrets where name = 'weekly_reports_token';
  if v_url is null or to_regnamespace('net') is null then
    return;
  end if;
  if not exists (
    select 1 from public.notifications n
    where n.pushed_at is null and n.created_at > now() - interval '24 hours'
  ) then
    return;
  end if;
  if not exists (
    select 1 from public.notifications n join public.push_subscriptions ps on ps.user_id = n.user_id
    where n.pushed_at is null and n.created_at > now() - interval '24 hours'
  ) then
    -- لا أجهزة لأصحابها: علّمها حتى لا نعيد الفحص كل مرة.
    update public.notifications set pushed_at = now()
    where pushed_at is null and created_at > now() - interval '24 hours';
    return;
  end if;
  execute 'select net.http_post(url := $1, headers := $2, body := $3)'
    using v_url || '/push',
          jsonb_build_object('Content-Type', 'application/json', 'x-daqa-cron', v_token),
          '{}'::jsonb;
end $$;
revoke execute on function private.run_notifications() from public, anon, authenticated;

-- تنظيف: الإشعارات أقدم من 60 يوماً تُحذف.
create or replace function private.cleanup_notifications()
returns void language sql security definer set search_path = '' as $$
  delete from public.notifications where created_at < now() - interval '60 days'
$$;
revoke execute on function private.cleanup_notifications() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute $cmd$select cron.schedule('daqa-notifications', '*/10 * * * *', 'select private.run_notifications()')$cmd$;
    execute $cmd$select cron.schedule('daqa-notifications-cleanup', '30 2 * * *', 'select private.cleanup_notifications()')$cmd$;
  end if;
exception when others then
  raise warning 'notifications schedule not created: %', sqlerrm;
end $$;
