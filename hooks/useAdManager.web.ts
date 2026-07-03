import { useCallback } from 'react';

export function useAdManager() {
  const showInterstitial = useCallback(async () => {}, []);
  const showRewarded = useCallback((onReward: (amount: number) => void) => { onReward(1); }, []);
  const trackScan = useCallback(async () => {}, []);
  const trackGeneration = useCallback(async () => {}, []);
  const loadInterstitial = useCallback(() => {}, []);
  const loadRewarded = useCallback(() => {}, []);

  return {
    interstitialLoaded: false,
    rewardedLoaded: false,
    showInterstitial,
    showRewarded,
    trackScan,
    trackGeneration,
    loadInterstitial,
    loadRewarded,
  };
}
