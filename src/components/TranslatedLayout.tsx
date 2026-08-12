import { useEffect, useState } from 'react';
import { View, Image, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import type { MenuItem } from '../types';
import { colors } from '../theme';

export function TranslatedLayout({ uri, items }: { uri: string; items: MenuItem[] }) {
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [canvasWidth, setCanvasWidth] = useState<number | null>(null);

  useEffect(() => {
    Image.getSize(uri, (width, height) => setNaturalSize({ width, height }));
  }, [uri]);

  const handleLayout = (event: LayoutChangeEvent) => {
    setCanvasWidth(event.nativeEvent.layout.width);
  };

  if (items.length === 0) return null;

  const scale = naturalSize && canvasWidth ? canvasWidth / naturalSize.width : 1;

  return (
    <View
      style={[styles.canvas, naturalSize ? { aspectRatio: naturalSize.width / naturalSize.height } : null]}
      onLayout={handleLayout}
    >
      {naturalSize &&
        canvasWidth &&
        items.map((item) => {
          const boxHeight = item.boundingBox.height * scale;
          const boxWidth = item.boundingBox.width * scale;
          const nameSize = Math.max(9, Math.min(boxHeight * 0.55, 22));
          const subSize = Math.max(7, nameSize * 0.62);
          const maxWidth = boxWidth * 1.9;

          return (
            <View
              key={item.id}
              style={[
                styles.itemBlock,
                { left: item.boundingBox.x * scale, top: item.boundingBox.y * scale, maxWidth },
              ]}
            >
              <View style={styles.nameRow}>
                <Text
                  style={[styles.original, { fontSize: nameSize }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.5}
                >
                  {item.original}
                </Text>
                {item.price && <Text style={[styles.price, { fontSize: subSize }]}>{item.price}</Text>}
              </View>
              <View style={styles.subRow}>
                <Text
                  style={[styles.pronunciation, { fontSize: subSize }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.5}
                >
                  {item.pronunciation}
                </Text>
                <Text
                  style={[styles.translated, { fontSize: subSize }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.5}
                >
                  {item.translated}
                </Text>
              </View>
            </View>
          );
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    width: '100%',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemBlock: {
    position: 'absolute',
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  subRow: {
    flexDirection: 'row',
    gap: 8,
  },
  original: {
    color: colors.ink,
    fontWeight: '700',
  },
  price: {
    color: colors.inkMuted,
    fontWeight: '600',
  },
  pronunciation: {
    color: colors.pronunciation,
    fontWeight: '600',
  },
  translated: {
    color: colors.primary,
    fontWeight: '700',
    flexShrink: 1,
  },
});
