import React, { ReactNode } from 'react';
import { Pressable, View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'outlined' | 'filled';
  padding?: number;
}

export function Card({
  children,
  onPress,
  style,
  variant = 'elevated',
  padding = Spacing.base,
}: CardProps) {
  const inner = (
    <View style={[styles.base, styles[variant], { padding }, style]}>
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [pressed && styles.pressed]}
        hitSlop={4}
      >
        {inner}
      </Pressable>
    );
  }
  return inner;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
  },
  default: {},
  elevated: {
    ...Shadows.md,
  },
  outlined: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filled: {
    backgroundColor: Colors.primaryLighter,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
});
