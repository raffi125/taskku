# 🎓 TaskKu — Deploy ke Vercel + GitHub Storage

Data disimpan ke file `tasks.json` di GitHub repo kamu secara otomatis.
Setiap perubahan tugas = 1 commit baru di repo.

---

## 📁 Struktur

```
taskku-vercel/
├── api/
│   └── tasks.js      ← Serverless function (otomatis jadi /api/tasks)
├── public/
│   └── index.html    ← Frontend
├── tasks.json        ← Database awal (commit ke repo)
├── vercel.json       ← Routing config
└── README.md
```

---

## 🚀 Langkah Deploy (ikutin urutan ini!)

### Step 1 — Buat GitHub Repo

1. Buka https://github.com/new
2. Buat repo baru, misal: `taskku-data`
3. Centang **"Add a README file"** biar tidak kosong
4. Klik **Create repository**

---

### Step 2 — Upload file ke repo

Upload semua file dari folder `taskku-vercel/` ke repo tadi:
- Klik **"uploading an existing file"** di halaman repo
- Drag & drop semua file (termasuk folder `api/` dan `public/`)
- Commit changes

Atau pakai git:
```bash
git clone https://github.com/USERNAME/taskku-data.git
# copy semua isi folder taskku-vercel ke dalamnya
cd taskku-data
git add .
git commit -m "init: taskku app"
git push
```

---

### Step 3 — Buat GitHub Personal Access Token

1. Buka: https://github.com/settings/tokens/new
2. Isi **Note**: `taskku-token`
3. **Expiration**: pilih sesuai kebutuhan (No expiration boleh)
4. Centang scope: ✅ **`repo`** (full control of private repositories)
5. Klik **Generate token**
6. **COPY tokennya sekarang** — tidak bisa dilihat lagi!

Token bentuknya: `ghp_xxxxxxxxxxxxxxxxxxxxx`

---

### Step 4 — Deploy ke Vercel

1. Buka https://vercel.com → login dengan GitHub
2. Klik **"Add New Project"**
3. Pilih repo `taskku-data` → klik **Import**
4. Di bagian **"Environment Variables"**, tambahkan 4 variabel:

   | Name | Value |
   |------|-------|
   | `GITHUB_TOKEN` | `ghp_xxxxx` (token dari step 3) |
   | `GITHUB_OWNER` | `username_github_kamu` |
   | `GITHUB_REPO`  | `taskku-data` |
   | `GITHUB_BRANCH`| `main` |

5. Klik **Deploy** → tunggu ~1 menit
6. Vercel kasih URL: `https://taskku-data.vercel.app` 🎉

---

## ✅ Cara Kerja

```
Browser → Vercel (/api/tasks) → GitHub API → tasks.json di repo
```

Setiap tambah/hapus/update tugas:
- Vercel function baca `tasks.json` dari GitHub
- Update datanya
- Commit balik ke GitHub

Kamu bisa lihat history tugas di tab **Commits** repo GitHub! 📜

---

## ⚠️ Catatan Penting

- **Rate limit**: GitHub API max ~5000 request/jam (lebih dari cukup)
- **Bukan real-time**: kalau buka di 2 tab sekaligus dan edit bersamaan, bisa konflik. Untuk 1 user ini aman.
- **Gratis total**: Vercel free tier + GitHub free = Rp 0

---

## 🛠 Troubleshooting

**Error "Environment variables belum diset"**
→ Cek Vercel Dashboard > Project > Settings > Environment Variables

**Error 401 dari GitHub**
→ Token kamu expired atau salah. Buat token baru di GitHub Settings.

**Error 409 Conflict**
→ Jarang terjadi, coba refresh dan ulangi aksi.

**Mau ganti domain?**
→ Vercel Dashboard > Project > Settings > Domains