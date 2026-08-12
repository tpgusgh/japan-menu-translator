import { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Pressable, Text, ScrollView, Modal, Image } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { recognizeText } from '../lib/ocr';
import { translateBatch } from '../lib/translate';
import { getPronunciation } from '../lib/pronounce';
import { fetchSummary } from '../lib/wikipedia';
import { lookupFoodTerm } from '../lib/food-dictionary';
import { refineTranslationsWithAI, generateTranslatedMenuImage } from '../lib/openai';
import { PhotoOverlay } from '../components/PhotoOverlay';
import { MenuList } from '../components/MenuList';
import { PrimaryButton } from '../components/PrimaryButton';
import type { MenuItem } from '../types';
import { colors, type, radius } from '../theme';

type Status = 'idle' | 'processing' | 'noText' | 'error';
type ScanMode = 'offline' | 'online' | 'ai-translate' | 'ai-generate';

const MODE_LABELS: Record<ScanMode, string> = {
  offline: '오프라인',
  online: '온라인',
  'ai-translate': 'AI 번역모드',
  'ai-generate': 'AI 창작모드',
};

const MODE_HINTS: Record<ScanMode, string> = {
  offline: '인터넷 없이 동작, 번역 품질 보통',
  online: '인터넷 필요, 번역 품질 더 좋음',
  'ai-translate': 'OpenAI로 읽기/번역 보정, 위치는 기존 방식 그대로 (유료, 인터넷 필요)',
  'ai-generate': 'OpenAI가 번역된 메뉴판 이미지를 통째로 새로 생성 (유료, 인터넷 필요, 느림)',
};

export function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [generatedImageUri, setGeneratedImageUri] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [mode, setMode] = useState<ScanMode>('offline');
  const [showModePicker, setShowModePicker] = useState(false);
  const insets = useSafeAreaInsets();

  const reset = useCallback(() => {
    setPhotoUri(null);
    setItems([]);
    setGeneratedImageUri(null);
    setStatus('idle');
  }, []);

  const runPipeline = useCallback(
    async (uri: string) => {
      try {
        setPhotoUri(uri);
        setItems([]);
        setGeneratedImageUri(null);
        setStatus('processing');

        if (mode === 'ai-generate') {
          const generated = await generateTranslatedMenuImage(uri);
          setGeneratedImageUri(generated);
          setStatus('idle');
          return;
        }

        const lines = await recognizeText(uri);
        if (lines.length === 0) {
          setStatus('noText');
          return;
        }

        let menuItems: MenuItem[];

        if (mode === 'ai-translate') {
          const aiItems = await refineTranslationsWithAI(uri, lines.map((line) => line.text));
          menuItems = lines.map((line, index) => {
            const ai = aiItems[index];
            return {
              id: `${index}-${line.text}`,
              original: ai?.original ?? line.text,
              translated: ai?.translated ?? '',
              pronunciation: ai?.pronunciation ?? '',
              price: ai?.price ?? line.price,
              orientation: line.orientation,
              boundingBox: line.boundingBox,
              description: null,
              descriptionState: 'idle',
            };
          });
        } else {
          const knownEntries = lines.map((line) => lookupFoodTerm(line.text));
          const unknownTexts = lines.filter((_, i) => !knownEntries[i]).map((line) => line.text);
          const translatedList = await translateBatch(unknownTexts, 'ja', 'ko', mode);
          let unknownIndex = 0;
          const translatedPerLine = knownEntries.map((known) => (known ? null : translatedList[unknownIndex++]));

          menuItems = await Promise.all(
            lines.map(async (line, index) => {
              const known = knownEntries[index];
              const translated = known ? known.translated : (translatedPerLine[index] as string);
              const pronunciation = known ? known.pronunciation : await getPronunciation(line.text);
              return {
                id: `${index}-${line.text}`,
                original: line.text,
                translated,
                pronunciation,
                price: line.price,
                orientation: line.orientation,
                boundingBox: line.boundingBox,
                description: null,
                descriptionState: 'idle',
              };
            })
          );
        }

        setItems(menuItems);
        setStatus('idle');
      } catch (e) {
        console.warn(e);
        setStatus('error');
      }
    },
    [mode]
  );

  const capture = useCallback(async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({
      quality: 1,
      skipProcessing: false,
      shutterSound: false,
    });
    if (!photo) return;
    await runPipeline(photo.uri);
  }, [runPipeline]);

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
        <Pressable
          style={[styles.settingsButton, { top: insets.top + 12 }]}
          onPress={() => setShowModePicker(true)}
        >
          <Text style={styles.settingsButtonText}>⚙</Text>
        </Pressable>
        <Modal visible={showModePicker} transparent animationType="fade" onRequestClose={() => setShowModePicker(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowModePicker(false)}>
            <View style={styles.modalCard}>
              {(Object.keys(MODE_LABELS) as ScanMode[]).map((m) => (
                <View key={m}>
                  <Pressable
                    style={[styles.modeButton, mode === m && styles.modeButtonActive]}
                    onPress={() => {
                      setMode(m);
                      setShowModePicker(false);
                    }}
                  >
                    <Text style={[styles.modeButtonText, mode === m && styles.modeButtonTextActive]}>
                      {MODE_LABELS[m]}
                    </Text>
                  </Pressable>
                  <Text style={styles.hint}>{MODE_HINTS[m]}</Text>
                </View>
              ))}
            </View>
          </Pressable>
        </Modal>
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
    <View style={styles.container}>
      <View style={[styles.resultHeader, { paddingTop: insets.top + 12 }]}>
        <PrimaryButton title="다시 찍기" onPress={reset} variant="secondary" />
      </View>
      {status === 'processing' && (
        <Text style={styles.statusText}>{mode === 'ai-generate' ? '이미지 생성 중... (시간 좀 걸림)' : '분석 중...'}</Text>
      )}
      {status === 'noText' && <Text style={styles.statusText}>텍스트를 찾지 못했습니다. 다시 찍어주세요.</Text>}
      {status === 'error' && <Text style={[styles.statusText, styles.errorText]}>처리 중 오류가 발생했습니다. 다시 찍어주세요.</Text>}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {mode === 'ai-generate' ? (
          generatedImageUri && <Image source={{ uri: generatedImageUri }} style={styles.generatedImage} resizeMode="contain" />
        ) : (
          <>
            {items.length > 0 && <PhotoOverlay uri={photoUri} items={items} />}
            <MenuList items={items} onShowDescription={handleShowDescription} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  scrollContent: { paddingBottom: 24 },
  camera: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: colors.bg },
  text: { fontSize: type.body, textAlign: 'center', padding: 12, color: colors.ink },
  statusText: { fontSize: type.body, textAlign: 'center', padding: 12, color: colors.inkMuted },
  errorText: { color: colors.danger, fontWeight: '600' },
  generatedImage: { width: '100%', aspectRatio: 2 / 3 },
  settingsButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  settingsButtonText: { color: '#fff', fontSize: 18 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 20,
    gap: 8,
    width: 280,
  },
  modeButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
    alignItems: 'center',
  },
  modeButtonActive: { backgroundColor: colors.primary },
  modeButtonText: { color: colors.ink, fontSize: type.body, fontWeight: '600' },
  modeButtonTextActive: { color: '#fff', fontWeight: '700' },
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
