# 🎓 TaskKu — Daftar Tugas Kuliah

Aplikasi manajemen tugas kuliah dengan penyimpanan ke file `tasks.json`.

## 📁 Struktur File

```
taskku/
├── server.js        ← Backend server (Node.js)
├── tasks.json       ← Database tugas (otomatis dibuat)
├── public/
│   └── index.html   ← Frontend (buka lewat server)
└── README.md
```

## 🚀 Cara Menjalankan

### Syarat
- Node.js sudah terinstall (cek: `node --version`)
- **Tidak perlu npm install apapun!** Pakai built-in Node.js saja.

### Langkah

1. **Buka terminal / command prompt**

2. **Masuk ke folder taskku**
   ```bash
   cd path/ke/folder/taskku
   ```

3. **Jalankan server**
   ```bash
   node server.js
   ```

4. **Buka browser**
   ```
   http://localhost:3000
   ```

5. Selesai! Data otomatis tersimpan ke `tasks.json` 🎉

---

## 🔌 API Endpoints

| Method | URL | Fungsi |
|--------|-----|--------|
| GET | /api/tasks | Ambil semua tugas |
| POST | /api/tasks | Tambah tugas baru |
| PUT | /api/tasks/:id | Update tugas (done, edit) |
| DELETE | /api/tasks/:id | Hapus tugas |
| DELETE | /api/tasks/done | Hapus semua tugas selesai |

## 📦 Format tasks.json

```json
[
  {
    "id": 1709000000000,
    "name": "Laporan Praktikum",
    "matkul": "Kimia Dasar",
    "deadline": "2026-03-15",
    "priority": "high",
    "done": false,
    "createdAt": "2026-02-27T10:00:00.000Z"
  }
]
```

## 💡 Tips

- Ganti port di `server.js` baris pertama jika port 3000 sudah terpakai
- File `tasks.json` bisa di-backup kapan saja
- Server otomatis restart jika ada error

## 🛠 Troubleshooting

**Port sudah dipakai?**
```bash
# Ganti PORT di server.js baris ke-12:
const PORT = 3001;  # atau port lain
```

**Tidak bisa konek?**
- Pastikan `node server.js` sudah dijalankan
- Cek terminal — ada pesan error?
- Coba buka: http://127.0.0.1:3000
