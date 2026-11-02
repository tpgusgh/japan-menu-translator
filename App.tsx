import { useEffect } from 'react';
import { useWindowDimensions } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';

// Android 16 ignores manifest orientation locks on large screens (>=600dp), and Play
// flags the lock. So the manifest is unlocked and phones are pinned to portrait here;
// tablets/foldables are left free to rotate/resize.
const LARGE_SCREEN_DP = 600;

export default function App() {
  const { width, height } = useWindowDimensions();
  const isLargeScreen = Math.min(width, height) >= LARGE_SCREEN_DP;

  useEffect(() => {
    const apply = isLargeScreen
      ? ScreenOrientation.unlockAsync()
      : ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    apply.catch((e) => console.warn('orientation lock failed', e));
  }, [isLargeScreen]);

  return (
    <SafeAreaProvider>
      <RootNavigator />
    </SafeAreaProvider>
  );
}
