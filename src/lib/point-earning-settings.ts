
'use client';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { PointEarningSettings } from './types';

// Default settings if a store doesn't have any defined.
export const defaultPointEarningSettings: PointEarningSettings = {
    rpPerPoint: 10000, // Default: 1 point for every Rp 10.000 spent
};

/**
 * Fetches point earning settings for a specific store from Firestore.
 * @param storeId The ID of the store.
 * @returns The store's specific settings, or default settings if not found.
 */
export async function getPointEarningSettings(storeId: string): Promise<PointEarningSettings> {
    const settingsDocRef = doc(db, 'stores', storeId);
    try {
        const docSnap = await getDoc(settingsDocRef);

        if (docSnap.exists() && docSnap.data().pointEarningSettings) {
            return { ...defaultPointEarningSettings, ...docSnap.data().pointEarningSettings };
        } else {
            // If settings don't exist, set them with default values
            await setDoc(settingsDocRef, { pointEarningSettings: defaultPointEarningSettings }, { merge: true });
            return defaultPointEarningSettings;
        }
    } catch (error) {
        console.error("Error fetching point earning settings:", error);
        return defaultPointEarningSettings;
    }
}


/**
 * Updates point earning settings for a specific store in Firestore.
 * @param storeId The ID of the store to update.
 * @param newSettings An object containing the settings to update.
 */
export async function updatePointEarningSettings(storeId: string, newSettings: Partial<PointEarningSettings>) {
    const storeDocRef = doc(db, 'stores', storeId);
    try {
        await setDoc(storeDocRef, {
            pointEarningSettings: newSettings
        }, { merge: true });
    } catch (error) {
        console.error(`Error updating point earning settings for store ${storeId}:`, error);
        throw error; // Re-throw the error to be handled by the caller
    }
}
