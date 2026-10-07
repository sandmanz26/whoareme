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
