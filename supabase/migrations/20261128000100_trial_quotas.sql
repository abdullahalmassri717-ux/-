-- حدود الفترة التجريبية (قرار صاحب المشروع 2026-11-28).
-- التجربة مقيّدة بعدد الاستخدام لا بالمدة فقط، حتى لا يأخذ أحد شهراً مجانياً
-- ثم يسجّل برقم جديد ويأخذ شهراً آخر بلا حدود:
--   • عدد الأوراق المصحّحة بالذكاء الاصطناعي خلال التجربة.
--   • عدد طلبات أدوات الذكاء الاصطناعي (توليد أسئلة، معايير، خطة، مساعد...).
-- الأرقام في الإعدادات ← trial (للمدرّس، وللمدرسة/المركز)، ويغيّرها مدير المنصة.
-- تُطبَّق في وظائف الخادم ما دامت الجهة لم تدفع أول فاتورة بعد.
-- بعد أول دفعة لا حدود تجريبية. ويمكن لصاحب الجهة طلب فاتورة الاشتراك مبكراً. الأوراق لا تُرفض: تُحفظ وتنتظر حتى الاشتراك.
--
-- وإجراء خفيف ضد التسجيل المكرر: كل جهاز يُعطى رقماً عشوائياً عند التسجيل،
-- ولوحة المدير تنبّه عند الموافقة إن كانت الجهة الجديدة من نفس الجهاز أو
-- بنفس الاسم أو باسم مالك مطابق لجهة سابقة.

-- ---------------------------------------------------------------------------
-- 1) الإعدادات الافتراضية (لا تغيّر ما ضبطه المدير)
-- ---------------------------------------------------------------------------
insert into public.platform_settings (key, value, is_public)
values ('trial', '{"days": 30}', true)
on conflict (key) do nothing;
update public.platform_settings
   set value = '{"papers_teacher": 150, "ai_teacher": 50, "papers_school": 600, "ai_school": 150}'::jsonb || value
 where key = 'trial';

-- ---------------------------------------------------------------------------
-- 2) عدّاد طلبات أدوات الذكاء الاصطناعي في التجربة (طلب ناجح = 1)
-- ---------------------------------------------------------------------------
create table if not exists public.trial_usage (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  ai_requests     int not null default 0,
  updated_at      timestamptz not null default now()
);
alter table public.trial_usage enable row level security;
revoke all on public.trial_usage from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) حالة رصيد التجربة لجهة
-- ---------------------------------------------------------------------------
create or replace function private.trial_quota(p_org uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  o record;
  t jsonb;
  v_school boolean;
  v_trial boolean;
  v_papers int;
  v_ai int;
begin
  select kind, is_demo into o from public.organizations where id = p_org;
  if not found then
    return jsonb_build_object('in_trial', false);
  end if;
  -- الاستخدام المجاني محدود حتى أول دفعة حقيقية (فاتورة مدفوعة بمبلغ أكبر من صفر).
  -- لذلك فاتورة بصفر (بلا طلاب) لا تفتح استخداماً بلا حدود، وفي مهلة دفع
  -- الفاتورة الأولى يبقى الرصيد التجريبي هو الحد حتى يُؤكَّد الدفع.
  v_trial := not o.is_demo and not exists (
    select 1 from public.invoices i
     where i.organization_id = p_org and i.status = 'paid' and i.amount > 0);
  if not v_trial then
    return jsonb_build_object('in_trial', false);
  end if;

  select value into t from public.platform_settings where key = 'trial';
  t := coalesce(t, '{}'::jsonb);
  v_school := o.kind <> 'individual_teacher';

  -- الورقة تُحسب مرة واحدة مهما أُعيد تصحيحها.
  select count(distinct r.submission_id) into v_papers
    from public.grading_runs r
   where r.organization_id = p_org and r.status = 'succeeded';
  select coalesce(max(u.ai_requests), 0) into v_ai from public.trial_usage u where u.organization_id = p_org;

  return jsonb_build_object(
    'in_trial', true,
    'papers_used', v_papers,
    'papers_limit', coalesce((t ->> case when v_school then 'papers_school' else 'papers_teacher' end)::int,
                             case when v_school then 600 else 150 end),
    'ai_used', v_ai,
    'ai_limit', coalesce((t ->> case when v_school then 'ai_school' else 'ai_teacher' end)::int,
                         case when v_school then 150 else 50 end));
end $$;

-- هل انتهى رصيد نوع معيّن؟ ('papers' أو 'ai'). الحد 0 أو أقل = بلا حد.
create or replace function private.trial_exhausted(p_org uuid, p_kind text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  q jsonb := private.trial_quota(p_org);
  v_limit int;
begin
  if not coalesce((q ->> 'in_trial')::boolean, false) then
    return false;
  end if;
  v_limit := (q ->> (p_kind || '_limit'))::int;
  return v_limit > 0 and (q ->> (p_kind || '_used'))::int >= v_limit;
end $$;

-- لوظائف الخادم وللأعضاء (لعرض الرصيد).
create or replace function public.org_trial_quota(p_org uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not (private.is_org_member(p_org) or private.is_platform_admin()) then
    return null;
  end if;
  return private.trial_quota(p_org);
end $$;
revoke execute on function public.org_trial_quota(uuid) from public, anon;
grant execute on function public.org_trial_quota(uuid) to authenticated, service_role;

-- وظيفة الخادم تسجّل طلب أداة ناجحاً (يُحسب فقط أثناء التجربة).
create or replace function public.trial_count_ai_request(p_org uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not coalesce((private.trial_quota(p_org) ->> 'in_trial')::boolean, false) then
    return;
  end if;
  insert into public.trial_usage (organization_id, ai_requests) values (p_org, 1)
  on conflict (organization_id) do update
    set ai_requests = public.trial_usage.ai_requests + 1, updated_at = now();
end $$;
revoke execute on function public.trial_count_ai_request(uuid) from public, anon, authenticated;
grant execute on function public.trial_count_ai_request(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 4) التصحيح التلقائي للأوراق العالقة يتخطى الجهات التي انتهى رصيد تجربتها
--    (تبقى أوراقها محفوظة وتُصحَّح بعد الاشتراك، ولا تستهلك محاولاتها).
-- ---------------------------------------------------------------------------
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
      and private.billing_lock(s.organization_id) is null
      and not private.trial_exhausted(s.organization_id, 'papers')
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

-- ---------------------------------------------------------------------------
-- 5) شريط التنبيه: رصيد التجربة مع حالة الدفع
-- ---------------------------------------------------------------------------
create or replace function public.my_billing_state(p_org uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_owner boolean;
  v_lock text;
  s record;
  inv record;
  v_warn int := private.billing_policy_int('warn_days', 3);
  v_quota jsonb;
begin
  if not private.is_org_member(p_org) then
    return null;
  end if;
  v_owner := private.is_org_owner(p_org);
  v_lock := private.billing_lock(p_org);
  v_quota := private.trial_quota(p_org);
  if not coalesce((v_quota ->> 'in_trial')::boolean, false) then
    v_quota := null;
  end if;
  if not v_owner then
    return jsonb_build_object('locked', v_lock, 'owner', false, 'trial_quota', v_quota);
  end if;
  select status, trial_ends_on into s from public.subscriptions
   where organization_id = p_org and status in ('trial', 'active', 'past_due') limit 1;
  select number, amount, currency_code, due_on into inv from public.invoices
   where organization_id = p_org and enforce and amount > 0 and status in ('issued', 'overdue')
   order by due_on limit 1;
  return jsonb_build_object(
    'locked', v_lock,
    'owner', true,
    'trial_quota', v_quota,
    'trial_ends_on', case when s.status = 'trial' and s.trial_ends_on - current_date between 0 and v_warn then s.trial_ends_on end,
    'invoice', case when inv.number is not null then
      jsonb_build_object('number', inv.number, 'amount', inv.amount, 'currency', inv.currency_code, 'due_on', inv.due_on) end,
    'pending_receipt', exists (select 1 from public.invoices
                                where organization_id = p_org and status = 'pending_confirmation'));
end $$;
revoke execute on function public.my_billing_state(uuid) from public, anon;
grant execute on function public.my_billing_state(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 6) رقم الجهاز عند التسجيل (رقم عشوائي من المتصفح، ليس بيانات شخصية)
-- ---------------------------------------------------------------------------
alter table public.organizations add column if not exists signup_device text
  check (signup_device is null or signup_device ~ '^[0-9a-zA-Z-]{8,64}$');

drop function if exists public.create_organization(text, text, text);
create or replace function public.create_organization(p_name text, p_type text, p_full_name text, p_device text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_org uuid;
  v_device text := case when p_device ~ '^[0-9a-zA-Z-]{8,64}$' then p_device end;
begin
  if v_uid is null then
    raise exception 'يجب تسجيل الدخول أولاً' using errcode = '42501';
  end if;

  insert into public.profiles (id, full_name)
  values (v_uid, nullif(trim(p_full_name), ''))
  on conflict (id) do update
    set full_name = coalesce(nullif(trim(excluded.full_name), ''), public.profiles.full_name);

  insert into public.organizations (name, kind, created_by, status, approved_at, signup_device)
  values (trim(p_name), p_type::public.org_kind, v_uid, 'pending', null, v_device)
  returning id into v_org;

  insert into public.memberships (organization_id, user_id, role, status)
  values (v_org, v_uid, 'owner', 'active');

  return v_org;
end $$;
revoke execute on function public.create_organization(text, text, text, text) from public, anon;
grant execute on function public.create_organization(text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 7) لوحة المدير: رصيد التجربة لكل جهة، وتنبيه «قد تكون مكررة»
-- ---------------------------------------------------------------------------
create or replace function private.norm_name(p text)
returns text language sql immutable set search_path = '' as $$
  select nullif(
    translate(regexp_replace(lower(coalesce(p, '')), '[[:space:][:punct:]ـً-ٰٟ]+', '', 'g'), 'أإآةى', 'اااهي'),
    '')
$$;

create or replace function public.admin_trial_overview()
returns table (organization_id uuid, in_trial boolean, papers_used int, papers_limit int,
               ai_used int, ai_limit int, duplicate_hint text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.admin_can('finance', 'orgs') then
    raise exception 'هذا الإجراء لمدير المنصة فقط' using errcode = '42501';
  end if;
  return query
  with q as (
    select o.id, o.name, o.created_at, o.signup_device, o.is_demo,
           private.norm_name(o.name) as nname,
           private.norm_name(p.full_name) as nowner,
           case when o.status = 'pending' or o.created_at > now() - interval '60 days'
                then private.trial_quota(o.id) end as quota
      from public.organizations o
      left join public.profiles p on p.id = o.created_by
  )
  select q.id,
         coalesce((q.quota ->> 'in_trial')::boolean, false),
         (q.quota ->> 'papers_used')::int, (q.quota ->> 'papers_limit')::int,
         (q.quota ->> 'ai_used')::int, (q.quota ->> 'ai_limit')::int,
         case when q.quota is not null then (select case
                   when q.signup_device is not null and o2.signup_device = q.signup_device
                     then 'سُجّلت من نفس جهاز «' || o2.name || '»'
                   when o2nname = q.nname then 'نفس اسم «' || o2.name || '»'
                   else 'اسم المالك مطابق لمالك «' || o2.name || '»'
                 end
            from (select o.id, o.name, o.signup_device, o.created_at,
                         private.norm_name(o.name) as o2nname,
                         private.norm_name(p.full_name) as o2owner
                    from public.organizations o
                    left join public.profiles p on p.id = o.created_by
                   where o.id <> q.id and not o.is_demo) o2
           where o2.created_at < q.created_at
             and ((q.signup_device is not null and o2.signup_device = q.signup_device)
                  or o2nname = q.nname
                  or (q.nowner is not null and length(q.nowner) >= 6 and o2.o2owner = q.nowner))
           order by (q.signup_device is not null and o2.signup_device = q.signup_device) desc, o2.created_at desc
           limit 1) end
    from q
   where not q.is_demo;
end $$;
revoke execute on function public.admin_trial_overview() from public, anon;
grant execute on function public.admin_trial_overview() to authenticated;

-- ---------------------------------------------------------------------------
-- 8) «اشترك الآن»: صاحب الجهة يطلب فاتورة الاشتراك قبل نهاية التجربة
--    (مثلاً عندما ينتهي رصيد التجربة). تُصدر الفاتورة التلقائية نفسها من اليوم.
-- ---------------------------------------------------------------------------
create or replace function public.request_subscription_invoice(p_org uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_sub uuid;
  v_id uuid;
begin
  if not private.is_org_owner(p_org) then
    raise exception 'هذا الإجراء لصاحب الجهة فقط' using errcode = '42501';
  end if;
  if exists (select 1 from public.invoices
              where organization_id = p_org and amount > 0
                and status in ('issued', 'overdue', 'pending_confirmation')) then
    raise exception 'لديك فاتورة اشتراك مفتوحة. ادفعها من هذه الصفحة.' using errcode = 'P0001';
  end if;
  select id into v_sub from public.subscriptions
   where organization_id = p_org and status = 'trial' limit 1;
  if v_sub is null then
    raise exception 'لا توجد فترة تجريبية لطلب فاتورة لها. تواصل مع الدعم.' using errcode = 'P0001';
  end if;
  update public.subscriptions set next_invoice_on = current_date where id = v_sub;
  v_id := private.auto_issue_invoice(v_sub);
  if v_id is null then
    raise exception 'تعذّر إصدار الفاتورة. تواصل مع الدعم.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.invoices where id = v_id and amount = 0) then
    raise exception 'أضف طلابك أولاً، فالاشتراك يُحسب حسب عدد الطلاب.' using errcode = 'P0001';
  end if;
  return v_id;
end $$;
revoke execute on function public.request_subscription_invoice(uuid) from public, anon;
grant execute on function public.request_subscription_invoice(uuid) to authenticated;
