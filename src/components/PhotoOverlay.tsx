import { useEffect, useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';

export function PhotoOverlay({ uri }: { uri: string }) {
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    Image.getSize(uri, (width, height) => setNaturalSize({ width, height }));
  }, [uri]);

  return (
    <View style={styles.wrapper}>
      <Image
        source={{ uri }}
        style={[styles.image, naturalSize ? { aspectRatio: naturalSize.width / naturalSize.height } : null]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '100%' },
  image: { width: '100%' },
});
