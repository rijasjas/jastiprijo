# 🧪 Panduan Test Admin Panel

## Langkah-langkah Testing

### 1. **Akses Admin Panel**
1. Buka http://localhost:8081/
2. Klik logo JastipRijo (kiri atas)
3. Login dengan:
   - Username: `RIJOADMIN`
   - Password: `RIJOPUNYA`

### 2. **Test Koneksi Database**
1. Klik tombol **"Test DB"**
2. **Expected Result**: Toast "Test koneksi berhasil" atau "Test koneksi gagal"
3. Jika gagal, sistem akan otomatis menggunakan mode offline

### 3. **Test Tambah Produk (Mode Online)**
1. Klik **"Tambah Produk"**
2. Isi form:
   - Nama: "Test Produk 1"
   - Kategori: "Makanan"
   - Harga: 25000
   - Stok: 5
   - Deskripsi: "Produk test"
3. Klik **"Simpan"**
4. **Expected Result**: 
   - Toast "Produk berhasil disimpan"
   - Produk muncul di tabel
   - Produk muncul di catalog utama

### 4. **Test Tambah Produk (Mode Offline)**
1. Matikan internet atau blokir Supabase
2. Ulangi langkah 3
3. **Expected Result**:
   - Toast "Produk disimpan (Mode Offline)"
   - Produk muncul di tabel admin
   - Produk muncul di catalog (dari localStorage)

### 5. **Test Update Stok**
1. Gunakan tombol **"-"** dan **"+"** di kolom stok
2. **Expected Result**:
   - Stok berubah langsung di tabel
   - Toast konfirmasi muncul
   - Stok update di catalog utama

### 6. **Test Edit Produk**
1. Klik tombol **"Edit"** (ikon pensil)
2. Ubah nama atau harga
3. Klik **"Simpan"**
4. **Expected Result**: Perubahan tersimpan dan terlihat

### 7. **Test Hapus Produk**
1. Klik tombol **"Hapus"** (ikon tong sampah)
2. **Expected Result**: Produk hilang dari tabel dan catalog

## 🔍 Debug Console

Buka Developer Tools (F12) dan lihat console untuk:

### Logs yang Diharapkan:
```
🔧 Initializing admin debug utilities...
🔄 Loading fresh data from database...
✅ Data loaded from Supabase
📊 Products loaded: X
📊 Orders loaded: Y
```

### Jika Error:
```
❌ Supabase failed, using fallback storage: [error details]
✅ Data loaded from fallback storage
```

### Saat Save Produk:
```
📝 Form submission started...
📋 Form data: {name: "Test", priceIdr: 25000, ...}
🧹 Clean form data: {name: "Test", priceIdr: 25000, ...}
💾 Calling onSave...
🔍 Debugging product save...
📝 Product data: {name: "Test", ...}
➕ Creating new product...
📋 Insert data: {name: "Test", ...}
✅ Product created: {id: "...", name: "Test", ...}
✅ onSave completed successfully
```

## 🚨 Troubleshooting

### Produk tidak tersimpan?
1. **Cek Console**: Lihat error di Developer Tools
2. **Test DB**: Klik tombol "Test DB" untuk cek koneksi
3. **Mode Offline**: Jika Supabase gagal, sistem akan otomatis gunakan localStorage

### Stok tidak update?
1. **Cek Console**: Lihat error saat update
2. **Refresh**: Klik "Refresh" untuk reload data
3. **Manual Update**: Gunakan console: `window.adminDebug.testStockUpdate("id", 10)`

### Error "Gagal menyimpan produk"?
1. **Cek Form**: Pastikan semua field terisi
2. **Cek Console**: Lihat detail error
3. **Try Again**: Coba save ulang
4. **Offline Mode**: Sistem akan fallback ke localStorage

## 🛠️ Advanced Testing

### Test dengan Console Commands:
```javascript
// Test koneksi
await window.adminDebug.testConnection()

// Test save produk
await window.adminDebug.testProductSave({
  name: "Console Test",
  category: "Makanan", 
  priceIdr: 15000,
  stock: 3
}, [])

// Test update stok
await window.adminDebug.testStockUpdate("product-id", 10)

// Force refresh
await window.adminDebug.refreshProducts()
```

### Test Fallback Storage:
```javascript
// Cek data fallback
console.log(JSON.parse(localStorage.getItem('jastiprijo_fallback_products')))

// Clear fallback data
localStorage.removeItem('jastiprijo_fallback_products')
```

## ✅ Expected Results

### Mode Online (Supabase Connected):
- ✅ Produk tersimpan ke database
- ✅ Data tersinkron real-time
- ✅ Gambar bisa diupload
- ✅ Stok update langsung

### Mode Offline (Fallback):
- ✅ Produk tersimpan ke localStorage
- ✅ Data tetap tersedia
- ✅ Stok bisa diupdate
- ✅ Produk muncul di catalog

### Error Handling:
- ✅ Error ditampilkan dengan jelas
- ✅ Fallback otomatis jika Supabase gagal
- ✅ Data tidak hilang saat error
- ✅ User bisa retry operasi

---

**Status**: ✅ Ready for Testing  
**Last Updated**: September 18, 2025  
**Version**: 3.1 - Enhanced with Fallback Storage



