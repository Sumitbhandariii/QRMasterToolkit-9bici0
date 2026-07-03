import React, {
  createContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import { historyService, HistoryItem, HistoryItemType, QRCustomization } from '@/services/historyService';

interface Stats {
  scanned: number;
  generated: number;
  total: number;
  scannedFromPhone: number;
}

interface AppContextType {
  history: HistoryItem[];
  favorites: HistoryItem[];
  stats: Stats;
  loading: boolean;
  addHistoryItem: (item: Omit<HistoryItem, 'id' | 'createdAt' | 'isFavorite'>) => Promise<HistoryItem>;
  toggleFavorite: (id: string) => Promise<void>;
  deleteHistoryItem: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  refreshHistory: () => Promise<void>;
  updateCustomization: (id: string, customization: QRCustomization) => Promise<void>;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshHistory = useCallback(async () => {
    try {
      const items = await historyService.getAll();
      setHistory(items);
    } catch (e) {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  const favorites = history.filter(i => i.isFavorite);
  const stats: Stats = {
    total: history.length,
    scanned: history.filter(i => i.type === 'scanned').length,
    generated: history.filter(i => i.type === 'generated').length,
    scannedFromPhone: history.filter(i => i.type === 'scanned_from_phone').length,
  };

  const addHistoryItem = useCallback(
    async (item: Omit<HistoryItem, 'id' | 'createdAt' | 'isFavorite'>) => {
      const newItem = await historyService.add(item);
      setHistory(prev => [newItem, ...prev].slice(0, 500));
      return newItem;
    },
    []
  );

  const toggleFavorite = useCallback(async (id: string) => {
    await historyService.toggleFavorite(id);
    setHistory(prev =>
      prev.map(item =>
        item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
      )
    );
  }, []);

  const deleteHistoryItem = useCallback(async (id: string) => {
    await historyService.delete(id);
    setHistory(prev => prev.filter(item => item.id !== id));
  }, []);

  const updateCustomization = useCallback(async (id: string, customization: QRCustomization) => {
    await historyService.updateCustomization(id, customization);
    setHistory(prev =>
      prev.map(item =>
        item.id === id ? { ...item, customization } : item
      )
    );
  }, []);

  const clearHistory = useCallback(async () => {
    await historyService.clearAll();
    setHistory([]);
  }, []);

  return (
    <AppContext.Provider
      value={{
        history,
        favorites,
        stats,
        loading,
        addHistoryItem,
        toggleFavorite,
        deleteHistoryItem,
        clearHistory,
        refreshHistory,
        updateCustomization,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
