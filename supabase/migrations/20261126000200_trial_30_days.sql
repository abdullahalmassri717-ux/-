-- قرار صاحب المشروع (2026-11-26): الفترة التجريبية شهر (30 يوماً) بدل 14.
-- تبقى قابلة للتعديل من لوحة الإدارة ← الإعدادات. الجهات التي في التجربة الآن تبقى على تاريخها.
insert into public.platform_settings (key, value, is_public)
values ('trial', '{"days": 30}', true)
on conflict (key) do update set value = jsonb_set(coalesce(public.platform_settings.value, '{}'::jsonb), '{days}', '30');
