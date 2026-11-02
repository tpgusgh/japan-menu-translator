import { useEffect, useRef, useState } from 'react';
import { View, PanResponder, StyleSheet } from 'react-native';
import { colors } from '../theme';

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

type Corner = 'tl' | 'tr' | 'bl' | 'br';

const MIN_SIZE = 60;
const HANDLE_SIZE = 28;

function initialBox(imageRect: CropRect): CropRect {
  const width = imageRect.width * 0.7;
  const height = imageRect.height * 0.7;
  return {
    x: imageRect.x + (imageRect.width - width) / 2,
    y: imageRect.y + (imageRect.height - height) / 2,
    width,
    height,
  };
}

function clampBox(box: CropRect, imageRect: CropRect): CropRect {
  const width = Math.max(MIN_SIZE, Math.min(box.width, imageRect.width));
  const height = Math.max(MIN_SIZE, Math.min(box.height, imageRect.height));
  const x = Math.max(imageRect.x, Math.min(box.x, imageRect.x + imageRect.width - width));
  const y = Math.max(imageRect.y, Math.min(box.y, imageRect.y + imageRect.height - height));
  return { x, y, width, height };
}

// ponytail: drag/resize via RN's built-in PanResponder instead of adding
// react-native-gesture-handler + reanimated just for a box with 4 handles.
export function CropSelector({ imageRect, onChange }: { imageRect: CropRect; onChange: (box: CropRect) => void }) {
  const [box, setBox] = useState<CropRect>(() => initialBox(imageRect));
  const boxRef = useRef(box);
  boxRef.current = box;
  const startBox = useRef<CropRect>(box);

  useEffect(() => {
    const next = clampBox(initialBox(imageRect), imageRect);
    setBox(next);
    onChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageRect.x, imageRect.y, imageRect.width, imageRect.height]);

  const update = (next: CropRect) => {
    const clamped = clampBox(next, imageRect);
    setBox(clamped);
    onChange(clamped);
  };

  const movePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startBox.current = boxRef.current;
      },
      onPanResponderMove: (_, g) => {
        update({ ...startBox.current, x: startBox.current.x + g.dx, y: startBox.current.y + g.dy });
      },
    })
  ).current;

  const cornerResponders = useRef(
    (['tl', 'tr', 'bl', 'br'] as Corner[]).reduce(
      (acc, corner) => {
        acc[corner] = PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onPanResponderGrant: () => {
            startBox.current = boxRef.current;
          },
          onPanResponderMove: (_, g) => {
            const s = startBox.current;
            const next: CropRect =
              corner === 'tl'
                ? { x: s.x + g.dx, y: s.y + g.dy, width: s.width - g.dx, height: s.height - g.dy }
                : corner === 'tr'
                  ? { x: s.x, y: s.y + g.dy, width: s.width + g.dx, height: s.height - g.dy }
                  : corner === 'bl'
                    ? { x: s.x + g.dx, y: s.y, width: s.width - g.dx, height: s.height + g.dy }
                    : { x: s.x, y: s.y, width: s.width + g.dx, height: s.height + g.dy };
            update(next);
          },
        });
        return acc;
      },
      {} as Record<Corner, ReturnType<typeof PanResponder.create>>
    )
  ).current;

  return (
    <View style={[styles.box, { left: box.x, top: box.y, width: box.width, height: box.height }]} {...movePanResponder.panHandlers}>
      <View style={[styles.gridLine, styles.gridV, { left: '33.33%' }]} />
      <View style={[styles.gridLine, styles.gridV, { left: '66.66%' }]} />
      <View style={[styles.gridLine, styles.gridH, { top: '33.33%' }]} />
      <View style={[styles.gridLine, styles.gridH, { top: '66.66%' }]} />
      <View style={[styles.handle, styles.handleTL]} {...cornerResponders.tl.panHandlers} />
      <View style={[styles.handle, styles.handleTR]} {...cornerResponders.tr.panHandlers} />
      <View style={[styles.handle, styles.handleBL]} {...cornerResponders.bl.panHandlers} />
      <View style={[styles.handle, styles.handleBR]} {...cornerResponders.br.panHandlers} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.indigo,
    backgroundColor: 'rgba(91,95,239,0.15)',
  },
  gridLine: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.5)' },
  gridV: { top: 0, bottom: 0, width: 1 },
  gridH: { left: 0, right: 0, height: 1 },
  handle: {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: colors.indigo,
    borderWidth: 3,
    borderColor: '#fff',
  },
  handleTL: { top: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2 },
  handleTR: { top: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2 },
  handleBL: { bottom: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2 },
  handleBR: { bottom: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2 },
});
