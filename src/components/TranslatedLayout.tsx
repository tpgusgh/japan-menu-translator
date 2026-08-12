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
          const fontSize = Math.max(9, Math.min(boxHeight * 0.72, 26));

          return (
            <Text
              key={item.id}
              style={[
                styles.label,
                {
                  left: item.boundingBox.x * scale,
                  top: item.boundingBox.y * scale,
                  maxWidth: boxWidth * 1.7,
                  fontSize,
                  lineHeight: fontSize * 1.15,
                },
              ]}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.4}
            >
              {item.translated}
            </Text>
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
  label: {
    position: 'absolute',
    color: colors.ink,
    fontWeight: '700',
  },
});
