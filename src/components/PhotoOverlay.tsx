import { useEffect, useState } from 'react';
import { View, Image, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import type { MenuItem } from '../types';
import { colors } from '../theme';

export function PhotoOverlay({ uri, items }: { uri: string; items: MenuItem[] }) {
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [displayWidth, setDisplayWidth] = useState<number | null>(null);

  useEffect(() => {
    Image.getSize(uri, (width, height) => setNaturalSize({ width, height }));
  }, [uri]);

  const handleLayout = (event: LayoutChangeEvent) => {
    setDisplayWidth(event.nativeEvent.layout.width);
  };

  const scale = naturalSize && displayWidth ? displayWidth / naturalSize.width : 1;

  return (
    <View style={styles.wrapper} onLayout={handleLayout}>
      <Image
        source={{ uri }}
        style={[styles.image, naturalSize ? { aspectRatio: naturalSize.width / naturalSize.height } : null]}
        resizeMode="contain"
      />
      {naturalSize &&
        displayWidth &&
        items.map((item, index) => (
          <View
            key={item.id}
            style={[
              styles.marker,
              {
                left: item.boundingBox.x * scale + (item.boundingBox.width * scale) / 2 - 12,
                top: item.boundingBox.y * scale + (item.boundingBox.height * scale) / 2 - 12,
              },
            ]}
          >
            <Text style={styles.markerText}>{index + 1}</Text>
          </View>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '100%' },
  image: { width: '100%' },
  marker: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  markerText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
