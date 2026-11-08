-- ============================================================================
-- دقة — لوحة مدير المنصة: إدارة الجهات، الفواتير والدفعات، والتسعير حسب الاستخدام.
--
-- 1) حالة الجهة: pending (بانتظار موافقة مدير المنصة) / active / disabled.
--    • الجهة التي تُنشأ من صفحة التسجيل تبدأ «بانتظار الموافقة».
--    • الجهة غير النشطة لا يصل أعضاؤها لبياناتها (القاعدة نفسها ترفض، لا الواجهة فقط).
--    • مدير المنصة: يوافق، يعطّل، يعدّل، يغيّر الباقة، يحذف، أو يضيف جهة بنفسه.
-- 2) التسعير حسب الاستخدام: لكل باقة طريقة (لكل طالب مسجّل أو لكل ورقة مصحّحة)
--    وسعر للوحدة، مع شرائح اختيارية حسب العدد. لا يوجد حد أدنى.
-- 3) الفواتير: معاينة قبل الإصدار، إصدار جماعي للمدرّسين، فاتورة يدوية،
--    تسجيل دفعة يدوياً، وتغيير حالة الفاتورة بحرية (مع حساب المدفوع جزئياً).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) حالة الجهة
-- ---------------------------------------------------------------------------
create type public.org_status as enum ('pending', 'active', 'disabled');

-- الجهات الموجودة تبقى نشطة؛ الجديدة من التسجيل تُنشأ «بانتظار الموافقة» في create_organization.
alter table public.organizations
  add column status public.org_status not null default 'active',
  add column status_note text,
  add column approved_at timestamptz;
update public.organizations set approved_at = created_at where approved_at is null;

create or replace function private.org_is_active(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.organizations where id = p_org and status = 'active')
$$;

-- عضو نشط في جهة نشطة.
create or replace function private.is_org_member(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    join public.organizations o on o.id = m.organization_id and o.status = 'active'
    where m.organization_id = p_org and m.user_id = (select auth.uid()) and m.status = 'active'
  )
$$;

create or replace function private.is_org_owner(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    join public.organizations o on o.id = m.organization_id and o.status = 'active'
    where m.organization_id = p_org and m.user_id = (select auth.uid())
      and m.status = 'active' and m.role = 'owner'
  )
$$;

-- نفس الفحصين بغض النظر عن حالة الجهة: ليرى المالك جهته وهي بانتظار الموافقة
-- (اسمها وحالتها)، ويكمل بيانات التسجيل (المنطقة ودعوات المعلمين).
create or replace function private.is_org_member_any_status(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships
    where organization_id = p_org and user_id = (select auth.uid()) and status = 'active'
  )
$$;
create or replace function private.is_org_owner_any_status(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships
    where organization_id = p_org and user_id = (select auth.uid()) and status = 'active' and role = 'owner'
  )
$$;

create or replace function private.is_group_teacher(p_group uuid)
returns boolean language sql volatile security definer set search_path = '' as $$
  select exists (
    select 1
    from public.group_teachers gt
    join public.memberships m
      on m.organization_id = gt.organization_id and m.user_id = gt.user_id and m.status = 'active'
    join public.organizations o on o.id = gt.organization_id and o.status = 'active'
    where gt.group_id = p_group and gt.user_id = (select auth.uid())
  )
$$;

create or replace function private.can_access_group(p_group uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.groups g
    join public.organizations o on o.id = g.organization_id and o.status = 'active'
    join public.memberships m
      on m.organization_id = g.organization_id
     and m.user_id = (select auth.uid())
     and m.status = 'active'
    where g.id = p_group
      and (m.role = 'owner' or private.is_group_teacher(g.id))
  )
$$;

create or replace function private.can_access_student(p_student uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.students s
    join public.organizations o on o.id = s.organization_id and o.status = 'active'
    join public.memberships m
      on m.organization_id = s.organization_id
     and m.user_id = (select auth.uid())
     and m.status = 'active'
    where s.id = p_student
      and (m.role = 'owner'
           or exists (select 1
                      from public.group_students gs
                      join public.group_teachers gt on gt.group_id = gs.group_id
                      where gs.student_id = s.id and gt.user_id = m.user_id))
  )
$$;
grant execute on all functions in schema private to authenticated, service_role;

drop policy organizations_select on public.organizations;
create policy organizations_select on public.organizations for select to authenticated
  using (private.is_org_member_any_status(id) or private.is_platform_admin());
drop policy organizations_update on public.organizations;
create policy organizations_update on public.organizations for update to authenticated
  using (private.is_org_owner_any_status(id)) with check (private.is_org_owner_any_status(id));
-- المالك لا يغيّر حالة جهته بنفسه.
revoke update on public.organizations from authenticated;
grant update (name, region, logo_path) on public.organizations to authenticated;

drop policy invitations_owner_all on public.invitations;
create policy invitations_owner_all on public.invitations for all to authenticated
  using (private.is_org_owner_any_status(organization_id)) with check (private.is_org_owner_any_status(organization_id));

-- التسجيل الذاتي: الجهة تنتظر موافقة مدير المنصة.
create or replace function public.create_organization(p_name text, p_type text, p_full_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_org uuid;
begin
  if v_uid is null then
    raise exception 'يجب تسجيل الدخول أولاً' using errcode = '42501';
  end if;

  insert into public.profiles (id, full_name)
  values (v_uid, nullif(trim(p_full_name), ''))
  on conflict (id) do update
    set full_name = coalesce(nullif(trim(excluded.full_name), ''), public.profiles.full_name);

  insert into public.organizations (name, kind, created_by, status, approved_at)
  values (trim(p_name), p_type::public.org_kind, v_uid, 'pending', null)
  returning id into v_org;

  insert into public.memberships (organization_id, user_id, role, status)
  values (v_org, v_uid, 'owner', 'active');

  return v_org;
end $$;

-- ---------------------------------------------------------------------------
-- 2) التسعير حسب الاستخدام
-- ---------------------------------------------------------------------------
alter table public.subscription_plans
  add column pricing_model text not null default 'per_student'
    check (pricing_model in ('per_student', 'per_paper')),
  -- شرائح اختيارية: [{"up_to": 50, "price": 5}, {"up_to": null, "price": 4}]
  -- السعر الذي يُطبَّق هو سعر الشريحة التي يقع فيها العدد كله.
  add column tiers jsonb not null default '[]'::jsonb
    check (jsonb_typeof(tiers) = 'array');

-- إلغاء الحد الأدنى: الدفع حسب الاستخدام الفعلي من طالب واحد.
update public.subscription_plans set minimum_charge = 0, min_students = null;
update public.subscription_plans
   set notes = 'لكل طالب مسجّل شهرياً، تدفع حسب عدد طلابك الفعلي (من طالب واحد فأكثر)'
 where slug = 'teacher_monthly';
update public.platform_settings set value = value - 'teacher_monthly_minimum' where key = 'pricing';

-- سعر الوحدة لعدد معيّن (الشريحة، وإلا السعر الأساسي).
create or replace function private.unit_price(p_tiers jsonb, p_base numeric, p_units int)
returns numeric language sql immutable set search_path = '' as $$
  select coalesce(
    (select (t ->> 'price')::numeric
       from jsonb_array_elements(coalesce(p_tiers, '[]'::jsonb)) t
      where (t ->> 'up_to') is null or p_units <= (t ->> 'up_to')::int
      order by coalesce((t ->> 'up_to')::int, 2147483647)
      limit 1),
    p_base)
$$;

alter table public.invoices
  add column pricing_model text,
  add column units int,
  add column notes text;
update public.invoices set pricing_model = 'per_student', units = active_students where pricing_model is null;

-- ---------------------------------------------------------------------------
-- 3) الفواتير والدفعات
-- ---------------------------------------------------------------------------
-- طرق دفع إضافية يسجّلها المدير يدوياً.
alter type public.payment_method add value if not exists 'cash';
alter type public.payment_method add value if not exists 'other';

alter table public.payment_receipts add column recorded_by_admin boolean not null default false;

-- يعيد حساب حالة الفاتورة من الدفعات: مدفوعة إذا غطّت الدفعات المؤكدة المبلغ،
-- «بانتظار التأكيد» إذا وُجد إيصال معلّق، وإلا تبقى مستحقة (والمدفوع جزئياً يظهر في الشاشة).
create or replace function private.refresh_invoice_status(p_invoice uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_inv public.invoices%rowtype;
  v_paid numeric;
  v_pending boolean;
begin
  select * into v_inv from public.invoices where id = p_invoice;
  if v_inv.id is null or v_inv.status = 'void' then
    return;
  end if;
  select coalesce(sum(amount) filter (where status = 'confirmed'), 0),
         bool_or(status = 'pending')
    into v_paid, v_pending
    from public.payment_receipts where invoice_id = p_invoice;
  if v_paid >= v_inv.amount then
    if v_inv.status <> 'paid' then
      update public.invoices set status = 'paid' where id = p_invoice;
    end if;
  elsif coalesce(v_pending, false) then
    if v_inv.status in ('issued', 'overdue') then
      update public.invoices set status = 'pending_confirmation' where id = p_invoice;
    end if;
  elsif v_inv.status = 'pending_confirmation' then
    update public.invoices set status = 'issued' where id = p_invoice;
  end if;
end $$;

create or replace function private.sync_invoice_with_receipt()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if (select organization_id from public.invoices where id = new.invoice_id) <> new.organization_id then
      raise exception 'الإيصال لا يخص هذه الجهة';
    end if;
    if new.status <> 'pending' then
      new.reviewed_by := auth.uid();
      new.reviewed_at := now();
    end if;
  elsif new.status is distinct from old.status then
    new.reviewed_by := auth.uid();
    new.reviewed_at := now();
  end if;
  return new;
end $$;

create or replace function private.after_receipt_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.refresh_invoice_status(coalesce(new.invoice_id, old.invoice_id));
  return null;
end $$;
create trigger payment_receipts_refresh_invoice after insert or update or delete on public.payment_receipts
  for each row execute function private.after_receipt_change();

-- وقت الدفع يتبع الحالة (حتى عند تغييرها يدوياً).
create or replace function private.invoice_paid_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    new.paid_at := coalesce(new.paid_at, now());
  elsif new.status <> 'paid' then
    new.paid_at := null;
  end if;
  return new;
end $$;
create trigger invoices_paid_at before update on public.invoices
  for each row execute function private.invoice_paid_at();

-- حذف دفعة سجّلها المدير خطأً.
create policy receipts_admin_delete on public.payment_receipts for delete to authenticated
  using (private.is_platform_admin());
grant delete on public.payment_receipts to authenticated;

-- بداية الفترة التي لم تُفوتر بعد لاشتراك.
create or replace function private.unbilled_from(p_org uuid, p_sub_start date)
returns date language sql stable security definer set search_path = '' as $$
  select least(current_date, coalesce(
    (select max(period_end) + 1 from public.invoices where organization_id = p_org and status <> 'void'),
    p_sub_start, current_date))
$$;

-- الاستخدام والمبلغ لجهة الآن (بلا أسماء طلاب). يستخدمه المدير للمعاينة والإصدار.
create or replace function private.usage_quote(p_org uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v record;
  v_from date;
  v_units int;
  v_price numeric;
  v_amount numeric(12,2);
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
  return jsonb_build_object(
    'subscription_id', v.sub_id,
    'plan_name', v.plan_name,
    'subscription_status', v.status,
    'pricing_model', v.pricing_model,
    'billing_cycle', v.billing_cycle,
    'installments', v.installments,
    'period_start', v_from,
    'period_end', current_date,
    'units', v_units,
    'unit_price', v_price,
    'amount', v_amount,
    'currency_code', v.currency_code);
end $$;

create or replace function public.admin_invoice_preview(p_org uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then
    raise exception 'هذا الإجراء لمدير المنصة فقط' using errcode = '42501';
  end if;
  return private.usage_quote(p_org);
end $$;
revoke execute on function public.admin_invoice_preview(uuid) from public, anon;
grant execute on function public.admin_invoice_preview(uuid) to authenticated;

-- المالك يرى تقدير فاتورته القادمة (أعداد فقط).
create or replace function public.my_usage_quote(p_org uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_org_owner(p_org) then
    raise exception 'ليس لديك صلاحية لهذا الإجراء' using errcode = '42501';
  end if;
  return private.usage_quote(p_org);
end $$;
revoke execute on function public.my_usage_quote(uuid) from public, anon;
grant execute on function public.my_usage_quote(uuid) to authenticated;

-- إصدار فاتورة حسب الاستخدام. p_amount يسمح للمدير بتعديل المبلغ يدوياً.
drop function public.admin_issue_invoice(uuid);
create or replace function public.admin_issue_invoice(p_org uuid, p_amount numeric default null, p_note text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  q jsonb;
  v_id uuid;
  v_no int;
  v_amount numeric(12,2);
begin
  if not private.is_platform_admin() then
    raise exception 'هذا الإجراء لمدير المنصة فقط' using errcode = '42501';
  end if;
  q := private.usage_quote(p_org);
  if q is null then
    raise exception 'لا يوجد اشتراك لهذه الجهة';
  end if;
  v_amount := coalesce(p_amount, (q ->> 'amount')::numeric);
  if v_amount < 0 then
    raise exception 'المبلغ لا يمكن أن يكون سالباً';
  end if;
  select count(*) + 1 into v_no from public.invoices where organization_id = p_org;

  insert into public.invoices (organization_id, subscription_id, number, period_start, period_end, installment_no,
                               active_students, price_per_student, amount, currency_code, status, due_on,
                               pricing_model, units, notes, paid_at)
  values (p_org, (q ->> 'subscription_id')::uuid,
          'INV-' || to_char(current_date, 'YYMM') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
          (q ->> 'period_start')::date, (q ->> 'period_end')::date, v_no,
          case when q ->> 'pricing_model' = 'per_student' then (q ->> 'units')::int else 0 end,
          (q ->> 'unit_price')::numeric, v_amount, q ->> 'currency_code',
          case when v_amount = 0 then 'paid'::public.invoice_status else 'issued'::public.invoice_status end,
          current_date + 7, q ->> 'pricing_model', (q ->> 'units')::int, nullif(trim(p_note), ''),
          case when v_amount = 0 then now() end)
  returning id into v_id;

  update public.subscriptions
     set status = case when status = 'trial' then 'active'::public.subscription_status else status end,
         current_period_start = (q ->> 'period_start')::date,
         current_period_end = (q ->> 'period_end')::date
   where id = (q ->> 'subscription_id')::uuid;
  return v_id;
end $$;
revoke execute on function public.admin_issue_invoice(uuid, numeric, text) from public, anon;
grant execute on function public.admin_issue_invoice(uuid, numeric, text) to authenticated;

-- إصدار فواتير لكل الجهات النشطة من نوع معيّن (مثل كل المدرّسين) دفعة واحدة.
-- يتخطى: من لم تنتهِ فترته التجريبية، ومن صدرت له فاتورة هذا الشهر، ومن مبلغه صفر.
create or replace function public.admin_issue_invoices_bulk(p_kind text default 'individual_teacher')
returns int language plpgsql security definer set search_path = '' as $$
declare
  r record;
  q jsonb;
  v_count int := 0;
begin
  if not private.is_platform_admin() then
    raise exception 'هذا الإجراء لمدير المنصة فقط' using errcode = '42501';
  end if;
  for r in
    select o.id from public.organizations o
      join public.subscriptions s on s.organization_id = o.id and s.status in ('trial', 'active', 'past_due')
     where o.status = 'active'
       and (p_kind is null or p_kind = 'all' or o.kind::text = p_kind
            or (p_kind = 'schools' and o.kind <> 'individual_teacher'))
       and not (s.status = 'trial' and coalesce(s.trial_ends_on, current_date) >= current_date)
       and not exists (select 1 from public.invoices i
                        where i.organization_id = o.id and i.status <> 'void'
                          and date_trunc('month', i.created_at) = date_trunc('month', now()))
  loop
    q := private.usage_quote(r.id);
    if q is not null and (q ->> 'amount')::numeric > 0 then
      perform public.admin_issue_invoice(r.id);
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end $$;
revoke execute on function public.admin_issue_invoices_bulk(text) from public, anon;
grant execute on function public.admin_issue_invoices_bulk(text) to authenticated;

-- فاتورة يدوية بمبلغ ووصف يحددهما المدير.
create or replace function public.admin_create_invoice(p_org uuid, p_amount numeric, p_note text, p_due_on date default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_sub uuid;
  v_no int;
  v_cur text := coalesce((select value ->> 'code' from public.platform_settings where key = 'currency'), 'ILS');
begin
  if not private.is_platform_admin() then
    raise exception 'هذا الإجراء لمدير المنصة فقط' using errcode = '42501';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'اكتب مبلغاً أكبر من صفر';
  end if;
  select id into v_sub from public.subscriptions
   where organization_id = p_org and status in ('trial', 'active', 'past_due') limit 1;
  select count(*) + 1 into v_no from public.invoices where organization_id = p_org;
  insert into public.invoices (organization_id, subscription_id, number, period_start, period_end, installment_no,
                               active_students, price_per_student, amount, currency_code, status, due_on, notes)
  values (p_org, v_sub,
          'INV-' || to_char(current_date, 'YYMM') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
          current_date, current_date, v_no, 0, 0, round(p_amount, 2), v_cur, 'issued',
          coalesce(p_due_on, current_date + 7), nullif(trim(p_note), ''))
  returning id into v_id;
  return v_id;
end $$;
revoke execute on function public.admin_create_invoice(uuid, numeric, text, date) from public, anon;
grant execute on function public.admin_create_invoice(uuid, numeric, text, date) to authenticated;

-- تسجيل دفعة استلمها المدير (نقداً أو تحويل) بدون إيصال من صاحب الحساب.
create or replace function public.admin_record_payment(p_invoice uuid, p_amount numeric, p_method text, p_reference text default null, p_note text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid;
  v_id uuid;
begin
  if not private.is_platform_admin() then
    raise exception 'هذا الإجراء لمدير المنصة فقط' using errcode = '42501';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'اكتب مبلغاً أكبر من صفر';
  end if;
  select organization_id into v_org from public.invoices where id = p_invoice and status <> 'void';
  if v_org is null then
    raise exception 'الفاتورة غير موجودة أو ملغاة';
  end if;
  insert into public.payment_receipts (invoice_id, organization_id, method, amount, reference, status, review_note,
                                       uploaded_by, recorded_by_admin)
  values (p_invoice, v_org, p_method::public.payment_method, round(p_amount, 2), nullif(trim(p_reference), ''),
          'confirmed', nullif(trim(p_note), ''), auth.uid(), true)
  returning id into v_id;
  return v_id;
end $$;
revoke execute on function public.admin_record_payment(uuid, numeric, text, text, text) from public, anon;
grant execute on function public.admin_record_payment(uuid, numeric, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- إدارة الجهات (مدير المنصة)
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_org_status(p_org uuid, p_status text, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_old public.org_status;
  v_days int := coalesce((select (value ->> 'days')::int from public.platform_settings where key = 'trial'), 14);
begin
  if not private.is_platform_admin() then
    raise exception 'هذا الإجراء لمدير المنصة فقط' using errcode = '42501';
  end if;
  select status into v_old from public.organizations where id = p_org for update;
  if v_old is null then
    raise exception 'الجهة غير موجودة';
  end if;
  update public.organizations
     set status = p_status::public.org_status,
         status_note = nullif(trim(p_note), ''),
         approved_at = case when p_status = 'active' and approved_at is null then now() else approved_at end
   where id = p_org;
  -- الفترة التجريبية تبدأ من يوم الموافقة، لا من يوم التسجيل.
  if v_old = 'pending' and p_status = 'active' then
    update public.subscriptions
       set trial_ends_on = current_date + v_days, started_on = current_date, current_period_start = current_date
     where organization_id = p_org and status = 'trial';
  end if;
end $$;
revoke execute on function public.admin_set_org_status(uuid, text, text) from public, anon;
grant execute on function public.admin_set_org_status(uuid, text, text) to authenticated;

create or replace function public.admin_update_org(p_org uuid, p_name text, p_kind text, p_region text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then
    raise exception 'هذا الإجراء لمدير المنصة فقط' using errcode = '42501';
  end if;
  update public.organizations
     set name = trim(p_name), kind = p_kind::public.org_kind, region = nullif(trim(p_region), '')
   where id = p_org;
end $$;
revoke execute on function public.admin_update_org(uuid, text, text, text) from public, anon;
grant execute on function public.admin_update_org(uuid, text, text, text) to authenticated;

-- تغيير الباقة: يبقى الاشتراك نفسه (وحالته) ويتغير سعره من اليوم.
create or replace function public.admin_change_plan(p_org uuid, p_plan uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_plan public.subscription_plans%rowtype;
begin
  if not private.is_platform_admin() then
    raise exception 'هذا الإجراء لمدير المنصة فقط' using errcode = '42501';
  end if;
  select * into v_plan from public.subscription_plans where id = p_plan;
  if v_plan.id is null then
    raise exception 'الباقة غير موجودة';
  end if;
  update public.subscriptions set plan_id = v_plan.id, price_per_student = v_plan.price_per_student
   where organization_id = p_org and status in ('trial', 'active', 'past_due');
  if not found then
    insert into public.subscriptions (organization_id, plan_id, status, price_per_student, current_period_start)
    values (p_org, v_plan.id, 'active', v_plan.price_per_student, current_date);
  end if;
end $$;
revoke execute on function public.admin_change_plan(uuid, uuid) from public, anon;
grant execute on function public.admin_change_plan(uuid, uuid) to authenticated;

-- حذف نهائي: يشترط كتابة اسم الجهة كما هو، ويحذف كل بياناتها.
create or replace function public.admin_delete_org(p_org uuid, p_confirm_name text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_name text;
begin
  if not private.is_platform_admin() then
    raise exception 'هذا الإجراء لمدير المنصة فقط' using errcode = '42501';
  end if;
  select name into v_name from public.organizations where id = p_org;
  if v_name is null then
    raise exception 'الجهة غير موجودة';
  end if;
  if trim(coalesce(p_confirm_name, '')) <> trim(v_name) then
    raise exception 'اكتب اسم الجهة كما هو بالضبط لتأكيد الحذف';
  end if;
  delete from public.organizations where id = p_org;
end $$;
revoke execute on function public.admin_delete_org(uuid, text) from public, anon;
grant execute on function public.admin_delete_org(uuid, text) to authenticated;

-- مدير المنصة يضيف جهة بنفسه (نشطة مباشرة). المالك برقم واتساب: إن كان له حساب
-- يصبح مالكاً فوراً، وإلا تُحفظ دعوة تتحول لعضوية عند أول تسجيل دخول.
create or replace function public.admin_create_org(p_name text, p_kind text, p_region text, p_owner_phone text, p_owner_name text, p_plan uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid;
  v_user uuid;
begin
  if not private.is_platform_admin() then
    raise exception 'هذا الإجراء لمدير المنصة فقط' using errcode = '42501';
  end if;
  if p_owner_phone is null or p_owner_phone !~ '^\+[0-9]{8,15}$' then
    raise exception 'رقم واتساب المالك غير صحيح';
  end if;
  insert into public.organizations (name, kind, region, status, approved_at)
  values (trim(p_name), p_kind::public.org_kind, nullif(trim(p_region), ''), 'active', now())
  returning id into v_org;

  select id into v_user from public.profiles where phone = p_owner_phone;
  if v_user is not null then
    insert into public.memberships (organization_id, user_id, role, status)
    values (v_org, v_user, 'owner', 'active');
  else
    insert into public.invitations (organization_id, phone, role, full_name)
    values (v_org, p_owner_phone, 'owner', nullif(trim(p_owner_name), ''));
  end if;

  if p_plan is not null then
    perform public.admin_change_plan(v_org, p_plan);
  end if;
  return v_org;
end $$;
revoke execute on function public.admin_create_org(text, text, text, text, text, uuid) from public, anon;
grant execute on function public.admin_create_org(text, text, text, text, text, uuid) to authenticated;

-- ملخص الجهات للمدير: أضفنا الحالة والباقة والمالك المدعو والاستخدام.
drop function public.admin_organizations();
create or replace function public.admin_organizations()
returns table (
  id uuid, name text, kind text, region text, created_at timestamptz,
  status text, status_note text,
  owner_name text, owner_phone text, owner_invited boolean,
  active_students int, teachers int,
  plan_id uuid, plan_name text, pricing_model text, subscription_status text, trial_ends_on date,
  papers_30d int, grading_cost_30d numeric, unpaid_amount numeric
) language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then
    raise exception 'هذا الإجراء لمدير المنصة فقط' using errcode = '42501';
  end if;
  return query
  select o.id, o.name, o.kind::text, o.region, o.created_at,
         o.status::text, o.status_note,
         coalesce(ow.full_name, inv.full_name), coalesce(ow.phone, inv.phone), (ow.phone is null and inv.phone is not null),
         (select count(distinct s.id)::int
            from public.students s
            join public.group_students gs on gs.student_id = s.id and gs.left_at is null
            join public.groups g on g.id = gs.group_id and g.archived_at is null
           where s.organization_id = o.id and s.status = 'active'),
         (select count(*)::int from public.memberships m where m.organization_id = o.id and m.status = 'active' and m.role = 'teacher'),
         sp.id, sp.name, sp.pricing_model, su.status::text, su.trial_ends_on,
         (select count(*)::int from public.submissions x where x.organization_id = o.id and x.created_at > now() - interval '30 days'),
         (select coalesce(sum(r.cost_usd), 0) from public.grading_runs r where r.organization_id = o.id and r.started_at > now() - interval '30 days'),
         (select coalesce(sum(i.amount - coalesce((select sum(pr.amount) from public.payment_receipts pr
                                                     where pr.invoice_id = i.id and pr.status = 'confirmed'), 0)), 0)
            from public.invoices i where i.organization_id = o.id and i.status in ('issued', 'overdue', 'pending_confirmation'))
    from public.organizations o
    left join lateral (
      select p.full_name, p.phone from public.memberships m join public.profiles p on p.id = m.user_id
       where m.organization_id = o.id and m.role = 'owner' and m.status = 'active' order by m.created_at limit 1
    ) ow on true
    left join lateral (
      select i.full_name, i.phone from public.invitations i
       where i.organization_id = o.id and i.role = 'owner' and i.accepted_at is null order by i.created_at limit 1
    ) inv on true
    left join lateral (
      select s.status, s.trial_ends_on, s.plan_id from public.subscriptions s
       where s.organization_id = o.id and s.status in ('trial', 'active', 'past_due') limit 1
    ) su on true
    left join public.subscription_plans sp on sp.id = su.plan_id
   order by (o.status = 'pending') desc, o.created_at desc;
end $$;
revoke execute on function public.admin_organizations() from public, anon;
grant execute on function public.admin_organizations() to authenticated;
