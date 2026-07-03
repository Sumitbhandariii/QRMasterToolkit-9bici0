import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  TextInput,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useAppContext } from '@/hooks/useAppContext';
import { HistoryItem } from '@/services/historyService';
import { HistoryItemCard } from '@/components/ui/HistoryItemCard';
import { AdBanner } from '@/components/ui/AdBanner';

type TabId = 'all' | 'scanned' | 'generated' | 'from_phone';
type SortOrder = 'newest' | 'oldest' | 'alpha';

const SORT_OPTIONS: { id: SortOrder; label: string; icon: string }[] = [
  { id: 'newest', label: 'Newest', icon: 'arrow-downward' },
  { id: 'oldest', label: 'Oldest', icon: 'arrow-upward' },
  { id: 'alpha', label: 'A–Z', icon: 'sort-by-alpha' },
];

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'all', label: 'All', icon: 'list' },
  { id: 'scanned', label: 'Scanned', icon: 'qr-code-scanner' },
  { id: 'generated', label: 'Generated', icon: 'qr-code' },
  { id: 'from_phone', label: 'From Gallery', icon: 'image-search' },
];

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { history, toggleFavorite, deleteHistoryItem, clearHistory } = useAppContext();

  const initialTab = (params.tab as TabId) ?? 'all';
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const searchBarAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (params.tab) {
      const t = params.tab as TabId;
      if (TABS.find(tab => tab.id === t)) setActiveTab(t);
    }
  }, [params.tab]);

  const handleSearchFocus = useCallback(() => {
    setSearchFocused(true);
    Animated.timing(searchBarAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [searchBarAnim]);

  const handleSearchBlur = useCallback(() => {
    setSearchFocused(false);
    Animated.timing(searchBarAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [searchBarAnim]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  }, []);

  const tabCounts = useMemo(() => ({
    all: history.length,
    scanned: history.filter(i => i.type === 'scanned').length,
    generated: history.filter(i => i.type === 'generated').length,
    from_phone: history.filter(i => i.type === 'scanned_from_phone').length,
  }), [history]);

  const tabFiltered = useMemo(() => {
    if (activeTab === 'all') return history;
    if (activeTab === 'scanned') return history.filter(i => i.type === 'scanned');
    if (activeTab === 'generated') return history.filter(i => i.type === 'generated');
    if (activeTab === 'from_phone') return history.filter(i => i.type === 'scanned_from_phone');
    return history;
  }, [history, activeTab]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const base = q
      ? tabFiltered.filter(
          i =>
            i.content.toLowerCase().includes(q) ||
            (i.label ?? '').toLowerCase().includes(q) ||
            (i.qrType ?? '').toLowerCase().includes(q) ||
            (i.format ?? '').toLowerCase().includes(q)
        )
      : tabFiltered;

    return [...base].sort((a, b) => {
      if (sortOrder === 'oldest') return (a.createdAt ?? 0) - (b.createdAt ?? 0);
      if (sortOrder === 'alpha') {
        const aStr = (a.label ?? a.content).toLowerCase();
        const bStr = (b.label ?? b.content).toLowerCase();
        return aStr.localeCompare(bStr);
      }
      // newest (default)
      return (b.createdAt ?? 0) - (a.createdAt ?? 0);
    });
  }, [tabFiltered, searchQuery, sortOrder]);

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

  const handleClearAll = () => {
    Alert.alert(
      'Clear History',
      'This will permanently delete all history items. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: clearHistory },
      ]
    );
  };

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
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>History</Text>
            <Text style={styles.headerSub}>
              {searchQuery ? `${filtered.length} of ${tabFiltered.length}` : `${filtered.length} items`}
            </Text>
          </View>
          {history.length > 0 ? (
            <Pressable
              style={styles.clearBtn}
              onPress={handleClearAll}
              hitSlop={8}
            >
              <MaterialIcons name="delete-outline" size={20} color={Colors.error} />
            </Pressable>
          ) : null}
        </View>

        {/* Sort control */}
        <View style={styles.sortRow}>
          <MaterialIcons name="sort" size={15} color={Colors.textTertiary} />
          <Text style={styles.sortLabel}>Sort:</Text>
          {SORT_OPTIONS.map(opt => (
            <Pressable
              key={opt.id}
              style={[styles.sortChip, sortOrder === opt.id && styles.sortChipActive]}
              onPress={() => setSortOrder(opt.id)}
              hitSlop={6}
            >
              <MaterialIcons
                name={opt.icon as any}
                size={12}
                color={sortOrder === opt.id ? Colors.white : Colors.textSecondary}
              />
              <Text style={[styles.sortChipText, sortOrder === opt.id && styles.sortChipTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Search bar */}
        <Animated.View
          style={[
            styles.searchBar,
            {
              borderColor: searchBarAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [Colors.border, Colors.primary],
              }),
              shadowOpacity: searchBarAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.1],
              }),
            },
          ]}
        >
          <MaterialIcons
            name="search"
            size={20}
            color={searchFocused ? Colors.primary : Colors.textTertiary}
          />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search by content, label or type..."
            placeholderTextColor={Colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            returnKeyType="search"
            clearButtonMode="never"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 ? (
            <Pressable onPress={handleClearSearch} hitSlop={8} style={styles.clearSearchBtn}>
              <MaterialIcons name="close" size={16} color={Colors.textSecondary} />
            </Pressable>
          ) : null}
        </Animated.View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <FlatList
          horizontal
          data={TABS}
          keyExtractor={t => t.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
          renderItem={({ item: tab }) => {
            const count = tabCounts[tab.id];
            const isActive = activeTab === tab.id;
            return (
              <Pressable
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setActiveTab(tab.id)}
              >
                <MaterialIcons
                  name={tab.icon as any}
                  size={14}
                  color={isActive ? Colors.white : Colors.textSecondary}
                />
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab.label}
                </Text>
                {count > 0 ? (
                  <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                    <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>
                      {count > 99 ? '99+' : count}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          }}
        />
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          filtered.length === 0 && styles.listEmpty,
        ]}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <MaterialIcons
                name={searchQuery ? 'search-off' : 'history'}
                size={52}
                color={Colors.textTertiary}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No Results Found' : 'No History Yet'}
            </Text>
            <Text style={styles.emptySub}>
              {searchQuery
                ? `No items match "${searchQuery}". Try a different search term.`
                : activeTab === 'generated'
                ? 'Generate your first QR code to see it here.'
                : activeTab === 'from_phone'
                ? 'Scan images from your gallery to see them here.'
                : 'Scan a QR code or barcode to get started.'}
            </Text>
            {searchQuery ? (
              <Pressable style={styles.clearSearchEmptyBtn} onPress={() => setSearchQuery('')}>
                <Text style={styles.clearSearchEmptyText}>Clear Search</Text>
              </Pressable>
            ) : null}
          </View>
        )}
        removeClippedSubviews={Platform.OS === 'android'}
        maxToRenderPerBatch={15}
        initialNumToRender={10}
        windowSize={5}
      />

      <AdBanner bottomSafe />
    </View>
  );
}

import { Platform } from 'react-native';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: Spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  clearBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 0,
    minHeight: 46,
    borderWidth: 1.5,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 0,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.sizes.base,
    color: Colors.text,
    paddingVertical: Spacing.md,
    includeFontPadding: false,
  },
  clearSearchBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsContainer: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  tabs: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    flexDirection: 'row',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    minHeight: 36,
  },
  tabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.white,
  },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  tabBadgeText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.textSecondary,
  },
  tabBadgeTextActive: {
    color: Colors.white,
  },
  listContent: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
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
  clearSearchEmptyBtn: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.primaryLighter,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearSearchEmptyText: {
    color: Colors.primaryDark,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  sortLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    color: Colors.textTertiary,
    marginRight: 2,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    minHeight: 30,
  },
  sortChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  sortChipText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    color: Colors.textSecondary,
  },
  sortChipTextActive: {
    color: Colors.white,
  },
});
