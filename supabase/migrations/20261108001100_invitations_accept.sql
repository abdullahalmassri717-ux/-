-- ============================================================================
-- دقة — دعوة المعلمين:
-- • اسم المعلم المدعو (ليظهر للمدير قبل أن يسجّل).
-- • accept_my_invitations(): عند تسجيل الدخول، يقبل الدعوات المعلّقة لرقم
--   المستخدم. (التسجيل الجديد يقبلها تلقائياً من handle_new_user، لكن المعلم
--   الذي عنده حساب من قبل يحتاج هذه الدالة.)
-- ============================================================================
alter table public.invitations add column if not exists full_name text;

create or replace function public.accept_my_invitations()
returns int language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_phone text;
  v_count int := 0;
begin
  if v_uid is null then
    return 0;
  end if;
  select phone into v_phone from public.profiles where id = v_uid;
  if v_phone is null then
    return 0;
  end if;

  -- اسم المعلم من الدعوة إن لم يكتب اسمه بعد.
  update public.profiles p
     set full_name = i.full_name
    from public.invitations i
   where p.id = v_uid and p.full_name is null
     and i.phone = v_phone and i.accepted_at is null and i.full_name is not null;

  insert into public.memberships (organization_id, user_id, role)
  select i.organization_id, v_uid, i.role
    from public.invitations i
   where i.phone = v_phone and i.accepted_at is null
  on conflict (organization_id, user_id) do update set status = 'active';
  get diagnostics v_count = row_count;

  update public.invitations set accepted_at = now()
   where phone = v_phone and accepted_at is null;
  return v_count;
end $$;

revoke execute on function public.accept_my_invitations() from public, anon;
grant execute on function public.accept_my_invitations() to authenticated;
