import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Share,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useAppContext } from '@/hooks/useAppContext';
import { HistoryItem } from '@/services/historyService';

type ContentInfo = {
  type: string;
  label: string;
  icon: string;
  iconColor: string;
  canOpen: boolean;
  openLabel: string;
};

function detectContentType(content: string): ContentInfo {
  if (/^https?:\/\//i.test(content))
    return { type: 'url', label: 'URL', icon: 'link', iconColor: '#3B82F6', canOpen: true, openLabel: 'Open in Browser' };
  if (/^www\./i.test(content))
    return { type: 'url', label: 'URL', icon: 'link', iconColor: '#3B82F6', canOpen: true, openLabel: 'Open in Browser' };
  if (/^mailto:/i.test(content))
    return { type: 'email', label: 'Email', icon: 'email', iconColor: '#EF4444', canOpen: true, openLabel: 'Open Email App' };
  if (/^tel:/i.test(content))
    return { type: 'phone', label: 'Phone', icon: 'call', iconColor: '#10B981', canOpen: true, openLabel: 'Call Number' };
  if (/^smsto?:/i.test(content))
    return { type: 'sms', label: 'SMS', icon: 'sms', iconColor: '#F59E0B', canOpen: true, openLabel: 'Send SMS' };
  if (/^WIFI:/i.test(content))
    return { type: 'wifi', label: 'WiFi', icon: 'wifi', iconColor: '#22C55E', canOpen: false, openLabel: '' };
  if (/^BEGIN:VCARD/i.test(content))
    return { type: 'contact', label: 'Contact', icon: 'contact-page', iconColor: '#8B5CF6', canOpen: false, openLabel: '' };
  if (/^geo:/i.test(content))
    return { type: 'location', label: 'Location', icon: 'location-on', iconColor: '#EC4899', canOpen: true, openLabel: 'Open in Maps' };
  if (/^upi:\/\//i.test(content))
    return { type: 'upi', label: 'UPI Payment', icon: 'payment', iconColor: '#F97316', canOpen: true, openLabel: 'Open UPI App' };
  return { type: 'text', label: 'Text', icon: 'text-fields', iconColor: '#6B7280', canOpen: false, openLabel: '' };
}

function parseWifi(content: string) {
  const ssid = content.match(/S:([^;]+)/)?.[1] ?? '';
  const pass = content.match(/P:([^;]+)/)?.[1] ?? '';
  const enc = content.match(/T:([^;]+)/)?.[1] ?? 'WPA';
  return { ssid, pass, enc };
}

function getOpenUrl(content: string, type: string): string {
  if (type === 'url') {
    return content.startsWith('http') ? content : `https://${content}`;
  }
  return content;
}

export default function ScanResultScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; content?: string; format?: string }>();
  const { history, toggleFavorite } = useAppContext();

  const [item, setItem] = useState<HistoryItem | null>(null);
  const [content, setContent] = useState('');
  const [format, setFormat] = useState('');
  const [isFav, setIsFav] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (params.id) {
      const found = history.find(h => h.id === params.id);
      if (found) {
        setItem(found);
        setContent(found.content);
        setFormat(found.format ?? '');
        setIsFav(found.isFavorite);
      }
    } else if (params.content) {
      setContent(decodeURIComponent(params.content));
      setFormat(params.format ? decodeURIComponent(params.format) : '');
    }
  }, [params.id, params.content, params.format, history]);

  useEffect(() => {
    if (item) setIsFav(item.isFavorite);
  }, [item]);

  const detected = detectContentType(content);

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  const handleOpen = useCallback(() => {
    if (!detected.canOpen) return;
    const url = getOpenUrl(content, detected.type);
    Linking.openURL(url).catch(() =>
      Alert.alert('Cannot Open', 'No app found to handle this link. Try copying and opening manually.')
    );
  }, [content, detected]);

  const handleShare = useCallback(() => {
    Share.share({ message: content }).catch(() => {});
  }, [content]);

  const handleToggleFav = useCallback(async () => {
    if (!item) return;
    await toggleFavorite(item.id);
    setIsFav(prev => !prev);
  }, [item, toggleFavorite]);

  const wifiData = detected.type === 'wifi' ? parseWifi(content) : null;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header badge row */}
        <View style={styles.headerRow}>
          <View style={[styles.typeBadge, { backgroundColor: detected.iconColor + '18' }]}>
            <MaterialIcons name={detected.icon as any} size={14} color={detected.iconColor} />
            <Text style={[styles.typeBadgeText, { color: detected.iconColor }]}>{detected.label}</Text>
          </View>
          {format ? (
            <View style={styles.formatBadge}>
              <Text style={styles.formatText}>{format}</Text>
            </View>
          ) : null}
        </View>

        {/* Success icon */}
        <View style={styles.successSection}>
          <View style={styles.successIconWrap}>
            <MaterialIcons name="check-circle" size={56} color={Colors.primary} />
          </View>
          <Text style={styles.successTitle}>Scan Successful!</Text>
          <Text style={styles.successSub}>QR code decoded successfully</Text>
        </View>

        {/* ── URL Open Banner — prominent CTA when URL detected ─────────────── */}
        {detected.canOpen ? (
          <Pressable
            style={({ pressed }) => [styles.openBanner, pressed && styles.openBannerPressed]}
            onPress={handleOpen}
          >
            <View style={styles.openBannerIcon}>
              <MaterialIcons name={detected.icon as any} size={22} color={Colors.white} />
            </View>
            <View style={styles.openBannerText}>
              <Text style={styles.openBannerTitle}>{detected.openLabel}</Text>
              <Text style={styles.openBannerSub} numberOfLines={1}>
                {detected.type === 'url'
                  ? (content.length > 40 ? content.slice(0, 40) + '...' : content)
                  : 'Tap to open'}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color="rgba(255,255,255,0.8)" />
          </Pressable>
        ) : null}

        {/* Content Card */}
        <View style={styles.contentCard}>
          <Text style={styles.contentLabel}>Decoded Content</Text>
          {wifiData ? (
            <View style={styles.wifiInfo}>
              <View style={styles.wifiRow}>
                <Text style={styles.wifiKey}>Network</Text>
                <Text style={styles.wifiVal}>{wifiData.ssid || '—'}</Text>
              </View>
              <View style={[styles.wifiRow, styles.wifiRowBorder]}>
                <Text style={styles.wifiKey}>Password</Text>
                <Text style={styles.wifiVal}>{wifiData.pass || 'None'}</Text>
              </View>
              <View style={styles.wifiRow}>
                <Text style={styles.wifiKey}>Security</Text>
                <Text style={styles.wifiVal}>{wifiData.enc}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.contentText} selectable>
              {content}
            </Text>
          )}
        </View>

        {/* Action Grid */}
        <View style={styles.actionsGrid}>
          {/* Copy */}
          <Pressable
            style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
            onPress={handleCopy}
          >
            <View style={[styles.actionIcon, { backgroundColor: copied ? Colors.primaryLight : '#DBEAFE' }]}>
              <MaterialIcons
                name={copied ? 'check' : 'content-copy'}
                size={22}
                color={copied ? Colors.primary : '#3B82F6'}
              />
            </View>
            <Text style={styles.actionLabel}>{copied ? 'Copied!' : 'Copy'}</Text>
          </Pressable>

          {/* Share */}
          <Pressable
            style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
            onPress={handleShare}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#DCFCE7' }]}>
              <MaterialIcons name="share" size={22} color="#22C55E" />
            </View>
            <Text style={styles.actionLabel}>Share</Text>
          </Pressable>

          {/* Open */}
          {detected.canOpen ? (
            <Pressable
              style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
              onPress={handleOpen}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#EDE9FE' }]}>
                <MaterialIcons name="open-in-browser" size={22} color="#8B5CF6" />
              </View>
              <Text style={styles.actionLabel}>Open</Text>
            </Pressable>
          ) : null}

          {/* Favorite */}
          {item ? (
            <Pressable
              style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
              onPress={handleToggleFav}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]}>
                <MaterialIcons
                  name={isFav ? 'star' : 'star-outline'}
                  size={22}
                  color="#F59E0B"
                />
              </View>
              <Text style={styles.actionLabel}>{isFav ? 'Saved' : 'Favorite'}</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Scan Again */}
        <Pressable
          style={({ pressed }) => [styles.scanAgainBtn, pressed && styles.scanAgainPressed]}
          onPress={() => router.back()}
        >
          <MaterialIcons name="qr-code-scanner" size={20} color={Colors.white} />
          <Text style={styles.scanAgainText}>Scan Again</Text>
        </Pressable>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scrollContent: {
    padding: Spacing.base,
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
    alignSelf: 'flex-start',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  typeBadgeText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  formatBadge: {
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  formatText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textTertiary,
    fontWeight: Typography.weights.medium,
  },
  successSection: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  successIconWrap: {
    marginBottom: Spacing.sm,
  },
  successTitle: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  successSub: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },

  // ── URL Open Banner ────────────────────────────────────────────────────────
  openBanner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    ...Shadows.green,
  },
  openBannerPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  openBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  openBannerText: {
    flex: 1,
  },
  openBannerTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },
  openBannerSub: {
    fontSize: Typography.sizes.xs,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },

  // ── Content Card ───────────────────────────────────────────────────────────
  contentCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  contentLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  contentText: {
    fontSize: Typography.sizes.base,
    color: Colors.text,
    lineHeight: 24,
  },
  wifiInfo: {
    gap: 0,
  },
  wifiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  wifiRowBorder: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.borderLight,
  },
  wifiKey: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.medium,
    width: 80,
  },
  wifiVal: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    fontWeight: Typography.weights.semibold,
    flex: 1,
    textAlign: 'right',
  },

  // ── Action Grid ────────────────────────────────────────────────────────────
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    width: '100%',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  actionCard: {
    width: 80,
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  actionCardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.medium,
  },

  // ── Scan Again ─────────────────────────────────────────────────────────────
  scanAgainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    borderRadius: Radius.lg,
    minHeight: 52,
    ...Shadows.green,
    minWidth: 200,
    justifyContent: 'center',
  },
  scanAgainPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  scanAgainText: {
    color: Colors.white,
    fontWeight: Typography.weights.semibold,
    fontSize: Typography.sizes.base,
  },
});
