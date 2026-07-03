// App Configuration
export const APP_CONFIG = {
  name: 'QR Master Toolkit',
  version: '1.0.0',
  scanCountBeforeInterstitial: 3,
  generateCountBeforeInterstitial: 3,
};

// AdMob Configuration
// Test Ad IDs are used by default - replace with real IDs for production
export const ADMOB_CONFIG = {
  // App IDs
  androidAppId: 'ca-app-pub-3940256099942544~3347511713', // Test App ID

  // Banner Ad Unit IDs
  bannerAdUnitId: 'ca-app-pub-3940256099942544/6300978111', // Test Banner

  // Interstitial Ad Unit IDs
  interstitialAdUnitId: 'ca-app-pub-3940256099942544/1033173712', // Test Interstitial

  // Rewarded Ad Unit IDs
  rewardedAdUnitId: 'ca-app-pub-3940256099942544/5224354917', // Test Rewarded

  // Set to false to use real ads (replace IDs above first)
  useTestAds: true,
};

export const STORAGE_KEYS = {
  history: '@qrmaster_history',
  favorites: '@qrmaster_favorites',
  onboardingComplete: '@qrmaster_onboarding',
  scanCount: '@qrmaster_scan_count',
  generateCount: '@qrmaster_generate_count',
};
