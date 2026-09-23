# Production Readiness Audit

> **whoareyou** — Direktori tech talent berbasis bukti kerja nyata

| | |
|---|---|
| **Tanggal Audit** | 17 September 2026 |
| **Metodologi** | Read-only inspection — tidak ada file yang diubah |
| **Codebase** | Inspeksi langsung seluruh source code, dokumentasi, schema, dan test suite |

---

## Daftar Isi

1. [Executive Summary](#1-executive-summary)
2. [Current Architecture](#2-current-architecture)
3. [Current Feature Status](#3-current-feature-status)
4. [User Flow Assessment](#4-user-flow-assessment)
5. [Frontend Audit](#5-frontend-audit)
6. [Backend Audit](#6-backend-audit)
7. [Database Audit](#7-database-audit)
8. [Security Audit](#8-security-audit)
9. [Scalability Assessment](#9-scalability-assessment)
10. [Deployment Readiness](#10-deployment-readiness)
11. [Missing Work](#11-missing-work)
12. [P0 / P1 / P2 Priorities](#12-p0--p1--p2-priorities)
13. [Detailed Effort Estimation](#13-detailed-effort-estimation)
14. [Minimum Launch Estimate](#14-minimum-launch-estimate)
15. [Proper Production Estimate](#15-proper-production-estimate)
16. [Production + Polish Estimate](#16-production--polish-estimate)
17. [Timeline](#17-timeline)
18. [Risks & Assumptions](#18-risks--assumptions)
19. [Client-Facing Summary](#19-client-facing-summary)

---

## 1. Executive Summary

`whoareyou` adalah direktori tech talent berbasis bukti kerja nyata — bukan screenshot atau brief. Satu repository dengan dua deployable: **SPA** (React 19 + Vite + Tailwind v4) dan **API** (Node + Express 5 + MongoDB 7 + TypeScript).

### Status Hari Ini

Codebase ini **jauh lebih matang** dari rata-rata project freelance di tahap yang sama:

- Backend sepenuhnya fungsional dengan auth JWT, CRUD, atomic quota enforcement, dan traffic tracking
- Database dirancang dengan benar: indexes, schema validators, transactions
- SPA memiliki semua UI yang diperlukan pengguna

### Gap Utama

**SPA belum tersambung ke API.** Hook `useAccount` — yang dirancang khusus sebagai seam untuk koneksi API — masih membaca dari `localStorage`. Ini adalah satu-satunya engineering gap besar, dan sudah diantisipasi dalam desain sistem.

### Kesimpulan

> Project ini **tidak butuh rearchitecture**. Butuh wiring, hardening, dan deployment.

---

## 2. Current Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  SPA  ·  React 19 + Vite 7 + Tailwind v4                        │
│  Hash router (hand-rolled)  ·  Zero runtime deps beyond React   │
│  Deploy: static hosting (Vercel / Netlify / S3)                 │
│                                                                 │
│  ┌── useAccount (Context) ──────────────────────────────────┐   │
│  │  register · login · saveDraft · publish · signOut         │   │
│  │                                                           │   │
│  │  ▶ saat ini membaca dari localStorage                     │   │
│  │  ▶ dirancang untuk diganti dengan fetch()                 │   │
│  └───────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────┘
                               │  HTTP (fetch)
                               │  ⚠ GAP: belum terhubung
┌──────────────────────────────▼──────────────────────────────────┐
│  API  ·  Node 20 + Express 5 + TypeScript + Zod                 │
│                                                                 │
│  POST  /api/auth/*              ·  rate-limited 20/15min        │
│  GET/POST/PUT/DELETE /api/work/* ·  rate-limited 60/min         │
│  GET   /api/people/*                                            │
│  GET   /api/traffic/me                                          │
│  POST  /uploads/work/:id/thumbnail  (GridFS)                    │
│                                                                 │
│  Pino logging  ·  Helmet headers  ·  3-tier rate limiter        │
│  Deploy: VPS/cloud + PM2/systemd  ⚠ belum dikonfigurasi         │
└──────────────────────────────┬──────────────────────────────────┘
                               │  native driver (replica set)
┌──────────────────────────────▼──────────────────────────────────┐
│  MongoDB 7  ·  replica set (wajib untuk transactions)           │
│                                                                 │
│  6 collections  ·  $jsonSchema validators  ·  TTL indexes       │
│  docker-compose.yml ada  →  untuk lokal saja                    │
│  Production: Atlas  ⚠ belum di-provision                        │
└─────────────────────────────────────────────────────────────────┘
```

### Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend framework | React | 19 |
| Build tool | Vite | 7 |
| CSS | Tailwind CSS | v4 |
| Runtime deps (SPA) | react, react-dom | — |
| Backend runtime | Node.js | ≥20 |
| API framework | Express | 5.1.0 |
| Database | MongoDB | 7 |
| Validation | Zod | — |
| Logging | Pino | — |
| Auth | JWT + scrypt | — |
| Language | TypeScript | 5.8 |

---

## 3. Current Feature Status

> **Legenda:** ✅ Done end-to-end · ⚠️ Partial · ❌ Missing

| Feature | Status | Frontend | Backend | Database | Catatan |
|---------|:------:|:--------:|:-------:|:--------:|---------|
| Browse / Directory | ✅ | Done | Done | Done | Client-side filtering dari seed data; belum server-side |
| Browse / Work Index | ✅ | Done | Done | Done | Filter, sort, pagination belum via API |
| Registration | ⚠️ | Done (UI) | Done | Done | SPA simpan ke localStorage, tidak POST ke API |
| Login / Session | ⚠️ | Done (UI) | Done | Done | Token tidak dikelola di SPA |
| Refresh Token | ⚠️ | Missing | Done | Done | Backend rotation benar; SPA belum implementasi |
| Profile Edit | ⚠️ | Done (UI) | Done | Done | SPA simpan ke localStorage |
| Password Change | ❌ | Missing | Missing | — | Tidak ada endpoint, tidak ada UI |
| Email Verification | ❌ | Missing | Missing | — | Field `emailVerifiedAt` ada di DB, flow tidak ada |
| Password Reset | ❌ | Missing | Missing | — | Tidak ada di frontend maupun backend |
| Work CRUD (Draft) | ⚠️ | Done (UI) | Done | Done | SPA tidak kirim ke API |
| Work Publish / Quota | ⚠️ | Done (UI) | Done (atomic) | Done | Quota enforcement ada di backend; SPA bypass |
| Work Unpublish | ⚠️ | Done (UI) | Done | Done | — |
| Work Delete | ⚠️ | Done (UI) | Done | Done | — |
| Thumbnail Upload | ⚠️ | Done (localStorage) | Done (GridFS) | Done | SPA simpan data URL; belum upload ke API |
| Traffic Dashboard | ⚠️ | Done (UI) | Done | Done | Data di-generate lokal (disclosed), belum dari API |
| Case Study Detail | ✅ | Done | Done | Done | Halaman statis dari seed data |
| Profile Page | ✅ | Done | Done | Done | Halaman statis dari seed data |
| Similar Work | ✅ | Done (client) | Done (server) | Done | Logic terduplikasi di dua tempat; harus identik |
| Search (full-text) | ✅ | Done | Done | Done | MongoDB text index; cukup untuk scale awal |
| Faceted Filtering | ✅ | Done | Done | Done | Skill, topic, role, model facets |
| Pagination | ⚠️ | Client-side | Done (server) | Done | SPA slice dari array; belum via API |
| Account Deletion | ❌ | Missing | Missing | — | Tidak ada |
| Profile Photo Upload | ❌ | — | Missing | — | Pakai randomuser.me placeholder |
| Content Moderation | ❌ | Missing | Missing | — | Tidak ada flagging, review queue, atau admin panel |
| Admin Interface | ❌ | Missing | Missing | — | Tidak ada |
| Health Check | ✅ | — | `GET /api/health` | — | Tersedia |
| Rate Limiting | ⚠️ | — | Done (in-memory) | — | Tidak berfungsi multi-instance tanpa Redis |
| Audit Log | ❌ | — | Missing | — | Tidak ada pencatatan operasi sensitif |

---

## 4. User Flow Assessment

### Flow 1 — Visitor → Browse → Lihat Portfolio

```
Landing (Hero)
  → Filter by role / topic / skill
  → Work card
  → Case study detail
  → Profile page
```

**Status:** ✅ Fungsional secara UI dengan seed data. Belum mengambil data dari API live.

**Gap:**
- Filter, pagination, dan search harus pindah ke server-side setelah wiring
- Data yang tampil masih dari fixtures yang di-hardcode, bukan database live

---

### Flow 2 — Register → Login → Manage Portfolio

```
Klik Join
  → JoinModal (name, email, password)
  → Panel overview
  → Edit Profile
  → Add Work → SchemaForm (role-specific fields)
  → Upload Thumbnail
  → Publish
  → Muncul di Home + Work Index
```

**Status:** ✅ Semua UI ada dan berfungsi dengan `localStorage`. ❌ Tidak ada API call yang sebenarnya.

**Gap konkret:**

| Action | Harusnya | Kenyataan |
|--------|---------|-----------|
| `register()` | `POST /api/auth/register` | Simpan ke localStorage |
| `login()` | `POST /api/auth/login` | Simpan ke localStorage |
| Refresh token | Auto-refresh sebelum expire | Tidak diimplementasi di SPA |
| `saveDraft()` | `POST /api/work` | Simpan ke localStorage |
| `publish()` | `POST /api/work/:id/publish` | Ubah flag di localStorage |
| Thumbnail | `POST /uploads/work/:id/thumbnail` | Simpan data URL ke localStorage (~200KB+) |
| Traffic | `GET /api/traffic/me` | Seeded data lokal |

---

### Flow 3 — Edit Entry (setelah publish)

```
Panel → Portfolio → Pilih entry → Edit form → Save → Republish
```

**Status:** ✅ UI ada. ❌ Tidak ada API call.

---

### Flow 4 — Logout

```
Panel / Navbar → Sign Out → Kembali ke Home
```

**Status:** ✅ `signOut()` membersihkan localStorage. ❌ `POST /api/auth/logout` tidak dipanggil — session di server tidak dihapus.

---

### Flow 5 — Missing Flows (belum ada sama sekali)

| Flow | Keterangan |
|------|-----------|
| Verify email | Tidak ada halaman, tidak ada resend |
| Forgot password | Tidak ada request form |
| Reset password | Tidak ada token, tidak ada form |
| Change password | Tidak ada di panel |
| Delete account | Tidak ada |
| Report/flag konten | Tidak ada |
| Admin moderation | Tidak ada |

---

## 5. Frontend Audit

### ✅ Sudah Baik

| Aspek | Detail |
|-------|--------|
| Bundle size | ~160 KB gzipped (mayoritas seed data, bukan library) |
| Runtime dependencies | react + react-dom saja (sesuai spec) |
| Responsive | Tidak ada overflow di 360 / 390 / 768 / 1024 / 1440px |
| Design tokens | Semua warna, spacing, radius dari CSS custom properties — tidak ada hardcoded color |
| Motion | `prefers-reduced-motion` aware |
| Form validation | Zod di `joinForm.ts`; `validateFields()` di SchemaForm |
| Accessibility primitives | Label, dialog, focus trap, touch targets ada |
| Hash router | Deploy-anywhere (tidak butuh server-side routing) |
| Hand-rolled utilities | Icons, router, dialog, image downscaler — tidak ada library overhead |

### ⚠️ Perlu Diperhatikan

| Aspek | Masalah |
|-------|---------|
| Loading states | Tidak ada — semua data sinkron dari localStorage. Setelah wiring ke API, setiap data-fetching path butuh loading skeleton |
| Error states | Tidak ada tampilan khusus untuk network failure, auth failure, server error |
| API error handling | Belum ada interceptor untuk 401 → trigger refresh, atau 429 → tampilkan "coba lagi" |
| Token refresh | Belum ada logic untuk refresh sebelum access token expire (15 menit) |
| Pagination | Client-side slice dari full array — setelah wiring harus pindah ke server pagination |

### ❌ Missing

| Aspek | Keterangan |
|-------|-----------|
| Email verification flow | Tidak ada halaman verify-email, tidak ada resend |
| Password reset UI | Tidak ada form forgot-password atau reset-password |
| Password change | Panel tidak punya halaman change password |
| Account deletion UI | Tidak ada |
| SEO / OG tags | Hash router tidak crawlable — `/people/:id` dan `/work/:id` tidak ter-index Google. Tidak ada `<meta property="og:title">` per halaman |

---

## 6. Backend Audit

### ✅ Sudah Baik

| Aspek | Detail |
|-------|--------|
| Authentication | JWT access token (15 menit) + rotating refresh token (httpOnly cookie, 30 hari) |
| Refresh token rotation | Token lama dihapus, token baru dibuat dalam satu operasi atomik — aman dari token reuse attack |
| Password hashing | scrypt dengan constant-time comparison (anti-timing attack) |
| Input validation | Zod schema di semua endpoint dengan structured error responses |
| Error handling | `ApiError` class — stack trace tidak pernah bocor ke response |
| Logging | Pino dengan field redaction (password, token tidak muncul di logs) |
| Rate limiting | 3 tier: general 300/min, auth 20/15min, write 60/min |
| Quota enforcement | Guarded atomic update dalam transaction — tidak ada race condition |
| Traffic de-duplication | Unique index pada `{ownerId, type, viewerHash, day, workId}` |
| Graceful shutdown | SIGTERM/SIGINT handler — in-flight request selesai dahulu |
| Health endpoint | `GET /api/health` |
| Schema validators | `$jsonSchema` di-apply idempotent pada startup |
| Smoke test | 47 assertions mencakup semua happy paths |

### ⚠️ Perlu Diperhatikan

| Aspek | Masalah |
|-------|---------|
| Rate limiting storage | In-memory (`express-rate-limit` default). Multi-instance tidak dishare → butuh Redis |
| scrypt vs argon2 | scrypt lebih lemah dari argon2id. Tidak critical untuk launch, bisa diupgrade |
| Similar work scoring | Logic terduplikasi di `src/lib/similar.ts` (SPA) dan `server/src/modules/work/queries.ts` (API). Harus selalu identik — maintenance risk |
| CORS default | `CORS_ORIGINS=""` di `.env.example` artinya allow all origins |

### ❌ Missing

| Aspek | Keterangan |
|-------|-----------|
| Email verification | Tidak ada mail transport, verification token, atau endpoint `/auth/verify-email` |
| Password reset | Tidak ada token generation, email template, atau endpoint |
| Audit log | Operasi sensitif (publish, delete, admin action) tidak tercatat |
| CSP tuning | Helmet dipasang tapi CSP belum dikonfigurasi untuk domain produksi |
| Redis rate limiting | Butuh untuk multi-instance deployment |
| Content moderation | Tidak ada endpoint untuk report/flag konten |
| Admin API | Tidak ada endpoints admin (suspend user, remove work) |

---

## 7. Database Audit

### ✅ Sudah Baik

| Aspek | Detail |
|-------|--------|
| Compound index order | Leading dengan `status` → filter fields → sort. Pattern ini benar untuk workload yang ada |
| Multikey indexes | `topics` dan `skills` (array fields) terindeks untuk filter |
| TTL indexes | `sessions.expiresAt` (30 hari) dan `trafficEvents.createdAt` (400 hari) auto-delete |
| Unique constraints | `users.email` (sparse), `users.slug`, `works.slug`, `sessions.tokenHash`, `trafficEvents` composite key |
| Schema validators | `$jsonSchema` di semua collection, `validationLevel: "moderate"` |
| Transaction support | Quota publish menggunakan MongoDB transaction |
| Denormalized counters | `users.counts.topicUsage` untuk O(1) quota check |
| Denormalized author snapshot | `works.author` untuk card render tanpa JOIN |
| Reconcile script | `npm run db:reconcile` untuk repair counter drift (safe on live DB) |
| Aggregation pipelines | Faceted search, similarity scoring, traffic rollup — single round-trip |

### ⚠️ Perlu Diperhatikan

| Aspek | Masalah |
|-------|---------|
| Text search scalability | MongoDB text index cukup untuk <50k works. Di atas itu, Atlas Search lebih proper |
| Connection pooling | Default pool ~5 connections. Perlu dimonitor jika load tinggi |
| `searchBlob` consistency | Field lowercase untuk text search perlu dipastikan selalu di-update saat field terkait berubah |

### ❌ Missing

| Aspek | Keterangan |
|-------|-----------|
| Backup strategy | Tidak ada konfigurasi automated backup |
| Slow query monitoring | Tidak ada Atlas Performance Advisor atau profiling setup |

---

## 8. Security Audit

### ✅ Mitigasi yang Sudah Ada

| Threat | Mitigasi |
|--------|---------|
| Brute force login | `authLimiter`: 20 attempts / 15 menit |
| Token replay (refresh) | Rotation on every use + SHA-256 hash storage (bukan plaintext) |
| Password dump exposure | scrypt hash — plaintext tidak pernah tersimpan |
| Timing attacks | Constant-time comparison; dummy hash untuk user tidak ditemukan |
| Stack trace exposure | Global error handler strips stack di production |
| NoSQL injection | Zod schema validation menolak unexpected types sebelum query |
| XSS | React escapes output by default; Helmet menambahkan `X-XSS-Protection` |
| Clickjacking | Helmet `X-Frame-Options: DENY` |
| Request body bombing | `express.json({ limit: "256kb" })` |
| Upload abuse | multer max 1.5 MB + rate-limited |
| Log leakage | Pino meredaksi field password dan token |
| CORS | Configurable origin whitelist via `CORS_ORIGINS` |

### ⚠️ Concerns

**CORS terbuka di development:**
```
CORS_ORIGINS=""  →  mengizinkan semua origin
```
Harus dikunci ke domain produksi sebelum go-live.

**Rate limiter in-memory:**
Jika dua instance API berjalan, counter tidak dishare. IP bisa bypass rate limit dengan mendistribusikan request ke instance berbeda. Butuh Redis.

**CSP belum di-tune:**
`helmet()` default CSP kemungkinan block Tailwind v4 CSS injection di production build. Perlu ditest sebelum deployment.

**Thumbnail access control:**
`GET /uploads/thumbnails/:id` tidak memerlukan autentikasi. Perlu konfirmasi apakah thumbnail dari draft work (yang belum publish) seharusnya juga public.

### ❌ Missing

| Gap | Risiko |
|-----|--------|
| Email verification | User bisa register dengan email orang lain |
| Audit log | Tidak ada jejak "siapa hapus apa kapan" |
| Dependency audit | Tidak ada `npm audit` di CI/CD |
| Secret rotation policy | Tidak ada prosedur untuk rotate JWT secrets |

---

## 9. Scalability Assessment

| Scale | Assessment | Bottleneck |
|-------|-----------|-----------|
| **100 users** | ✅ Aman | Tidak ada bottleneck signifikan |
| **1.000 users** | ✅ Aman | Rate limiter perlu Redis jika multi-instance |
| **10.000 users** | ⚠️ Perlu review | GridFS thumbnail serving; MongoDB connection pool; full-text search jika works >50k |
| **100.000 users** | ⚠️ Perlu upgrade | Atlas Search, CDN untuk thumbnails, kemungkinan read replica |

**Bottleneck yang paling mungkin muncul pertama:**

1. **Image serving dari GridFS** — setiap `GET /uploads/thumbnails/:id` memukul MongoDB langsung. Satu nginx caching layer di depan sudah sangat membantu (header `Cache-Control: immutable` sudah ada)
2. **In-memory rate limiter** — tidak scalable ke multi-instance tanpa Redis
3. **MongoDB text search** — cukup untuk scale awal, tapi Atlas Search lebih powerful untuk corpus besar

---

## 10. Deployment Readiness

| Komponen | Status | Keterangan |
|----------|:------:|-----------|
| SPA build | ✅ | `npm run build` → static files siap deploy |
| SPA hosting | ❌ | Butuh Vercel / Netlify / S3 |
| API TypeScript build | ✅ | `npm run build` → compile ke `dist/` |
| API Dockerfile | ❌ | Hanya `docker-compose.yml` untuk MongoDB lokal |
| Process management | ❌ | Tidak ada PM2 ecosystem file atau systemd unit |
| Reverse proxy | ❌ | Tidak ada nginx.conf atau Caddy config |
| MongoDB production | ❌ | Belum di-provision (Atlas atau self-hosted replica set) |
| Environment variables | ⚠️ | `.env.example` ada; nilai produksi belum di-set |
| JWT secrets | ❌ | Masih placeholder `change-me-*` |
| CORS | ⚠️ | `CORS_ORIGINS=""` (allow all) |
| CI/CD | ❌ | Tidak ada `.github/workflows/` |
| HTTPS / SSL | ❌ | Belum dikonfigurasi |
| Domain / DNS | ❌ | Belum dikonfigurasi |
| Error tracking | ❌ | Tidak ada Sentry atau Datadog |
| Log aggregation | ❌ | Pino ke stdout; belum ada pipeline ke Loki / CloudWatch |
| Backup (DB) | ❌ | Tidak ada automated backup strategy |
| Staging environment | ❌ | Hanya localhost |
| Rollback plan | ❌ | Tidak ada prosedur |

---

## 11. Missing Work

### P0 — Critical

| ID | Work Item | Area | Current State | Required Work |
|----|-----------|------|---------------|---------------|
| P0-1 | Wire SPA ↔ API | Full-stack | Designed but localStorage | Replace localStorage dengan fetch calls; token lifecycle management; loading + error states |
| P0-2 | Production env configuration | DevOps | `.env.example` placeholder | Set real secrets; lock CORS; validasi env benar |
| P0-3 | MongoDB Atlas / production DB | DevOps | Local Docker only | Provision cluster, seed data, connection string |
| P0-4 | API server deployment | DevOps | Not configured | Dockerfile, PM2/systemd, nginx reverse proxy, VPS/cloud |
| P0-5 | SPA static hosting | DevOps | Not deployed | Vercel / Netlify / S3+CloudFront |
| P0-6 | Domain + HTTPS + DNS | DevOps | Not configured | Domain registration + DNS + SSL cert |

### P1 — Important

| ID | Work Item | Area | Current State | Required Work |
|----|-----------|------|---------------|---------------|
| P1-1 | Email verification | Full-stack | Missing | Mail transport (SendGrid/SES), token, UI flow |
| P1-2 | Password reset | Full-stack | Missing | Token generation, email template, reset form UI |
| P1-3 | Frontend loading + error states | Frontend | Missing | Skeleton loading, error messages, retry UI untuk semua API calls |
| P1-4 | Redis untuk rate limiting | Backend | In-memory only | Redis client, reconfigure 3 limiters |
| P1-5 | CSP headers tuning | Backend | Helmet default | Tune untuk domain produksi; test production build tidak break |
| P1-6 | Error tracking (Sentry) | DevOps | Missing | Frontend + backend SDK integration |
| P1-7 | CI/CD pipeline | DevOps | Missing | GitHub Actions: lint + smoke test + deploy |
| P1-8 | Uptime monitoring | DevOps | Missing | Alerting via Uptime Robot / BetterStack |
| P1-9 | Audit log | Backend | Missing | Log publish, delete, registration ke structured store |
| P1-10 | Backup strategy | DevOps | Missing | Atlas automated backup atau mongodump cron |

### P2 — Post-launch

| ID | Work Item | Area | Current State | Required Work |
|----|-----------|------|---------------|---------------|
| P2-1 | Profile photo upload | Full-stack | randomuser.me placeholder | Upload endpoint, GridFS/S3, UI di panel |
| P2-2 | Password change | Full-stack | Missing | Panel UI + extend `PATCH /auth/me` |
| P2-3 | Account deletion | Full-stack | Missing | Soft delete, cascade ke works/sessions, UI confirmation |
| P2-4 | Real test suite | Backend | 47 smoke tests only | Unit + integration tests untuk edge cases |
| P2-5 | SEO + Open Graph tags | Frontend | Missing | OG meta per halaman (profile, work) |
| P2-6 | Content moderation | Full-stack | Missing | Flag/report button, admin review queue |
| P2-7 | Admin panel | Full-stack | Missing | Basic interface untuk manage users dan content |
| P2-8 | Performance + bundle audit | Frontend | Not done | Code splitting, lazy loading |
| P2-9 | Accessibility audit | Frontend | Primitives ada | WCAG 2.1 AA audit + fixes |
| P2-10 | Staging environment | DevOps | Missing | Full stack staging (separate DB, domain) |
| P2-11 | Load testing | DevOps | Not done | k6 untuk establish baseline |
| P2-12 | Log aggregation | DevOps | stdout only | Pipeline Pino logs ke centralized platform |
| P2-13 | Image CDN | DevOps | GridFS direct | Nginx caching layer atau S3+CloudFront |

---

## 12. P0 / P1 / P2 Priorities

### P0 — Critical
> Harus selesai sebelum production. Tanpa P0, aplikasi tidak bisa diluncurkan.

- **SPA tidak tersambung ke API** — semua data dari localStorage, tidak persist ke server
- **Tidak ada production deployment** — tidak ada infrastructure
- **Secrets masih placeholder** — `change-me-*` di production adalah security hole

### P1 — Important
> Sangat disarankan sebelum public launch. Tanpa P1, ada risiko signifikan terhadap pengguna.

- Tanpa email verification → user bisa daftar dengan email orang lain
- Tanpa password reset → user yang lupa password kehilangan akun permanen
- Tanpa error states → API failure bisa menyebabkan blank screen
- Tanpa monitoring → masalah production tidak terdeteksi
- Tanpa backup → data loss jika DB bermasalah

### P2 — Post-launch
> Aplikasi bisa berjalan tanpa P2, tapi experience dan operasional kurang optimal.

- Photo placeholder merusak kepercayaan (randomuser.me bukan foto asli)
- Tanpa moderation = spam/abuse risk seiring traction tumbuh
- Tanpa staging = setiap deployment ke production tanpa safety net

---

## 13. Detailed Effort Estimation

> Estimasi untuk **1 experienced full-stack developer** — realistis, termasuk debugging, integrasi, dan edge cases.
> Buffer **tidak termasuk** di tabel ini; lihat tabel scenario untuk angka dengan buffer.

### P0 — Critical

| ID | Work Item | Est. Hours | Complexity | Dependencies |
|----|-----------|:----------:|:----------:|--------------|
| P0-1 | Wire SPA ↔ API (useAccount + data fetching) | 24–32h | High | Semua API endpoint backend tersedia |
| P0-2 | Production env configuration | 4–6h | Low | P0-3, P0-4 |
| P0-3 | MongoDB Atlas setup | 6–8h | Medium | Akses Atlas |
| P0-4 | API server deployment | 8–12h | Medium | VPS/cloud provider |
| P0-5 | SPA static hosting | 3–5h | Low | P0-1 selesai |
| P0-6 | Domain + HTTPS | 2–4h | Low | Domain tersedia |
| | **P0 Total** | **47–67h** | | |

### P1 — Important

| ID | Work Item | Est. Hours | Complexity | Dependencies |
|----|-----------|:----------:|:----------:|--------------|
| P1-1 | Email verification | 14–18h | Medium | Mail service (SendGrid/SES), P0-1 |
| P1-2 | Password reset | 10–14h | Medium | P1-1 (mail transport sudah ada) |
| P1-3 | Frontend loading + error states | 10–14h | Medium | P0-1 |
| P1-4 | Redis rate limiting | 5–7h | Low-Med | Redis instance |
| P1-5 | CSP header tuning | 3–5h | Low | P0-4, P0-5 |
| P1-6 | Error tracking (Sentry) | 3–5h | Low | P0-4, P0-5 |
| P1-7 | CI/CD pipeline | 6–8h | Medium | P0-4, P0-5 |
| P1-8 | Uptime monitoring | 2–3h | Low | P0-4 |
| P1-9 | Audit log | 5–7h | Low | P0-4 |
| P1-10 | Backup strategy | 3–5h | Low | P0-3 |
| | **P1 Total** | **61–86h** | | |

### P2 — Post-launch

| ID | Work Item | Est. Hours | Complexity | Dependencies |
|----|-----------|:----------:|:----------:|--------------|
| P2-1 | Profile photo upload | 8–12h | Medium | P0-1, P0-4 |
| P2-2 | Password change | 4–6h | Low | P0-1 |
| P2-3 | Account deletion | 5–7h | Medium | P0-1 |
| P2-4 | Real test suite | 20–28h | High | — |
| P2-5 | SEO + OG tags | 6–8h | Medium | P0-5 |
| P2-6 | Content moderation | 16–24h | High | P0-1 |
| P2-7 | Admin panel | 24–36h | High | All P0 |
| P2-8 | Performance + bundle audit | 6–8h | Medium | P0-5 |
| P2-9 | Accessibility audit | 8–12h | Medium | P0-1 |
| P2-10 | Staging environment | 4–6h | Low-Med | P0-4, P0-5 |
| P2-11 | Load testing | 6–10h | Medium | P0-3, P0-4 |
| P2-12 | Log aggregation | 5–7h | Low | P0-4 |
| P2-13 | Image CDN | 6–10h | Medium | P0-4 |
| | **P2 Total** | **118–174h** | | |

---

## 14. Minimum Launch Estimate

**Scope:** P0 saja. Aplikasi fungsional end-to-end, tapi tanpa email flows, monitoring, atau safeguards tambahan.

### Yang DI-INCLUDE

- ✅ SPA tersambung ke API (register, login, CRUD work, publish)
- ✅ Production deployment (DB, API, SPA, HTTPS, domain)

### Yang TIDAK DI-INCLUDE

- ❌ Email verification → user bisa daftar dengan email palsu
- ❌ Password reset → user yang lupa password kehilangan akun
- ❌ Loading/error states → API failure bisa menyebabkan blank screen
- ❌ Monitoring → masalah tidak terdeteksi
- ❌ Backup → data loss risk

### Estimasi

| | |
|---|---|
| Raw hours (P0) | 47–67h |
| **Dengan buffer 25%** | **59–84h** |
| Hari kerja efektif (6h/hari) | 10–14 hari |
| **Estimasi minggu** | **2–3 minggu** |

---

## 15. Proper Production Estimate

**Scope:** P0 + P1. Aplikasi dengan safeguards, monitoring, dan user experience yang layak untuk public.

### Yang DI-INCLUDE

- ✅ Semua yang ada di Minimum Launch
- ✅ Email verification + password reset
- ✅ Frontend loading + error states untuk semua API calls
- ✅ Error tracking (Sentry)
- ✅ CI/CD pipeline
- ✅ Uptime monitoring
- ✅ Audit log
- ✅ Backup strategy

### Estimasi

| | |
|---|---|
| Raw hours (P0 + P1) | 108–153h |
| **Dengan buffer 25%** | **135–191h** |
| Hari kerja efektif (6h/hari) | 23–32 hari |
| **Estimasi minggu** | **4.5–6.5 minggu** |

---

## 16. Production + Polish Estimate

**Scope:** P0 + P1 + P2. Aplikasi production-grade dengan content moderation, admin panel, test suite, performance, aksesibilitas, dan staging environment.

### Yang DI-INCLUDE

- ✅ Semua P0 + P1
- ✅ Profile photo upload
- ✅ Password change + account deletion
- ✅ Real test suite (unit + integration)
- ✅ SEO + Open Graph tags
- ✅ Content moderation + admin panel
- ✅ Performance + bundle optimization
- ✅ Accessibility audit + fixes
- ✅ Staging environment + load testing
- ✅ Log aggregation + image CDN

### Estimasi

| | |
|---|---|
| Raw hours (P0 + P1 + P2) | 226–327h |
| **Dengan buffer 25%** | **283–409h** |
| Hari kerja efektif (6h/hari) | 47–68 hari |
| **Estimasi minggu** | **9.5–14 minggu** |

---

## 17. Timeline

> **Asumsi:** 1 experienced full-stack developer · 6 jam/hari productive · 5 hari/minggu

### Recommended Phasing

```
Minggu 1–2  ┃  P0-1: Wire SPA ↔ API  (~32h, item terbesar)
Minggu 2–3  ┃  P0-2..6: Env, DB Atlas, hosting, domain, HTTPS
             ┃  ━━━━━━━━━━━━━━━━━━━ Minimum Launch ━━━━━━━━━━━━━━━━━━━
Minggu 3–4  ┃  P1-1..3: Email verification, password reset, error states
Minggu 4–5  ┃  P1-4..10: Redis, CSP, Sentry, CI/CD, monitoring, audit, backup
             ┃  ━━━━━━━━━━━━━━━━━ Proper Production ━━━━━━━━━━━━━━━━━━
Minggu 6–8  ┃  P2 (selected): profile photo, password change, performance, SEO
Minggu 9–11 ┃  P2 (advanced): content moderation, test suite, accessibility
Minggu 12–14┃  P2 (optional): admin panel, load testing, staging
             ┃  ━━━━━━━━━━━━━━━━ Production + Polish ━━━━━━━━━━━━━━━━━
```

### Summary

| Scenario | Hours (buffered) | Working Days | Weeks |
|----------|:---------------:|:------------:|:-----:|
| Minimum Launch | 59–84h | 10–14 | **2–3 minggu** |
| Proper Production | 135–191h | 23–32 | **4.5–6.5 minggu** |
| Production + Polish | 283–409h | 47–68 | **9.5–14 minggu** |

---

## 18. Risks & Assumptions

### Major Risks

| Risk | Likelihood | Impact | Keterangan |
|------|:----------:|:------:|-----------|
| SPA wiring lebih kompleks dari perkiraan | Medium | +1–2 minggu | Seam sudah didesain; koneksi ini bukan refactor besar, tapi banyak touch points |
| Mail service setup (SendGrid/SES) | Low-Med | +2–3 hari | Third-party setup selalu ada learning curve |
| MongoDB Atlas configuration issues | Low | +1–2 hari | Atlas well-documented; replica set sudah diuji lokal |
| CSP breaks production build | Medium | +1–2 hari | Tailwind v4 CSS injection perlu dikonfirmasi di production build |
| Scope creep dari client | Medium | Signifikan | Tambahan fitur kecil yang "sebentar doang" bisa akumulasi jadi minggu ekstra |
| Client feedback delay | Medium | +days/weeks | Perlu define feedback turnaround SLA di awal |
| Requirement change selama development | Low-Med | Signifikan | Freeze requirements per phase untuk mitigasi |

### Assumptions

- Arsitektur yang ada digunakan as-is (tidak ada major redesign)
- Tidak ada perubahan signifikan pada business rules (quota, taxonomy, scoring)
- Tidak ada fitur baru di luar yang sudah teridentifikasi
- Cloud provider tersedia (AWS/GCP/Atlas) dan akses credentials siap
- Domain sudah dimiliki atau proses registrasi tidak delay
- Feedback dari client diberikan dalam 24–48 jam untuk unblock development
- Third-party services (SendGrid/SES, Sentry) dapat di-provision dan API key tersedia
- Tidak ada major security vulnerability yang membutuhkan redesign auth

---

## 19. Client-Facing Summary

### Current Situation

Proyek `whoareyou` dalam kondisi yang **jauh lebih maju dari rata-rata project di tahap ini**.

Backend (API + database) sudah sepenuhnya dibangun dengan:
- Autentikasi yang benar (JWT + rotating refresh token)
- Database yang terstruktur dengan validasi dan transaksi
- Logika bisnis yang di-enforce server-side (quota 2 entry per topik)

Frontend memiliki semua tampilan yang dibutuhkan pengguna — browse, filter, panel administrasi, form per-peran.

**Gap utama:** Frontend belum terhubung ke backend. Saat ini, semua data (registrasi, portofolio, profil) tersimpan secara lokal di browser pengguna — bukan di server. Ini adalah bagian yang memang dirancang untuk disambungkan selanjutnya, dan fondasi yang tepat sudah ada.

---

### Remaining Work

| Prioritas | Pekerjaan Utama |
|-----------|----------------|
| **Critical** | Menghubungkan frontend ke backend, provisioning database produksi, deployment infrastruktur, domain + HTTPS |
| **Important** | Email verification + password reset, monitoring, CI/CD, backup strategy |
| **Post-launch** | Profile photo upload, content moderation, admin panel, test suite |

---

### Estimated Effort

```
┌──────────────────────────────────────────────────────────────┐
│  Scenario A — Minimum Launch                                 │
│  Fungsional end-to-end, tanpa email verification & monitoring │
│                                                              │
│  Estimated:  59–84 jam development                           │
│  Timeline:   2–3 minggu                                      │
├──────────────────────────────────────────────────────────────┤
│  Scenario B — Proper Production  ← Recommended               │
│  Layak untuk public: email, error handling, monitoring, backup│
│                                                              │
│  Estimated:  135–191 jam development                         │
│  Timeline:   4.5–6.5 minggu                                  │
├──────────────────────────────────────────────────────────────┤
│  Scenario C — Production + Polish                            │
│  Termasuk moderation, admin, test suite, performance, a11y   │
│                                                              │
│  Estimated:  283–409 jam development                         │
│  Timeline:   9.5–14 minggu                                   │
└──────────────────────────────────────────────────────────────┘
```

---

### Major Risks

- **Item terbesar tunggal** adalah menghubungkan frontend ke backend (~24–32 jam). Ini mechanical tapi memiliki banyak touch points yang perlu ditest menyeluruh
- **Email service** bergantung pada setup third-party provider (SendGrid atau Amazon SES)
- **Scope creep** adalah risiko paling umum — lebih baik freeze scope per phase dan treat penambahan sebagai change request

---

### Recommendation

**Mulai dari Scenario B (Proper Production).**

Scenario A mengekspos pengguna nyata ke risiko yang tidak perlu: tidak ada password reset berarti user yang lupa password kehilangan akunnya permanen, dan tidak ada email verification artinya siapapun bisa mendaftar menggunakan email orang lain.

Selisih waktunya sekitar **2–4 minggu** dari Scenario A, tapi perbedaan kepercayaan pengguna sangat signifikan.

**Scenario C** bisa dikerjakan secara iteratif setelah launch — content moderation dan admin panel misalnya, bisa ditambahkan berdasarkan traction awal yang muncul.

---

*Audit ini dihasilkan dari inspeksi langsung seluruh source code, dokumentasi, schema database, dan test suite pada 17 September 2026. Tidak ada file yang diubah selama proses audit. Estimasi menggunakan standar 1 experienced developer at 6 productive hours/day dengan buffer 25% untuk debugging, integrasi, dan edge cases.*
