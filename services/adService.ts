import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, APP_CONFIG } from '@/constants/config';

// Ad frequency manager — no actual native ad calls here
// Actual rendering happens in components using react-native-google-mobile-ads

export const adService = {
  async getScanCount(): Promise<number> {
    try {
      const val = await AsyncStorage.getItem(STORAGE_KEYS.scanCount);
      return val ? parseInt(val, 10) : 0;
    } catch {
      return 0;
    }
  },

  async incrementScanCount(): Promise<number> {
    const count = (await this.getScanCount()) + 1;
    await AsyncStorage.setItem(STORAGE_KEYS.scanCount, String(count));
    return count;
  },

  async shouldShowInterstitialAfterScan(): Promise<boolean> {
    const count = await this.getScanCount();
    return count % APP_CONFIG.scanCountBeforeInterstitial === 0 && count > 0;
  },

  async getGenerateCount(): Promise<number> {
    try {
      const val = await AsyncStorage.getItem(STORAGE_KEYS.generateCount);
      return val ? parseInt(val, 10) : 0;
    } catch {
      return 0;
    }
  },

  async incrementGenerateCount(): Promise<number> {
    const count = (await this.getGenerateCount()) + 1;
    await AsyncStorage.setItem(STORAGE_KEYS.generateCount, String(count));
    return count;
  },

  async shouldShowInterstitialAfterGenerate(): Promise<boolean> {
    const count = await this.getGenerateCount();
    return count % APP_CONFIG.generateCountBeforeInterstitial === 0 && count > 0;
  },
};
