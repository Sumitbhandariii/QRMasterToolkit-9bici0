import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants/config';

export type HistoryItemType =
  | 'scanned'
  | 'generated'
  | 'scanned_from_phone';

export interface QRCustomization {
  fgColor: string;
  bgColor: string;
  dotStyle: 'squares' | 'rounded' | 'dots';
  logoUri?: string;
}

export const DEFAULT_CUSTOMIZATION: QRCustomization = {
  fgColor: '#111827',
  bgColor: '#FFFFFF',
  dotStyle: 'squares',
};

export interface HistoryItem {
  id: string;
  type: HistoryItemType;
  content: string;
  format?: string;
  qrType?: string;
  label?: string;
  createdAt: string;
  isFavorite: boolean;
  metadata?: Record<string, string>;
  customization?: QRCustomization;
}

export const historyService = {
  async getAll(): Promise<HistoryItem[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.history);
      if (!raw) return [];
      return JSON.parse(raw) as HistoryItem[];
    } catch {
      return [];
    }
  },

  async updateCustomization(id: string, customization: QRCustomization): Promise<void> {
    const items = await this.getAll();
    const updated = items.map(item =>
      item.id === id ? { ...item, customization } : item
    );
    await AsyncStorage.setItem(STORAGE_KEYS.history, JSON.stringify(updated));
  },

  async add(item: Omit<HistoryItem, 'id' | 'createdAt' | 'isFavorite'>): Promise<HistoryItem> {
    const existing = await this.getAll();
    const newItem: HistoryItem = {
      ...item,
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      createdAt: new Date().toISOString(),
      isFavorite: false,
    };
    const updated = [newItem, ...existing].slice(0, 500);
    await AsyncStorage.setItem(STORAGE_KEYS.history, JSON.stringify(updated));
    return newItem;
  },

  async toggleFavorite(id: string): Promise<boolean> {
    const items = await this.getAll();
    const updated = items.map(item =>
      item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
    );
    await AsyncStorage.setItem(STORAGE_KEYS.history, JSON.stringify(updated));
    const favItem = updated.find(i => i.id === id);
    return favItem?.isFavorite ?? false;
  },

  async delete(id: string): Promise<void> {
    const items = await this.getAll();
    const updated = items.filter(item => item.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.history, JSON.stringify(updated));
  },

  async clearAll(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.history);
  },

  async getFavorites(): Promise<HistoryItem[]> {
    const items = await this.getAll();
    return items.filter(i => i.isFavorite);
  },

  async getByType(type: HistoryItemType): Promise<HistoryItem[]> {
    const items = await this.getAll();
    return items.filter(i => i.type === type);
  },

  async getStats(): Promise<{ scanned: number; generated: number; total: number; scannedFromPhone: number }> {
    const items = await this.getAll();
    return {
      total: items.length,
      scanned: items.filter(i => i.type === 'scanned').length,
      generated: items.filter(i => i.type === 'generated').length,
      scannedFromPhone: items.filter(i => i.type === 'scanned_from_phone').length,
    };
  },
};
