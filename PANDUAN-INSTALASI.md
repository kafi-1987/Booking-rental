# PANDUAN INSTALASI — Aplikasi Booking Rental Mobil

## A. BACKEND (Google Apps Script)
1. Buka https://script.google.com → **Proyek Baru**.
2. Ganti isi `Code.gs` dengan isi berkas **Kode.gs** (rename file jadi "Kode").
3. Menu ⚙️ Project Settings → centang **Show "appsscript.json"**, lalu ganti isinya dengan berkas **appsscript.json**.
4. Pilih fungsi **setupAppEnvironment** → ▶ Run **(HANYA SEKALI)** → izinkan akses Drive, Sheets, Gmail.
5. Buka **Execution Log**: catat **password owner awal** yang tampil (username: `owner`).
6. **Deploy → New deployment → Web app** → Execute as: **Me**, Who has access: **Anyone** → Deploy → **copy URL /exec**.
7. Tambah kasir: edit fungsi `tambahKasir()` (username & password), Run sekali. Ganti password owner: edit `resetPassword()`, Run sekali.
> Setiap mengubah Kode.gs, deploy ulang: Deploy → Manage deployments → ✏️ → New version.

## B. FRONTEND (GitHub Pages)
Folder kerja = **hasil ekstrak ZIP `rental-mobil-frontend`** (di dalamnya langsung terlihat `index.html`, `css`, `js`). **Di folder inilah `git init` dijalankan** — jangan masuk lebih dalam, jangan naik satu level.
1. Buka `js/config.js`, ganti `ISI_URL_EXEC_DI_SINI` dengan URL /exec tadi. Simpan.
2. Di folder itu buka PowerShell (File Explorer → klik address bar → ketik `powershell` → Enter), jalankan `dir` → pastikan `index.html` ada di daftar.
3. Panduan push langkah demi langkah (Git, token, Pages) akan saya pandu lewat chat — kirim screenshot hasil `dir`.

## C. Uji
1. Buka URL GitHub Pages → katalog tampil.
2. Cari tanggal → booking → cek email & sheet **Booking**.
3. Cek Status → unggah bukti → cek sheet **Pembayaran** & folder Drive Uploads.
4. `#/admin` → login → setujui booking, verifikasi pembayaran.
