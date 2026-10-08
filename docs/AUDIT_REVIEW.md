# Audit Review — whoareyou (08 Oktober 2026)

> Tinjauan atas [`docs/AUDIT_03102026.md`](AUDIT_03102026.md). Setiap klaim
> diverifikasi langsung ke kode, bukan ke dokumentasi. Dokumen ini adalah
> **koreksi + pelengkap**, bukan pengganti. Baca keduanya berdampingan.

| | |
|---|---|
| **Basis verifikasi** | `HEAD d86dc84`, branch `development` |
| **Metode** | Baca kode per file:line untuk tiap temuan; grep untuk bukti ada/tidaknya field, index, dependensi |
| **Hasil** | ~75% temuan akurat, ~15% overstated, ~10% salah/kontradiktif |
| **Tambahan** | 8 isu yang tidak tertangkap audit asli |

---

## A. Verdict per temuan

| ID | Verdict | Catatan singkat |
|---|---|---|
| C1 | ✅ Akurat | Hanya 2 aggregate `$match` yang rusak; write path aman. |
| C2 | ✅ Akurat (defer wajar) | Risiko rendah karena token dicek ke DB. |
| C3 | ⚠️ Sebagian | `Publish` sudah punya guard + rollback. Yang belum: `Unpublish`, `Delete`, `SetPublished`, `SetSuspended`, `DecideAppeal`, fan-out. |
| C4 | ✅ Akurat | Belum ada `$nor` guard di republish moderator. |
| C5 | ⚠️ Understated | Bukan path traversal (Express sudah aman). Risikonya extension dari `originalname` + `mimetype` spoofable. **Butuh migrasi data**, tidak disebut audit. |
| C6 | ✅ Wajar (as-is) | — |
| C7 | ❌ Salah faktual | `react-hot-toast@2.6.1` **sudah terpasang** di `package.json` dan `node_modules`. Yang hilang hanya mount + pemakaian. |
| C8 | ✅ Akurat | Contoh kode memakai `useAuthStore` (zustand) yang tidak dipakai proyek. |
| C9 | ✅ Akurat | Min `JWT_SECRET` 16; secret aktif 44 karakter, aman dinaikkan ke 32. |
| C10 | ⚠️ Akurat, fix berisiko | Hard lockout per email = vektor DoS. Lihat §B.4. |
| H1 | ✅ Akurat | — |
| H2 | ✅ Defer wajar | — |
| H3 | ✅ Akurat | — |
| H4 | ✅ Akurat | FE menelan 403 `email_unverified` di `useMyWork.saveDraft`. |
| H5 | ✅ Akurat (besar) | — |
| H6 | ⚠️ **Overstated** | `isAuth`, `isOptionalAuth`, dan `Login` semua butuh `status:"active"`. Token user suspended otomatis tak terpakai. Ini LOW. |
| H7 | ⚠️ **Understated** | Bukan sekadar tak bisa baca notice: user suspended **tidak bisa login sama sekali**, jadi seluruh alur banding tak terjangkau. |
| H8 | ✅ Akurat | — |
| H9 | ✅ Defer wajar | — |
| H10 | ✅ Akurat | Guard CAS di akhir tidak menutup side-effect reversal ganda. |
| H11 | ✅ Ignore | — |
| H12 | ✅ Akurat (parsial) | Lihat §D soal `sessions`. |
| D1 | ✅ Akurat | `patch.role` memicu rebuild `searchBlob` semua work tanpa manfaat. |
| D2 | ✅ Akurat | — |
| D3 | ⚠️ Sebagian | Index usulan memakai field `day` yang **tidak ada** di `models/report.ts`. |
| D4 | ⚠️ Sebagian lemah | `works.seeded` drop valid; `{access:1}` nilai rendah. |
| D5 | ✅ Akurat | Baru relevan setelah ada delete account. |
| S3 | ✅ Akurat | Fix "202 generic" menurunkan UX; keputusan produk. |
| S4 | ✅ Akurat | `pino-http` default men-serialize `headers`, `Authorization` ikut ter-log. |

---

## B. Koreksi penting

### B.1 C7 — toast sudah terpasang
`react-hot-toast@2.6.1` ada di dependensi dan `node_modules`; `grep -r "react-hot-toast" src/` memang nol hit. Langkah "npm install" di Batch 5 tidak perlu. Sisa pekerjaan: mount `<Toaster/>` dan panggil `toast()`.

Catatan tambahan: `zustand@5.0.15` juga terpasang dan **tidak dipakai**. Contoh C8 menyarankan memakainya — itu menambah dependency runtime yang bertabrakan dengan aturan `CLAUDE.md` ("no runtime dependency") dan tidak diperlukan.

### B.2 H6 — severity terlalu tinggi
`server/src/middleware/userAuth.ts` (`isAuth`, `isOptionalAuth`) dan `usecase/user/Auth/index.ts` (`Login`, `Me`, `UpdateProfile`) semuanya memfilter `status: "active"`. Begitu user di-suspend, token-nya langsung gagal auth. Men-set `token: null` saat suspend adalah defense-in-depth (LOW), bukan HIGH.

### B.3 H7 — dampaknya lebih besar dari yang ditulis
Konsekuensi berantai: suspend → `Login` menolak (`status:"active"`) → user tak bisa masuk → tak bisa membuka notice atau mengajukan banding. Fitur banding yang menjadi nilai jual moderasi **mati untuk populasi yang menjadi sasarannya**. Middleware carve-out saja tidak cukup.

### B.4 C10 — lockout bisa jadi DoS
Lockout keras per email berarti siapa pun yang tahu email korban bisa mengunci akunnya. Rekomendasi: throttle per-email (tanpa lock permanen), atau lock yang mensyaratkan kombinasi email+IP dan auto-expire cepat. Ini keputusan produk (lihat §F).

### B.5 C5 — wajib migrasi data
Mengubah URL `/${folder}/${file}` → `/uploads/${folder}/${file}` memutus semua `thumbnailPath` dan `photoUrl` yang sudah tersimpan. Yang harus dilakukan bersamaan:
1. Ubah mount + derive extension dari mimetype (allowlist), bukan `originalname`.
2. Script migrasi `updateMany` untuk `users.photoUrl` dan `works.thumbnailPath`.
3. `removeFile()` merekonstruksi path dari `API_BASE_URL`; pastikan skema baru konsisten antara dev/prod.

### B.6 D3 — field `day` tidak ada
`models/report.ts` tidak punya field `day`. Index `(reporterHash, targetKind, targetId, reason, day)` tidak bisa dipasang sebelum field ditambah. Dan mengubah unique index pada DB berisi data bisa gagal karena duplikat — **dedupe dulu**.

### B.7 C3 — scope menyentuh yang sudah beres
`WorkUsecase.Publish` sudah memakai guarded `updateOne` (`$nor` kuota) + compensating rollback. Yang benar-benar belum: `Unpublish`, `Delete`, `ModerationWorkUsecase.SetPublished`, `ModerationPeopleUsecase.SetSuspended`, `DecideAppeal`, fan-out `UpdateProfile`.

---

## C. Temuan yang tidak tertangkap audit

| # | Temuan | Bukti |
|---|---|---|
| 1 | Route `/signup` tidak ada, tapi `PanelPage` menavigasi ke sana → 404 | `src/pages/PanelPage.tsx` vs `src/routes.tsx` |
| 2 | `disabledRoles` tidak berpengaruh ke pengunjung publik | `useAdmin` mengambil `/moderation/settings` (moderator-only); `GET /user/settings` publik tidak pernah dipanggil FE |
| 3 | Halaman publik menyatakan produk serverless/localStorage — sudah tidak benar | `PrivacyPage.tsx`, `TermsPage.tsx`, `ContentPolicyPage.tsx:144` |
| 4 | Tombol "Delete profile" hanya logout, tidak menghapus data server | `useAccount.deleteAccount` hanya `postLogout()` |
| 5 | `resetPassword` memakai kanal gagal untuk sukses | `useAccount.tsx`: `return { ok:false, reason:"Reset link sent…" }` |
| 6 | `company`, `skills`, `languages`, `openToWork` tak bisa diedit dari UI walau server mendukung | `useMyProfile.ts` + `ProfileForm` |
| 7 | Dua sumber kebenaran taxonomy (FE statis vs `server/src/constant/app.ts`); `GET /user/taxonomy` ada tapi tak dipakai | `src/data/taxonomy.ts` |
| 8 | `hasStoredAccount: true` hardcoded — sisa kode localStorage | `useAccount.tsx` |

---

## D. Kontradiksi internal audit

1. **`sessions`.** H12 bilang "hanya tambah entry di DATABASE.md", Batch 4 bilang "buat schema + model + index". Padahal C2 (yang membutuhkan sessions) di-defer, dan collection `sessions` **tidak ada di kode**. Jangan dokumentasikan atau buat sesuatu yang belum dipakai.
2. **Premis transaksi.** `server/README.md` mengklaim publish berjalan dalam transaksi dan fallback ke compensating di standalone. Kode **tidak punya jalur transaksi sama sekali** (grep `withTransaction`/`startSession` = nol), jadi selalu compensating. README harus diperbaiki, bukan sekadar di-defer.
3. **C3/C7** sudah dijelaskan di §B.1 dan §B.7.

---

## E. Klasifikasi severity ulang

| Tingkat | Item |
|---|---|
| **P0 — rusak / akurasi legal** | C1, H4, halaman legal (C.3), delete profile (C.4), `/signup` (C.1), `disabledRoles` publik (C.2) |
| **P1 — keamanan / aturan produk** | C4, C5 (+migrasi), C9, C10 (tanpa hard-lock), S4, H7, H8 |
| **P2 — reliability/data** | C3 sisa, H10, D1–D5, H6 |
| **P3 — UX/infra** | C7, C8, H1, H3, H5, U2–U4, wiring taxonomy/facets/settings/funnel |
| **P4 — deferred** | C2, H2, H9, U5, S5, S6, sessions, pagination, CI/CD |

---

## F. Keputusan Batch 0 (dikonfirmasi 8 Oktober 2026)

Semua keputusan blocking sudah diambil. Batch 3–4 tidak lagi menunggu.

| # | Keputusan | Hasil |
|---|---|---|
| 1 | **Standalone vs replica set** | **Standalone.** Compensating + `db:reconcile` (cron). Perbaiki `server/README.md`. Tidak menambah jalur transaksi. |
| 2 | **Anti credential-stuffing (C10)** | **Throttle per-email + jeda progresif, tanpa lock permanen.** Tidak mengunci hanya berdasarkan email. |
| 3 | **Banding untuk user suspended (H7)** | **Login terbatas** untuk `status:"suspended"`, scope hanya `/notices/*` dan `DELETE /auth/me`. |
| 4 | **`sessions` collection** | **Belum dibuat.** Revisit bersama C2. Dikeluarkan dari Batch 4. |
| 5 | **Migrasi URL upload (C5)** | **Migrasi data + alias.** Mount di `/uploads`, derive ekstensi dari MIME, `updateMany` untuk `users.photoUrl` dan `works.thumbnailPath`, plus route lama yang mengarahkan ke lokasi baru. |

---

## G. Urutan batch revisi

1. **Batch 0** — keputusan §F (tanpa kode).
2. **Batch 1** — P0 cepat: C1, `/signup`, `resetPassword`, `disabledRoles` publik, mount Toaster. **Sudah dieksekusi (lihat §H).**
3. **Batch 2** — kebenaran legal & data: perbarui halaman publik; pindahkan delete profile ke `DELETE /auth/me` + cascade, atau ubah copy.
4. **Batch 3** — keamanan: C9 → C5 (+migrasi) → S4 → C4 → C10 (setelah keputusan §F.2).
5. **Batch 4** — data/reliability: C3 sisa, H10, H8, D1–D5 (dedupe sebelum index).
6. **Batch 5** — FE infra: C7 lanjutan, C8 (tanpa zustand), H3, H4, H1.
7. **Batch 6** — wiring taxonomy/facets/settings/funnel dari server, **lalu** H5/U4.
8. **Batch 7** — deferred: C2, pagination, sessions, CI/CD.

---

## H. Yang dieksekusi di Batch 1

| Item | Perubahan |
|---|---|
| C1 | `usecase/user/Traffic/index.ts`: cast `new Types.ObjectId(userId)` pada `$match` aggregate. |
| `/signup` | `PanelPage.tsx`: tombol "Create a profile" memanggil `openJoin()` dari `BrowseContext` (modal registrasi yang nyata) alih-alih `navigate("/signup")` yang 404. |
| `resetPassword` | `useAccount.tsx`: return `{ ok: true }` saat sukses (sebelumnya `ok:false`). |
| `disabledRoles` publik | Endpoint baru `fetchPublicSettings()` → `GET /user/settings`; `useAdmin` memakai `apiSettings ?? publicSettings` sehingga role yang ditarik dan copy dari server berlaku untuk semua pengunjung, bukan hanya moderator. |
| Toast | `<Toaster/>` di-mount di `Shell.tsx`; `apiErrorMessage()` di `lib/api/client.ts`; feedback sukses/gagal di `useMyWork`, `useMyProfile`, `useAdmin`. |

### H.1 Blocker yang ditemukan saat verifikasi (di luar Batch 1)

Verifikasi membuka tiga masalah yang **sudah ada sebelum Batch 1** dan membuat repo tidak bisa di-verify. Ketiganya diperbaiki agar `lint` dan `test:smoke` benar-benar hijau.

| # | Masalah | Bukti | Perbaikan |
|---|---|---|---|
| 1 | `npm run lint` (FE) gagal 2 error tipe | `JoinModal` tidak mengisi `access`; `PanelPage` mengirim `string[]` ke `ChipGroup` yang butuh `CategoryId[]` | `register` di context meng-omit `access`; cast `topics` di `PanelPage`. |
| 2 | `PATCH /auth/me` 500 di seluruh server | `Work.updateMany(filter, [pipeline])` ditolak Mongoose 9 | tambah opsi `{ updatePipeline: true }` (satu-satunya pipeline update di server). |
| 3 | `react-hot-toast` mengimpor `goober`, `tsc` gagal TS1203 | `tsconfig.app.json` tanpa `skipLibCheck` | tambah `"skipLibCheck": true`. |

### H.2 Temuan tambahan pada C1 (tidak ada di audit)

Setelah cast C1 benar, `GET /traffic/me` masih salah: `series[].work` diisi objek Map (`TrafficDaily.work`) alih-alih angka, sehingga `totals.workOpens` rusak. Diperbaiki dengan menjumlahkan map per hari, dan `perWork` kini dihitung dari query yang sama agar `series` dan `perWork` tidak mungkin berbeda.

### H.3 Verifikasi

- `npm run lint` (root): `tsc` hijau, ESLint 0 error (12 warning lama `react-hooks/incompatible-library`).
- `cd server && npm run lint`: hijau (2 warning `no-explicit-any` lama).
- `cd server && npm run test:smoke`: **91 passed, 0 failed**. README mengklaim 125 assertion; angka itu tidak pernah benar.
- `npm run build`: sukses (sitemap 71 URL).

§8 smoke kini menguji **read-path** traffic dengan meng-assert `workOpens > 0` dan entri spesifik muncul di `perWork`, sehingga regresi C1 akan tertangkap. Sebelumnya §8 hanya memeriksa bentuk respons, itulah sebabnya kegagalan total C1 lolos sekian lama.

---

## I. Tetap deferred (jangan dikerjakan tanpa keputusan)

C2, H2, H9, U5, S5, S6, `sessions`, pagination, CI/CD. H7 dan C10 menunggu §F. C5 dan D3/D4 menunggu langkah migrasi/dedupe.

---

## J. Batch 2 (selesai, 8 Oktober 2026)

**Tujuan:** kebenaran halaman publik + alur hapus akun yang benar-benar menghapus.

### Backend

- `DELETE /api/v1/user/auth/me` (`isAuth`) → `AuthUsecase.DeleteAccount`.
- `DeleteAccount`: menghapus **hard** works, trafficEvents, trafficDaily, notices, reports yang menargetkan user/works; men-null-kan `reports.resolvedBy`; menghapus file upload (portrait + thumbnail) lewat helper baru `utils/files.ts`; lalu men-scrub user jadi tombstone (`status: "deleted"`, `deletedAt`, email/password/token/photo/profil dikosongkan). `moderationAction` sengaja dipertahankan sebagai audit.
- `IUser.status` ditambah `"deleted"`.
- `removeFile` dipindah ke `server/src/utils/files.ts` sebagai `removeStoredFile`, dipakai bersama oleh Uploads dan Auth.

### Frontend

- Endpoint `deleteMe()`; `useAccount.deleteAccount` kini `async` dan sesungguhnya memanggil server sebelum membersihkan sesi + cache.
- `DeleteProfile` di `PanelPage`: copy akurat, tombol pending, toast sukses/gagal.
- Copy in-app yang keliru diperbaiki: `PanelPage` (overview + SignedOut), `JoinModal` (success + password hint), `AboutPage` ("front-end demo" → produk dengan backend), `AdminPage` (copy Reset), `WorkEditor` ("stored in this browser only").
- `ReportModal`: klaim "no account needed" dihapus; tamu diarahkan ke `/signin` karena API mewajibkan auth.
- Halaman publik ditulis ulang sesuai produk nyata: `PrivacyPage` (peta data lengkap, 8 bagian), `TermsPage` (klaim serverless dihapus, penghapusan akun diselaraskan), `ContentPolicyPage` (laporan wajib akun; bagian "honest about itself" diperbarui), `AccessibilityPage` (klaim "no mail transport" dihapus).
- Sapuan em dash: `grep -r "—" src` kembali kosong (aturan `AGENTS.md §8`).

### Verifikasi

- `npm run lint`: 0 error (12 warning lama).
- `cd server && npm run lint`: 0 error (2 warning lama).
- `cd server && npm run test:smoke`: **98 passed, 0 failed**. §18 baru menguji: akun hapus → token 401, login 401, entri hilang dari publik (404), dan email bebas dipakai daftar ulang.
- `npm run build`: sukses.

### Catatan keputusan yang diambil

Penghapusan memakai **hard delete** untuk konten dan telemetri, bukan soft-delete, karena Terms menjanjikan "tidak ada salinan yang disimpan". User row disisakan sebagai tombstone ter-scrub semata agar `moderationAction` tetap punya aktor. Jika nanti diinginkan soft-delete, ubah copy Terms lebih dulu agar tidak berbohong.

---

## K. Batch 3 (selesai, 8 Oktober 2026)

Keputusan §F dikonfirmasi, lalu dikerjakan. Commit `fcb7c1f`.

### 3a — keamanan cepat

| Item | Perubahan |
|---|---|
| C9 | `TOKEN_HASH_SECRET` dipisah dari `JWT_SECRET`; `JWT_SECRET` minimum 32; `.env.example` diperbarui |
| S4 | `pino` redact: `authorization`, `cookie`, `password`, `passwordHash`, `token` |
| C4 | Guard `$nor` kuota di `ModerationWorkUsecase.SetPublished` + compensating rollback; smoke §19 |

### 3b — data dan alur

| Item | Perubahan |
|---|---|
| C5 | Upload disajikan dari `/uploads/*`; ekstensi dari allowlist MIME; `Content-Disposition: inline`; redirect path lama; `server/src/utils/files.ts` menangani bentuk lama dan baru |
| C5 | Script `npm run db:migrate-uploads` (`scripts/migrate-upload-urls.ts`) untuk menulis ulang URL tersimpan. **Belum dijalankan** atas permintaan. |
| C10 | `loginThrottle` per-email dengan jeda progresif (maks 3s), tanpa lock permanen |
| H7 | `isAuthAllowSuspended` untuk notices, logout, `GET`/`DELETE /auth/me`; `Login` dan `Me` menerima status `suspended`; FE menampilkan panel terbatas untuk akun suspended |

### Verifikasi

- `npm run lint` dan `cd server && npm run lint`: 0 error.
- `cd server && npm run test:smoke`: **114 passed, 0 failed** (§19 kuota, §20 upload, §21 suspended).
- `npm run build`: sukses.
- Manual: S4 (token tidak muncul di log), C5 (path baru 200 + `Content-Disposition`, path lama 301, traversal 404), C10 (attempt 5-8 melambat 0.33s→1.74s, email lain tetap 0.10s).

### Catatan

- `db:migrate-uploads` harus dijalankan saat deploy sebelum redirect path lama dilepas. Selama belum, gambar lama tetap hidup lewat redirect.
- H7 hanya menyentuh notices + hapus akun; route lain tetap menolak akun suspended.

---

## L. Batch 4 (selesai, 8 Oktober 2026)

Data dan reliability.

| Item | Perubahan |
|---|---|
| H10 | Decide appeal memakai satu `findOneAndUpdate` atomik sebagai klaim; dua moderator tidak bisa sama-sama membalik |
| C3 sisa | Kompensasi di `Unpublish`, moderator unpublish, dan `SetSuspended`; fan-out `UpdateProfile` di-`catch` + log, tidak lagi menggagalkan seluruh edit profil |
| H8 | `Delete` menghapus file thumbnail; juga menghapus traffic events, unset counter harian, dan menutup reports yang menunjuk entri itu |
| D1 | `patch.role` dikeluarkan dari pemicu fan-out (role ada per entri, bukan di snapshot) |
| D3 | `report.day` ditambah; unique index jadi `(reporterHash, targetKind, targetId, reason, day)` |
| D4 | Index `users.access`, `notices(userId, createdAt)`, `notices("appeal.outcome")`; index `works.seeded` dibuang |
| D5 | Ditinjau: query pembaca sudah memfilter `deletedAt`/`status`; tidak ada perubahan kode |
| docs | `server/README.md` diperbaiki: klaim transaksi/replica-set, refresh token, driver native, dan scrypt diganti sesuai kenyataan |

### Verifikasi

- `npm run lint` dan `cd server && npm run lint`: 0 error.
- `cd server && npm run test:smoke`: **118 passed, 0 failed** (§22 baru: cascade hapus entri).
- `npm run build`: sukses.

### Catatan

- Index baru berlaku setelah `npm run db:setup` (`syncIndexes`). Perubahan index report akan **drop** index unique lama `(reporterHash, targetId)`; dokumen lama tanpa `day` tetap aman karena field baru nullable.
- `db:migrate-uploads` masih menunggu dijalankan saat deploy.

---

## M. Handover — status per 8 Oktober 2026 (untuk lanjut besok)

**Branch:** `development`. **HEAD:** `8f9b1bb`. Working tree bersih kecuali `docs/AUDIT_03102026.md` (untuk Anda, sengaja tidak di-commit).

**Sudah selesai dan terverifikasi:**

| Batch | Commit | Isi |
|---|---|---|
| 1 | `ec021be` | Fix traffic (cast + sum), `/signup`, `resetPassword`, `disabledRoles` publik, toaster + feedback mutasi, perbaikan baseline (updatePipeline, lint FE, skipLibCheck) |
| 2 | `ec021be` | Hapus akun end-to-end + cascade; koreksi halaman publik & copy; report wajib login; sapuan em dash |
| 3 | `71292f1` | C9 `TOKEN_HASH_SECRET`, S4 redact log, C4 guard kuota republish, C5 `/uploads` + MIME + redirect + script migrasi, C10 throttle per-email, H7 akses akun suspended |
| 4 | `8f9b1bb` | H10 CAS appeal, C3 kompensasi unpublish/suspend/fan-out, H8 + cascade hapus entri, D1, D3 `report.day`, D4 index, README diperbaiki |

**Verifikasi terakhir:** FE lint 0 error, server lint 0 error, `test:smoke` **118 passed**, `npm run build` sukses.

**Keputusan Batch 0 (dikonfirmasi, §F):** standalone + compensating; throttle tanpa lock; login terbatas untuk suspended; `sessions` belum dibuat; migrasi URL + alias.

**Utang deploy (belum dijalankan):**
- `npm run db:setup` untuk memasang index baru (D4/D3).
- `npm run db:migrate-uploads` sebelum redirect path lama dilepas.
- Jadwalkan `npm run db:reconcile` (safety net counter).
- `server/.env` lokal sudah dapat `TOKEN_HASH_SECRET` (gitignored).

**Belum diverifikasi:** seluruh Batch 1-4 di browser (browser desktop tidak terhubung sepanjang sesi).

**Berikutnya — Batch 5 (FE infra):**
1. C8 — axios response interceptor: timeout 10s, normalisasi error, redirect ke `/signin` saat 401 (tanpa zustand, pakai event/langsung bersihkan sesi).
2. H3 — state loading/error di `useAdmin` + `AdminPage`.
3. H4 — cek `emailVerifiedAt` di tombol publish `WorkEditor` + pesan 403 `email_unverified` yang jelas.
4. H1 — refactor `ProfilePage`, `VerifyPage`, `VerifyEmailBanner`, `AvatarPicker` dari `useState+useEffect+api.get` ke `useQuery`/`useMutation`, memakai endpoint wrapper yang sudah ada.

**Setelah itu:** Batch 6 (wiring taxonomy/facets/settings/funnel dari server, lalu pecah god components), Batch 7 (deferred: C2, pagination, dll).

**Cara lanjut besok:** baca §M ini, lalu kerjakan Batch 5.

---

## N. Batch 5 (selesai, 9 Oktober 2026)

FE infra. (`§M` di atas kini historis.)

| Item | Perubahan |
|---|---|
| C8 | `client.ts`: timeout 10s + response interceptor. 401 pada endpoint non-auth memancarkan event `wru:unauthorized`; `useAccount` mendengarkannya dan membersihkan sesi, kecuali untuk akun suspended. Route guard yang mengarahkan ke `/signin`. |
| H3 | `useAdmin` mengekspos `isLoading`/`isError`; `AdminPage` menampilkan state loading/error; banner konsol diperbaiki (dulu keliru bilang "no access control / stored in your browser"). |
| H4 | Tombol publish `WorkEditor` dinonaktifkan sampai email terverifikasi, dengan alasan; error 403 server tetap muncul lewat toast. |
| H1 | `ProfilePage` pindah ke `useQuery` (membedakan 404 vs error); `VerifyPage`, `VerifyEmailBanner`, `AvatarPicker` memakai wrapper endpoint (`postVerifyConfirm`, `postVerifyRequest`, `postProfilePhoto`, `deleteProfilePhoto`) alih-alih `api.*` mentah. |

**Verifikasi:** FE lint 0 error (12 warning lama), `npm run build` sukses. Smoke tidak berubah (118) karena Batch 5 tidak menyentuh server. Verifikasi browser masih tertunda.

**Berikutnya — Batch 6:** wiring `GET /user/taxonomy`, `GET /user/people/facets`, `GET /user/settings`, dan funnel ingest/dashboard dari server (mengganti data statis di FE), lalu pemecahan god components (`AdminPage` 997, `PanelPage` ~950, `WorkEditor` ~500).

---

## O. Batch 6 (sebagian, 9 Oktober 2026)

### Dikerjakan: funnel dari server

| Item | Perubahan |
|---|---|
| Ingest | `src/lib/analytics.ts`: `track()` tetap menaikkan counter lokal, lalu menjadwalkan `flushFunnel()` (debounce 5s); `pagehide` melakukan flush terakhir dengan `keepalive`. Flush mengirim snapshot, mengurangi persis yang terkirim, dan menyaring hanya step yang dikenal (skema server `.strict()`, key usang akan menggagalkan flush selamanya). |
| Dashboard | `AdminPage` `FunnelSection` membaca `GET /moderation/analytics/funnel?days=30` via `useQuery` (loading/error), bukan `localStorage`. `resetFunnel` lokal dihapus karena tidak ada padanannya di server. |
| Kontrak | Diverifikasi dengan curl: payload valid → 204; key asing → 400 (server strict). |

### Sengaja ditunda, dengan alasan

- **Taxonomy dari server** (`GET /user/taxonomy`): server hanya mengembalikan `id`/`status`/`kind`, tanpa label, blurb, atau tint yang dipakai UI. Menyambungkannya berarti menambah dependensi async pada seluruh filter untuk keuntungan nol, karena data statis FE diturunkan dari konstanta yang sama dan berubah bersamaan saat deploy. Tidak dikerjakan.
- **People facets dari server** (`GET /user/people/facets`): `BrowseContext` sudah menghitung count dari data yang sama yang ia filter; facets server redundan sampai filtering dipindah ke server (H2, deferred). Tidak dikerjakan.
- **God components** (`AdminPage`, `PanelPage`, `WorkEditor`): pemecahan besar tanpa test suite dan tanpa akses browser adalah risiko regresi yang tidak bisa diverifikasi. Ditunda sampai verifikasi browser tersedia. Satu perbaikan copy di `AdminPage` (banner) sudah dilakukan di Batch 5.

**Verifikasi:** FE lint 0 error (12 warning lama), `npm run build` sukses, kontrak ingest terkonfirmasi. Smoke tidak berubah (118, server tidak disentuh).

---

## P. Batch 7 (sebagian, 9 Oktober 2026)

### Dikerjakan

| Item | Perubahan |
|---|---|
| U5 (error boundary) | `ErrorBoundary` di root (`main.tsx`) + `errorElement` per route (`RouteError`), jadi render error jadi halaman, bukan layar putih |
| U5 (lazy) | Halaman di-`lazy()` di `routes.tsx`, `<Suspense>` di `Shell`; bundle awal turun dari ~955 kB ke ~641 kB dan setiap halaman jadi chunk sendiri |
| CI | `.github/workflows/ci.yml`: lint + build SPA, lint + `test:smoke` API. **Belum dieksekusi** (tidak bisa dijalankan dari sesi ini) |

### Masih deferred, dengan alasan

- **C2 (refresh token/multi-session)** dan **`sessions`**: ini revamp auth penuh dan bertentangan dengan keputusan §F.4 ("sessions belum sekarang"). Tidak dikerjakan tanpa keputusan baru.
- **H2 (pagination server-side)**: butuh rework `BrowseContext` + endpoint; nunggu keputusan desain.
- **S5/S6 (image bomb / EXIF strip)**: bernilai (EXIF GPS pada potret itu isu privasi nyata) tapi butuh `sharp` atau parser biner; dikerjakan terpisah.
- **God components**: masih menunggu verifikasi browser.

**Verifikasi:** FE lint 0 error (12 warning lama), `npm run build` sukses (chunk terpisah), smoke tidak berubah (118). CI belum dijalankan.

---

## Q. Batch 8 — God component split (selesai, 9 Oktober 2026)

| File | Sebelum | Sesudah | Komponen baru |
|---|---|---|---|
| `pages/AdminPage.tsx` | 997 | 154 | `components/admin/{primitives,ReviewQueue,EntriesTable,PeopleTable,FunnelSection,SiteSection,AuditLog}.tsx` |
| `pages/PanelPage.tsx` | 959 | 176 | `components/panel/{Overview,ProfileForm,DeleteProfile,PortfolioSection,VerifyEmailBanner}.tsx` |
| `pages/WorkPage.tsx` | 476 | 312 | `components/work/{Chapter,WorkAside}.tsx` |

Commit: `5578180` (admin), `45cf91a` (panel), dan commit WorkPage.

**Tidak dikerjakan:** pemecahan `WorkEditor` (488 LOC). Audit menaruhnya bersama migrasi RHF di H5, bukan murni pemecahan; biar jadi satu pekerjaan tersendiri.

**Verifikasi:** `npm run lint` 0 error (12 warning lama), `npm run build` sukses. **Tidak ada perubahan perilaku yang disengaja**, tetapi UI belum dicek di browser (browser belum tersambung), jadi regresi visual belum bisa dikesampingkan.

---

## R. Verifikasi browser (9 Oktober 2026)

Browser desktop tersambung. SPA di `http://localhost:9800`, API `http://localhost:4000`.

### Lulus

- **Sapuan route** (`/`, `/work`, `/about`, `/changelog`, `/privacy`, `/terms`, `/content-policy`, `/accessibility`, `/signin`, 404): semua render dengan heading benar, **0 console error**, tidak ada overflow horizontal (lebar ~1000px). Guard route bekerja: `/panel` → `/signin`, `/admin` → `/`.
- **Alur penuh**: register lewat modal (201) → panel render → banner verify email tampil → WorkStarter → WorkEditor (readiness 5/5) → Publish → entri muncul di home, `/work`, dan halaman case study → hapus akun (`DELETE /auth/me` 200, token dibersihkan, redirect `/signin`) → entri ikut hilang dari publik (API 404). Semua tanpa console error.
- **Batch 6 funnel**: flush terkirim (`POST .../analytics/funnel` 204) dan `whoareyou:funnel` kembali `{}`, artinya counter benar-benar terkirim lalu dibersihkan.
- **Batch 5 H4**: setelah email terverifikasi, banner verify hilang dan tombol Publish aktif.

### Bug ditemukan dan diperbaiki

**Publish entri baru tidak pernah terkirim.** `POST /user/work` 201, tapi tidak ada `POST /work/:id/publish`; entri tersimpan sebagai draft. Sebabnya di `useMyWork.saveDraft` cabang create: `resolved` dibangun ulang dari respons server (selalu `status: "draft"`) dan **menjatuhkan flag `published`** dari draft pemanggil, sehingga pengecekan publish tidak pernah menyala. Diperbaiki dengan membawa `published` melintasi create. Diverifikasi ulang: kini `POST /work/:id/publish` 200 dan nav menampilkan "1/2".

### Keterbatasan yang belum tuntas

- **Lebar 360/390/768/1024/1440 belum diuji**: tidak ada tool kontol viewport; perlu resize manual.
- Tab berada dalam keadaan `document.hidden` → pengukuran layout kurang dapat diandalkan dan screenshot tidak tersedia. Perlu pane browser benar-benar terlihat.
- **Email verification di dev gagal**: `MAIL_TRANSPORT=http` (Resend) membalas 502, jadi token verifikasi tidak dikembalikan; verifikasi dilakukan lewat update DB. Di produksi ini tidak masalah, tetapi untuk dev sebaiknya `MAIL_TRANSPORT=log` atau `none`.

**Commit fix:** `fix(panel): publish a new entry on first save`.
