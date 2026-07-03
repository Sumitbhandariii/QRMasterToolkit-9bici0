import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { useAppContext } from '@/hooks/useAppContext';
import { HistoryItem } from '@/services/historyService';
import { HistoryItemCard } from '@/components/ui/HistoryItemCard';

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { favorites, toggleFavorite, deleteHistoryItem } = useAppContext();

  const handlePress = useCallback((item: HistoryItem) => {
    if (item.type === 'generated') {
      router.push(`/qr-detail?id=${item.id}`);
    } else {
      router.push(`/scan-result?id=${item.id}`);
    }
  }, [router]);

  const handleToggleFav = useCallback(async (id: string) => {
    await toggleFavorite(id);
  }, [toggleFavorite]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteHistoryItem(id);
  }, [deleteHistoryItem]);

  const renderItem = useCallback(
    ({ item }: { item: HistoryItem }) => (
      <HistoryItemCard
        item={item}
        onPress={handlePress}
        onToggleFavorite={handleToggleFav}
        onDelete={handleDelete}
      />
    ),
    [handlePress, handleToggleFav, handleDelete]
  );

  const keyExtractor = useCallback((item: HistoryItem) => item.id, []);

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View>
          <Text style={styles.headerTitle}>Favorites</Text>
          <Text style={styles.headerSub}>{favorites.length} saved items</Text>
        </View>
        <View style={styles.starWrap}>
          <MaterialIcons name="star" size={24} color="#F59E0B" />
        </View>
      </View>

      <FlatList
        data={favorites}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          favorites.length === 0 && styles.listEmpty,
        ]}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <MaterialIcons name="star-outline" size={52} color={Colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>No Favorites Yet</Text>
            <Text style={styles.emptySub}>
              Tap the star icon on any scan or generated QR code to save it here.
            </Text>
          </View>
        )}
        removeClippedSubviews
        maxToRenderPerBatch={15}
        initialNumToRender={10}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerTitle: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  headerSub: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  starWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.xl,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  listEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.xxxl,
    gap: Spacing.md,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: Typography.sizes.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});
