# 🛠️ Panduan Admin JastipRijo

## Login Admin
1. **Klik logo JastipRijo** di header (kiri atas)
2. **Masukkan kredensial:**
   - Username: `RIJOADMIN`
   - Password: `RIJOPUNYA`
3. Klik **Login**

## 📦 Mengelola Produk

### ➕ Menambah Produk Baru
1. Masuk ke tab **"Produk"**
2. Klik tombol **"Tambah Produk"**
3. Isi form:
   - **Nama Produk**: Nama yang akan ditampilkan
   - **Kategori**: Pilih "Makanan" atau "Snack"
   - **Deskripsi**: Detail produk (opsional)
   - **Harga (IDR)**: Harga dalam Rupiah
   - **Stok**: Jumlah stok tersedia
   - **Gambar**: Upload gambar produk (opsional, max 10MB)
4. Klik **"Simpan"**

### ✏️ Edit Produk
1. Cari produk dalam tabel
2. Klik tombol **"Edit"** (ikon pensil)
3. Ubah data yang diperlukan
4. Klik **"Simpan"**

### 📊 Update Stok
1. Gunakan tombol **"-"** dan **"+"** di kolom Stok
2. Perubahan akan tersimpan otomatis
3. Stok akan update di catalog konsumen

### 🗑️ Hapus Produk
1. Klik tombol **"Hapus"** (ikon tong sampah)
2. Produk akan dihapus dari database
3. **Hati-hati**: Aksi ini tidak dapat dibatalkan!

## 🛒 Mengelola Pesanan

### 👁️ Lihat Detail Pesanan
1. Masuk ke tab **"Pesanan"**
2. Klik tombol **"👁️"** untuk melihat detail
3. Modal akan menampilkan:
   - Info pelanggan
   - Item pesanan
   - Bukti pembayaran (jika ada)

### 📄 Download PDF Pesanan
1. Klik tombol **"📥"** di baris pesanan
2. PDF akan terbuka di tab baru

### ✅ Kelola Status Pesanan
- **Selesai**: Tandai pesanan sudah selesai
- **Tolak**: Tolak pesanan (stok akan dikembalikan)
- **Hapus**: Hapus pesanan yang ditolak

## 🔧 Tools Debug

### 🔄 Refresh Data
- Klik **"Refresh"** untuk memuat ulang data terbaru

### 🔍 Test Database
- Klik **"Test DB"** untuk test koneksi Supabase
- Akan menampilkan status koneksi

### 📊 Status Monitor
Panel atas menampilkan:
- **Status**: Online/Loading
- **Jumlah Produk**: Total produk aktif
- **Jumlah Pesanan**: Total pesanan
- **Last Updated**: Waktu update terakhir

## 🐛 Troubleshooting

### Produk tidak muncul di catalog?
1. Klik **"Test DB"** untuk cek koneksi
2. Pastikan produk memiliki:
   - ✅ Nama terisi
   - ✅ Harga > 0
   - ✅ Stok ≥ 0
3. Tunggu beberapa detik untuk sinkronisasi
4. Refresh browser jika perlu

### Stok tidak update?
1. Cek koneksi internet
2. Klik **"Refresh"** di admin panel
3. Lihat console browser (F12) untuk error
4. Gunakan debug tools: `window.adminDebug.testStockUpdate(id, stock)`

### Error saat upload gambar?
1. Pastikan file adalah gambar (PNG, JPG, etc.)
2. Ukuran file maksimal 10MB
3. Coba upload satu per satu jika multiple upload gagal

## 🔍 Advanced Debug

Buka console browser (F12) dan gunakan:

```javascript
// Test koneksi database
await window.adminDebug.testConnection()

// Refresh produk manual
await window.adminDebug.refreshProducts()

// Test save produk
await window.adminDebug.testProductSave({
  name: "Test Product",
  category: "Makanan",
  priceIdr: 10000,
  stock: 5
}, [])

// Test update stok
await window.adminDebug.testStockUpdate("product-id", 10)
```

## 💡 Tips & Best Practices

### 📸 Upload Gambar
- **Resolusi optimal**: 800x800px
- **Format**: JPG/PNG
- **Ukuran**: < 2MB untuk performa terbaik
- **Gambar pertama** akan jadi gambar utama

### 📊 Manajemen Stok
- Update stok secara real-time
- Monitor stok rendah secara berkala
- Set stok = 0 untuk "sold out"

### 🔄 Sinkronisasi Data
- Data tersinkron otomatis setiap 30 detik
- Gunakan "Refresh" jika perlu update manual
- Perubahan admin langsung terlihat di catalog

### 🚨 Error Handling
- Semua error akan ditampilkan sebagai notifikasi
- Cek console browser untuk detail error
- Gunakan "Test DB" untuk diagnosa koneksi

## 📞 Support

Jika mengalami masalah:
1. **Refresh browser** (Ctrl+F5)
2. **Clear cache** browser
3. **Cek koneksi internet**
4. **Screenshot error** untuk dokumentasi
5. **Hubungi developer** dengan detail error

---

**Status Sistem**: ✅ Fully Operational  
**Last Updated**: September 18, 2025  
**Version**: 3.0 - Enhanced Admin Panel



