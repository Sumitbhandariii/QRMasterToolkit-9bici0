import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Share,
  Platform,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useAppContext } from '@/hooks/useAppContext';
import { HistoryItem, QRCustomization, DEFAULT_CUSTOMIZATION } from '@/services/historyService';
import { ColorPickerSheet } from '@/components/ui/ColorPickerSheet';

type DotStyle = 'squares' | 'rounded' | 'dots';

const DOT_STYLES: { id: DotStyle; label: string; icon: string; description: string }[] = [
  { id: 'squares', label: 'Squares', icon: 'grid-on', description: 'Classic sharp squares' },
  { id: 'rounded', label: 'Rounded', icon: 'rounded-corner', description: 'Soft rounded corners' },
  { id: 'dots', label: 'Dots', icon: 'blur-circular', description: 'Modern circular dots' },
];

// Maps dot style to a QR rendering approach via ecl + gradient options
function getQRProps(style: DotStyle, fgColor: string, bgColor: string) {
  switch (style) {
    case 'dots':
      return {
        color: fgColor,
        backgroundColor: bgColor,
        enableLinearGradient: false,
        ecl: 'H' as const,
      };
    case 'rounded':
      return {
        color: fgColor,
        backgroundColor: bgColor,
        enableLinearGradient: true,
        linearGradient: [fgColor, adjustColorBrightness(fgColor, 40)],
        ecl: 'M' as const,
      };
    case 'squares':
    default:
      return {
        color: fgColor,
        backgroundColor: bgColor,
        enableLinearGradient: false,
        ecl: 'M' as const,
      };
  }
}

// Lighten or darken a hex color by a percentage
function adjustColorBrightness(hex: string, amount: number): string {
  try {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
    const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  } catch {
    return hex;
  }
}

// Section expand/collapse component
function Section({
  title,
  icon,
  iconColor,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: string;
  iconColor: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const rotation = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;

  const toggle = useCallback(() => {
    Animated.timing(rotation, {
      toValue: open ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    setOpen(prev => !prev);
  }, [open, rotation]);

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={sectionStyles.wrapper}>
      <Pressable
        style={({ pressed }) => [sectionStyles.header, pressed && sectionStyles.pressed]}
        onPress={toggle}
      >
        <View style={[sectionStyles.iconWrap, { backgroundColor: iconColor + '18' }]}>
          <MaterialIcons name={icon as any} size={18} color={iconColor} />
        </View>
        <Text style={sectionStyles.title}>{title}</Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <MaterialIcons name="expand-more" size={22} color={Colors.textTertiary} />
        </Animated.View>
      </Pressable>
      {open ? <View style={sectionStyles.content}>{children}</View> : null}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  pressed: { opacity: 0.85 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  content: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.md,
  },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function QRDetailScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const { history, toggleFavorite, updateCustomization } = useAppContext();

  const [item, setItem] = useState<HistoryItem | null>(null);
  const [isFav, setIsFav] = useState(false);
  const [saving, setSaving] = useState(false);

  // Customization state
  const [fgColor, setFgColor] = useState(DEFAULT_CUSTOMIZATION.fgColor);
  const [bgColor, setBgColor] = useState(DEFAULT_CUSTOMIZATION.bgColor);
  const [dotStyle, setDotStyle] = useState<DotStyle>(DEFAULT_CUSTOMIZATION.dotStyle);
  const [logoUri, setLogoUri] = useState<string | undefined>(undefined);

  // Picker sheets
  const [fgPickerVisible, setFgPickerVisible] = useState(false);
  const [bgPickerVisible, setBgPickerVisible] = useState(false);

  const qrViewRef = useRef<View>(null);

  // Debounced save ref
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (params.id) {
      const found = history.find(h => h.id === params.id);
      if (found) {
        setItem(found);
        setIsFav(found.isFavorite);
        if (found.customization) {
          setFgColor(found.customization.fgColor);
          setBgColor(found.customization.bgColor);
          setDotStyle(found.customization.dotStyle);
          setLogoUri(found.customization.logoUri);
        }
      }
    }
  }, [params.id, history]);

  useEffect(() => {
    if (item) setIsFav(item.isFavorite);
  }, [item]);

  // Auto-save customization changes
  const persistCustomization = useCallback(
    (custom: QRCustomization) => {
      if (!item) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        updateCustomization(item.id, custom);
      }, 600);
    },
    [item, updateCustomization]
  );

  const handleFgColor = useCallback(
    (color: string) => {
      setFgColor(color);
      setFgPickerVisible(false);
      persistCustomization({ fgColor: color, bgColor, dotStyle, logoUri });
    },
    [bgColor, dotStyle, logoUri, persistCustomization]
  );

  const handleBgColor = useCallback(
    (color: string) => {
      setBgColor(color);
      setBgPickerVisible(false);
      persistCustomization({ fgColor, bgColor: color, dotStyle, logoUri });
    },
    [fgColor, dotStyle, logoUri, persistCustomization]
  );

  const handleDotStyle = useCallback(
    (style: DotStyle) => {
      setDotStyle(style);
      persistCustomization({ fgColor, bgColor, dotStyle: style, logoUri });
    },
    [fgColor, bgColor, logoUri, persistCustomization]
  );

  const handlePickLogo = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Allow photo library access to choose a logo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setLogoUri(uri);
      persistCustomization({ fgColor, bgColor, dotStyle, logoUri: uri });
    }
  }, [fgColor, bgColor, dotStyle, persistCustomization]);

  const handleRemoveLogo = useCallback(() => {
    setLogoUri(undefined);
    persistCustomization({ fgColor, bgColor, dotStyle, logoUri: undefined });
  }, [fgColor, bgColor, dotStyle, persistCustomization]);

  const handleResetColors = useCallback(() => {
    setFgColor(DEFAULT_CUSTOMIZATION.fgColor);
    setBgColor(DEFAULT_CUSTOMIZATION.bgColor);
    setDotStyle(DEFAULT_CUSTOMIZATION.dotStyle);
    setLogoUri(undefined);
    persistCustomization(DEFAULT_CUSTOMIZATION);
  }, [persistCustomization]);

  // ── QR Export ──────────────────────────────────────────────────────────────

  const captureQR = async (): Promise<string> => {
    if (!qrViewRef.current) throw new Error('QR view not ready');
    const uri = await captureRef(qrViewRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });
    return uri;
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Allow media library access to save QR codes.');
        return;
      }
      const uri = await captureQR();
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Saved!', 'QR code saved to your gallery.');
    } catch {
      Alert.alert('Error', 'Failed to save QR code. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    try {
      const uri = await captureQR();
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share QR Code',
        });
      } else {
        await Share.share({ message: item?.content ?? '' });
      }
    } catch {
      try {
        await Share.share({ message: item?.content ?? '' });
      } catch {}
    }
  };

  const handleShareText = async () => {
    try {
      await Share.share({ message: item?.content ?? '' });
    } catch {}
  };

  const handleToggleFav = async () => {
    if (!item) return;
    await toggleFavorite(item.id);
    setIsFav(prev => !prev);
  };

  // ── Render helpers ─────────────────────────────────────────────────────────

  if (!item) {
    return (
      <View style={styles.loadingState}>
        <MaterialIcons name="qr-code" size={40} color={Colors.textTertiary} />
        <Text style={styles.loadingText}>Loading QR Code...</Text>
      </View>
    );
  }

  const qrTypeLabels: Record<string, string> = {
    text: 'Text', url: 'URL', wifi: 'WiFi', phone: 'Phone',
    sms: 'SMS', email: 'Email', contact: 'Contact', location: 'Location', upi: 'UPI Payment',
  };

  const qrProps = getQRProps(dotStyle, fgColor, bgColor);
  const isDarkBg = bgColor === '#000000' || bgColor === '#111827' || bgColor === '#1F2937' || bgColor === '#374151';

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Badge row */}
        <View style={styles.badgeRow}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>
              {qrTypeLabels[item.qrType ?? ''] ?? 'QR Code'}
            </Text>
          </View>
          <View style={[styles.dotStyleBadge, { backgroundColor: Colors.surfaceAlt }]}>
            <MaterialIcons name={DOT_STYLES.find(d => d.id === dotStyle)?.icon as any ?? 'grid-on'} size={12} color={Colors.textSecondary} />
            <Text style={styles.dotStyleBadgeText}>{DOT_STYLES.find(d => d.id === dotStyle)?.label}</Text>
          </View>
        </View>

        {/* QR Display Card */}
        <View style={[styles.qrCard, isDarkBg && styles.qrCardDark]}>
          <ViewShot
            ref={qrViewRef as any}
            options={{ format: 'png', quality: 1 }}
            style={[
              styles.qrWrapper,
              { backgroundColor: bgColor },
              dotStyle === 'rounded' && styles.qrWrapperRounded,
              dotStyle === 'dots' && styles.qrWrapperDots,
            ]}
          >
            <QRCode
              value={item.content || 'QR Master Toolkit'}
              size={200}
              logo={logoUri ? { uri: logoUri } : undefined}
              logoSize={logoUri ? 44 : undefined}
              logoBackgroundColor={logoUri ? bgColor : undefined}
              logoBorderRadius={logoUri ? 8 : undefined}
              logoMargin={logoUri ? 4 : undefined}
              {...qrProps}
            />
          </ViewShot>
          <View style={styles.qrBrand}>
            <MaterialIcons name="qr-code" size={12} color={isDarkBg ? 'rgba(255,255,255,0.4)' : Colors.textTertiary} />
            <Text style={[styles.qrBrandText, isDarkBg && styles.qrBrandTextDark]}>QR Master Toolkit</Text>
          </View>
        </View>

        {/* Content snippet */}
        <View style={styles.contentCard}>
          <Text style={styles.contentLabel}>QR Content</Text>
          <Text style={styles.contentText} selectable numberOfLines={3}>
            {item.content}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, styles.actionPrimary, pressed && styles.pressed]}
            onPress={handleSave}
            disabled={saving}
          >
            <MaterialIcons name="download" size={20} color={Colors.white} />
            <Text style={styles.actionPrimaryText}>{saving ? 'Saving...' : 'Save PNG'}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.actionBtn, styles.actionSecondary, pressed && styles.pressed]}
            onPress={handleShare}
          >
            <MaterialIcons name="share" size={20} color={Colors.primary} />
            <Text style={styles.actionSecondaryText}>Share Image</Text>
          </Pressable>
        </View>

        <View style={styles.secondaryActions}>
          <Pressable
            style={({ pressed }) => [styles.iconActionBtn, pressed && styles.pressed]}
            onPress={handleShareText}
          >
            <MaterialIcons name="text-fields" size={18} color={Colors.textSecondary} />
            <Text style={styles.iconActionText}>Share Text</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.iconActionBtn, pressed && styles.pressed]}
            onPress={handleToggleFav}
          >
            <MaterialIcons
              name={isFav ? 'star' : 'star-outline'}
              size={18}
              color={isFav ? '#F59E0B' : Colors.textSecondary}
            />
            <Text style={[styles.iconActionText, isFav && styles.favActiveText]}>
              {isFav ? 'Saved' : 'Favorite'}
            </Text>
          </Pressable>
        </View>

        {/* ─── Customization Sections ─── */}
        <View style={styles.customizeSeparator}>
          <View style={styles.separatorLine} />
          <View style={styles.separatorLabel}>
            <MaterialIcons name="tune" size={14} color={Colors.textSecondary} />
            <Text style={styles.separatorText}>Customize QR Code</Text>
          </View>
          <View style={styles.separatorLine} />
        </View>

        {/* Dot Style Section */}
        <Section
          title="Dot Style"
          icon="grain"
          iconColor="#8B5CF6"
          defaultOpen
        >
          <View style={styles.dotStyleGrid}>
            {DOT_STYLES.map(style => (
              <Pressable
                key={style.id}
                style={({ pressed }) => [
                  styles.dotStyleCard,
                  dotStyle === style.id && styles.dotStyleCardActive,
                  pressed && styles.pressed,
                ]}
                onPress={() => handleDotStyle(style.id)}
              >
                <MaterialIcons
                  name={style.icon as any}
                  size={26}
                  color={dotStyle === style.id ? Colors.primary : Colors.textSecondary}
                />
                <Text
                  style={[
                    styles.dotStyleLabel,
                    dotStyle === style.id && styles.dotStyleLabelActive,
                  ]}
                >
                  {style.label}
                </Text>
                <Text style={styles.dotStyleDesc}>{style.description}</Text>
                {dotStyle === style.id ? (
                  <View style={styles.dotStyleCheck}>
                    <MaterialIcons name="check-circle" size={16} color={Colors.primary} />
                  </View>
                ) : null}
              </Pressable>
            ))}
          </View>
        </Section>

        {/* Foreground Color */}
        <Section title="Foreground Color" icon="format-color-fill" iconColor="#3B82F6">
          <View style={styles.colorRow}>
            <View style={styles.colorPreviewGroup}>
              <View style={[styles.colorSwatch, { backgroundColor: fgColor }, fgColor === '#FFFFFF' && styles.colorSwatchBorder]} />
              <View>
                <Text style={styles.colorHex}>{fgColor.toUpperCase()}</Text>
                <Text style={styles.colorHint}>QR code dots color</Text>
              </View>
            </View>
            <Pressable
              style={({ pressed }) => [styles.changeColorBtn, pressed && styles.pressed]}
              onPress={() => setFgPickerVisible(true)}
            >
              <MaterialIcons name="colorize" size={16} color={Colors.primary} />
              <Text style={styles.changeColorText}>Change</Text>
            </Pressable>
          </View>

          {/* Quick presets */}
          <Text style={styles.presetsLabel}>Quick Presets</Text>
          <View style={styles.quickPresets}>
            {['#111827', '#22C55E', '#3B82F6', '#8B5CF6', '#EF4444', '#F59E0B', '#EC4899', '#000000'].map(c => (
              <Pressable
                key={c}
                style={[
                  styles.quickSwatch,
                  { backgroundColor: c },
                  fgColor === c && styles.quickSwatchActive,
                ]}
                onPress={() => handleFgColor(c)}
              />
            ))}
          </View>
        </Section>

        {/* Background Color */}
        <Section title="Background Color" icon="format-color-reset" iconColor="#F97316">
          <View style={styles.colorRow}>
            <View style={styles.colorPreviewGroup}>
              <View style={[styles.colorSwatch, { backgroundColor: bgColor }, (bgColor === '#FFFFFF' || bgColor === '#F9FAFB') && styles.colorSwatchBorder]} />
              <View>
                <Text style={styles.colorHex}>{bgColor.toUpperCase()}</Text>
                <Text style={styles.colorHint}>QR code background</Text>
              </View>
            </View>
            <Pressable
              style={({ pressed }) => [styles.changeColorBtn, pressed && styles.pressed]}
              onPress={() => setBgPickerVisible(true)}
            >
              <MaterialIcons name="colorize" size={16} color={Colors.primary} />
              <Text style={styles.changeColorText}>Change</Text>
            </Pressable>
          </View>

          <Text style={styles.presetsLabel}>Quick Presets</Text>
          <View style={styles.quickPresets}>
            {['#FFFFFF', '#F9FAFB', '#DCFCE7', '#DBEAFE', '#EDE9FE', '#FEF3C7', '#111827', '#000000'].map(c => (
              <Pressable
                key={c}
                style={[
                  styles.quickSwatch,
                  { backgroundColor: c },
                  (c === '#FFFFFF' || c === '#F9FAFB') && styles.quickSwatchLight,
                  bgColor === c && styles.quickSwatchActive,
                ]}
                onPress={() => handleBgColor(c)}
              />
            ))}
          </View>
        </Section>

        {/* Logo Section */}
        <Section title="Center Logo" icon="image" iconColor="#EC4899">
          {logoUri ? (
            <View style={styles.logoPreviewRow}>
              <View style={styles.logoThumbWrap}>
                <Image
                  source={{ uri: logoUri }}
                  style={styles.logoThumb}
                  contentFit="cover"
                />
              </View>
              <View style={styles.logoInfo}>
                <Text style={styles.logoInfoTitle}>Logo Applied</Text>
                <Text style={styles.logoInfoSub}>Tap remove to clear</Text>
              </View>
              <View style={styles.logoActions}>
                <Pressable
                  style={({ pressed }) => [styles.logoBtn, styles.logoBtnSecondary, pressed && styles.pressed]}
                  onPress={handlePickLogo}
                >
                  <MaterialIcons name="edit" size={16} color={Colors.primary} />
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.logoBtn, styles.logoBtnDanger, pressed && styles.pressed]}
                  onPress={handleRemoveLogo}
                >
                  <MaterialIcons name="close" size={16} color={Colors.error} />
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.logoPickerArea}>
              <View style={styles.logoDashedBorder}>
                <MaterialIcons name="add-photo-alternate" size={32} color={Colors.textTertiary} />
                <Text style={styles.logoPickerTitle}>Add a Logo</Text>
                <Text style={styles.logoPickerSub}>
                  Embed your brand or icon in the center of the QR code
                </Text>
                <Pressable
                  style={({ pressed }) => [styles.logoPickBtn, pressed && styles.pressed]}
                  onPress={handlePickLogo}
                >
                  <MaterialIcons name="image-search" size={16} color={Colors.white} />
                  <Text style={styles.logoPickBtnText}>Choose from Gallery</Text>
                </Pressable>
              </View>
            </View>
          )}
        </Section>

        {/* Reset */}
        <Pressable
          style={({ pressed }) => [styles.resetBtn, pressed && styles.pressed]}
          onPress={handleResetColors}
        >
          <MaterialIcons name="refresh" size={18} color={Colors.textSecondary} />
          <Text style={styles.resetText}>Reset to Default</Text>
        </Pressable>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      {/* Color Picker Modals */}
      <ColorPickerSheet
        visible={fgPickerVisible}
        title="Foreground Color"
        selectedColor={fgColor}
        onSelect={handleFgColor}
        onClose={() => setFgPickerVisible(false)}
      />
      <ColorPickerSheet
        visible={bgPickerVisible}
        title="Background Color"
        selectedColor={bgColor}
        onSelect={handleBgColor}
        onClose={() => setBgPickerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.base,
  },
  scrollContent: {
    padding: Spacing.base,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  typeBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  typeBadgeText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.primaryDark,
  },
  dotStyleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  dotStyleBadgeText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.medium,
  },

  // QR Card
  qrCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.sm,
    ...Shadows.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  qrCardDark: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
  },
  qrWrapper: {
    padding: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  qrWrapperRounded: {
    borderRadius: Radius.xl,
    ...Shadows.sm,
  },
  qrWrapperDots: {
    borderRadius: Radius.full,
    ...Shadows.sm,
  },
  qrBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  qrBrandText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textTertiary,
  },
  qrBrandTextDark: {
    color: 'rgba(255,255,255,0.35)',
  },

  // Content card
  contentCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
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
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    lineHeight: 20,
  },

  // Action buttons
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    minHeight: 52,
  },
  actionPrimary: {
    backgroundColor: Colors.primary,
    ...Shadows.green,
  },
  actionPrimaryText: {
    color: Colors.white,
    fontWeight: Typography.weights.semibold,
    fontSize: Typography.sizes.base,
  },
  actionSecondary: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  actionSecondaryText: {
    color: Colors.primary,
    fontWeight: Typography.weights.semibold,
    fontSize: Typography.sizes.base,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  iconActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 48,
  },
  iconActionText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.medium,
  },
  favActiveText: {
    color: '#F59E0B',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },

  // Separator
  customizeSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  separatorLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
  },
  separatorText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  // Dot style cards
  dotStyleGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  dotStyleCard: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: 4,
    position: 'relative',
  },
  dotStyleCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLighter,
  },
  dotStyleLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.textSecondary,
  },
  dotStyleLabelActive: {
    color: Colors.primaryDark,
  },
  dotStyleDesc: {
    fontSize: Typography.sizes.xs,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 14,
  },
  dotStyleCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
  },

  // Color rows
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  colorPreviewGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
  },
  colorSwatchBorder: {
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  colorHex: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  colorHint: {
    fontSize: Typography.sizes.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  changeColorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLighter,
  },
  changeColorText: {
    fontSize: Typography.sizes.sm,
    color: Colors.primary,
    fontWeight: Typography.weights.semibold,
  },
  presetsLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: Spacing.sm,
  },
  quickPresets: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  quickSwatch: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
  },
  quickSwatchLight: {
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  quickSwatchActive: {
    transform: [{ scale: 1.15 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },

  // Logo
  logoPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  logoThumbWrap: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  logoThumb: {
    width: '100%',
    height: '100%',
  },
  logoInfo: {
    flex: 1,
  },
  logoInfoTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  logoInfoSub: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  logoActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  logoBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  logoBtnSecondary: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLighter,
  },
  logoBtnDanger: {
    borderColor: Colors.error,
    backgroundColor: Colors.errorLight,
  },
  logoPickerArea: {
    width: '100%',
  },
  logoDashedBorder: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  logoPickerTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  logoPickerSub: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  logoPickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    marginTop: Spacing.sm,
    ...Shadows.green,
  },
  logoPickBtnText: {
    color: Colors.white,
    fontWeight: Typography.weights.semibold,
    fontSize: Typography.sizes.sm,
  },

  // Reset
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    minHeight: 48,
  },
  resetText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.medium,
  },
});
