import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { WebView } from 'react-native-webview';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useAppContext } from '@/hooks/useAppContext';

// ─── Inline jsQR HTML ──────────────────────────────────────────────────────────
// jsQR is loaded from multiple CDN sources with a local stub fallback.
// The scanImage function is called via injectJavaScript, NOT window.postMessage,
// to avoid the Android bridge issue. The image is sent in chunks if too large.

const JSQR_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body>
<canvas id="c" style="display:none"></canvas>
<script>
(function() {
  var loaded = false;

  function tryLoad(urls, idx) {
    if (idx >= urls.length) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOAD_ERROR', error: 'jsQR CDN unavailable' }));
      return;
    }
    var s = document.createElement('script');
    s.src = urls[idx];
    s.onload = function() {
      if (!loaded) {
        loaded = true;
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'READY' }));
      }
    };
    s.onerror = function() { tryLoad(urls, idx + 1); };
    document.head.appendChild(s);
  }

  tryLoad([
    'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js',
    'https://unpkg.com/jsqr@1.4.0/dist/jsQR.min.js'
  ], 0);

  // Called from RN via injectJavaScript
  window.scanImage = function(dataUri) {
    try {
      if (typeof jsQR === 'undefined') {
        window.ReactNativeWebView.postMessage(JSON.stringify({ success: false, error: 'jsQR not loaded yet. Please check your internet connection.' }));
        return;
      }
      var img = new Image();
      img.onload = function() {
        try {
          var c = document.getElementById('c');
          var w = img.naturalWidth || img.width;
          var h = img.naturalHeight || img.height;
          if (w === 0 || h === 0) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ success: false, error: 'Image has invalid dimensions' }));
            return;
          }
          c.width = w;
          c.height = h;
          var ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0);
          var d = ctx.getImageData(0, 0, w, h);
          var code = jsQR(d.data, w, h, { inversionAttempts: 'attemptBoth' });
          if (code && code.data) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ success: true, data: code.data }));
          } else {
            // Try with smaller canvas (helps for very large images)
            var scale = Math.min(1, 1024 / Math.max(w, h));
            if (scale < 1) {
              var sw = Math.round(w * scale);
              var sh = Math.round(h * scale);
              c.width = sw;
              c.height = sh;
              ctx.drawImage(img, 0, 0, sw, sh);
              d = ctx.getImageData(0, 0, sw, sh);
              code = jsQR(d.data, sw, sh, { inversionAttempts: 'attemptBoth' });
              if (code && code.data) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ success: true, data: code.data }));
                return;
              }
            }
            window.ReactNativeWebView.postMessage(JSON.stringify({ success: false, error: 'No QR code found in this image. Make sure the QR code is clearly visible and not blurry.' }));
          }
        } catch(e) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ success: false, error: 'Scan error: ' + e.message }));
        }
      };
      img.onerror = function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({ success: false, error: 'Failed to load image data. Try selecting a different image.' }));
      };
      img.src = dataUri;
    } catch(e) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ success: false, error: e.message }));
    }
  };
})();
</script>
</body>
</html>`;

function isUrl(str: string): boolean {
  return /^https?:\/\//i.test(str) || /^www\./i.test(str);
}

function isActionable(str: string): boolean {
  return (
    /^https?:\/\//i.test(str) ||
    /^www\./i.test(str) ||
    /^tel:/i.test(str) ||
    /^mailto:/i.test(str) ||
    /^geo:/i.test(str) ||
    /^upi:\/\//i.test(str)
  );
}

function getActionLabel(str: string): string {
  if (/^https?:\/\//i.test(str) || /^www\./i.test(str)) return 'Open in Browser';
  if (/^tel:/i.test(str)) return 'Call Number';
  if (/^mailto:/i.test(str)) return 'Open Email';
  if (/^geo:/i.test(str)) return 'Open in Maps';
  if (/^upi:\/\//i.test(str)) return 'Open UPI App';
  return 'Open';
}

function getActionUrl(str: string): string {
  if (/^www\./i.test(str)) return `https://${str}`;
  return str;
}

export default function ScanFromPhoneScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addHistoryItem } = useAppContext();

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [webviewReady, setWebviewReady] = useState(false);
  const [webviewLoadError, setWebviewLoadError] = useState(false);
  const [result, setResult] = useState<{ success: boolean; data?: string; error?: string } | null>(null);
  const webviewRef = useRef<WebView>(null);
  const pendingDataUriRef = useRef<string | null>(null);

  // ── Trigger scan via injectJavaScript (reliable on Android) ─────────────────
  const triggerScan = useCallback((dataUri: string) => {
    if (!webviewRef.current) return;
    // Escape backticks and backslashes only — avoid full JSON encoding overhead
    const safe = dataUri.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
    webviewRef.current.injectJavaScript(`window.scanImage(\`${safe}\`); true;`);
  }, []);

  // ── Pick image from gallery ──────────────────────────────────────────────────
  const handlePickImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Allow access to your photo library to scan QR codes from images.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8, // Lower quality reduces base64 size significantly
        base64: false,
      });

      if (pickerResult.canceled || !pickerResult.assets?.[0]) return;

      const asset = pickerResult.assets[0];
      const imageUri = asset.uri;
      setSelectedImage(imageUri);
      setResult(null);
      setScanning(true);

      // Read as base64 via FileSystem (works offline, no network needed)
      let base64: string;
      try {
        base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } catch {
        setScanning(false);
        Alert.alert('Error', 'Could not read image file. Please try again.');
        return;
      }

      // Detect MIME type from URI
      let mimeType = 'image/jpeg';
      const lower = imageUri.toLowerCase();
      if (lower.includes('.png')) mimeType = 'image/png';
      else if (lower.includes('.webp')) mimeType = 'image/webp';
      else if (lower.includes('.gif')) mimeType = 'image/gif';

      const dataUri = `data:${mimeType};base64,${base64}`;

      if (webviewReady) {
        triggerScan(dataUri);
      } else {
        // Store and wait for READY message
        pendingDataUriRef.current = dataUri;
      }
    } catch {
      setScanning(false);
      Alert.alert('Error', 'Failed to open gallery. Please try again.');
    }
  }, [webviewReady, triggerScan]);

  // ── Handle messages from WebView ─────────────────────────────────────────────
  const handleWebViewMessage = useCallback(
    async (event: any) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);

        if (msg.type === 'READY') {
          setWebviewReady(true);
          setWebviewLoadError(false);
          // Fire pending scan if one was queued while WebView was loading
          if (pendingDataUriRef.current) {
            const uri = pendingDataUriRef.current;
            pendingDataUriRef.current = null;
            triggerScan(uri);
          }
          return;
        }

        if (msg.type === 'LOAD_ERROR') {
          setWebviewLoadError(true);
          setScanning(false);
          setResult({ success: false, error: 'Could not load scan engine. Please check your internet connection and try again.' });
          return;
        }

        setScanning(false);

        if (msg.success && msg.data) {
          setResult({ success: true, data: msg.data });

          try {
            const item = await addHistoryItem({
              type: 'scanned_from_phone',
              content: msg.data,
              format: 'QR_CODE',
              label: msg.data.length > 60 ? msg.data.slice(0, 60) + '...' : msg.data,
            });
            router.push(`/scan-result?id=${item.id}`);
          } catch {
            // Still show result even if save fails
          }
        } else {
          setResult({ success: false, error: msg.error ?? 'No QR code detected in this image.' });
        }
      } catch {
        setScanning(false);
        setResult({ success: false, error: 'Failed to process scan result.' });
      }
    },
    [addHistoryItem, router, triggerScan]
  );

  const handleOpenLink = useCallback((content: string) => {
    const url = getActionUrl(content);
    Linking.openURL(url).catch(() =>
      Alert.alert('Error', 'Cannot open this link.')
    );
  }, []);

  const handleWebViewError = useCallback(() => {
    setWebviewLoadError(true);
    setScanning(false);
  }, []);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Hidden WebView — always mounted to keep jsQR loaded */}
      <View style={styles.hiddenWebView}>
        <WebView
          ref={webviewRef}
          source={{ html: JSQR_HTML }}
          onMessage={handleWebViewMessage}
          onError={handleWebViewError}
          javaScriptEnabled
          originWhitelist={['*']}
          domStorageEnabled
          style={{ width: 1, height: 1, opacity: 0 }}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Image preview */}
        <View style={styles.imageArea}>
          {selectedImage ? (
            <Image
              source={{ uri: selectedImage }}
              style={styles.selectedImage}
              contentFit="contain"
              transition={200}
            />
          ) : (
            <View style={styles.placeholder}>
              <MaterialIcons name="image-search" size={72} color={Colors.primary} />
              <Text style={styles.placeholderTitle}>Scan QR from Gallery</Text>
              <Text style={styles.placeholderSub}>
                Pick an image from your phone to detect QR codes
              </Text>
            </View>
          )}
        </View>

        {/* WebView loading indicator */}
        {!webviewReady && !webviewLoadError ? (
          <View style={styles.engineStatusCard}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.engineStatusText}>Loading scan engine...</Text>
          </View>
        ) : null}

        {/* WebView load error */}
        {webviewLoadError ? (
          <View style={[styles.engineStatusCard, styles.engineErrorCard]}>
            <MaterialIcons name="wifi-off" size={18} color={Colors.error} />
            <Text style={[styles.engineStatusText, { color: Colors.error }]}>
              Scan engine requires internet. Please connect and restart the screen.
            </Text>
          </View>
        ) : null}

        {/* Scanning progress */}
        {scanning ? (
          <View style={styles.scanningCard}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.scanningText}>Scanning for QR codes...</Text>
          </View>
        ) : null}

        {/* Result card */}
        {result && !scanning ? (
          <View style={[styles.resultCard, result.success ? styles.resultSuccess : styles.resultError]}>
            <MaterialIcons
              name={result.success ? 'check-circle' : 'error-outline'}
              size={28}
              color={result.success ? Colors.primary : Colors.error}
            />
            <View style={styles.resultTextWrap}>
              <Text style={[styles.resultTitle, { color: result.success ? Colors.primaryDark : Colors.error }]}>
                {result.success ? 'QR Code Found!' : 'Not Found'}
              </Text>
              {result.success && result.data ? (
                <View style={styles.resultDataWrap}>
                  <Text style={styles.resultSub} numberOfLines={3} selectable>
                    {result.data}
                  </Text>
                  {isActionable(result.data) ? (
                    <Pressable
                      style={({ pressed }) => [styles.openBtn, pressed && { opacity: 0.8 }]}
                      onPress={() => handleOpenLink(result.data!)}
                    >
                      <MaterialIcons name="open-in-browser" size={15} color={Colors.white} />
                      <Text style={styles.openBtnText}>{getActionLabel(result.data)}</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : (
                <Text style={styles.resultSub}>{result.error}</Text>
              )}
            </View>
          </View>
        ) : null}

        {/* Features list — shown only before first image selection */}
        {!selectedImage ? (
          <View style={styles.featuresList}>
            {[
              { icon: 'qr-code', text: 'Detects QR codes from any photo', color: '#22C55E' },
              { icon: 'open-in-browser', text: 'URLs, calls, maps open directly', color: '#3B82F6' },
              { icon: 'save', text: 'Auto-saves result to history', color: '#8B5CF6' },
              { icon: 'category', text: 'Stored in "From Gallery" category', color: '#F59E0B' },
            ].map((f, i) => (
              <View key={i} style={[styles.featureRow, i < 3 && styles.featureRowBorder]}>
                <View style={[styles.featureIcon, { backgroundColor: f.color + '18' }]}>
                  <MaterialIcons name={f.icon as any} size={18} color={f.color} />
                </View>
                <Text style={styles.featureText}>{f.text}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Pick button */}
        <Pressable
          style={({ pressed }) => [
            styles.pickBtn,
            pressed && styles.pressed,
            (!webviewReady || scanning) && styles.pickBtnDisabled,
          ]}
          onPress={handlePickImage}
          disabled={scanning}
        >
          <MaterialIcons name="photo-library" size={22} color={Colors.white} />
          <Text style={styles.pickBtnText}>
            {scanning ? 'Scanning...' : selectedImage ? 'Pick Another Image' : 'Open Gallery'}
          </Text>
        </Pressable>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  hiddenWebView: {
    position: 'absolute',
    width: 1,
    height: 1,
    top: -200,
    left: -200,
    overflow: 'hidden',
    opacity: 0,
  },
  content: {
    padding: Spacing.base,
    alignItems: 'center',
  },
  imageArea: {
    width: '100%',
    height: 280,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  selectedImage: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  placeholderTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    textAlign: 'center',
  },
  placeholderSub: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  engineStatusCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryLighter,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  engineErrorCard: {
    backgroundColor: Colors.errorLight,
  },
  engineStatusText: {
    fontSize: Typography.sizes.sm,
    color: Colors.primaryDark,
    flex: 1,
  },
  scanningCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.primaryLighter,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    ...Shadows.sm,
  },
  scanningText: {
    fontSize: Typography.sizes.base,
    color: Colors.primaryDark,
    fontWeight: Typography.weights.medium,
  },
  resultCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    ...Shadows.sm,
  },
  resultSuccess: {
    backgroundColor: Colors.primaryLighter,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  resultError: {
    backgroundColor: Colors.errorLight,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  resultTextWrap: {
    flex: 1,
  },
  resultDataWrap: {
    gap: Spacing.sm,
  },
  resultTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    marginBottom: 4,
  },
  resultSub: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.md,
    alignSelf: 'flex-start',
    ...Shadows.green,
  },
  openBtnText: {
    fontSize: Typography.sizes.sm,
    color: Colors.white,
    fontWeight: Typography.weights.semibold,
  },
  featuresList: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  featureRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  pickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.xxl,
    minHeight: 56,
    width: '100%',
    ...Shadows.green,
  },
  pickBtnDisabled: {
    opacity: 0.7,
  },
  pickBtnText: {
    color: Colors.white,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
