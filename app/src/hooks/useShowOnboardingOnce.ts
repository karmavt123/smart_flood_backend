import { router } from 'expo-router';
import { useEffect } from 'react';

import { hasSeenOnboarding } from '@/storage/onboardingStorage';

/** LẦN ĐẦU MỞ APP → chuyển sang màn Giới thiệu (FR-01). Những lần sau không hiện nữa. */
export function useShowOnboardingOnce() {
  useEffect(() => {
    hasSeenOnboarding().then((seen) => {
      if (!seen) router.replace('/onboarding');
    });
  }, []);
}
