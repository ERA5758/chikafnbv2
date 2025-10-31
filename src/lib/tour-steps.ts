import { Step } from 'react-joyride';

export const tourSteps: Step[] = [
  {
    target: '[data-tour="sidebar-overview"]',
    content: 'Selamat datang! Ini adalah halaman Overview, tempat Anda bisa melihat rangkuman performa bisnis Anda secara sekilas.',
    disableBeacon: true,
  },
  {
    target: '[data-tour="sidebar-pos"]',
    content: 'Gunakan menu Kasir POS untuk mengelola meja dan mencatat transaksi penjualan harian Anda.',
  },
  {
    target: '[data-tour="sidebar-kitchen"]',
    content: 'Menu Dapur menampilkan pesanan yang sedang aktif dan perlu disiapkan.',
  },
  {
    target: '[data-tour="sidebar-transactions"]',
    content: 'Di sini, Anda dapat melihat riwayat semua transaksi yang telah terjadi di toko Anda.',
  },
  {
    target: '[data-tour="sidebar-products"]',
    content: 'Kelola semua produk atau item menu Anda, termasuk harga, stok, dan kategori di sini. Langkah pertama yang baik adalah menambahkan produk Anda!',
  },
  {
    target: '[data-tour="sidebar-customers"]',
    content: 'Lihat dan kelola data pelanggan setia Anda, termasuk poin loyalitas yang mereka miliki.',
  },
  {
    target: '[data-tour="sidebar-employees"]',
    content: 'Sebagai admin, Anda dapat menambah atau mengelola akun karyawan Anda di menu ini.',
  },
  {
    target: '[data-tour="sidebar-customer-analytics"]',
    content: 'Dapatkan wawasan mendalam tentang perilaku pelanggan Anda, seperti siapa yang paling sering berbelanja dan produk favorit mereka.',
  },
  {
    target: '[data-tour="sidebar-promotions"]',
    content: 'Buat dan kelola program promosi penukaran poin untuk meningkatkan loyalitas pelanggan.',
  },
  {
    target: '[data-tour="sidebar-challenges"]',
    content: 'Gunakan AI untuk membuat tantangan penjualan yang seru dan memotivasi untuk tim Anda.',
  },
  {
    target: '[data-tour="sidebar-ai-business-plan"]',
    content: 'Buka potensi penuh bisnis Anda dengan rencana bisnis strategis yang dibuat khusus oleh AI setelah Anda mencapai tonggak tertentu.',
  },
  {
    target: '[data-tour="sidebar-receipt-settings"]',
    content: 'Sesuaikan informasi yang tertera di struk belanja pelanggan, seperti header, footer, dan teks promo.',
  },
  {
    target: '[data-tour="sidebar-catalog"]',
    content: 'Atur menu digital publik Anda di sini. Pelanggan bisa melihat menu Anda secara online melalui link atau QR code.',
  },
  {
    target: '[data-tour="top-up-button"]',
    content: 'Beberapa fitur canggih seperti rekomendasi AI memerlukan "Pradana Token". Anda bisa mengisi ulang saldo token Anda di sini.',
  },
  {
    target: '[data-tour="chika-chat-button"]',
    content: 'Punya pertanyaan tentang bisnis Anda? Klik tombol ini untuk memulai sesi konsultasi dengan asisten bisnis AI, Chika!',
  },
  {
    target: '[data-tour="sidebar-settings"]',
    content: 'Terakhir, Anda bisa menyesuaikan berbagai pengaturan, seperti password dan profil, di menu Pengaturan. Selamat mencoba!',
  },
];
