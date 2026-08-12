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
          const boxHeight = item.boundingBox.height * scale;
          const boxWidth = item.boundingBox.width * scale;

          if (item.orientation === 'vertical') {
            // Original reads top-to-bottom in a narrow column; stack the translation
            // the same way (one character per line, upright -- Hangul syllable blocks
            // don't need rotating like Latin would) immediately to its left, matching
            // right-to-left column order.
            const charSize = Math.max(8, Math.min(boxWidth * 0.9, 16));
            return (
              <View
                key={item.id}
                style={[
                  styles.verticalLabel,
                  {
                    left: item.boundingBox.x * scale - charSize * 1.4,
                    top: item.boundingBox.y * scale,
                  },
                ]}
              >
                {[...item.translated].map((ch, i) => (
                  <Text key={i} style={[styles.verticalChar, { fontSize: charSize, lineHeight: charSize * 1.15 }]}>
                    {ch}
                  </Text>
                ))}
              </View>
            );
          }

          // ponytail: fixed offset below the original line; dense menus with tight
          // line spacing can still overlap the next line's Japanese text.
          const fontSize = Math.max(8, Math.min(boxHeight * 0.6, 14));

          return (
            <Text
              key={item.id}
              style={[
                styles.label,
                {
                  left: item.boundingBox.x * scale,
                  top: item.boundingBox.y * scale + boxHeight + 1,
                  maxWidth: boxWidth * 1.6,
                  fontSize,
                  lineHeight: fontSize * 1.2,
                },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {item.translated}
            </Text>
          );
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '100%' },
  image: { width: '100%' },
  label: {
    position: 'absolute',
    color: colors.primary,
    fontWeight: '700',
    backgroundColor: 'rgba(255,255,255,0.82)',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 3,
    overflow: 'hidden',
  },
  verticalLabel: {
    position: 'absolute',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.82)',
    paddingHorizontal: 1,
    paddingVertical: 2,
    borderRadius: 3,
  },
  verticalChar: {
    color: colors.primary,
    fontWeight: '700',
    textAlign: 'center',
  },
});
