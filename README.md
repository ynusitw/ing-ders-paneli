# Ders Paneli

Öğretmen-öğrenci ders talep/onay sistemi + gömülü video görüşme odası. Bakiye/ödeme/cüzdan yok — para transferi tamamen site dışında.

## Stack
- Next.js 14 (App Router, TypeScript) — standart `next dev`/`next start`, özel sunucu yok
- Firebase Authentication (e-posta/şifre) — rol bazlı erişim (`TEACHER` / `STUDENT`)
- Firestore — veri deposu (server tarafında Admin SDK, API route'ları üzerinden)
- WebRTC (simple-peer) + Firestore realtime doküman — video odası sinyalleşmesi (ayrı sinyalleşme sunucusu gerekmez)
- Tailwind CSS

## Kurulum
1. [Firebase Console](https://console.firebase.google.com)'da bir proje oluştur, **Authentication > Email/Password**'ü etkinleştir, **Firestore Database**'i oluştur.
2. Proje Ayarları > Genel > "Web uygulaması ekle" ile `NEXT_PUBLIC_FIREBASE_*` değerlerini al.
3. Proje Ayarları > Servis Hesapları > "Yeni özel anahtar oluştur" ile inen JSON'dan `project_id`, `client_email`, `private_key` değerlerini al (private_key'deki `\n` karakterlerini olduğu gibi bırak, `.env`'de tırnak içinde tutulur).
4. `.env.example`'ı `.env.local` olarak kopyala ve doldur.
5. Firestore güvenlik kurallarını ve index'leri deploy et (Firebase CLI kuruluysa):
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   ```
   (CLI yoksa `firestore.rules` içeriğini Console > Firestore > Rules'a elle yapıştır; index'ler ilk sorgu çalıştığında Firestore'un verdiği link ile de oluşturulabilir.)
6. Bağımlılıkları kur ve çalıştır:
   ```bash
   npm install
   npm run dev
   ```

## Veri Modeli (Firestore koleksiyonları)
- `users/{uid}` — email, fullName, role
- `availabilitySlots/{id}` — teacherId, startTime, endTime, status: OPEN → REQUESTED → BOOKED
- `lessonRequests/{id}` — slotId, teacherId, studentId, status: PENDING → APPROVED/REJECTED (isim alanları denormalize edilmiştir)
- `lessons/{id}` — onaylanan talepten doğar; `id` aynı zamanda video oda kimliğidir
- `lessons/{id}/materials/{id}` — öğretmenin paylaştığı not/materyal (alt koleksiyon)
- `rooms/{lessonId}` — sadece video odası sinyalleşmesi için (offer/answer), istemciden doğrudan yazılan tek koleksiyon

Talep/onay akışı `adminDb.runTransaction` ile atomik yürütülür (bkz. `src/app/api/requests/route.ts` ve `src/app/api/requests/[id]/route.ts`).

## Kimlik Doğrulama Akışı
- Kayıt: `POST /api/register` (Admin SDK ile kullanıcı + Firestore doc oluşturur) → client `signInWithCustomToken` → `POST /api/session` (httpOnly çerez oluşturur)
- Giriş: client `signInWithEmailAndPassword` → `POST /api/session`
- `src/middleware.ts` Edge runtime'da sadece çerez varlığına bakar (kaba engel); asıl rol kontrolü `src/app/teacher/layout.tsx` ve `src/app/student/layout.tsx` içinde `getCurrentUser()` (Node runtime, Admin SDK) ile yapılır — çünkü `firebase-admin` Edge'de çalışmaz.

## Video Odası
`src/app/room/[lessonId]/page.tsx` dersin gerçek katılımcısı olup olmadığını sunucuda doğrular, ardından `src/components/video-room.tsx` client component'i kamera/mikrofon izni ister ve `rooms/{lessonId}` Firestore dokümanı üzerinden WebRTC offer/answer alışverişi yapıp 1:1 görüşmeyi başlatır. Harici platforma yönlendirme yoktur.

## Deploy (Vercel)
Özel sunucu olmadığı için doğrudan Vercel'e deploy edilebilir:
```bash
npx vercel login
npx vercel --prod --yes
```
`.env.local`'deki 7 değişkenin tamamı Vercel Project Settings > Environment Variables'a da eklenmeli (`NEXT_PUBLIC_*` olanlar `--type config`, diğerleri `--type secret` ile `vercel env add` üzerinden eklenebilir).

**Bilinen sorun:** `firebase-admin@14.x`'in bağımlılığı `jwks-rsa`, `jose@6` (saf ESM paket) kullanıyor. Yerel Node 24'te `require(esm)` desteği olduğu için sorun çıkmıyor ama Vercel'in Node çalışma zamanında `ERR_REQUIRE_ESM` ile build/runtime hatası veriyor. Çözüm: `package.json` içinde `"overrides": { "jose": "4.15.9" }` ile CJS uyumlu bir sürüme sabitlendi (bkz. `next.config.js`'teki `serverComponentsExternalPackages` ayarı da ilgili).

Canlı: https://ders-paneli-olive.vercel.app

## Durum
Veri modeli, tüm API rotaları, auth akışı (register/login/session), video odası ve tüm panel sayfaları (müsaitlik, talepler, dersler, materyal paylaşımı) uçtan uca test edilip çalışır durumda. Proje canlıda deploy edilmiş ve Vercel üzerinde erişilebilir.
