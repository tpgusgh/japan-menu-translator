import { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Button, Text, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { recognizeText } from '../lib/ocr';
import { translate } from '../lib/translate';
import { getPronunciation } from '../lib/pronounce';
import { fetchSummary } from '../lib/wikipedia';
import { PhotoOverlay } from '../components/PhotoOverlay';
import { MenuList } from '../components/MenuList';
import type { MenuItem } from '../types';

type Status = 'idle' | 'processing' | 'noText' | 'error';

export function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [status, setStatus] = useState<Status>('idle');

  const reset = useCallback(() => {
    setPhotoUri(null);
    setItems([]);
    setStatus('idle');
  }, []);

  const capture = useCallback(async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 1, skipProcessing: false });
      if (!photo) return;

      setPhotoUri(photo.uri);
      setItems([]);
      setStatus('processing');

      const lines = await recognizeText(photo.uri);
      if (lines.length === 0) {
        setStatus('noText');
        return;
      }

      const menuItems = await Promise.all(
        lines.map(async (line, index) => {
          const [translated, pronunciation] = await Promise.all([
            translate(line.text, 'ja', 'ko'),
            getPronunciation(line.text),
          ]);
          const item: MenuItem = {
            id: `${index}-${line.text}`,
            original: line.text,
            translated,
            pronunciation,
            boundingBox: line.boundingBox,
            description: null,
            descriptionState: 'idle',
          };
          return item;
        })
      );

      setItems(menuItems);
      setStatus('idle');
    } catch (e) {
      console.warn(e);
      setStatus('error');
    }
  }, []);

  const updateItem = useCallback((id: string, patch: Partial<MenuItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const handleShowDescription = useCallback(
    async (id: string) => {
      updateItem(id, { descriptionState: 'loading' });
      const item = items.find((i) => i.id === id);
      if (!item) return;
      const summary = await fetchSummary(item.translated);
      updateItem(id, { description: summary, descriptionState: summary ? 'loaded' : 'unavailable' });
    },
    [items, updateItem]
  );

  if (!permission) {
    return <View style={styles.center} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>카메라 권한이 필요합니다.</Text>
        <Button title="권한 요청" onPress={requestPermission} />
      </View>
    );
  }

  if (!photoUri) {
    return (
      <View style={styles.container}>
        <CameraView ref={cameraRef} style={styles.camera} zoom={zoom} />
        <View style={styles.zoomRow}>
          <Button title="축소 −" onPress={() => setZoom((z) => Math.max(0, z - 0.15))} />
          <Text style={styles.zoomLabel}>확대: {Math.round(zoom * 100)}%</Text>
          <Button title="확대 +" onPress={() => setZoom((z) => Math.min(1, z + 0.15))} />
        </View>
        <Text style={styles.hint}>글씨가 작게 보이면 확대 후 메뉴 1~2개가 크게 나오도록 가까이서 촬영하세요.</Text>
        <Button title="촬영" onPress={capture} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <PhotoOverlay uri={photoUri} items={items} />
      {status === 'processing' && <Text style={styles.text}>분석 중...</Text>}
      {status === 'noText' && <Text style={styles.text}>텍스트를 찾지 못했습니다. 다시 촬영해주세요.</Text>}
      {status === 'error' && <Text style={styles.text}>처리 중 오류가 발생했습니다. 다시 촬영해주세요.</Text>}
      <MenuList items={items} onShowDescription={handleShowDescription} />
      <Button title="다시 촬영" onPress={reset} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  text: { fontSize: 16, textAlign: 'center', padding: 12 },
  zoomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 8, gap: 8 },
  zoomLabel: { fontSize: 14, color: '#333' },
  hint: { fontSize: 12, color: '#666', textAlign: 'center', paddingHorizontal: 12, paddingBottom: 4 },
});
