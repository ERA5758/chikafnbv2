import { z } from 'zod';
import { ai } from '@/ai/genkit';

export const InactiveTenantFollowUpInputSchema = z.object({
  adminName: z.string().describe('Nama lengkap admin atau pemilik tenant'),
  storeName: z.string().describe('Nama toko atau bisnis tenant'),
  businessDescription: z.string().describe('Deskripsi singkat jenis usaha tenant (contoh: Kafe, Restoran Cepat Saji, Warung Kopi)'),
});

export type InactiveTenantFollowUpInput = z.infer<typeof InactiveTenantFollowUpInputSchema>;

export const InactiveTenantFollowUpOutputSchema = z.object({
  whatsappMessage: z.string().describe('Pesan WhatsApp yang personal dan proaktif'),
});

export const inactiveTenantFollowUpFlow = ai.defineFlow(
  {
    name: 'inactiveTenantFollowUp',
    inputSchema: InactiveTenantFollowUpInputSchema,
    outputSchema: InactiveTenantFollowUpOutputSchema,
  },
  async (input) => {
    const { adminName, storeName } = input;

    const prompt = `
      **PERAN DAN TUJUAN UTAMA:**
      Anda adalah "Chika", seorang business growth assistant dari Chika POS.
      Tugas Anda adalah membuat satu pesan WhatsApp yang sangat persuasif untuk admin tenant yang sudah tidak aktif (tidak ada transaksi) selama seminggu.
      Tujuan utama pesan ini adalah untuk mendorong mereka mengklaim promo "Katalog Digital Gratis 1 Bulan" yang akan segera berakhir.

      **INFORMASI KUNCI UNTUK DISAMPAIKAN:**
      1.  **Fitur Unggulan:** "Katalog Digital Publik dengan Asisten AI". Ini adalah Website Toko Online instan untuk bisnis mereka.
      2.  **Manfaat Utama:**
          - Menghemat biaya cetak menu/katalog fisik.
          - Memberi citra brand yang modern dan inovatif.
          - Pelanggan mereka akan dibantu oleh Asisten Menu AI yang siap melayani 24/7.
      3.  **PROMO SPESIAL (Hook Utama):** Tenant berhak mendapatkan *GRATIS PENGGUNAAN KATALOG SELAMA 1 BULAN PERTAMA* sejak pendaftaran.
      4.  **CTA (Call to Action) Jelas:** Promo ini bisa langsung di-klaim melalui halaman *Admin Overview* di dasbor Chika POS.

      **ATURAN PENTING:**
      - Pesan HARUS dalam Bahasa Indonesia yang antusias, persuasif, dan menciptakan sedikit urgensi (misal: "jangan sampai hangus").
      - Maksimal 4-5 kalimat.
      - Gunakan format Markdown WhatsApp (misal: *teks tebal*).
      - Jangan terdengar seperti robot. Buat seolah-olah Anda benar-benar peduli dengan pertumbuhan bisnis mereka.

      **Data Tenant:**
      - Nama Admin: ${adminName}
      - Nama Toko: ${storeName}

      **Contoh Struktur Pesan:**
      - Sapaan hangat.
      - Pengingat tentang hak promo gratis 1 bulan untuk Katalog Digital yang mungkin belum mereka sadari.
      - Penjelasan singkat manfaatnya (seperti punya website toko online sendiri + asisten AI).
      - Ajakan jelas untuk segera klaim di halaman Admin Overview sebelum promonya hangus.

      Buat satu pesan WhatsApp yang paling efektif. Awali dengan sapaan "Halo Kak *${adminName}* dari *${storeName}*!".`;

    const llmResponse = await ai.generate({
      prompt: prompt,
      model: 'openai/gpt-4o',
      output: {
        format: 'text',
      },
    });

    return {
      whatsappMessage: llmResponse.text(),
    };
  }
);
