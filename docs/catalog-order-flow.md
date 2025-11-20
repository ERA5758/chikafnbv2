# Alur Pemesanan Katalog Digital Publik

Dokumen ini menjelaskan alur kerja lengkap untuk fitur pemesanan mandiri (self-order) yang dilakukan oleh pelanggan melalui katalog digital publik, dari awal hingga pesanan masuk ke sistem kasir dan dapur.

## Diagram Alur Sederhana

Pelanggan -> Buka Katalog (Scan QR/URL) -> Pilih Menu -> Login/Daftar -> Kirim Pesanan -> **Sistem Membuat Meja Virtual** -> Kasir Proses Pesanan -> **Transaksi Dibuat, Order Masuk Dapur** -> Dapur Selesaikan Pesanan -> Kasir Selesaikan Pembayaran

---

## Langkah-langkah Detail

### 1. Pelanggan Mengakses Katalog
- **Aksi Pelanggan**: Pelanggan memindai QR Code di meja atau membuka URL unik katalog (contoh: `domain.com/katalog/nama-toko-anda`).
- **Proses Sistem**:
    - `src/app/katalog/[slug]/page.tsx` di-render.
    - Komponen ini mengambil data toko, produk, dan promosi yang sedang aktif.
    - Data ditampilkan kepada pelanggan dalam bentuk menu digital yang interaktif.

### 2. Otentikasi Pelanggan (Login/Daftar)
- **Konteks**: Pelanggan harus login untuk bisa mengirim pesanan.
- **Aksi Pelanggan**: Setelah selesai memilih produk dan membuka keranjang belanja, pelanggan menekan tombol "Konfirmasi & Kirim Pesanan". Jika belum login, sebuah dialog akan muncul. Pelanggan memasukkan nomor WhatsApp mereka.
- **Proses Sistem**:
    - Aplikasi mengirim nomor HP ke API `/api/customer-auth`.
    - **Skenario A: Pelanggan Sudah Terdaftar (Login)**: API mengembalikan data pelanggan yang sudah ada.
    - **Skenario B: Pelanggan Baru (Daftar)**: Dialog akan meminta nama pelanggan, lalu API membuat dokumen pelanggan baru di database.

### 3. Pelanggan Mengirim Pesanan
- **Aksi Pelanggan**: Setelah login, pelanggan menekan tombol "Konfirmasi & Kirim Pesanan ke Kasir".
- **Proses Sistem**:
    - Aplikasi mengirim *payload* berisi detail pesanan (item keranjang, data pelanggan, total harga, dan metode pembayaran yang dipilih) ke API `/api/catalog/order`.
    - **Logika Kunci**: API ini membuat **"Meja Virtual"** baru di koleksi `tables` dengan status `Terisi`.
    - Seluruh detail pesanan (`currentOrder`) disimpan di dalam dokumen meja virtual tersebut.

### 4. Notifikasi di Aplikasi Kasir
- **Proses Sistem**:
    - Aplikasi kasir (`DashboardProvider`) selalu mendengarkan perubahan pada koleksi `tables` secara *real-time*.
    - Ketika dokumen meja virtual baru dibuat, `onSnapshot` terpicu.
    - **Notifikasi Suara**: Suara notifikasi diputar untuk memberitahu kasir ada pesanan baru.
    - **Tampilan Visual Diperbarui**: Halaman "Manajemen Meja" otomatis me-render kartu meja virtual baru dengan status "Terisi", lengkap dengan ikon metode pembayaran yang dipilih pelanggan.

### 5. Kasir Memproses Pesanan & Meneruskan ke Dapur
- **Aksi Kasir**: Kasir melihat dan mengklik kartu meja virtual baru.
- **Proses Sistem**:
    - Kasir diarahkan ke halaman kasir utama (POS) dengan keranjang belanja otomatis terisi sesuai pesanan pelanggan.
    - **Aksi Kasir**: Kasir memeriksa pesanan lalu menekan tombol "Buat Transaksi" atau "Proses Pembayaran".
    - **Proses Sistem Kunci**:
        - Sebuah dokumen **`Transaction`** baru dibuat dengan status **`Diproses`**.
        - Dokumen **Meja Virtual** yang asli **dihapus** dari sistem.
        - Karena transaksi baru dibuat dengan status `Diproses`, pesanan ini **otomatis muncul di monitor Dapur**.

### 6. Dapur & Penyelesaian Akhir
- **Aksi Dapur**: Staf dapur melihat pesanan baru di monitor mereka, menyiapkannya, lalu menandai pesanan sebagai "Selesai".
- **Aksi Kasir**:
    - Di halaman "Transaksi", kasir melihat status pesanan telah berubah menjadi "Selesai".
    - Jika pelanggan sebelumnya memilih "Bayar di Kasir", kasir sekarang dapat menerima pembayaran dan menyelesaikan transaksi.
    - Jika pelanggan sudah membayar via QRIS, kasir hanya perlu menyelesaikan transaksi tanpa proses pembayaran.
- Setelah transaksi diselesaikan, siklus pesanan dianggap selesai sepenuhnya.
