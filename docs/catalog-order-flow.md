# Alur Pemesanan Katalog Digital Publik

Dokumen ini menjelaskan alur kerja lengkap untuk fitur pemesanan mandiri (self-order) yang dilakukan oleh pelanggan melalui katalog digital publik, dari awal hingga pesanan masuk ke sistem kasir.

## Diagram Alur Sederhana

Pelanggan -> Buka Katalog (Scan QR/URL) -> Pilih Menu -> Login/Daftar via No. HP -> Konfirmasi Pesanan -> **Sistem Membuat Meja Virtual** -> Notifikasi Suara & Visual di Kasir -> Kasir Proses Pesanan

---

## Langkah-langkah Detail

### 1. Pelanggan Mengakses Katalog
- **Aksi Pelanggan**: Pelanggan memindai QR Code di meja atau membuka URL unik katalog (contoh: `domain.com/katalog/nama-toko-anda`).
- **Proses Sistem**:
    - `src/app/katalog/[slug]/page.tsx` di-render.
    - Komponen ini memanggil API route `/api/catalog-data` dengan parameter `slug` dari URL.
    - API mengambil data toko, daftar produk, dan promosi yang sedang aktif dari database Firestore.
    - Data ditampilkan kepada pelanggan dalam bentuk menu digital yang interaktif.

### 2. Otentikasi Pelanggan (Login/Daftar)
- **Konteks**: Pelanggan harus login untuk bisa mengirim pesanan. Ini penting untuk mencatat data pelanggan dan mencegah pesanan anonim.
- **Aksi Pelanggan**: Setelah selesai memilih produk dan membuka keranjang belanja, pelanggan menekan tombol "Konfirmasi & Kirim Pesanan". Jika belum login, sebuah dialog (`CustomerAuthDialog`) akan muncul. Pelanggan memasukkan nomor WhatsApp mereka.
- **Proses Sistem**:
    - Aplikasi mengirim nomor HP ke API route `/api/customer-auth`.
    - API ini memeriksa sub-koleksi `customers` di dalam dokumen `stores/{storeId}`.
    - **Skenario A: Pelanggan Sudah Terdaftar (Login)**
        - Nomor HP ditemukan.
        - API mengembalikan data pelanggan yang sudah ada.
        - Aplikasi menyimpan data pelanggan di `localStorage` browser untuk sesi berikutnya dan menampilkan status "Logged In".
    - **Skenario B: Pelanggan Baru (Daftar)**
        - Nomor HP tidak ditemukan.
        - Dialog di aplikasi akan meminta pelanggan memasukkan nama (dan tanggal lahir opsional).
        - Setelah diisi, aplikasi kembali memanggil API `/api/customer-auth` dengan data tambahan (nama).
        - API membuat dokumen pelanggan baru di `stores/{storeId}/customers`, lengkap dengan `loyaltyPoints: 0` dan `joinDate`.
        - API mengembalikan data pelanggan yang baru dibuat.
        - Aplikasi menyimpan data pelanggan di `localStorage`.

### 3. Pelanggan Mengirim Pesanan
- **Aksi Pelanggan**: Setelah login, pelanggan menekan tombol "Konfirmasi & Kirim Pesanan ke Kasir".
- **Proses Sistem**:
    - Aplikasi mengirim *payload* berisi detail pesanan (item keranjang, data pelanggan, total harga, dan metode pembayaran yang dipilih) ke API route `/api/catalog/order`.
    - **Logika Kunci**: API ini tidak membuat transaksi langsung, melainkan membuat **"Meja Virtual"**.
    - API membuat dokumen baru di sub-koleksi `stores/{storeId}/tables`.
    - Dokumen meja ini diberi nama unik (misal: `Virtual #1`, `Virtual #2`) dan langsung diberi status **`Terisi`**.
    - Seluruh detail pesanan (`currentOrder`) disimpan di dalam dokumen meja virtual tersebut, termasuk metode pembayaran yang dipilih pelanggan (QRIS atau Bayar di Kasir).

### 4. Notifikasi di Aplikasi Kasir
- **Proses Sistem**:
    - Aplikasi kasir (`DashboardProvider`) selalu mendengarkan perubahan (*listen for changes*) pada koleksi `tables` secara *real-time* menggunakan `onSnapshot` dari Firebase.
    - Ketika dokumen meja virtual baru dibuat (dari langkah 3), `onSnapshot` akan terpicu.
    - **Notifikasi Suara**: `DashboardProvider` mendeteksi penambahan meja virtual baru, lalu memanggil fungsi `playNotificationSound()` untuk memutar suara notifikasi, memberitahu kasir ada pesanan baru.
    - **Tampilan Visual Diperbarui**: Halaman "Manajemen Meja" (`/dashboard/views/tables.tsx`) otomatis me-render kartu meja virtual baru tersebut dengan status "Terisi". Kartu ini juga akan menampilkan ikon (dompet atau QR code) sesuai metode pembayaran yang dipilih pelanggan.

### 5. Kasir Memproses Pesanan
- **Aksi Kasir**: Kasir melihat kartu meja virtual baru, lalu mengkliknya.
- **Proses Sistem**: Mengklik kartu akan mengarahkan kasir ke halaman kasir utama (`/dashboard/views/pos.tsx`) dengan `tableId` dari meja virtual tersebut di URL.
- Halaman POS akan membaca `tableId` dari URL, mengambil data pesanan dari dokumen meja virtual, dan otomatis mengisi keranjang belanja beserta data pelanggan.
- **Aksi Kasir**: Kasir kini dapat memproses pesanan seperti biasa (misalnya, meneruskan ke dapur atau langsung menyelesaikan pembayaran jika pelanggan sudah membayar via QRIS).

### 6. Penyelesaian
- Setelah transaksi selesai dan dibayar, kasir akan menyelesaikan transaksi di sistem.
- Proses penyelesaian ini akan mengubah status meja menjadi "Menunggu Dibersihkan" atau langsung menghapus meja virtual jika transaksi lunas, menandakan siklus pesanan tersebut telah selesai.
