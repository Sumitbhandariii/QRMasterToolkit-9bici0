import { useState, useCallback, useRef } from 'react';

// react-native-google-mobile-ads requires a custom native build (EAS Build / bare workflow).
// This stub provides the same API surface so the rest of the app compiles and runs without crashes.
// To enable real ads: do an EAS Build and uncomment the real implementation.

export function useAdManager() {
  const [interstitialLoaded] = useState(false);
  const [rewardedLoaded] = useState(false);
  const scanCountRef = useRef(0);
  const genCountRef = useRef(0);

  const showInterstitial = useCallback(async () => {
    // no-op until EAS Build with real AdMob native module
  }, []);

  const showRewarded = useCallback((onReward: (amount: number) => void) => {
    // Grant reward immediately as fallback
    onReward(1);
  }, []);

  const trackScan = useCallback(async () => {
    scanCountRef.current += 1;
    // Show interstitial every 5 scans (will become active in EAS build)
  }, []);

  const trackGeneration = useCallback(async () => {
    genCountRef.current += 1;
    // Show interstitial every 5 generations (will become active in EAS build)
  }, []);

  const loadInterstitial = useCallback(() => {}, []);
  const loadRewarded = useCallback(() => {}, []);

  return {
    interstitialLoaded,
    rewardedLoaded,
    showInterstitial,
    showRewarded,
    trackScan,
    trackGeneration,
    loadInterstitial,
    loadRewarded,
  };
}
