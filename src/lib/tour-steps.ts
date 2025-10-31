import { Step } from 'react-joyride';

export const tourSteps: Step[] = [
  {
    target: '[data-tour="sidebar-overview"]',
    content: 'Ini adalah menu utama Anda. Anda bisa melihat ringkasan bisnis, mengelola kasir, produk, dan lainnya di sini.',
    disableBeacon: true,
  },
  {
    target: '[data-tour="header-title"]',
    content: 'Setiap halaman memiliki judul yang menjelaskan fungsinya. Saat ini Anda berada di halaman Overview.',
  },
  {
    target: '[data-tour="add-product-button"]',
    content: 'Langkah pertama yang bagus adalah menambahkan produk pertama Anda. Klik di sini untuk mulai mengisi katalog menu Anda.',
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
