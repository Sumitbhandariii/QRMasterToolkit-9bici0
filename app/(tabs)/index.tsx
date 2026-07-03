import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useAppContext } from '@/hooks/useAppContext';
import { AdBanner } from '@/components/ui/AdBanner';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - Spacing.base * 2 - Spacing.sm * 3) / 2;

interface StatCardProps {
  label: string;
  value: number;
  icon: string;
  color: string;
  onPress: () => void;
}

function StatCard({ label, value, icon, color, onPress }: StatCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.statCard, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={[styles.statIconWrap, { backgroundColor: color + '18' }]}>
        <MaterialIcons name={icon as any} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );
}

interface FeatureCardProps {
  icon: string;
  label: string;
  color: string;
  bgColor: string;
  onPress: () => void;
  wide?: boolean;
}

function FeatureCard({ icon, label, color, bgColor, onPress, wide }: FeatureCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.featureCard,
        wide ? styles.featureCardWide : { width: CARD_WIDTH },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View style={[styles.featureIconWrap, { backgroundColor: bgColor }]}>
        <MaterialIcons name={icon as any} size={28} color={color} />
      </View>
      <Text style={styles.featureLabel}>{label}</Text>
      <MaterialIcons name="chevron-right" size={16} color={Colors.textTertiary} />
    </Pressable>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { stats } = useAppContext();

  const goToHistory = useCallback((tab?: string) => {
    router.push(tab ? (`/(tabs)/history?tab=${tab}` as any) : '/(tabs)/history');
  }, [router]);

  const goScanner = useCallback(() => router.push('/(tabs)/scanner'), [router]);
  const goGenerator = useCallback(() => router.push('/(tabs)/generator'), [router]);
  const goFavorites = useCallback(() => router.push('/(tabs)/favorites'), [router]);
  const goScanFromPhone = useCallback(() => router.push('/scan-from-phone'), [router]);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.base },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good day! 👋</Text>
            <Text style={styles.appName}>QR Master Toolkit</Text>
          </View>
          <View style={styles.headerBadge}>
            <MaterialIcons name="verified" size={20} color={Colors.primary} />
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <StatCard
            label="Generated"
            value={stats.generated}
            icon="qr-code"
            color="#22C55E"
            onPress={() => goToHistory('generated')}
          />
          <StatCard
            label="History"
            value={stats.total}
            icon="history"
            color="#3B82F6"
            onPress={() => goToHistory()}
          />
          <StatCard
            label="Scanned"
            value={stats.scanned}
            icon="qr-code-scanner"
            color="#8B5CF6"
            onPress={() => goToHistory('scanned')}
          />
        </View>

        {/* Banner */}
        <Pressable onPress={() => goToHistory()} style={({ pressed }) => [pressed && styles.pressed]}>
          <LinearGradient
            colors={['#16A34A', '#22C55E', '#4ADE80']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.banner}
          >
            <View style={styles.bannerContent}>
              <Text style={styles.bannerTitle}>Scan & Generate</Text>
              <Text style={styles.bannerSub}>QR Codes Instantly</Text>
              <Text style={styles.bannerCta}>View History →</Text>
            </View>
            <View style={styles.bannerIcon}>
              <MaterialIcons name="qr-code-2" size={80} color="rgba(255,255,255,0.25)" />
            </View>
          </LinearGradient>
        </Pressable>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.featureGrid}>
          <FeatureCard
            icon="qr-code-scanner"
            label="Scan QR"
            color="#22C55E"
            bgColor="#DCFCE7"
            onPress={goScanner}
          />
          <FeatureCard
            icon="qr-code"
            label="Generate QR"
            color="#3B82F6"
            bgColor="#DBEAFE"
            onPress={goGenerator}
          />
          <FeatureCard
            icon="history"
            label="History"
            color="#8B5CF6"
            bgColor="#EDE9FE"
            onPress={() => goToHistory()}
          />
          <FeatureCard
            icon="star"
            label="Favorites"
            color="#F59E0B"
            bgColor="#FEF3C7"
            onPress={goFavorites}
          />
        </View>

        <FeatureCard
          icon="image-search"
          label="Scan From Phone Gallery"
          color="#EC4899"
          bgColor="#FCE7F3"
          onPress={goScanFromPhone}
          wide
        />

        {/* Recent History */}
        <Text style={styles.sectionTitle}>Tips</Text>
        <View style={styles.tipsCard}>
          {[
            { icon: 'flash-on', text: 'Use flash for low-light scanning', color: '#F59E0B' },
            { icon: 'image-search', text: 'Pick gallery photos to scan QR codes', color: '#8B5CF6' },
            { icon: 'share', text: 'Share generated QR codes instantly', color: '#22C55E' },
          ].map((tip, i) => (
            <View key={i} style={[styles.tipRow, i < 2 && styles.tipBorder]}>
              <View style={[styles.tipIconWrap, { backgroundColor: tip.color + '18' }]}>
                <MaterialIcons name={tip.icon as any} size={18} color={tip.color} />
              </View>
              <Text style={styles.tipText}>{tip.text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>

      <AdBanner bottomSafe />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surface },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  greeting: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  appName: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginTop: 2,
  },
  headerBadge: {
    width: 44,
    height: 44,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primaryLighter,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
    ...Shadows.md,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  statLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.medium,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  banner: {
    borderRadius: Radius.xl,
    marginBottom: Spacing.lg,
    padding: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    minHeight: 100,
    ...Shadows.green,
  },
  bannerContent: { flex: 1 },
  bannerTitle: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },
  bannerSub: {
    fontSize: Typography.sizes.base,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  bannerCta: {
    fontSize: Typography.sizes.sm,
    color: 'rgba(255,255,255,0.75)',
    marginTop: Spacing.sm,
    fontWeight: Typography.weights.medium,
  },
  bannerIcon: {
    position: 'absolute',
    right: -10,
    bottom: -10,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  featureCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadows.md,
  },
  featureCardWide: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.base,
    paddingVertical: Spacing.md,
  },
  featureIconWrap: {
    width: 52,
    height: 52,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    flex: 1,
  },
  tipsCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadows.sm,
    marginBottom: Spacing.base,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  tipBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  tipIconWrap: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  bottomSpace: { height: Spacing.xxl },
});
