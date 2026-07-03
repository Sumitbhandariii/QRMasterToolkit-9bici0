import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// react-native-google-mobile-ads requires a custom native build (EAS Build / bare workflow).
// This renders an invisible placeholder that preserves layout spacing.
// To enable real banner ads: do an EAS Build and replace with BannerAd from react-native-google-mobile-ads.

interface Props {
  bottomSafe?: boolean;
}

export function AdBanner({ bottomSafe = false }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        bottomSafe && { paddingBottom: Math.max(insets.bottom, 0) },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
