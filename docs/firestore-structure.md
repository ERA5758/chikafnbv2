# Struktur Data Firestore untuk Tenant (Toko)

Dokumen ini menjelaskan bagaimana data untuk setiap tenant (toko) diatur dalam database Firestore. Struktur ini dirancang untuk memisahkan data antar toko dan menjaga operasional tetap terorganisir.

## Hirarki Data

```
/stores/{storeId}
  |
  |-- (Data utama toko: nama, lokasi, saldo token, dll.)
  |
  |-- /products/{productId}
  |-- /customers/{customerId}
  |-- /transactions/{transactionId}
  |-- /tables/{tableId}
  |-- /redemptionOptions/{optionId}
  |-- /challengePeriods/{periodId}
  |-- /topUpRequests/{requestId} (Riwayat khusus toko)
  |-- /settings/{settingsId} (Contoh: 'whatsapp', 'receipt')

/users/{userId}
/topUpRequests/{requestId} (Global untuk verifikasi Superadmin)
/appSettings/{settingName}
```

---

## 1. Koleksi Utama: `stores`

Ini adalah koleksi inti yang berisi semua toko yang terdaftar.

-   **Path**: `/stores/{storeId}`
-   **Deskripsi**: Setiap dokumen dalam koleksi ini merepresentasikan satu tenant/toko. `{storeId}` biasanya adalah UID dari pengguna admin pertama yang mendaftarkan toko tersebut.
-   **Field Penting**:
    -   `name` (string): Nama toko.
    -   `location` (string): Lokasi/kota toko.
    -   `pradanaTokenBalance` (number): Saldo token yang digunakan untuk fitur berbayar (seperti AI).
    -   `adminUids` (array of strings): Daftar UID pengguna yang memiliki peran 'admin' untuk toko ini.
    -   `catalogSlug` (string): URL unik yang digunakan untuk katalog digital publik.
    -   `catalogSubscriptionExpiry` (timestamp): Tanggal kedaluwarsa langganan katalog.
    -   `financialSettings` (map): Berisi pengaturan seperti `taxPercentage` dan `serviceFeePercentage`.
    -   `notificationSettings` (map): Pengaturan notifikasi, seperti `dailySummaryEnabled`.

---

## 2. Sub-Koleksi di Bawah Dokumen Toko

Setiap dokumen `/stores/{storeId}` memiliki sub-koleksi untuk data operasionalnya.

### `/products`
-   **Path**: `/stores/{storeId}/products/{productId}`
-   **Deskripsi**: Menyimpan semua produk atau item menu yang dijual oleh toko.
-   **Field Penting**: `name`, `category`, `price`, `costPrice` (harga pokok), `stock`, `imageUrl`.

### `/customers`
-   **Path**: `/stores/{storeId}/customers/{customerId}`
-   **Deskripsi**: Menyimpan data pelanggan yang terdaftar di toko tersebut.
-   **Field Penting**: `name`, `phone`, `birthDate`, `loyaltyPoints`, `memberTier`, `joinDate`.

### `/transactions`
-   **Path**: `/stores/{storeId}/transactions/{transactionId}`
-   **Deskripsi**: Mencatat setiap transaksi penjualan yang terjadi.
-   **Field Penting**: `receiptNumber`, `totalAmount`, `items` (array of objects), `staffId`, `customerId`, `paymentMethod`, `status`.

### `/tables`
-   **Path**: `/stores/{storeId}/tables/{tableId}`
-   **Deskripsi**: Mengelola denah meja fisik maupun meja virtual (untuk pesanan online).
-   **Field Penting**: `name`, `capacity`, `status` ('Tersedia', 'Terisi', dll), `currentOrder` (map).

### `/redemptionOptions`
-   **Path**: `/stores/{storeId}/redemptionOptions/{optionId}`
-   **Deskripsi**: Mendefinisikan aturan penukaran poin loyalitas.
-   **Field Penting**: `description`, `pointsRequired`, `value` (nilai dalam Rp), `isActive`.

### `/challengePeriods`
-   **Path**: `/stores/{storeId}/challengePeriods/{periodId}`
-   **Deskripsi**: Menyimpan periode tantangan penjualan untuk karyawan.
-   **Field Penting**: `period` (string), `challenges` (array of objects), `isActive`.

### `/topUpRequests`
-   **Path**: `/stores/{storeId}/topUpRequests/{requestId}`
-   **Deskripsi**: Ini adalah **salinan** riwayat top-up yang ditampilkan di dasbor admin toko. Data aslinya ada di koleksi root.

---

## 3. Koleksi Terkait di Level Atas (Root Collections)

Koleksi ini berada di level teratas (root) dan tidak berada di bawah dokumen toko mana pun.

### `users`
-   **Path**: `/users/{userId}`
-   **Deskripsi**: Berisi semua akun pengguna untuk seluruh platform (admin, kasir, superadmin).
-   **Field Penting**: `name`, `email`, `role`, `storeId` (menautkan pengguna ke toko tempat mereka bekerja).

### `topUpRequests`
-   **Path**: `/topUpRequests/{requestId}`
-   **Deskripsi**: Ini adalah koleksi **global** tempat semua permintaan top-up dari semua toko pertama kali dibuat. Superadmin akan memantau koleksi ini untuk melakukan verifikasi. Setelah statusnya diubah (misal, menjadi 'completed'), Cloud Function akan menyalin/memperbarui datanya ke sub-koleksi di dalam dokumen toko yang bersangkutan.

### `appSettings`
-   **Path**: `/appSettings/{documentName}`
-   **Deskripsi**: Menyimpan pengaturan global untuk seluruh platform. Contoh dokumen: `transactionFees`, `bankAccount`.
