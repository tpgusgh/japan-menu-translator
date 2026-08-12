import { useEffect, useState } from 'react';
import { View, Image, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import type { MenuItem } from '../types';
import { colors, radius } from '../theme';

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
        items.map((item) => (
          <View
            key={item.id}
            style={[
              styles.bubble,
              {
                left: item.boundingBox.x * scale,
                top: item.boundingBox.y * scale,
                maxWidth: item.boundingBox.width * scale + 40,
              },
            ]}
          >
            <Text style={styles.original}>{item.original}</Text>
            <Text style={styles.translated}>{item.translated}</Text>
            <Text style={styles.pronunciation}>{item.pronunciation}</Text>
          </View>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '100%' },
  image: { width: '100%' },
  bubble: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: radius.sm,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  original: { fontSize: 10, textDecorationLine: 'line-through', color: colors.original },
  translated: { fontSize: 14, fontWeight: '700', color: colors.ink },
  pronunciation: { fontSize: 11, color: colors.pronunciation, fontWeight: '600' },
});
