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
        items.map((item) => {
          const boxWidth = item.boundingBox.width * scale;
          const boxHeight = item.boundingBox.height * scale;
          const fontSize = Math.max(9, Math.min(boxHeight * 0.72, 26));

          return (
            <View
              key={item.id}
              style={[
                styles.cover,
                {
                  left: item.boundingBox.x * scale,
                  top: item.boundingBox.y * scale,
                  minWidth: boxWidth,
                  minHeight: boxHeight,
                  maxWidth: boxWidth * 1.6,
                },
              ]}
            >
              <Text
                style={[styles.coverText, { fontSize, lineHeight: fontSize * 1.15 }]}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.4}
              >
                {item.translated}
              </Text>
            </View>
          );
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '100%' },
  image: { width: '100%' },
  cover: {
    position: 'absolute',
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    borderRadius: 2,
  },
  coverText: { color: colors.ink, fontWeight: '700', textAlign: 'center' },
});
