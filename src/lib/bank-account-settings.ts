
'use client';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export type BankAccountSettings = {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
};

// Default settings if the document doesn't exist in Firestore.
export const defaultBankAccountSettings: BankAccountSettings = {
    bankName: 'BANK BCA',
    accountNumber: '6225089802',
    accountHolder: 'PT. ERA MAJU MAPAN BERSAMA PRADANA',
};

/**
 * Fetches Bank Account settings from Firestore.
 * @returns The bank account settings, or default settings if not found.
 */
export async function getBankAccountSettings(): Promise<BankAccountSettings> {
    const settingsDocRef = doc(db, 'appSettings', 'bankAccount');
    try {
        const docSnap = await getDoc(settingsDocRef);

        if (docSnap.exists()) {
            return { ...defaultBankAccountSettings, ...docSnap.data() };
        } else {
            console.warn(`Bank account settings not found, creating document with default values.`);
            await setDoc(settingsDocRef, defaultBankAccountSettings);
            return defaultBankAccountSettings;
        }
    } catch (error) {
        console.error("Error fetching bank account settings:", error);
        return defaultBankAccountSettings;
    }
}
