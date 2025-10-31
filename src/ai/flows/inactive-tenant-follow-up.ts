
'use server';
/**
 * @fileOverview An AI agent for generating proactive follow-up messages to inactive tenants.
 *
 * - getInactiveTenantFollowUp - A function that generates a personalized message.
 * - InactiveTenantFollowUpInput - The input type for the function.
 * - InactiveTenantFollowUpOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export const InactiveTenantFollowUpInputSchema = z.object({
  storeName: z.string().describe("The tenant's store name."),
  adminName: z.string().describe("The name of the store's admin."),
  businessDescription: z.string().describe('A brief description of the business (e.g., "kafe", "restoran", "vape store").'),
  daysInactive: z.number().describe('The number of days since the last transaction.'),
});
export type InactiveTenantFollowUpInput = z.infer<typeof InactiveTenantFollowUpInputSchema>;

export const InactiveTenantFollowUpOutputSchema = z.object({
  followUpMessage: z.string().describe('A friendly, concise, and proactive follow-up message in Indonesian, formatted for WhatsApp.'),
});
export type InactiveTenantFollowUpOutput = z.infer<typeof InactiveTenantFollowUpOutputSchema>;

export async function getInactiveTenantFollowUp(
  input: InactiveTenantFollowUpInput
): Promise<InactiveTenantFollowUpOutput> {
  return inactiveTenantFollowUpFlow(input);
}

const prompt = ai.definePrompt({
  name: 'inactiveTenantFollowUpPrompt',
  input: { schema: InactiveTenantFollowUpInputSchema },
  output: { schema: InactiveTenantFollowUpOutputSchema },
  prompt: `Anda adalah Chika, seorang konsultan bisnis yang proaktif dan ramah dari Chika POS.
Tugas Anda adalah membuat pesan WhatsApp singkat untuk menyapa admin toko yang sudah tidak aktif bertransaksi selama {{daysInactive}} hari.

Tujuan pesan ini BUKAN untuk menegur, tetapi untuk menyemangati dan memberikan ide agar mereka kembali aktif. Pesan harus personal, relevan dengan jenis bisnisnya, dan diakhiri dengan ajakan untuk mencoba fitur Chika POS.

Gunakan format Markdown WhatsApp (misal: *teks tebal*).

Data Tenant:
- Nama Admin: {{adminName}}
- Nama Toko: {{storeName}}
- Jenis Usaha: {{businessDescription}}

Contoh Ide Pesan (gunakan sebagai inspirasi, jangan ditiru mentah-mentah):
- Untuk Kafe: Sarankan untuk membuat promo "Happy Hour" di sore hari atau bundling Kopi + Cemilan.
- Untuk Restoran: Usulkan untuk mencoba fitur 'AI Deskripsi Produk' untuk menu yang kurang populer.
- Untuk Bisnis Apapun: Ingatkan tentang fitur 'Generator Tantangan Karyawan' untuk memotivasi tim di awal minggu.

Buat satu pesan WhatsApp yang unik, ramah, dan solutif. Awali dengan sapaan "Halo Kak *{{adminName}}* dari *{{storeName}}*!".`,
});

export const inactiveTenantFollowUpFlow = ai.defineFlow(
  {
    name: 'inactiveTenantFollowUpFlow',
    inputSchema: InactiveTenantFollowUpInputSchema,
    outputSchema: InactiveTenantFollowUpOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input, { model: 'openai/gpt-4o' });

    if (!output) {
      throw new Error('AI did not return a valid follow-up message.');
    }
    return output;
  }
);
