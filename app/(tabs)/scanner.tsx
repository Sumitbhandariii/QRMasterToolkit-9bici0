import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Linking,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { useAppContext } from '@/hooks/useAppContext';
import { adService } from '@/services/adService';
import { useAdManager } from '@/hooks/useAdManager';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCAN_BOX = Math.min(SCREEN_WIDTH * 0.7, 280);

type CameraState = 'idle' | 'preparing' | 'active';

export default function ScannerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addHistoryItem } = useAppContext();
  const { showInterstitial } = useAdManager();

  const [permission, requestPermission] = useCameraPermissions();
  const [cameraFacing, setCameraFacing] = useState<CameraType>('back');
  const [torchOn, setTorchOn] = useState(false);
  // cameraKey forces a full CameraView remount (fixes black/white screen)
  const [cameraKey, setCameraKey] = useState(0);
  const [cameraState, setCameraState] = useState<CameraState>('idle');
  const scannedRef = useRef(false);
  const prepareTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending timers on unmount
  useEffect(() => {
    return () => {
      if (prepareTimerRef.current) clearTimeout(prepareTimerRef.current);
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Small delay gives the tab transition time to finish before activating camera
      scannedRef.current = false;
      setCameraState('preparing');
      prepareTimerRef.current = setTimeout(() => {
        setCameraState('active');
      }, 250);

      return () => {
        if (prepareTimerRef.current) clearTimeout(prepareTimerRef.current);
        setCameraState('idle');
        setTorchOn(false);
      };
    }, [])
  );

  const handleBarcodeScanned = useCallback(
    async ({ data, type }: { data: string; type: string }) => {
      if (scannedRef.current || !data) return;
      scannedRef.current = true;
      // Torch off after scan
      setTorchOn(false);

      try {
        const item = await addHistoryItem({
          type: 'scanned',
          content: data,
          format: type || 'QR_CODE',
          label: data.length > 60 ? data.slice(0, 60) + '...' : data,
        });

        const count = await adService.incrementScanCount();
        if (count % 5 === 0) showInterstitial();

        router.push(`/scan-result?id=${item.id}`);
      } catch {
        router.push(
          `/scan-result?content=${encodeURIComponent(data)}&format=${encodeURIComponent(type || 'QR_CODE')}`
        );
      }
    },
    [addHistoryItem, router, showInterstitial]
  );

  // Camera flip: idle → wait 300ms → update facing + increment key → wait 250ms → active
  const toggleCamera = useCallback(() => {
    if (prepareTimerRef.current) clearTimeout(prepareTimerRef.current);
    setTorchOn(false);
    setCameraState('idle');

    prepareTimerRef.current = setTimeout(() => {
      setCameraFacing(prev => (prev === 'back' ? 'front' : 'back'));
      setCameraKey(prev => prev + 1);
      scannedRef.current = false;
      setCameraState('preparing');

      prepareTimerRef.current = setTimeout(() => {
        setCameraState('active');
      }, 300);
    }, 200);
  }, []);

  // Torch: increment cameraKey to force remount with new enableTorch value.
  // This is the only reliable way to toggle torch on Android with expo-camera.
  const toggleFlash = useCallback(() => {
    if (cameraFacing === 'front') return;
    setTorchOn(prev => {
      const next = !prev;
      // Force remount so Android picks up the new enableTorch value
      setCameraKey(k => k + 1);
      scannedRef.current = false;
      return next;
    });
  }, [cameraFacing]);

  const handleRescan = useCallback(() => {
    scannedRef.current = false;
  }, []);

  const requestPerm = useCallback(async () => {
    const result = await requestPermission();
    if (!result.granted) {
      Alert.alert(
        'Camera Permission',
        'Camera access is required for scanning. Please enable it in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
    }
  }, [requestPermission]);

  // ── Permission loading ───────────────────────────────────────────────────────
  if (!permission) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.permContainer, { paddingTop: insets.top + Spacing.xxl }]}>
        <View style={styles.permIconWrap}>
          <MaterialIcons name="videocam-off" size={48} color={Colors.textSecondary} />
        </View>
        <Text style={styles.permTitle}>Camera Access Needed</Text>
        <Text style={styles.permSub}>
          Allow camera access to scan QR codes and barcodes instantly.
        </Text>
        <Pressable style={styles.permBtn} onPress={requestPerm}>
          <Text style={styles.permBtnText}>Allow Camera</Text>
        </Pressable>
        <Pressable style={styles.permSettingsBtn} onPress={() => Linking.openSettings()}>
          <Text style={styles.permSettingsText}>Open Settings</Text>
        </Pressable>
      </View>
    );
  }

  const isFlashActive = torchOn && cameraFacing === 'back';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Text style={styles.headerTitle}>QR Scanner</Text>
        <Pressable
          onPress={() => router.push('/scan-from-phone')}
          style={styles.galleryBtn}
          hitSlop={8}
        >
          <MaterialIcons name="image-search" size={22} color={Colors.white} />
        </Pressable>
      </View>

      {/* Camera — fully replaced on each key change to prevent black/white screens */}
      {cameraState === 'active' ? (
        <CameraView
          key={`camera-${cameraKey}`}
          style={StyleSheet.absoluteFillObject}
          facing={cameraFacing}
          enableTorch={isFlashActive}
          barcodeScannerSettings={{
            barcodeTypes: [
              'qr',
              'pdf417',
              'aztec',
              'ean13',
              'ean8',
              'upc_a',
              'upc_e',
              'code39',
              'code93',
              'code128',
              'codabar',
              'interleaved2of5',
              'itf14',
              'datamatrix',
            ],
          }}
          onBarcodeScanned={handleBarcodeScanned}
        />
      ) : (
        <View style={styles.cameraPlaceholder}>
          {cameraState === 'preparing' ? (
            <ActivityIndicator size="large" color={Colors.primary} />
          ) : null}
        </View>
      )}

      {/* Dark overlay */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <View style={styles.overlayTop} />
        <View style={styles.overlayMiddle}>
          <View style={styles.overlaySide} />
          <View style={[styles.scanBox, { width: SCAN_BOX, height: SCAN_BOX }]}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <View style={styles.overlaySide} />
        </View>
        <View style={styles.overlayBottom} />
      </View>

      {/* Scan hint */}
      <View style={styles.hintContainer} pointerEvents="none">
        <View style={styles.hintBadge}>
          <MaterialIcons name="qr-code-scanner" size={14} color={Colors.primary} />
          <Text style={styles.hintText}>
            {cameraState !== 'active'
              ? 'Initializing camera...'
              : 'Point camera at a QR code or barcode'}
          </Text>
        </View>
      </View>

      {/* Controls */}
      <View
        style={[
          styles.controls,
          { paddingBottom: Math.max(insets.bottom, Spacing.base) + Spacing.xl },
        ]}
      >
        {/* Flash */}
        <Pressable
          style={[styles.controlBtn, isFlashActive && styles.controlBtnActive]}
          onPress={toggleFlash}
          hitSlop={8}
          disabled={cameraFacing === 'front'}
        >
          <MaterialIcons
            name={isFlashActive ? 'flash-on' : 'flash-off'}
            size={24}
            color={
              cameraFacing === 'front'
                ? Colors.textTertiary
                : isFlashActive
                ? Colors.primary
                : Colors.white
            }
          />
          <Text
            style={[styles.controlLabel, isFlashActive && { color: Colors.primary }]}
          >
            Flash
          </Text>
        </Pressable>

        {/* Rescan */}
        <Pressable style={styles.rescanBtn} onPress={handleRescan} hitSlop={8}>
          <View style={styles.rescanBtnInner}>
            <MaterialIcons name="refresh" size={28} color={Colors.white} />
          </View>
          <Text style={styles.controlLabel}>Rescan</Text>
        </Pressable>

        {/* Flip Camera */}
        <Pressable
          style={styles.controlBtn}
          onPress={toggleCamera}
          hitSlop={8}
          disabled={cameraState !== 'active'}
        >
          <MaterialIcons
            name="flip-camera-android"
            size={24}
            color={cameraState !== 'active' ? Colors.textTertiary : Colors.white}
          />
          <Text style={styles.controlLabel}>Flip</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  cameraPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
  },
  permContainer: {
    flex: 1,
    backgroundColor: Colors.white,
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.base,
  },
  permIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  permTitle: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    textAlign: 'center',
  },
  permSub: {
    fontSize: Typography.sizes.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  permBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    borderRadius: Radius.lg,
    marginTop: Spacing.base,
    minWidth: 200,
    alignItems: 'center',
  },
  permBtnText: {
    color: Colors.white,
    fontWeight: Typography.weights.semibold,
    fontSize: Typography.sizes.base,
  },
  permSettingsBtn: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    minWidth: 200,
    alignItems: 'center',
  },
  permSettingsText: {
    color: Colors.primary,
    fontWeight: Typography.weights.medium,
    fontSize: Typography.sizes.base,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  headerTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },
  galleryBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  overlayMiddle: { flexDirection: 'row', height: SCAN_BOX },
  overlaySide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  overlayBottom: { flex: 1.2, backgroundColor: 'rgba(0,0,0,0.55)' },
  scanBox: { borderRadius: 4, position: 'relative' },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: Colors.primary,
  },
  cornerTL: {
    top: 0, left: 0,
    borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 0, right: 0,
    borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 0, left: 0,
    borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 0, right: 0,
    borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 4,
  },
  hintContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    top: '62%',
  },
  hintBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  hintText: {
    color: Colors.white,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: Spacing.xl,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  controlBtn: {
    alignItems: 'center',
    gap: 6,
    minWidth: 64,
    minHeight: 64,
    justifyContent: 'center',
    borderRadius: Radius.lg,
  },
  controlBtnActive: {
    backgroundColor: 'rgba(34,197,94,0.18)',
  },
  controlLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  rescanBtn: {
    alignItems: 'center',
    gap: 6,
  },
  rescanBtnInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34,197,94,0.15)',
  },
});
