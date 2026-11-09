-- إيقاف الاشتراك الشهري مؤقتاً (مثلاً في أشهر الإجازة).
-- المدرّس صاحب الاشتراك الشهري يوقفه من شاشة الاشتراك، بتاريخ رجوع أو بدونه.
-- أيام الإيقاف لا تُحسب في الفاتورة، وخلالها لا تُقبل أوراق جديدة. البيانات تبقى كما هي.
-- اشتراكات المدارس السنوية لا تتأثر (تُدفع على دفعتين بغضّ النظر عن الإجازة).

create table public.subscription_pauses (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  subscription_id  uuid not null references public.subscriptions (id) on delete cascade,
  starts_on        date not null,
  ends_on          date,                        -- فارغ = موقوف حتى يرجع بنفسه
  created_by       uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  constraint subscription_pauses_dates check (ends_on is null or ends_on >= starts_on)
);
create index subscription_pauses_org_idx on public.subscription_pauses (organization_id, starts_on);

alter table public.subscription_pauses enable row level security;
create policy subscription_pauses_select on public.subscription_pauses for select to authenticated
  using (private.is_org_owner(organization_id) or private.is_platform_admin());
grant select on public.subscription_pauses to authenticated;
-- الإضافة والتعديل عبر الدوال أدناه فقط.

-- هل اشتراك الجهة موقوف في يوم معيّن؟
create or replace function private.org_paused_on(p_org uuid, p_day date default current_date)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.subscription_pauses
     where organization_id = p_org and starts_on <= p_day and (ends_on is null or ends_on >= p_day))
$$;

-- عدد أيام الإيقاف داخل فترة.
create or replace function private.paused_days(p_org uuid, p_from date, p_to date)
returns int language sql stable security definer set search_path = '' as $$
  select coalesce(sum(greatest(0, least(coalesce(ends_on, p_to), p_to) - greatest(starts_on, p_from) + 1)), 0)::int
    from public.subscription_pauses
   where organization_id = p_org
$$;

-- الإيقاف الحالي أو القادم (لعرضه في الشاشة).
create or replace function public.my_subscription_pause(p_org uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v record;
begin
  if not (private.is_org_owner(p_org) or private.is_platform_admin()) then
    raise exception 'ليس لديك صلاحية لهذا الإجراء' using errcode = '42501';
  end if;
  select starts_on, ends_on into v from public.subscription_pauses
   where organization_id = p_org and (ends_on is null or ends_on >= current_date)
   order by starts_on limit 1;
  if v.starts_on is null then
    return null;
  end if;
  return jsonb_build_object('starts_on', v.starts_on, 'ends_on', v.ends_on, 'active', v.starts_on <= current_date);
end $$;
revoke execute on function public.my_subscription_pause(uuid) from public, anon;
grant execute on function public.my_subscription_pause(uuid) to authenticated;

-- إيقاف الاشتراك الشهري. p_from فارغ = من اليوم. p_until فارغ = بدون تاريخ رجوع.
create or replace function public.pause_subscription(p_org uuid, p_from date default null, p_until date default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_sub uuid;
  v_cycle text;
  v_from date := coalesce(p_from, current_date);
begin
  if not (private.is_org_owner(p_org) or private.is_platform_admin()) then
    raise exception 'إيقاف الاشتراك لصاحب الحساب فقط' using errcode = '42501';
  end if;
  select s.id, p.billing_cycle::text into v_sub, v_cycle
    from public.subscriptions s join public.subscription_plans p on p.id = s.plan_id
   where s.organization_id = p_org and s.status in ('trial', 'active', 'past_due')
   limit 1;
  if v_sub is null then
    raise exception 'لا يوجد اشتراك لإيقافه';
  end if;
  if v_cycle <> 'monthly' then
    raise exception 'الإيقاف متاح للاشتراك الشهري فقط. الاشتراك السنوي يشمل أشهر الإجازة.';
  end if;
  if v_from < current_date then
    raise exception 'تاريخ بداية الإيقاف لا يمكن أن يكون في الماضي';
  end if;
  if p_until is not null and p_until < v_from then
    raise exception 'تاريخ الرجوع يجب أن يكون بعد تاريخ الإيقاف';
  end if;
  if exists (select 1 from public.subscription_pauses
              where organization_id = p_org and (ends_on is null or ends_on >= current_date)) then
    raise exception 'الاشتراك عليه إيقاف من قبل. ألغِه أولاً ثم أوقفه من جديد.';
  end if;
  insert into public.subscription_pauses (organization_id, subscription_id, starts_on, ends_on, created_by)
  values (p_org, v_sub, v_from, p_until, auth.uid());
end $$;
revoke execute on function public.pause_subscription(uuid, date, date) from public, anon;
grant execute on function public.pause_subscription(uuid, date, date) to authenticated;

-- إرجاع الاشتراك الآن (أو إلغاء إيقاف لم يبدأ بعد).
create or replace function public.resume_subscription(p_org uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not (private.is_org_owner(p_org) or private.is_platform_admin()) then
    raise exception 'ليس لديك صلاحية لهذا الإجراء' using errcode = '42501';
  end if;
  -- إيقاف لم يبدأ بعد (أو بدأ اليوم): يُحذف كأنه لم يكن.
  delete from public.subscription_pauses
   where organization_id = p_org and starts_on >= current_date;
  -- إيقاف جارٍ: ينتهي أمس، فيُحسب اليوم كيوم عادي.
  update public.subscription_pauses
     set ends_on = current_date - 1
   where organization_id = p_org and starts_on < current_date and (ends_on is null or ends_on >= current_date);
end $$;
revoke execute on function public.resume_subscription(uuid) from public, anon;
grant execute on function public.resume_subscription(uuid) to authenticated;

-- لا أوراق جديدة خلال الإيقاف.
create or replace function private.block_submission_when_paused()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if private.org_paused_on(new.organization_id) then
    raise exception 'الاشتراك موقوف مؤقتاً. أرجِعه من شاشة الاشتراك لتستقبل أوراقاً جديدة.';
  end if;
  return new;
end $$;
create trigger submissions_block_when_paused before insert on public.submissions
  for each row execute function private.block_submission_when_paused();

-- حساب الفاتورة: نفس السابق، لكن الاشتراك الشهري لكل طالب يُخصم منه نسبة أيام الإيقاف.
create or replace function private.usage_quote(p_org uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v record;
  v_from date;
  v_units int;
  v_price numeric;
  v_amount numeric(12,2);
  v_days int;
  v_paused int := 0;
begin
  select s.id as sub_id, s.price_per_student as agreed_price, s.started_on, s.status,
         p.name as plan_name, p.pricing_model, p.tiers, p.billing_cycle, p.installments, p.currency_code
    into v
    from public.subscriptions s join public.subscription_plans p on p.id = s.plan_id
   where s.organization_id = p_org and s.status in ('trial', 'active', 'past_due')
   limit 1;
  if v.sub_id is null then
    return null;
  end if;
  v_from := private.unbilled_from(p_org, v.started_on);
  v_days := greatest(1, current_date - v_from + 1);
  if v.pricing_model = 'per_paper' then
    select count(*)::int into v_units from public.submissions
     where organization_id = p_org and created_at >= v_from and created_at < current_date + 1;
  else
    select count(distinct s.id)::int into v_units
      from public.students s
      join public.group_students gs on gs.student_id = s.id and gs.left_at is null
      join public.groups g on g.id = gs.group_id and g.archived_at is null
     where s.organization_id = p_org and s.status = 'active';
  end if;
  v_price := private.unit_price(v.tiers, v.agreed_price, v_units);
  v_amount := round(v_units * v_price / case when v.billing_cycle = 'yearly' then greatest(1, v.installments) else 1 end, 2);
  if v.billing_cycle = 'monthly' and v.pricing_model <> 'per_paper' then
    v_paused := least(v_days, private.paused_days(p_org, v_from, current_date));
    v_amount := round(v_amount * (v_days - v_paused) / v_days, 2);
  end if;
  return jsonb_build_object(
    'subscription_id', v.sub_id,
    'plan_name', v.plan_name,
    'subscription_status', v.status,
    'pricing_model', v.pricing_model,
    'billing_cycle', v.billing_cycle,
    'installments', v.installments,
    'period_start', v_from,
    'period_end', current_date,
    'period_days', v_days,
    'paused_days', v_paused,
    'units', v_units,
    'unit_price', v_price,
    'amount', v_amount,
    'currency_code', v.currency_code);
end $$;
