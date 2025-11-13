
import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/server/firebase-admin';
import { getWhatsappSettings } from '@/lib/server/whatsapp-settings';

async function internalSendWhatsapp(deviceId: string, target: string, message: string, isGroup: boolean = false) {
    const formData = new FormData();
    formData.append('device_id', deviceId);
    formData.append(isGroup ? 'group' : 'number', target);
    formData.append('message', message);
    const endpoint = isGroup ? 'sendGroup' : 'send';
    const webhookUrl = `https://app.whacenter.com/api/${endpoint}`;

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const responseJson = await response.json();
            console.error('WhaCenter API HTTP Error:', { status: response.status, body: responseJson });
        } else {
            const responseJson = await response.json();
            if (responseJson.status === 'error') {
                console.error('WhaCenter API Error:', responseJson.reason);
            }
        }
    } catch (error) {
        console.error("Failed to send WhatsApp message:", error);
    }
}

function formatWhatsappNumber(nomor: string | number): string {
    if (!nomor) return '';
    let nomorStr = String(nomor).replace(/\D/g, '');
    if (nomorStr.startsWith('0')) {
        return '62' + nomorStr.substring(1);
    }
    if (nomorStr.startsWith('8')) {
        return '62' + nomorStr;
    }
    return nomorStr;
}

export async function POST(req: NextRequest) {
    const { auth, db } = getFirebaseAdmin();
    const authorization = req.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
    }
    const idToken = authorization.split('Bearer ')[1];
    
    try {
        const decodedToken = await auth.verifyIdToken(idToken);
        const { uid, name } = decodedToken;
        const { storeId, storeName, amount, tokensToAdd, uniqueCode, totalAmount, proofUrl } = await req.json();

        if (!storeId || !storeName || !amount || !tokensToAdd || !totalAmount || !proofUrl) {
            return NextResponse.json({ error: 'Missing required top-up data.' }, { status: 400 });
        }

        const newRequestData = {
            storeId,
            storeName,
            userId: uid,
            userName: name || 'User',
            amount,
            tokensToAdd,
            uniqueCode,
            totalAmount,
            proofUrl,
            status: 'pending' as const,
            requestedAt: new Date().toISOString(),
        };

        // Write to the root collection 'topUpRequests'
        await db.collection('topUpRequests').add(newRequestData);
        console.info(`Top-up request submitted to root collection for store ${storeId} by user ${uid}`);

        const successResponse = NextResponse.json({ success: true });

        // --- Handle WhatsApp notifications in the background ---
        (async () => {
            try {
                const { deviceId, adminGroup } = await getWhatsappSettings("platform");
                if (!deviceId) {
                    console.warn("WhatsApp deviceId not configured. Skipping notifications.");
                    return;
                }
                
                // Notify platform admin
                if (adminGroup) {
                    const adminMessage = `*PENGAJUAN TOP UP BARU*\nToko: *${storeName}*\nAdmin: *${name}*\nJumlah: *Rp ${totalAmount.toLocaleString('id-ID')}* (+${tokensToAdd.toLocaleString('id-ID')} Token)\nStatus: *Pending*\n\nMohon untuk segera diverifikasi melalui panel Superadmin.\nLihat bukti: ${proofUrl}`;
                    internalSendWhatsapp(deviceId, adminGroup, adminMessage, true);
                }
                
                // Notify user
                const userDoc = await db.collection('users').doc(uid).get();
                const userWhatsapp = userDoc.data()?.whatsapp;
                if (userWhatsapp) {
                    const userMessage = `Halo *${name}*, pengajuan top up Pradana Token Anda untuk toko *${storeName}* sebesar *Rp ${totalAmount.toLocaleString('id-ID')}* telah berhasil kami terima dan sedang dalam proses verifikasi.`;
                    const formattedPhone = formatWhatsappNumber(userWhatsapp);
                    internalSendWhatsapp(deviceId, formattedPhone, userMessage);
                }
            } catch (whatsappError) {
                console.error("Error sending top-up notifications:", whatsappError);
            }
        })();

        return successResponse;

    } catch (error) {
        console.error('Error in submitTopUpRequest:', error);
        return NextResponse.json({ error: (error as Error).message || 'An unknown error occurred.' }, { status: 500 });
    }
}
