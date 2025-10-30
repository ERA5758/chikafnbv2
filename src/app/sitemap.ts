import { MetadataRoute } from 'next';
import { getFirebaseAdmin } from '@/lib/server/firebase-admin';

// This is a dynamic sitemap. It's generated on-demand when a search engine requests it.
// It fetches all active store catalogs and creates a sitemap entry for each.
// See: https://nextjs.org/docs/app/api-reference/file-conventions/sitemap

// It's crucial to set the production domain in your environment variables.
const URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://chika-pos.vercel.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const { db } = getFirebaseAdmin();
    
    // 1. Fetch all stores from Firestore
    const storesSnapshot = await db.collection('stores').get();
    
    const storeUrls = storesSnapshot.docs
        .map(doc => {
            const store = doc.data();
            const now = new Date();
            const expiryDate = store.catalogSubscriptionExpiry ? new Date(store.catalogSubscriptionExpiry) : null;
            
            // 2. Filter for stores that have an active catalog subscription and a valid slug
            if (store.catalogSlug && expiryDate && expiryDate > now) {
                return {
                    url: `${URL}/katalog/${store.catalogSlug}`,
                    lastModified: store.updatedAt ? new Date(store.updatedAt) : new Date(),
                    changeFrequency: 'weekly' as const,
                    priority: 0.8,
                };
            }
            return null;
        })
        .filter(Boolean) as MetadataRoute.Sitemap;

    // 3. Add static pages to the sitemap
    const staticPages: MetadataRoute.Sitemap = [
        {
            url: URL,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 1,
        },
        {
            url: `${URL}/login`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.5,
        },
        {
            url: `${URL}/register`,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 0.5,
        }
    ];

    // 4. Combine static pages with dynamic store catalog pages
    return [...staticPages, ...storeUrls];
}
