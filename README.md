# 🎓 TaskKu — Panduan Deploy ke Vercel

Aplikasi daftar tugas kuliah dengan login, disimpan di Upstash Redis (via Vercel Storage).

---

## 📁 Struktur File

```
taskku-kv-auth/
├── api/
│   ├── auth/
│   │   ├── login.js      ← POST /api/auth/login
│   │   ├── logout.js     ← POST /api/auth/logout
│   │   └── check.js      ← GET  /api/auth/check
│   └── tasks.js          ← semua /api/tasks/*
├── public/
│   └── index.html        ← Frontend
├── vercel.json           ← Routing config
└── README.md
```

---

## 🚀 Langkah Deploy (ikuti urutan ini!)

### Step 1 — Upload ke GitHub

1. Buka https://github.com/new
2. Buat repo baru, misal: `taskku`
3. Centang **"Add a README file"** → **Create repository**
4. Klik **"uploading an existing file"** → drag & drop semua isi folder ini
5. Klik **Commit changes**

---

### Step 2 — Deploy ke Vercel

1. Buka https://vercel.com → **Add New Project**
2. Import repo `taskku` dari GitHub
3. Klik **Deploy** langsung (belum perlu setting apapun)
4. Tunggu ~1 menit sampai selesai

---

### Step 3 — Buat Database Upstash Redis

1. Di Vercel Dashboard → buka project `taskku`
2. Klik tab **Storage**
3. Klik **Create Database** → pilih **Upstash** (Redis)
4. Isi nama: `taskku-db` → pilih region **Singapore (sin1)** → **Create**
5. Setelah dibuat, klik **Connect to Project**
6. Di dialog "Configure", ubah **Custom Prefix** dari `STORAGE` menjadi **`KV`**
7. Pastikan semua environment dicentang ✅ → klik **Connect**

> Setelah connect, Vercel otomatis menambahkan env variables:
> `KV_REST_API_URL` dan `KV_REST_API_TOKEN`

---

### Step 4 — Tambah Environment Variables

Di Vercel Dashboard → Project → **Settings** → **Environment Variables**

Tambahkan 3 variabel berikut:

| Name | Value |
|------|-------|
| `APP_USERNAME` | `raffi25003` |
| `APP_PASSWORD_HASH` | `4bb6d2624c8b313b089b3d507068a97ce17c1b39db3297d78d741528509da31d` |
| `SESSION_SECRET` | `taskku-secret-raffi-2025` (boleh diganti string apapun) |

Klik **Save** setiap kali menambahkan variabel.

---

### Step 5 — Redeploy

Karena env variables baru ditambahkan, perlu redeploy:

1. Buka tab **Deployments**
2. Klik titik tiga (**···**) di deployment terbaru
3. Klik **Redeploy** → **Redeploy**
4. Tunggu selesai → buka URL project kamu 🎉

---

## 🔑 Login Credentials

| Field | Value |
|-------|-------|
| Username | `raffi25003` |
| Password | `raffifauzan2005` |

---

## 🔐 Cara Ganti Password

**1. Generate hash SHA-256 password baru** via browser console (F12):
```javascript
const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('passwordbaru'));
console.log([...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,'0')).join(''));
```

**2.** Copy hash yang muncul

**3.** Update env variable `APP_PASSWORD_HASH` di Vercel Settings → Redeploy

---

## 🔐 Cara Ganti Username

Update env variable `APP_USERNAME` di Vercel Settings → Redeploy.

---

## 🛠 Troubleshooting

| Error | Penyebab | Solusi |
|-------|----------|--------|
| `HTTP 404` saat login | File API tidak terdeteksi Vercel | Pastikan struktur folder `api/auth/` sudah benar di repo |
| `KV belum diset` | Env variable KV kosong | Ulangi Step 3, pastikan prefix = `KV` |
| `APP_USERNAME / APP_PASSWORD_HASH belum diset` | Env variables belum diisi | Ulangi Step 4 |
| Login berhasil tapi data tidak tersimpan | KV belum terconnect | Pastikan sudah klik Connect di Step 3 |
| Semua sudah benar tapi masih error | Env variable baru belum aktif | Redeploy ulang (Step 5) |

---

## ✅ Fitur

- 🔐 Login dengan username & password (password di-hash SHA-256, tidak disimpan plaintext)
- 🔒 Session disimpan di Redis, expire otomatis **7 hari**
- 🛡 Anti brute force: delay 1 detik saat login gagal
- ↩️ Session expired → otomatis redirect ke halaman login
- 📋 Tambah tugas dengan nama, mata kuliah, deadline, prioritas
- ✅ Centang tugas selesai
- 🗑 Hapus tugas / hapus semua yang sudah selesai
- 📊 Progress bar & statistik
- 📱 Responsive: mobile, tablet, laptop, desktop
