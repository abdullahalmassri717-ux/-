# النسخ الاحتياطي لقاعدة البيانات

كل ليلة (00:30 UTC) يأخذ GitHub نسخة كاملة من قاعدة البيانات، مشفّرة بكلمة سر
قاعدة البيانات (`SUPABASE_DB_PASSWORD`)، ويحتفظ بها 14 يوماً.
الملف: Actions ← «Backup database» ← آخر تشغيل ناجح ← `database-backup`.

صور أوراق الطلاب (Storage) غير مشمولة؛ Supabase يحفظها بنفسه.

## الاسترجاع (لمبرمج، عند الحاجة فقط)

```bash
unzip database-backup.zip
gpg --decrypt daqa-YYYY-MM-DD.dump.gpg > daqa.dump    # يطلب كلمة سر قاعدة البيانات
# إلى قاعدة جديدة فارغة أولاً، للتأكد قبل أي استبدال:
pg_restore --no-owner --no-privileges -d "<رابط القاعدة الجديدة>" daqa.dump
```

لا تسترجع فوق القاعدة الحقيقية مباشرة قبل موافقة صاحب المشروع.
