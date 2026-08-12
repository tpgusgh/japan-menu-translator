import { useEffect } from 'react';
import { View, Text } from 'react-native';

export function DownloadScreen({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    onReady();
  }, [onReady]);

  return (
    <View>
      <Text>준비 중...</Text>
    </View>
  );
}
