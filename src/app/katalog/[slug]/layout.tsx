import * as React from 'react';
import type { Metadata, ResolvingMetadata } from 'next';
import { getFirebaseAdmin } from '@/lib/server/firebase-admin';

type Props = {
  params: { slug: string };
};

async function getStoreData(slug: string) {
  try {
    const { db } = getFirebaseAdmin();
    const storesRef = db.collection('stores');
    const querySnapshot = await storesRef.where('catalogSlug', '==', slug).limit(1).get();

    if (querySnapshot.empty) {
      return null;
    }

    const storeDocSnapshot = querySnapshot.docs[0];
    return storeDocSnapshot.data();
  } catch (error) {
    console.error("Error fetching store data for metadata:", error);
    return null;
  }
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const slug = params.slug;
  const storeData = await getStoreData(slug);

  if (!storeData) {
    return {
      title: 'Katalog Tidak Ditemukan',
      description: 'Katalog yang Anda cari tidak tersedia saat ini.',
    };
  }

  const title = `${storeData.name} - Lihat Menu Kami`;
  const description = storeData.description || `Jelajahi menu lengkap dari ${storeData.name}. Pesan sekarang melalui katalog digital kami.`;

  return {
    title: title,
    description: description,
    openGraph: {
      title: title,
      description: description,
      images: storeData.logoUrl ? [storeData.logoUrl] : [],
    },
  };
}

export default function CatalogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
