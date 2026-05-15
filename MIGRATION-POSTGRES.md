# خطة الترقية لاحقًا إلى PostgreSQL

النظام مبني بطبقة بيانات محايدة (Prisma + طبقة `server/repos/*`). المنطق
(`routes/`, `auth.js`) لا يلمس قاعدة البيانات مباشرة، ولا يوجد أي SQL خاص
بـ SQLite. لذلك الترقية لا تتطلب إعادة بناء — خطوات محدودة فقط.

## متى تُرقّي؟
عند أيٍّ من: كتابات متزامنة كثيفة، آلاف الفواتير، عدة تطبيقات تشارك القاعدة،
أو الحاجة لميزات PostgreSQL متقدمة. دون ذلك يبقى SQLite كافيًا.

## الخطوات (≈ 30 دقيقة)

1. **أضف حاوية PostgreSQL** إلى `docker-compose.yml`:
   ```yaml
   db:
     image: postgres:16-alpine
     restart: unless-stopped
     environment:
       POSTGRES_DB: invoicing
       POSTGRES_USER: invoicing
       POSTGRES_PASSWORD: ${PG_PASSWORD}
     volumes:
       - ./pgdata:/var/lib/postgresql/data
   ```
   واجعل خدمة `invoicing` تعتمد عليها (`depends_on: [db]`).

2. **بدّل مزوّد Prisma** في `server/prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"   // كان "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
   لا تغيير على النماذج (Json تصبح jsonb تلقائيًا، باقي الأنواع كما هي).

3. **حدّث `DATABASE_URL`**:
   `postgresql://invoicing:${PG_PASSWORD}@db:5432/invoicing`

4. **أنشئ هجرة PostgreSQL**:
   ```
   cd server && npx prisma migrate dev --name pg-init
   ```
   (في الإنتاج: `npx prisma migrate deploy` — موجود أصلًا في Dockerfile CMD.)

5. **انقل البيانات** (مرة واحدة): استخدم تصدير النسخة الاحتياطية من
   **الإعدادات ← نسخة احتياطية** (JSON) ثم سكربت استيراد بسيط يكتب عبر
   `server/repos/*` (نفس الواجهة، لا كود جديد لقاعدة البيانات). أو
   `pgloader` من ملف الـ SQLite مباشرة.

6. **شغّل بوابة اختبار الترقيم** (المذكورة في خطة التحقق): طلبات متزامنة
   على نفس المؤسسة/النوع ⇒ تسلسل بلا فجوة/تكرار.

## ملاحظة الترقيم تحت التزامن العالي (PostgreSQL فقط)
على SQLite الكاتب الوحيد يضمن التسلسل. على PostgreSQL مع تزامن عالٍ، عزّز
`server/repos/invoices.js` داخل `prisma.$transaction` بقفل صف العداد:
```
await tx.$executeRaw`SELECT 1 FROM "Counter" WHERE "orgId" = ${org.id} FOR UPDATE`
```
هذا هو **التغيير الوحيد المحتمل** الخاص بالمنطق، ومعزول في ملف واحد، ولا يؤثر
على SQLite (يبقى قيد `@@unique([orgId, invoiceNumber])` شبكة أمان في الحالتين).

## لا تغييرات مطلوبة في
- الواجهة (`src/**`) — تتحدث مع `/api` فقط.
- المسارات (`server/routes/*`) و`auth.js` — لا تلمس ORM.
- بنية الحاوية — نفس Dockerfile، تُضاف خدمة db فقط.
