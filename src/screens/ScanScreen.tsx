import { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Pressable, Text, ScrollView, Modal, Image, type LayoutChangeEvent } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { setStatusBarStyle } from 'expo-status-bar';
import { recognizeText } from '../lib/ocr';
import { translateBatch, isModelDownloaded, downloadModel, type TranslateMode } from '../lib/translate';
import { getPronunciation } from '../lib/pronounce';
import { fetchSummary } from '../lib/wikipedia';
import { lookupFoodTerm } from '../lib/food-dictionary';
import { addHistoryEntry } from '../lib/history';
import { PhotoOverlay } from '../components/PhotoOverlay';
import { MenuList } from '../components/MenuList';
import { PrimaryButton } from '../components/PrimaryButton';
import { CropSelector, type CropRect } from '../components/CropSelector';
import type { MenuItem } from '../types';
import { colors, type, radius } from '../theme';

type Status = 'idle' | 'preparing' | 'processing' | 'noText' | 'error';
type ScanMode = 'full' | 'region';

const MODE_LABELS: Record<TranslateMode, string> = {
  offline: '오프라인',
  online: '온라인',
};

const MODE_HINTS: Record<TranslateMode, string> = {
  offline: '인터넷 없이 동작 · 최초 1회만 언어팩 다운로드',
  online: '인터넷 필요 · 다운로드 없이 바로 사용, 번역 품질 더 좋음',
};

const SCAN_MODE_LABELS: Record<ScanMode, string> = {
  full: '일반 스캔',
  region: '부분 스캔',
};

export function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = ImagePicker.useMediaLibraryPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [mode, setMode] = useState<TranslateMode>('offline');
  const [modelsReady, setModelsReady] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>('full');
  const [pendingPhoto, setPendingPhoto] = useState<{ uri: string; width: number; height: number } | null>(null);
  const [imageRect, setImageRect] = useState<CropRect | null>(null);
  const cropBoxRef = useRef<CropRect | null>(null);

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
    setPendingPhoto(null);
    setImageRect(null);
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
        addHistoryEntry(uri, menuItems).catch((e) => console.warn('history save failed', e));
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
    if (scanMode === 'region' && photo.width && photo.height) {
      setPendingPhoto({ uri: photo.uri, width: photo.width, height: photo.height });
      return;
    }
    await runPipeline(photo.uri);
  }, [runPipeline, scanMode]);

  const pickFromGallery = useCallback(async () => {
    let perm = mediaPermission;
    if (!perm?.granted) {
      perm = await requestMediaPermission();
    }
    if (!perm?.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (scanMode === 'region') {
      setPendingPhoto({ uri: asset.uri, width: asset.width, height: asset.height });
      return;
    }
    await runPipeline(asset.uri);
  }, [mediaPermission, requestMediaPermission, scanMode, runPipeline]);

  const handleCropLayout = useCallback(
    (e: LayoutChangeEvent) => {
      if (!pendingPhoto) return;
      const { width: cw, height: ch } = e.nativeEvent.layout;
      const photoAspect = pendingPhoto.width / pendingPhoto.height;
      const containerAspect = cw / ch;
      const displayW = photoAspect > containerAspect ? cw : ch * photoAspect;
      const displayH = photoAspect > containerAspect ? cw / photoAspect : ch;
      setImageRect({ x: (cw - displayW) / 2, y: (ch - displayH) / 2, width: displayW, height: displayH });
    },
    [pendingPhoto]
  );

  const confirmCrop = useCallback(async () => {
    const box = cropBoxRef.current;
    if (!pendingPhoto || !imageRect || !box) return;
    const scaleX = pendingPhoto.width / imageRect.width;
    const scaleY = pendingPhoto.height / imageRect.height;
    const originX = Math.max(0, Math.min(Math.round((box.x - imageRect.x) * scaleX), pendingPhoto.width - 1));
    const originY = Math.max(0, Math.min(Math.round((box.y - imageRect.y) * scaleY), pendingPhoto.height - 1));
    const width = Math.max(1, Math.min(Math.round(box.width * scaleX), pendingPhoto.width - originX));
    const height = Math.max(1, Math.min(Math.round(box.height * scaleY), pendingPhoto.height - originY));

    const cropped = await ImageManipulator.manipulateAsync(
      pendingPhoto.uri,
      [{ crop: { originX, originY, width, height } }],
      { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
    );
    setPendingPhoto(null);
    setImageRect(null);
    await runPipeline(cropped.uri);
  }, [pendingPhoto, imageRect, runPipeline]);

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

  if (pendingPhoto) {
    return (
      <View style={styles.container}>
        <View style={styles.cropContainer} onLayout={handleCropLayout}>
          <Image source={{ uri: pendingPhoto.uri }} style={StyleSheet.absoluteFill} resizeMode="contain" />
          {imageRect && (
            <CropSelector imageRect={imageRect} onChange={(box) => (cropBoxRef.current = box)} />
          )}
        </View>
        <View style={[styles.cropPanel, { paddingBottom: insets.bottom + 16 }]}>
          <Text style={styles.cropHint}>번역할 영역에 맞춰 상자를 조절하세요</Text>
          <View style={styles.cropButtonRow}>
            <View style={styles.flex1}>
              <PrimaryButton title="다시 찍기" variant="secondary" onPress={() => setPendingPhoto(null)} />
            </View>
            <View style={styles.flex1}>
              <PrimaryButton title="이 영역 번역" onPress={confirmCrop} />
            </View>
          </View>
        </View>
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
              <View style={styles.modalHeader}>
                <Text style={styles.modalHeaderText}>번역 방식 선택</Text>
              </View>
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

        <View style={[styles.controlPanel, { paddingBottom: insets.bottom + 20 }]}>
          <Text style={styles.hint}>메뉴판을 프레임 안에 맞추고 촬영하세요</Text>
          <View style={styles.segment}>
            {(Object.keys(SCAN_MODE_LABELS) as ScanMode[]).map((m) => (
              <Pressable
                key={m}
                style={[styles.segmentItem, scanMode === m && styles.segmentItemActive]}
                onPress={() => setScanMode(m)}
              >
                <Text style={[styles.segmentText, scanMode === m && styles.segmentTextActive]}>
                  {SCAN_MODE_LABELS[m]}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.captureRow}>
            <Pressable style={styles.sideButton} onPress={pickFromGallery}>
              <Text style={styles.sideButtonText}>사진 선택</Text>
            </Pressable>
            <Pressable style={styles.shutterOuter} onPress={capture} accessibilityLabel="촬영">
              <View style={styles.shutterInner} />
            </Pressable>
            <View style={styles.zoomGroup}>
              <Pressable
                style={styles.zoomButton}
                onPress={() => setZoom((z) => Math.max(0, z - 0.15))}
                accessibilityLabel="축소"
              >
                <Text style={styles.zoomButtonText}>−</Text>
              </Pressable>
              <Pressable
                style={styles.zoomButton}
                onPress={() => setZoom((z) => Math.min(1, z + 0.15))}
                accessibilityLabel="확대"
              >
                <Text style={styles.zoomButtonText}>+</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.resultHeader, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={reset} hitSlop={8} style={styles.backButton}>
          <Text style={styles.backText}>‹ 다시 찍기</Text>
        </Pressable>
      </View>
      {status === 'preparing' && <Text style={styles.statusText}>번역 언어팩 다운로드 중... (최초 1회만)</Text>}
      {status === 'processing' && <Text style={styles.statusText}>분석 중...</Text>}
      {status === 'noText' && <Text style={styles.statusText}>텍스트를 찾지 못했습니다. 다시 찍어주세요.</Text>}
      {status === 'error' && <Text style={[styles.statusText, styles.errorText]}>처리 중 오류가 발생했습니다. 다시 찍어주세요.</Text>}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {items.length > 0 && (
          <View style={styles.photoFrame}>
            <PhotoOverlay uri={photoUri} items={items} />
          </View>
        )}
        <MenuList items={items} onShowDescription={handleShowDescription} />
      </ScrollView>
    </View>
  );
}

function Corner({ style, rotate = '0deg' }: { style: object; rotate?: string }) {
  return (
    <View style={[styles.cornerWrap, style, { transform: [{ rotate }] }]}>
      <View style={styles.cornerBarH} />
      <View style={styles.cornerBarV} />
    </View>
  );
}

const CORNER_SIZE = 34;
const CORNER_THICKNESS = 4;
const SCRIM = 'rgba(14,20,40,0.78)';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  flex1: { flex: 1 },
  resultHeader: { backgroundColor: colors.bg, paddingHorizontal: 16, paddingBottom: 4 },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  backText: { color: colors.ink, fontSize: type.body, fontWeight: '800' },
  scrollContent: { paddingBottom: 32 },
  photoFrame: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  camera: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: colors.bg, padding: 24 },
  text: { fontSize: type.body, textAlign: 'center', padding: 12, color: colors.ink },
  statusText: { fontSize: type.body, textAlign: 'center', padding: 16, color: colors.inkMuted },
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
  brandLogo: { width: 28, height: 28, borderRadius: 7 },
  brandText: { color: '#fff', fontSize: 17, fontWeight: '900' },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SCRIM,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsButtonText: { color: '#fff', fontSize: 18 },
  scanFrame: {
    position: 'absolute',
    top: '16%',
    bottom: '34%',
    left: '8%',
    right: '8%',
  },
  cornerWrap: { position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE },
  cornerBarH: { position: 'absolute', top: 0, left: 0, width: CORNER_SIZE, height: CORNER_THICKNESS, backgroundColor: '#fff', borderRadius: 2 },
  cornerBarV: { position: 'absolute', top: 0, left: 0, width: CORNER_THICKNESS, height: CORNER_SIZE, backgroundColor: '#fff', borderRadius: 2 },
  cornerTL: { top: 0, left: 0 },
  cornerTR: { top: 0, right: 0 },
  cornerBR: { bottom: 0, right: 0 },
  cornerBL: { bottom: 0, left: 0 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,14,30,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    overflow: 'hidden',
    width: 300,
  },
  modalHeader: { paddingVertical: 18, paddingHorizontal: 20, backgroundColor: colors.pinkSoft },
  modalHeaderText: { color: colors.pinkDeep, fontSize: type.title, fontWeight: '900' },
  modalBody: { padding: 12, gap: 8 },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
  },
  modeOptionActive: { backgroundColor: colors.chip },
  modeDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.border },
  modeDotActive: { backgroundColor: colors.pink },
  modeTextGroup: { flex: 1, gap: 2 },
  modeOptionTitle: { fontSize: type.body, fontWeight: '700', color: colors.ink },
  modeOptionTitleActive: { color: colors.ink },
  modeOptionHint: { fontSize: 12, color: colors.inkMuted },
  controlPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: SCRIM,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 18,
    paddingHorizontal: 24,
    gap: 16,
    alignItems: 'center',
  },
  hint: { fontSize: type.hint, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
  segment: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: radius.pill,
    padding: 3,
  },
  segmentItem: { paddingVertical: 8, paddingHorizontal: 22, borderRadius: radius.pill },
  segmentItemActive: { backgroundColor: '#fff' },
  segmentText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '700' },
  segmentTextActive: { color: colors.ink, fontWeight: '900' },
  captureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch' },
  sideButton: {
    width: 92,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.pink },
  zoomGroup: { width: 92, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  zoomButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomButtonText: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 26 },
  cropContainer: { flex: 1, backgroundColor: '#000' },
  cropPanel: { backgroundColor: colors.card, paddingTop: 18, paddingHorizontal: 16, gap: 14, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  cropHint: { fontSize: type.body, color: colors.ink, textAlign: 'center', fontWeight: '600' },
  cropButtonRow: { flexDirection: 'row', gap: 12 },
});
