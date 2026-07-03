import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';

const PRESET_COLORS = [
  // Greens
  '#22C55E', '#16A34A', '#4ADE80', '#86EFAC',
  // Blues
  '#3B82F6', '#1D4ED8', '#60A5FA', '#93C5FD',
  // Purples
  '#8B5CF6', '#7C3AED', '#A78BFA', '#C4B5FD',
  // Reds
  '#EF4444', '#DC2626', '#F87171', '#FCA5A5',
  // Oranges
  '#F97316', '#EA580C', '#FB923C', '#FDBA74',
  // Yellows
  '#F59E0B', '#D97706', '#FBBF24', '#FDE68A',
  // Pinks
  '#EC4899', '#DB2777', '#F472B6', '#F9A8D4',
  // Darks
  '#111827', '#1F2937', '#374151', '#4B5563',
  // Mids
  '#6B7280', '#9CA3AF', '#D1D5DB', '#E5E7EB',
  // Lights
  '#F3F4F6', '#F9FAFB', '#FFFFFF', '#000000',
];

interface ColorPickerSheetProps {
  visible: boolean;
  title: string;
  selectedColor: string;
  onSelect: (color: string) => void;
  onClose: () => void;
}

export function ColorPickerSheet({
  visible,
  title,
  selectedColor,
  onSelect,
  onClose,
}: ColorPickerSheetProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <MaterialIcons name="close" size={20} color={Colors.textSecondary} />
          </Pressable>
        </View>

        {/* Selected preview */}
        <View style={styles.previewRow}>
          <View style={[styles.previewSwatch, { backgroundColor: selectedColor }]}>
            {selectedColor === '#FFFFFF' || selectedColor === '#F9FAFB' || selectedColor === '#F3F4F6' || selectedColor === '#E5E7EB' ? (
              <MaterialIcons name="check" size={16} color={Colors.textTertiary} />
            ) : (
              <MaterialIcons name="check" size={16} color="rgba(255,255,255,0.9)" />
            )}
          </View>
          <Text style={styles.selectedHex}>{selectedColor.toUpperCase()}</Text>
        </View>

        {/* Color Grid */}
        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
          <View style={styles.grid}>
            {PRESET_COLORS.map((color) => {
              const isSelected = color.toUpperCase() === selectedColor.toUpperCase();
              const isLight =
                color === '#FFFFFF' ||
                color === '#F9FAFB' ||
                color === '#F3F4F6' ||
                color === '#E5E7EB' ||
                color === '#D1D5DB';
              return (
                <Pressable
                  key={color}
                  style={({ pressed }) => [
                    styles.swatch,
                    { backgroundColor: color },
                    isLight && styles.swatchBorder,
                    isSelected && styles.swatchSelected,
                    pressed && styles.swatchPressed,
                  ]}
                  onPress={() => onSelect(color)}
                >
                  {isSelected ? (
                    <MaterialIcons
                      name="check"
                      size={16}
                      color={isLight ? Colors.textSecondary : 'rgba(255,255,255,0.95)'}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
          <View style={{ height: Spacing.xxl }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    maxHeight: '70%',
    ...Shadows.lg,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  title: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  previewSwatch: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  selectedHex: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  scrollView: {
    paddingHorizontal: Spacing.base,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingVertical: Spacing.base,
  },
  swatch: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchBorder: {
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  swatchSelected: {
    transform: [{ scale: 1.1 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  swatchPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
});
