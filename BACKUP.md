# النسخ الاحتياطي والاستعادة

قاعدة البيانات ملف واحد: `/data/invoicing.sqlite` داخل الحاوية،
وعلى السيرفر في `/opt/shoaa-erp-data/invoicing.sqlite` (الـ Volume).

## نسخ احتياطي تلقائي يومي (موصى به)

في Coolify → التطبيق → **Scheduled Tasks** → أضف مهمة:

- **Command:** `node scripts/backup.js`
- **Frequency:** `0 2 * * *`  (يوميًا 2 فجرًا)
- **Container:** نفس حاوية التطبيق

تنشئ نسخة في `/data/backups/invoicing-<التاريخ>.sqlite` وتحتفظ بآخر 14
(عدّل عبر متغيّر البيئة `BACKUP_KEEP`). النسخ تظهر على السيرفر في
`/opt/shoaa-erp-data/backups/` فانسخها لمكان خارجي دوريًا.

## نسخ احتياطي يدوي (في أي وقت)

من **الإعدادات ← نسخة احتياطية** داخل النظام → ملف JSON.

أو على السيرفر مباشرة:
```
cp /opt/shoaa-erp-data/invoicing.sqlite ~/invoicing-$(date +%F).sqlite
```

## الاستعادة

1. أوقف الحاوية من Coolify.
2. استبدل الملف:
   ```
   cp /مسار/النسخة.sqlite /opt/shoaa-erp-data/invoicing.sqlite
   ```
3. أعد تشغيل الحاوية. تعمل الهجرات تلقائيًا (آمنة/idempotent).

## نسخ خارج السيرفر (مهم)

النسخة على نفس السيرفر لا تحمي من تعطّل السيرفر. انسخ
`/opt/shoaa-erp-data/backups/` دوريًا إلى تخزين خارجي
(جهازك / سحابة) — `scp` أو `rsync` أسبوعيًا يكفي لحجمك.
