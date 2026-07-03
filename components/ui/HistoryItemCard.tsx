import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { HistoryItem } from '@/services/historyService';

interface Props {
  item: HistoryItem;
  onPress?: (item: HistoryItem) => void;
  onToggleFavorite?: (id: string) => void;
  onDelete?: (id: string) => void;
}

function getTypeIcon(type: HistoryItem['type']): string {
  switch (type) {
    case 'scanned': return 'qr-code-scanner';
    case 'generated': return 'qr-code';
    case 'scanned_from_phone': return 'image-search';
    default: return 'qr-code';
  }
}

function getTypeLabel(type: HistoryItem['type']): string {
  switch (type) {
    case 'scanned': return 'Scanned';
    case 'generated': return 'Generated';
    case 'scanned_from_phone': return 'From Gallery';
    default: return 'Unknown';
  }
}

function getTypeColor(type: HistoryItem['type']): string {
  switch (type) {
    case 'scanned': return '#3B82F6';
    case 'generated': return '#22C55E';
    case 'scanned_from_phone': return '#8B5CF6';
    default: return '#6B7280';
  }
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export const HistoryItemCard = memo(function HistoryItemCard({
  item,
  onPress,
  onToggleFavorite,
  onDelete,
}: Props) {
  const typeColor = getTypeColor(item.type);

  const handleDelete = () => {
    Alert.alert('Delete Item', 'Remove this item from history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => onDelete?.(item.id),
      },
    ]);
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={() => onPress?.(item)}
    >
      <View style={[styles.iconWrapper, { backgroundColor: typeColor + '15' }]}>
        <MaterialIcons
          name={getTypeIcon(item.type) as any}
          size={22}
          color={typeColor}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={[styles.typeBadge, { backgroundColor: typeColor + '15' }]}>
            <Text style={[styles.typeLabel, { color: typeColor }]}>
              {getTypeLabel(item.type)}
            </Text>
          </View>
          {item.format ? (
            <Text style={styles.format}>{item.format}</Text>
          ) : null}
        </View>
        <Text style={styles.contentText} numberOfLines={2}>
          {item.label || item.content}
        </Text>
        <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={() => onToggleFavorite?.(item.id)}
          hitSlop={8}
          style={styles.actionBtn}
        >
          <MaterialIcons
            name={item.isFavorite ? 'star' : 'star-outline'}
            size={22}
            color={item.isFavorite ? '#F59E0B' : Colors.textTertiary}
          />
        </Pressable>
        <Pressable onPress={handleDelete} hitSlop={8} style={styles.actionBtn}>
          <MaterialIcons name="delete-outline" size={20} color={Colors.textTertiary} />
        </Pressable>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
    gap: Spacing.md,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  typeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  typeLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  format: {
    fontSize: Typography.sizes.xs,
    color: Colors.textTertiary,
  },
  contentText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    fontWeight: Typography.weights.medium,
  },
  date: {
    fontSize: Typography.sizes.xs,
    color: Colors.textTertiary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexShrink: 0,
  },
  actionBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
