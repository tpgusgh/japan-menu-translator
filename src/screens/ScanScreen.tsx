import { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Pressable, Text, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { recognizeText } from '../lib/ocr';
import { translate, type TranslateMode } from '../lib/translate';
import { getPronunciation } from '../lib/pronounce';
import { fetchSummary } from '../lib/wikipedia';
import { lookupFoodTerm } from '../lib/food-dictionary';
import { PhotoOverlay } from '../components/PhotoOverlay';
import { TranslatedLayout } from '../components/TranslatedLayout';
import { MenuList } from '../components/MenuList';
import { PrimaryButton } from '../components/PrimaryButton';
import type { MenuItem } from '../types';
import { colors, type, radius } from '../theme';

type Status = 'idle' | 'processing' | 'noText' | 'error';

export function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [mode, setMode] = useState<TranslateMode>('offline');

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
          const known = lookupFoodTerm(line.text);
          const [translated, pronunciation] = known
            ? [known.translated, known.pronunciation]
            : await Promise.all([translate(line.text, 'ja', 'ko', mode), getPronunciation(line.text)]);
          const item: MenuItem = {
            id: `${index}-${line.text}`,
            original: line.text,
            translated,
            pronunciation,
            price: line.price,
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
  }, [mode]);

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
        <PrimaryButton title="권한 요청" onPress={requestPermission} />
      </View>
    );
  }

  if (!photoUri) {
    return (
      <View style={styles.container}>
        <CameraView ref={cameraRef} style={styles.camera} zoom={zoom} />
        <View style={styles.modeRow}>
          <Pressable
            style={[styles.modeButton, mode === 'offline' && styles.modeButtonActive]}
            onPress={() => setMode('offline')}
          >
            <Text style={[styles.modeButtonText, mode === 'offline' && styles.modeButtonTextActive]}>
              오프라인
            </Text>
          </Pressable>
          <Pressable
            style={[styles.modeButton, mode === 'online' && styles.modeButtonActive]}
            onPress={() => setMode('online')}
          >
            <Text style={[styles.modeButtonText, mode === 'online' && styles.modeButtonTextActive]}>
              온라인
            </Text>
          </Pressable>
        </View>
        <Text style={styles.hint}>
          {mode === 'online' ? '인터넷 필요, 번역 품질 더 좋음' : '인터넷 없이 동작, 번역 품질 보통'}
        </Text>
        <View style={styles.zoomRow}>
          <Pressable
            style={styles.zoomButton}
            onPress={() => setZoom((z) => Math.max(0, z - 0.15))}
          >
            <Text style={styles.zoomButtonText}>−</Text>
          </Pressable>
          <Text style={styles.zoomLabel}>확대 {Math.round(zoom * 100)}%</Text>
          <Pressable
            style={styles.zoomButton}
            onPress={() => setZoom((z) => Math.min(1, z + 0.15))}
          >
            <Text style={styles.zoomButtonText}>+</Text>
          </Pressable>
        </View>
        <Text style={styles.hint}>글씨가 작게 보이면 확대 후 메뉴 1~2개가 크게 나오도록 가까이서 촬영하세요.</Text>
        <PrimaryButton title="촬영" onPress={capture} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <PhotoOverlay uri={photoUri} />
      {status === 'processing' && <Text style={styles.statusText}>분석 중...</Text>}
      {status === 'noText' && <Text style={styles.statusText}>텍스트를 찾지 못했습니다. 다시 촬영해주세요.</Text>}
      {status === 'error' && <Text style={[styles.statusText, styles.errorText]}>처리 중 오류가 발생했습니다. 다시 촬영해주세요.</Text>}
      <TranslatedLayout uri={photoUri} items={items} />
      <MenuList items={items} onShowDescription={handleShowDescription} />
      <PrimaryButton title="다시 촬영" onPress={reset} variant="secondary" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingBottom: 24 },
  camera: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: colors.bg },
  text: { fontSize: type.body, textAlign: 'center', padding: 12, color: colors.ink },
  statusText: { fontSize: type.body, textAlign: 'center', padding: 12, color: colors.inkMuted },
  errorText: { color: colors.danger, fontWeight: '600' },
  modeRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingTop: 10 },
  modeButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modeButtonActive: { backgroundColor: colors.primary },
  modeButtonText: { color: '#fff', fontSize: type.hint, fontWeight: '600' },
  modeButtonTextActive: { fontWeight: '700' },
  zoomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 10 },
  zoomButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomButtonText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  zoomLabel: { fontSize: type.body, color: colors.ink, fontWeight: '600', minWidth: 90, textAlign: 'center' },
  hint: { fontSize: type.hint, color: colors.inkMuted, textAlign: 'center', paddingHorizontal: 16, paddingBottom: 4 },
});
