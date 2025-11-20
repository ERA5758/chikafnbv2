

import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/server/firebase-admin';

export async function GET(req: NextRequest) {
  const { db } = getFirebaseAdmin();
  const slug = req.nextUrl.searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ error: 'Parameter slug diperlukan.' }, { status: 400 });
  }

  try {
    const storesRef = db.collection('stores');
    const querySnapshot = await storesRef.where('catalogSlug', '==', slug).limit(1).get();

    if (querySnapshot.empty) {
      return NextResponse.json({ error: 'Katalog tidak ditemukan.' }, { status: 404 });
    }
    
    const storeDocSnapshot = querySnapshot.docs[0];
    const storeId = storeDocSnapshot.id;
    const storeData = storeDocSnapshot.data();

    // Re-enable subscription check
    const now = new Date();
    const expiryDate = storeData?.catalogSubscriptionExpiry ? new Date(storeData.catalogSubscriptionExpiry) : null;
    if (!expiryDate || expiryDate < now) {
        return NextResponse.json({ error: 'Katalog saat ini tidak tersedia atau langganan telah berakhir.' }, { status: 403 });
    }

    const productsPromise = db.collection('stores').doc(storeId).collection('products')
      .orderBy('name')
      .get();
      
    const promotionsPromise = db.collection('stores').doc(storeId).collection('redemptionOptions')
        .where('isActive', '==', true)
        .get();

    const [productsSnapshot, promotionsSnapshot] = await Promise.all([productsPromise, promotionsPromise]);
      
    const products = productsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    const promotions = promotionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    }));


    const catalogData = {
      store: {
        id: storeId,
        name: storeData?.name,
        description: storeData?.description,
        logoUrl: storeData?.logoUrl,
        theme: storeData?.theme,
        socialLinks: storeData?.socialLinks,
        location: storeData?.location,
        financialSettings: storeData?.financialSettings,
        qrisImageUrl: storeData?.qrisImageUrl,
      },
      products,
      promotions,
    };

    return NextResponse.json(catalogData);

  } catch (error) {
    console.error('Error fetching catalog data:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal saat memuat katalog.' }, { status: 500 });
  }
}
