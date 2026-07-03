import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { STORAGE_KEYS } from '@/constants/config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES = [
  {
    id: 0,
    image: require('@/assets/images/onboarding1.png'),
    title: 'Welcome to\nQR Master Toolkit',
    description: 'Your all-in-one QR code and barcode scanner & generator with premium experience.',
    icon: 'qr-code',
  },
  {
    id: 1,
    image: require('@/assets/images/onboarding2.png'),
    title: 'Scan QR Codes\nInstantly',
    description: 'Fast and accurate scanning with auto-focus, flashlight support, and front/back camera switching.',
    icon: 'qr-code-scanner',
  },
  {
    id: 2,
    image: require('@/assets/images/onboarding3.png'),
    title: 'Generate QR Codes\nEasily',
    description: 'Create QR codes for URLs, text, WiFi, contacts, payments, and 9+ formats in seconds.',
    icon: 'add-box',
  },
  {
    id: 3,
    image: require('@/assets/images/onboarding4.png'),
    title: 'Scan from\nGallery Images',
    description: 'Pick any image from your phone gallery and detect QR codes or barcodes automatically.',
    icon: 'image-search',
  },
  {
    id: 4,
    image: require('@/assets/images/onboarding5.png'),
    title: 'Manage History\n& Favorites',
    description: 'Access your full scan and generation history, and save your most important codes as favorites.',
    icon: 'star',
  },
  {
    id: 5,
    image: require('@/assets/images/onboarding6.png'),
    title: 'Ready to\nGet Started!',
    description: 'Everything you need to manage QR codes is right here. Let\'s dive in!',
    icon: 'rocket-launch',
  },
];

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const scrollTo = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(SLIDES.length - 1, index));
    scrollRef.current?.scrollTo({ x: clamped * SCREEN_WIDTH, animated: true });
    setCurrentIndex(clamped);
  }, []);

  const handleScroll = useCallback((e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.round(x / SCREEN_WIDTH);
    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  }, [currentIndex]);

  const handleGetStarted = useCallback(async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.onboardingComplete, 'true');
    router.replace('/(tabs)');
  }, [router]);

  const handleSkip = useCallback(async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.onboardingComplete, 'true');
    router.replace('/(tabs)');
  }, [router]);

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, Spacing.base) },
      ]}
    >
      {/* Skip button */}
      {!isLast ? (
        <Pressable
          style={styles.skipBtn}
          onPress={handleSkip}
          hitSlop={12}
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      ) : (
        <View style={styles.skipBtn} />
      )}

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleScroll}
        style={styles.scrollView}
        bounces={false}
        decelerationRate="fast"
      >
        {SLIDES.map(slide => (
          <View key={slide.id} style={[styles.slide, { width: SCREEN_WIDTH }]}>
            <View style={styles.imageContainer}>
              <Image
                source={slide.image}
                style={styles.slideImage}
                contentFit="contain"
                transition={300}
              />
            </View>
            <View style={styles.textContainer}>
              <View style={[styles.iconBadge]}>
                <MaterialIcons name={slide.icon as any} size={28} color={Colors.primary} />
              </View>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.description}>{slide.description}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <Pressable
            key={i}
            onPress={() => scrollTo(i)}
            hitSlop={8}
          >
            <View
              style={[
                styles.dot,
                i === currentIndex && styles.dotActive,
              ]}
            />
          </Pressable>
        ))}
      </View>

      {/* Navigation buttons */}
      <View style={styles.buttonsRow}>
        {currentIndex > 0 ? (
          <Pressable
            style={styles.prevBtn}
            onPress={() => scrollTo(currentIndex - 1)}
            hitSlop={8}
          >
            <MaterialIcons name="chevron-left" size={24} color={Colors.primary} />
            <Text style={styles.prevText}>Previous</Text>
          </Pressable>
        ) : (
          <View style={styles.prevBtn} />
        )}

        {isLast ? (
          <Pressable style={styles.getStartedBtn} onPress={handleGetStarted}>
            <Text style={styles.getStartedText}>Get Started</Text>
            <MaterialIcons name="arrow-forward" size={20} color={Colors.white} />
          </Pressable>
        ) : (
          <Pressable
            style={styles.nextBtn}
            onPress={() => scrollTo(currentIndex + 1)}
          >
            <Text style={styles.nextText}>Next</Text>
            <MaterialIcons name="chevron-right" size={24} color={Colors.white} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  skipBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    marginRight: Spacing.sm,
    minHeight: 40,
    justifyContent: 'center',
  },
  skipText: {
    fontSize: Typography.sizes.base,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.medium,
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
  },
  imageContainer: {
    flex: 1,
    width: '100%',
    maxHeight: 340,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.base,
  },
  slideImage: {
    width: '100%',
    height: '100%',
    maxHeight: 320,
  },
  textContainer: {
    width: '100%',
    paddingHorizontal: Spacing.xxl,
    alignItems: 'center',
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primaryLighter,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  title: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 32,
  },
  description: {
    fontSize: Typography.sizes.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.base,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  dotActive: {
    width: 24,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.base,
  },
  prevBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 100,
    minHeight: 44,
    justifyContent: 'flex-start',
  },
  prevText: {
    fontSize: Typography.sizes.base,
    color: Colors.primary,
    fontWeight: Typography.weights.medium,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    minHeight: 48,
    ...Shadows.green,
  },
  nextText: {
    fontSize: Typography.sizes.base,
    color: Colors.white,
    fontWeight: Typography.weights.semibold,
  },
  getStartedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    minHeight: 48,
    ...Shadows.green,
  },
  getStartedText: {
    fontSize: Typography.sizes.base,
    color: Colors.white,
    fontWeight: Typography.weights.semibold,
  },
});
