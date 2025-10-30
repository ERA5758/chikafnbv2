import * as React from 'react';
import type { Metadata } from 'next';
import type { Store, Product, RedemptionOption } from '@/lib/types';
import CatalogClientPage from './catalog-client-page';
import { getFirebaseAdmin } from '@/lib/server/firebase-admin';

type CatalogPageProps = {
  params: { slug: string };
};

// --- Data Fetching on the Server ---
async function getCatalogData(slug: string): Promise<{
  store: Store | null;
  products: Product[];
  promotions: RedemptionOption[];
  error?: string;
}> {
  const { db } = getFirebaseAdmin();

  try {
    const storesRef = db.collection('stores');
    const querySnapshot = await storesRef.where('catalogSlug', '==', slug).limit(1).get();

    if (querySnapshot.empty) {
      return { store: null, products: [], promotions: [], error: 'Katalog tidak ditemukan.' };
    }
    
    const storeDocSnapshot = querySnapshot.docs[0];
    const storeId = storeDocSnapshot.id;
    const storeData = storeDocSnapshot.data() as Omit<Store, 'id'>;

    const now = new Date();
    const expiryDate = storeData?.catalogSubscriptionExpiry ? new Date(storeData.catalogSubscriptionExpiry) : null;
    if (!expiryDate || expiryDate < now) {
        return { store: null, products: [], promotions: [], error: 'Katalog saat ini tidak tersedia atau langganan telah berakhir.' };
    }

    const productsPromise = db.collection('stores').doc(storeId).collection('products').orderBy('name').get();
    const promotionsPromise = db.collection('stores').doc(storeId).collection('redemptionOptions').where('isActive', '==', true).get();

    const [productsSnapshot, promotionsSnapshot] = await Promise.all([productsPromise, promotionsPromise]);
      
    const products = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
    const promotions = promotionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RedemptionOption));

    const catalogData = {
      store: { id: storeId, ...storeData },
      products,
      promotions,
    };

    return catalogData;

  } catch (error) {
    console.error('Error fetching catalog data on server:', error);
    return { store: null, products: [], promotions: [], error: 'Terjadi kesalahan internal saat memuat katalog.' };
  }
}

// --- Dynamic Metadata Generation for SEO ---
export async function generateMetadata({ params }: CatalogPageProps): Promise<Metadata> {
  const { store } = await getCatalogData(params.slug);

  if (!store) {
    return {
      title: 'Katalog Tidak Ditemukan',
      description: 'Halaman katalog yang Anda cari tidak tersedia.',
    };
  }

  return {
    title: `Menu Lengkap ${store.name}`,
    description: store.description || `Lihat menu lengkap dari ${store.name} yang berlokasi di ${store.location}. Nikmati berbagai hidangan lezat dan promo menarik kami.`,
    openGraph: {
      title: `Menu Lengkap ${store.name}`,
      description: store.description || `Menu online dari ${store.name}.`,
      images: [
        {
          url: store.logoUrl || 'https://picsum.photos/seed/chika/1200/630',
          width: 1200,
          height: 630,
          alt: `Logo ${store.name}`,
        },
      ],
    },
  };
}


// --- Main Page Component (Server Component) ---
export default async function CatalogPage({ params }: CatalogPageProps) {
  const { slug } = params;
  const initialData = await getCatalogData(slug);
  const { store, products } = initialData;

  // Structured Data (JSON-LD) for Rich Snippets
  const generateStructuredData = () => {
    if (!store || !products || products.length === 0) {
      return null;
    }
    
    const menuItems = products.map(product => ({
      "@type": "MenuItem",
      "name": product.name,
      "description": product.description || product.name,
      "image": product.imageUrl,
      "offers": {
        "@type": "Offer",
        "price": product.price.toString(),
        "priceCurrency": "IDR"
      }
    }));

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Restaurant",
      "name": store.name,
      "image": store.logoUrl || 'https://picsum.photos/seed/chika/1200/630',
      "description": store.description || `Menu lengkap dari ${store.name}`,
      "address": {
        "@type": "PostalAddress",
        "addressLocality": store.location,
        "addressCountry": "ID"
      },
      "servesCuisine": store.businessDescription || "F&B",
      "hasMenu": {
        "@type": "Menu",
        "name": `Menu ${store.name}`,
        "hasMenuItem": menuItems
      }
    };
    return JSON.stringify(structuredData);
  }

  const jsonLd = generateStructuredData();

  return (
    <>
      {jsonLd && (
         <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
      )}
      <CatalogClientPage slug={slug} initialData={initialData} />
    </>
  );
}
