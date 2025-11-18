"use strict";
'use server';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendDailySalesSummary = exports.onTopUpRequestUpdate = exports.onTopUpRequestCreate = exports.processIndividualTenantOrder = exports.processPujaseraQueue = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const logger = __importStar(require("firebase-functions/logger"));
const firestore_2 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
const date_fns_1 = require("date-fns");
const format_1 = require("date-fns/format");
const locale_1 = require("date-fns/locale");
// Initialize Firebase Admin SDK if not already initialized
if ((0, app_1.getApps)().length === 0) {
    (0, app_1.initializeApp)();
}
const db = (0, firestore_2.getFirestore)();
/**
 * Retrieves WhatsApp settings directly from environment variables.
 */
function getWhatsappSettings() {
    const deviceId = process.env.WHATSAPP_DEVICE_ID;
    const adminGroup = process.env.WHATSAPP_ADMIN_GROUP;
    if (!deviceId) {
        logger.warn("WHATSAPP_DEVICE_ID environment variable is not set.");
    }
    if (!adminGroup) {
        logger.warn("WHATSAPP_ADMIN_GROUP environment variable is not set.");
    }
    return { deviceId, adminGroup };
}
async function internalSendWhatsapp(deviceId, target, message, isGroup = false) {
    const formData = new FormData();
    formData.append('device_id', deviceId);
    formData.append(isGroup ? 'group' : 'number', target);
    formData.append('message', message);
    const endpoint = isGroup ? 'sendGroup' : 'send';
    const webhookUrl = `https://app.whacenter.com/api/${endpoint}`;
    try {
        const fetch = (await Promise.resolve().then(() => __importStar(require('node-fetch')))).default;
        const response = await fetch(webhookUrl, {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) {
            const responseJson = await response.json();
            const reason = (typeof responseJson === 'object' && responseJson && 'reason' in responseJson) ? responseJson.reason : 'Unknown error';
            logger.error('WhaCenter API HTTP Error:', { status: response.status, body: reason });
        }
        else {
            const responseJson = await response.json();
            if (typeof responseJson === 'object' && responseJson && 'status' in responseJson && responseJson.status === 'error' && 'reason' in responseJson) {
                logger.error('WhaCenter API Error:', responseJson.reason);
            }
        }
    }
    catch (error) {
        logger.error("Failed to send WhatsApp message:", error);
    }
}
function formatWhatsappNumber(nomor) {
    if (!nomor)
        return '';
    let nomorStr = String(nomor).replace(/\D/g, '');
    if (nomorStr.startsWith('0')) {
        return '62' + nomorStr.substring(1);
    }
    if (nomorStr.startsWith('8')) {
        return '62' + nomorStr;
    }
    return nomorStr;
}
/**
 * [LEGACY] Main function to handle all queued tasks for centralized payment.
 */
exports.processPujaseraQueue = (0, firestore_1.onDocumentCreated)("Pujaseraqueue/{jobId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
        logger.info("No data associated with the event, exiting.");
        return;
    }
    const jobData = snapshot.data();
    const { type, payload } = jobData;
    try {
        await snapshot.ref.update({ status: 'processing', startedAt: firestore_2.FieldValue.serverTimestamp() });
        switch (type) {
            case 'pujasera-order':
                await handlePujaseraOrder(payload);
                await snapshot.ref.update({ status: 'completed', processedAt: firestore_2.FieldValue.serverTimestamp() });
                break;
            default:
                logger.warn(`Unknown job type: ${type}`);
                await snapshot.ref.update({ status: 'unknown_type', error: `Unknown job type: ${type}`, processedAt: firestore_2.FieldValue.serverTimestamp() });
        }
    }
    catch (error) {
        logger.error(`Failed to process job ${snapshot.id} of type ${type}:`, error);
        await snapshot.ref.update({ status: 'failed', error: error.message, processedAt: firestore_2.FieldValue.serverTimestamp() });
    }
});
/**
 * [NEW] Processes orders where payment is handled by each tenant individually.
 */
exports.processIndividualTenantOrder = (0, firestore_1.onDocumentCreated)("PujaseraIndividualQueue/{jobId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
        logger.info("[Individual] No data associated with the event, exiting.");
        return;
    }
    const jobData = snapshot.data();
    const { type, payload } = jobData;
    try {
        await snapshot.ref.update({ status: 'processing', startedAt: firestore_2.FieldValue.serverTimestamp() });
        if (type === 'pujasera-order-individual') {
            await handleIndividualPujaseraOrder(payload);
            await snapshot.ref.update({ status: 'completed', processedAt: firestore_2.FieldValue.serverTimestamp() });
        }
        else {
            logger.warn(`[Individual] Unknown job type: ${type}`);
            await snapshot.ref.update({ status: 'unknown_type', error: `Unknown job type: ${type}`, processedAt: firestore_2.FieldValue.serverTimestamp() });
        }
    }
    catch (error) {
        logger.error(`[Individual] Failed to process job ${snapshot.id} of type ${type}:`, error);
        await snapshot.ref.update({ status: 'failed', error: error.message, processedAt: firestore_2.FieldValue.serverTimestamp() });
    }
});
async function handleIndividualPujaseraOrder(payload) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const { pujaseraId, customer, cart, paymentMethod, deliveryOption, deliveryAddress } = payload;
    if (!pujaseraId || !customer || !cart || !Array.isArray(cart) || cart.length === 0) {
        throw new Error("Data pesanan individual tidak lengkap.");
    }
    const itemsByTenant = {};
    for (const item of cart) {
        if (!item.storeId || !item.storeName)
            continue;
        if (!itemsByTenant[item.storeId]) {
            itemsByTenant[item.storeId] = { storeName: item.storeName, items: [] };
        }
        itemsByTenant[item.storeId].items.push(item);
    }
    const feeSettingsDoc = await db.doc('appSettings/transactionFees').get();
    const feeSettings = feeSettingsDoc.data() || {};
    const feePercentage = (_a = feeSettings.feePercentage) !== null && _a !== void 0 ? _a : 0.005;
    const minFeeRp = (_b = feeSettings.minFeeRp) !== null && _b !== void 0 ? _b : 500;
    const maxFeeRp = (_c = feeSettings.maxFeeRp) !== null && _c !== void 0 ? _c : 2500;
    const tokenValueRp = (_d = feeSettings.tokenValueRp) !== null && _d !== void 0 ? _d : 1000;
    const batch = db.batch();
    const parentTransactionId = db.collection('dummy').doc().id;
    let grandTotalAmount = 0;
    for (const tenantId in itemsByTenant) {
        const tenantInfo = itemsByTenant[tenantId];
        const tenantItems = tenantInfo.items;
        const tenantStoreRef = db.doc(`stores/${tenantId}`);
        const tenantStoreDoc = await tenantStoreRef.get();
        if (!tenantStoreDoc.exists) {
            logger.warn(`[Individual] Tenant store with ID ${tenantId} not found. Skipping.`);
            continue;
        }
        const tenantData = tenantStoreDoc.data();
        const tenantCounter = tenantData.transactionCounter || 0;
        const newReceiptNumber = tenantCounter + 1;
        const subtotal = tenantItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const taxRate = (_f = (_e = tenantData.financialSettings) === null || _e === void 0 ? void 0 : _e.taxPercentage) !== null && _f !== void 0 ? _f : 0;
        const serviceRate = (_h = (_g = tenantData.financialSettings) === null || _g === void 0 ? void 0 : _g.serviceFeePercentage) !== null && _h !== void 0 ? _h : 0;
        const taxAmount = subtotal * (taxRate / 100);
        const serviceFeeAmount = subtotal * (serviceRate / 100);
        const totalAmount = subtotal + taxAmount + serviceFeeAmount;
        grandTotalAmount += totalAmount; // Accumulate total amount for points calculation
        const newTransactionRef = db.collection('stores').doc(tenantId).collection('transactions').doc();
        batch.set(newTransactionRef, {
            receiptNumber: newReceiptNumber,
            storeId: tenantId,
            customerId: customer.id || 'N/A',
            customerName: customer.name || 'Guest',
            staffId: 'catalog-system',
            createdAt: new Date().toISOString(),
            items: tenantItems,
            subtotal,
            taxAmount,
            serviceFeeAmount,
            discountAmount: 0,
            totalAmount: totalAmount,
            paymentMethod,
            status: 'Diproses',
            notes: `Pesanan dari Katalog Publik #${String(parentTransactionId).substring(0, 6)}`,
            parentTransactionId,
            pujaseraId: pujaseraId,
            deliveryOption: deliveryOption || 'pickup',
            deliveryAddress: deliveryAddress || '',
        });
        // Deduct token from each tenant based on their transaction amount
        const feeFromPercentage = totalAmount * feePercentage;
        const feeCappedAtMin = Math.max(feeFromPercentage, minFeeRp);
        const feeCappedAtMax = Math.min(feeCappedAtMin, maxFeeRp);
        const transactionFee = feeCappedAtMax / tokenValueRp;
        batch.update(tenantStoreRef, {
            transactionCounter: firestore_2.FieldValue.increment(1),
            pradanaTokenBalance: firestore_2.FieldValue.increment(-transactionFee)
        });
    }
    // Fetch pujasera settings for points calculation
    const pujaseraStoreDoc = await db.doc(`stores/${pujaseraId}`).get();
    if (pujaseraStoreDoc.exists) {
        const pujaseraData = pujaseraStoreDoc.data();
        const pointSettings = (pujaseraData.pointEarningSettings || { rpPerPoint: 10000 });
        if (pointSettings.rpPerPoint > 0) {
            const totalPointsEarned = Math.floor(grandTotalAmount / pointSettings.rpPerPoint);
            // Update customer's central loyalty points under the pujasera document
            if (customer.id !== 'N/A' && totalPointsEarned > 0) {
                const customerRef = db.doc(`stores/${pujaseraId}/customers/${customer.id}`);
                batch.update(customerRef, { loyaltyPoints: firestore_2.FieldValue.increment(totalPointsEarned) });
            }
        }
    }
    await batch.commit();
    logger.info(`[Individual] Successfully processed catalog order and distributed to ${Object.keys(itemsByTenant).length} tenants.`);
}
async function handlePujaseraOrder(payload) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const { pujaseraId, customer, cart, paymentMethod } = payload;
    if (!pujaseraId || !customer || !cart || cart.length === 0) {
        throw new Error("Data pesanan tidak lengkap.");
    }
    // Group items by tenant for distribution
    const itemsByTenant = {};
    for (const item of cart) {
        if (!item.storeId || !item.storeName)
            continue;
        if (!itemsByTenant[item.storeId]) {
            itemsByTenant[item.storeId] = { storeName: item.storeName, items: [] };
        }
        itemsByTenant[item.storeId].items.push(item);
    }
    const feeSettingsDoc = await db.doc('appSettings/transactionFees').get();
    const feeSettings = feeSettingsDoc.data() || {};
    const feePercentage = (_a = feeSettings.feePercentage) !== null && _a !== void 0 ? _a : 0.005;
    const minFeeRp = (_b = feeSettings.minFeeRp) !== null && _b !== void 0 ? _b : 500;
    const maxFeeRp = (_c = feeSettings.maxFeeRp) !== null && _c !== void 0 ? _c : 2500;
    const tokenValueRp = (_d = feeSettings.tokenValueRp) !== null && _d !== void 0 ? _d : 1000;
    const batch = db.batch();
    const parentTransactionId = db.collection('dummy').doc().id; // Generate a shared ID for this order group
    for (const tenantId in itemsByTenant) {
        const tenantInfo = itemsByTenant[tenantId];
        const tenantItems = tenantInfo.items;
        const tenantStoreRef = db.doc(`stores/${tenantId}`);
        const tenantStoreDoc = await tenantStoreRef.get();
        if (!tenantStoreDoc.exists) {
            logger.warn(`Tenant store with ID ${tenantId} not found. Skipping.`);
            continue;
        }
        const tenantData = tenantStoreDoc.data();
        const tenantCounter = tenantData.transactionCounter || 0;
        const newReceiptNumber = tenantCounter + 1;
        const subtotal = tenantItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        // Calculate tax and service fee based on tenant's settings
        const taxRate = (_f = (_e = tenantData.financialSettings) === null || _e === void 0 ? void 0 : _e.taxPercentage) !== null && _f !== void 0 ? _f : 0;
        const serviceRate = (_h = (_g = tenantData.financialSettings) === null || _g === void 0 ? void 0 : _g.serviceFeePercentage) !== null && _h !== void 0 ? _h : 0;
        const taxAmount = subtotal * (taxRate / 100);
        const serviceFeeAmount = subtotal * (serviceRate / 100);
        const totalAmount = subtotal + taxAmount + serviceFeeAmount;
        const newTransactionRef = db.collection('stores').doc(tenantId).collection('transactions').doc();
        batch.set(newTransactionRef, {
            receiptNumber: newReceiptNumber,
            storeId: tenantId,
            customerId: customer.id || 'N/A',
            customerName: customer.name || 'Guest',
            staffId: 'catalog-system',
            createdAt: new Date().toISOString(),
            items: tenantItems,
            subtotal,
            taxAmount,
            serviceFeeAmount,
            discountAmount: 0,
            totalAmount: totalAmount,
            paymentMethod,
            status: 'Diproses',
            notes: `Pesanan dari Katalog Publik #${String(parentTransactionId).substring(0, 6)}`,
            parentTransactionId,
            pujaseraId: pujaseraId,
        });
        const feeFromPercentage = totalAmount * feePercentage;
        const feeCappedAtMin = Math.max(feeFromPercentage, minFeeRp);
        const feeCappedAtMax = Math.min(feeCappedAtMin, maxFeeRp);
        const transactionFee = feeCappedAtMax / tokenValueRp;
        batch.update(tenantStoreRef, {
            transactionCounter: firestore_2.FieldValue.increment(1),
            pradanaTokenBalance: firestore_2.FieldValue.increment(-transactionFee)
        });
    }
    await batch.commit();
    logger.info(`Successfully processed catalog order and distributed to ${Object.keys(itemsByTenant).length} tenants.`);
}
/**
 * Triggers when a new top-up request is created.
 * It syncs the request to the store's subcollection for history.
 * The notification is now handled by the API route.
 */
exports.onTopUpRequestCreate = (0, firestore_1.onDocumentCreated)("topUpRequests/{requestId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
        logger.info("No data for onTopUpRequestCreate event, exiting.");
        return;
    }
    const requestData = snapshot.data();
    const { storeId } = requestData;
    if (!storeId) {
        logger.error("Top-up request is missing 'storeId'.", { id: snapshot.id });
        return;
    }
    try {
        // Sync data to the store's subcollection for their history
        const historyRef = db.collection('stores').doc(storeId).collection('topUpRequests').doc(snapshot.id);
        await historyRef.set(requestData);
        logger.info(`Synced top-up request ${snapshot.id} to store ${storeId}`);
    }
    catch (error) {
        logger.error(`Failed to sync new top-up request ${snapshot.id} for store ${storeId}:`, error);
    }
});
/**
 * Handles logic when a top-up request is updated (approved/rejected).
 * Sends notifications to the customer and admin group.
 */
exports.onTopUpRequestUpdate = (0, firestore_1.onDocumentUpdated)("topUpRequests/{requestId}", async (event) => {
    var _a, _b, _c, _d;
    const before = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const after = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if (!before || !after) {
        logger.info("No data change detected in onTopUpRequestUpdate, exiting.");
        return;
    }
    if (before.status !== 'pending' || before.status === after.status) {
        return;
    }
    const { storeId, storeName, status, tokensToAdd, userId } = after;
    const requestId = event.params.requestId;
    if (!storeId || !storeName) {
        logger.error(`Request ${requestId} is missing 'storeId' or 'storeName'. Cannot process update.`);
        return;
    }
    const { deviceId, adminGroup } = getWhatsappSettings();
    if (!deviceId) {
        logger.error("WhatsApp Device ID not configured. Cannot send top-up update notifications.");
        return;
    }
    const formattedAmount = (tokensToAdd || 0).toLocaleString('id-ID');
    let customerWhatsapp = '';
    let customerName = after.userName || 'Pelanggan';
    if (userId) {
        try {
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists) {
                customerWhatsapp = ((_c = userDoc.data()) === null || _c === void 0 ? void 0 : _c.whatsapp) || '';
                customerName = ((_d = userDoc.data()) === null || _d === void 0 ? void 0 : _d.name) || customerName;
            }
        }
        catch (userError) {
            logger.error(`Could not fetch user document for UID ${userId}:`, userError);
        }
    }
    let customerMessage = '';
    let adminMessage = '';
    if (status === 'completed') {
        customerMessage = `✅ *Top-up Disetujui!*\n\nHalo ${customerName},\nPermintaan top-up Anda untuk toko *${storeName}* telah disetujui.\n\nSejumlah *${formattedAmount} token* telah ditambahkan ke saldo Anda.\n\nTerima kasih!`;
        adminMessage = `✅ *Top-up Disetujui*\n\nPermintaan dari: *${storeName}*\nJumlah: *${formattedAmount} token*\n\nStatus berhasil diperbarui dan saldo toko telah ditambahkan.`;
    }
    else if (status === 'rejected') {
        customerMessage = `❌ *Top-up Ditolak*\n\nHalo ${customerName},\nMohon maaf, permintaan top-up Anda untuk toko *${storeName}* sejumlah ${formattedAmount} token telah ditolak.\n\nSilakan periksa bukti transfer Anda dan coba lagi, atau hubungi admin jika ada pertanyaan.`;
        adminMessage = `❌ *Top-up Ditolak*\n\nPermintaan dari: *${storeName}*\nJumlah: *${formattedAmount} token*\n\nStatus berhasil diperbarui. Tidak ada perubahan pada saldo toko.`;
    }
    else {
        return;
    }
    try {
        // Notify customer directly
        if (customerWhatsapp) {
            const formattedPhone = formatWhatsappNumber(customerWhatsapp);
            await internalSendWhatsapp(deviceId, formattedPhone, customerMessage, false);
            logger.info(`Sent '${status}' notification for customer ${customerName} of store ${storeId}`);
        }
        else {
            logger.warn(`User ${userId} for store ${storeId} does not have a WhatsApp number. Cannot send notification.`);
        }
        // Notify admin group directly
        if (adminGroup) {
            await internalSendWhatsapp(deviceId, adminGroup, adminMessage, true);
            logger.info(`Sent '${status}' notification for admin group for request from ${storeName}.`);
        }
    }
    catch (error) {
        logger.error(`Failed to send notifications for request ${requestId}:`, error);
    }
});
exports.sendDailySalesSummary = (0, scheduler_1.onSchedule)({
    schedule: "1 0 * * *", // Runs at 00:01 every day
    timeZone: "Asia/Jakarta",
}, async (event) => {
    logger.info("Memulai pengiriman ringkasan penjualan harian...");
    try {
        const storesSnapshot = await db.collection('stores').get();
        if (storesSnapshot.empty) {
            logger.info("Tidak ada toko yang terdaftar. Proses dihentikan.");
            return;
        }
        const { deviceId } = getWhatsappSettings();
        if (!deviceId) {
            logger.error("WhatsApp Device ID not configured. Cannot send daily summaries.");
            return;
        }
        const promises = storesSnapshot.docs.map(async (storeDoc) => {
            var _a;
            const store = storeDoc.data();
            const storeId = storeDoc.id;
            if (((_a = store.notificationSettings) === null || _a === void 0 ? void 0 : _a.dailySummaryEnabled) === false) {
                logger.info(`Pengiriman ringkasan harian dinonaktifkan untuk toko: ${store.name}`);
                return;
            }
            if (!store.adminUids || store.adminUids.length === 0) {
                logger.warn(`Toko ${store.name} tidak memiliki admin.`);
                return;
            }
            const today = new Date();
            const yesterday = (0, date_fns_1.subDays)(today, 1);
            const startOfDayTs = firestore_2.Timestamp.fromDate(new Date(yesterday.setHours(0, 0, 0, 0)));
            const endOfDayTs = firestore_2.Timestamp.fromDate(new Date(yesterday.setHours(23, 59, 59, 999)));
            const transactionsSnapshot = await db.collectionGroup('transactions')
                .where('storeId', '==', storeId)
                .where('createdAt', '>=', startOfDayTs.toDate().toISOString())
                .where('createdAt', '<=', endOfDayTs.toDate().toISOString())
                .get();
            let totalRevenue = 0;
            const totalTransactions = transactionsSnapshot.size;
            transactionsSnapshot.forEach(txDoc => {
                totalRevenue += txDoc.data().totalAmount || 0;
            });
            logger.info(`Toko: ${store.name}, Omset Kemarin: Rp ${totalRevenue}, Transaksi: ${totalTransactions}`);
            const adminDocs = await Promise.all(store.adminUids.map((uid) => db.collection('users').doc(uid).get()));
            const formattedDate = (0, format_1.format)(yesterday, "EEEE, d MMMM yyyy", { locale: locale_1.id });
            for (const adminDoc of adminDocs) {
                if (adminDoc.exists) {
                    const adminData = adminDoc.data();
                    if (adminData && adminData.whatsapp) {
                        const message = `*Ringkasan Harian Chika POS*\n*${store.name}* - ${formattedDate}\n\nHalo *${adminData.name}*, berikut adalah ringkasan penjualan Anda kemarin:\n- *Total Omset*: Rp ${totalRevenue.toLocaleString('id-ID')}\n- *Jumlah Transaksi*: ${totalTransactions}\n\nTerus pantau dan optimalkan performa penjualan Anda melalui dasbor Chika. Semangat selalu! 💪\n\n_Apabila tidak berkenan, fitur ini dapat dinonaktifkan di menu Pengaturan._`;
                        const formattedPhone = formatWhatsappNumber(adminData.whatsapp);
                        await internalSendWhatsapp(deviceId, formattedPhone, message, false);
                        logger.info(`Laporan harian berhasil dikirim untuk ${adminData.name} (${store.name})`);
                    }
                }
            }
        });
        await Promise.all(promises);
        logger.info("Pengiriman ringkasan penjualan harian selesai.");
    }
    catch (error) {
        logger.error("Error dalam fungsi terjadwal sendDailySalesSummary:", error);
    }
});
//# sourceMappingURL=index.js.map