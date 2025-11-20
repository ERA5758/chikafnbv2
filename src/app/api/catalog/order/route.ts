

import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/server/firebase-admin';
import type { OrderPayload, Table } from '@/lib/types';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
    const { db } = getFirebaseAdmin();
    try {
        const payload: OrderPayload = await req.json();
        const { storeId, customer, cart, subtotal, taxAmount, serviceFeeAmount, totalAmount, paymentMethod } = payload;

        if (!storeId || !customer || !cart || cart.length === 0) {
            return NextResponse.json({ error: 'Data pesanan tidak lengkap.' }, { status: 400 });
        }
        
        const storeRef = db.collection('stores').doc(storeId);
        
        // Use a transaction to atomically get the next virtual table number and create the table
        const newTable = await db.runTransaction(async (transaction) => {
            const storeDoc = await transaction.get(storeRef);
            if (!storeDoc.exists) {
                throw new Error("Toko tidak ditemukan.");
            }
            
            const currentCounter = storeDoc.data()?.virtualTableCounter || 0;
            const newTableNumber = currentCounter + 1;
            
            // Update the counter
            transaction.update(storeRef, { virtualTableCounter: newTableNumber });
            
            // Create the new virtual table document
            const newTableRef = db.collection('stores').doc(storeId).collection('tables').doc();
            const newTableData: Omit<Table, 'id'> = {
                name: `Virtual #${newTableNumber}`,
                capacity: customer.name.length, // Arbitrary capacity, can be adjusted
                status: 'Terisi',
                isVirtual: true,
                currentOrder: {
                    items: cart,
                    subtotal: subtotal,
                    taxAmount: taxAmount,
                    serviceFeeAmount: serviceFeeAmount,
                    totalAmount: totalAmount,
                    orderTime: new Date().toISOString(),
                    customer: {
                        id: customer.id,
                        name: customer.name,
                        phone: customer.phone,
                        avatarUrl: customer.avatarUrl,
                    },
                    paymentMethod: paymentMethod, // Save the payment method
                }
            };
            
            transaction.set(newTableRef, newTableData);
            
            return { id: newTableRef.id, ...newTableData };
        });

        return NextResponse.json({ success: true, message: 'Pesanan berhasil dikirim ke kasir.', table: newTable });

    } catch (error) {
        console.error('Error creating virtual table order:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
