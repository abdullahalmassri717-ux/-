-- ============================================================================
-- دقة — حذف البيانات التجريبية تلقائياً مع أول صف حقيقي فيه طلاب.
--
-- أول ما تضيف جهة حقيقية (غير تجريبية، ولم ينشئها رقم تجريبي) طالباً إلى صف
-- أو مجموعة، تُحذف الجهات التجريبية بكل بياناتها ومستخدمو الأرقام التجريبية
-- 0599990001–5. يحدث ذلك مرة واحدة: بعدها لا توجد جهات تجريبية فلا يعمل شيء.
-- ============================================================================

create or replace function private.remove_demo_on_first_real_student()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_demo_phones text[] := array['970599990001', '970599990002', '970599990003', '970599990004', '970599990005'];
begin
  -- لا توجد بيانات تجريبية: لا شيء نفعله (الحالة العادية بعد أول مرة).
  if not exists (select 1 from public.organizations where is_demo) then
    return null;
  end if;
  -- الطالب أُضيف لجهة تجريبية، أو لجهة أنشأها رقم تجريبي أثناء التجربة.
  if exists (
    select 1 from public.organizations o
     where o.id = new.organization_id
       and (o.is_demo or o.created_by in (select u.id from auth.users u where u.phone = any(v_demo_phones)))
  ) then
    return null;
  end if;

  delete from public.organizations
   where is_demo
      or created_by in (select u.id from auth.users u where u.phone = any(v_demo_phones));
  delete from auth.users where phone = any(v_demo_phones);
  return null;
end $$;
revoke execute on function private.remove_demo_on_first_real_student() from public, anon, authenticated;

drop trigger if exists group_students_remove_demo on public.group_students;
create trigger group_students_remove_demo after insert on public.group_students
  for each row execute function private.remove_demo_on_first_real_student();
