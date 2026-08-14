import { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Pressable, Text, ScrollView, Modal, Image } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { setStatusBarStyle } from 'expo-status-bar';
import { recognizeText } from '../lib/ocr';
import { translateBatch, isModelDownloaded, downloadModel, type TranslateMode } from '../lib/translate';
import { getPronunciation } from '../lib/pronounce';
import { fetchSummary } from '../lib/wikipedia';
import { lookupFoodTerm } from '../lib/food-dictionary';
import { PhotoOverlay } from '../components/PhotoOverlay';
import { MenuList } from '../components/MenuList';
import { PrimaryButton } from '../components/PrimaryButton';
import type { MenuItem } from '../types';
import { colors, type, radius, gradients, glowShadow } from '../theme';

type Status = 'idle' | 'preparing' | 'processing' | 'noText' | 'error';

const MODE_LABELS: Record<TranslateMode, string> = {
  offline: '오프라인',
  online: '온라인',
};

const MODE_HINTS: Record<TranslateMode, string> = {
  offline: '인터넷 없이 동작 · 최초 1회만 언어팩 다운로드',
  online: '인터넷 필요 · 다운로드 없이 바로 사용, 번역 품질 더 좋음',
};

export function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [mode, setMode] = useState<TranslateMode>('offline');
  const [modelsReady, setModelsReady] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(photoUri ? 'dark' : 'light');
    }, [photoUri])
  );
  const [showModePicker, setShowModePicker] = useState(false);
  const insets = useSafeAreaInsets();

  const reset = useCallback(() => {
    setPhotoUri(null);
    setItems([]);
    setStatus('idle');
  }, []);

  const ensureOfflineModels = useCallback(async () => {
    if (modelsReady) return;
    const [jaReady, koReady] = await Promise.all([isModelDownloaded('ja'), isModelDownloaded('ko')]);
    if (!jaReady || !koReady) {
      setStatus('preparing');
      await Promise.all([downloadModel('ja'), downloadModel('ko')]);
    }
    setModelsReady(true);
  }, [modelsReady]);

  const runPipeline = useCallback(
    async (uri: string) => {
      try {
        setPhotoUri(uri);
        setItems([]);
        setStatus('processing');

        if (mode === 'offline') {
          await ensureOfflineModels();
        }
        setStatus('processing');

        const lines = await recognizeText(uri);
        if (lines.length === 0) {
          setStatus('noText');
          return;
        }

        const knownEntries = lines.map((line) => lookupFoodTerm(line.text));
        const unknownTexts = lines.filter((_, i) => !knownEntries[i]).map((line) => line.text);
        const translatedList = await translateBatch(unknownTexts, 'ja', 'ko', mode);
        let unknownIndex = 0;
        const translatedPerLine = knownEntries.map((known) => (known ? null : translatedList[unknownIndex++]));

        const menuItems = await Promise.all(
          lines.map(async (line, index) => {
            const known = knownEntries[index];
            const translated = known ? known.translated : (translatedPerLine[index] as string);
            const pronunciation = known ? known.pronunciation : await getPronunciation(line.text);
            const item: MenuItem = {
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
            return item;
          })
        );

        setItems(menuItems);
        setStatus('idle');
      } catch (e) {
        console.warn(e);
        setStatus('error');
      }
    },
    [mode, ensureOfflineModels]
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

        <View style={[styles.brandBar, { top: insets.top + 10 }]} pointerEvents="box-none">
          <View style={styles.brandRow}>
            <Image source={require('../../assets/logo.png')} style={styles.brandLogo} />
            <Text style={styles.brandText}>메뉴 렌즈</Text>
          </View>
          <Pressable style={styles.settingsButton} onPress={() => setShowModePicker(true)}>
            <Text style={styles.settingsButtonText}>⚙</Text>
          </Pressable>
        </View>

        <View style={styles.scanFrame} pointerEvents="none">
          <Corner style={styles.cornerTL} />
          <Corner style={styles.cornerTR} rotate="90deg" />
          <Corner style={styles.cornerBR} rotate="180deg" />
          <Corner style={styles.cornerBL} rotate="270deg" />
        </View>

        <Modal visible={showModePicker} transparent animationType="fade" onRequestClose={() => setShowModePicker(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowModePicker(false)}>
            <View style={styles.modalCard}>
              <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.modalHeader}>
                <Text style={styles.modalHeaderText}>번역 방식 선택</Text>
              </LinearGradient>
              <View style={styles.modalBody}>
                {(Object.keys(MODE_LABELS) as TranslateMode[]).map((m) => (
                  <Pressable
                    key={m}
                    style={[styles.modeOption, mode === m && styles.modeOptionActive]}
                    onPress={() => {
                      setMode(m);
                      setShowModePicker(false);
                    }}
                  >
                    <View style={[styles.modeDot, mode === m && styles.modeDotActive]} />
                    <View style={styles.modeTextGroup}>
                      <Text style={[styles.modeOptionTitle, mode === m && styles.modeOptionTitleActive]}>
                        {MODE_LABELS[m]}
                      </Text>
                      <Text style={styles.modeOptionHint}>{MODE_HINTS[m]}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          </Pressable>
        </Modal>

        <View style={[styles.controlPanel, { paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.zoomRow}>
            <Pressable style={styles.zoomButton} onPress={() => setZoom((z) => Math.max(0, z - 0.15))}>
              <Text style={styles.zoomButtonText}>−</Text>
            </Pressable>
            <Text style={styles.zoomLabel}>확대 {Math.round(zoom * 100)}%</Text>
            <Pressable style={styles.zoomButton} onPress={() => setZoom((z) => Math.min(1, z + 0.15))}>
              <Text style={styles.zoomButtonText}>+</Text>
            </Pressable>
          </View>
          <Text style={styles.hint}>메뉴판을 프레임 안에 맞추고 촬영하세요</Text>
          <PrimaryButton title="촬영" onPress={capture} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradients.brand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.resultHeader, { paddingTop: insets.top + 12 }]}
      >
        <PrimaryButton title="다시 찍기" onPress={reset} variant="secondary" />
      </LinearGradient>
      {status === 'preparing' && <Text style={styles.statusText}>번역 언어팩 다운로드 중... (최초 1회만)</Text>}
      {status === 'processing' && <Text style={styles.statusText}>분석 중...</Text>}
      {status === 'noText' && <Text style={styles.statusText}>텍스트를 찾지 못했습니다. 다시 찍어주세요.</Text>}
      {status === 'error' && <Text style={[styles.statusText, styles.errorText]}>처리 중 오류가 발생했습니다. 다시 찍어주세요.</Text>}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {items.length > 0 && <PhotoOverlay uri={photoUri} items={items} />}
        <MenuList items={items} onShowDescription={handleShowDescription} />
      </ScrollView>
    </View>
  );
}

function Corner({ style, rotate = '0deg' }: { style: object; rotate?: string }) {
  return (
    <View style={[styles.cornerWrap, style, { transform: [{ rotate }] }]}>
      <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cornerBarH} />
      <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.cornerBarV} />
    </View>
  );
}

const CORNER_SIZE = 34;
const CORNER_THICKNESS = 4;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scrollContent: { paddingBottom: 24 },
  camera: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: colors.bg },
  text: { fontSize: type.body, textAlign: 'center', padding: 12, color: colors.ink },
  statusText: { fontSize: type.body, textAlign: 'center', padding: 12, color: colors.inkMuted },
  errorText: { color: colors.danger, fontWeight: '600' },
  brandBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandLogo: { width: 30, height: 30, borderRadius: 8 },
  brandText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(20,20,40,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsButtonText: { color: '#fff', fontSize: 18 },
  scanFrame: {
    position: 'absolute',
    top: '18%',
    bottom: '30%',
    left: '7%',
    right: '7%',
  },
  cornerWrap: { position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE },
  cornerBarH: { position: 'absolute', top: 0, left: 0, width: CORNER_SIZE, height: CORNER_THICKNESS, borderRadius: 2 },
  cornerBarV: { position: 'absolute', top: 0, left: 0, width: CORNER_THICKNESS, height: CORNER_SIZE, borderRadius: 2 },
  cornerTL: { top: 0, left: 0 },
  cornerTR: { top: 0, right: 0 },
  cornerBR: { bottom: 0, right: 0 },
  cornerBL: { bottom: 0, left: 0 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,12,30,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
    width: 300,
    ...glowShadow,
  },
  modalHeader: { paddingVertical: 18, paddingHorizontal: 20 },
  modalHeaderText: { color: '#fff', fontSize: type.title, fontWeight: '800' },
  modalBody: { padding: 12, gap: 8 },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
  },
  modeOptionActive: { backgroundColor: colors.chip },
  modeDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.border },
  modeDotActive: { backgroundColor: colors.indigo },
  modeTextGroup: { flex: 1, gap: 2 },
  modeOptionTitle: { fontSize: type.body, fontWeight: '700', color: colors.ink },
  modeOptionTitleActive: { color: colors.indigo },
  modeOptionHint: { fontSize: 12, color: colors.inkMuted },
  controlPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: 8,
  },
  zoomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 10 },
  zoomButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(20,20,40,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomButtonText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  zoomLabel: { fontSize: type.body, color: '#fff', fontWeight: '600', minWidth: 90, textAlign: 'center' },
  hint: { fontSize: type.hint, color: 'rgba(255,255,255,0.85)', textAlign: 'center', paddingHorizontal: 16, paddingBottom: 4 },
});
