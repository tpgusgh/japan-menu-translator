import { useState, useCallback, useEffect } from 'react';
import { View, TextInput, Text, Pressable, StyleSheet, PermissionsAndroid, Modal, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setStatusBarStyle } from 'expo-status-bar';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translate } from '../lib/translate';
import { getPronunciation } from '../lib/pronounce';
import { recognizeSpeech } from '../../modules/ml-features';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors, type, radius } from '../theme';

type ReverseMode = 'text' | 'voice';

const TTS_SETTINGS_KEY = 'tts_settings';
const PITCH_RATE_MIN = 0.5;
const PITCH_RATE_MAX = 2.0;
const PITCH_RATE_STEP = 0.1;

interface TtsSettings {
  voiceId: string | undefined;
  pitch: number;
  rate: number;
}

function speakJapanese(text: string, settings: TtsSettings) {
  Speech.stop();
  Speech.speak(text, { language: 'ja-JP', voice: settings.voiceId, pitch: settings.pitch, rate: settings.rate });
}

export function ReverseScreen() {
  const insets = useSafeAreaInsets();
  const [reverseMode, setReverseMode] = useState<ReverseMode>('text');

  const [input, setInput] = useState('');
  const [result, setResult] = useState<{ translated: string; pronunciation: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const [listening, setListening] = useState(false);
  const [voiceResult, setVoiceResult] = useState<{ heard: string; translated: string; pronunciation: string } | null>(
    null
  );
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const [ttsVoices, setTtsVoices] = useState<Speech.Voice[]>([]);
  const [ttsVoiceId, setTtsVoiceId] = useState<string | undefined>(undefined);
  const [ttsPitch, setTtsPitch] = useState(1);
  const [ttsRate, setTtsRate] = useState(1);
  const [ttsLoaded, setTtsLoaded] = useState(false);
  const [showTtsSettings, setShowTtsSettings] = useState(false);
  const ttsSettings: TtsSettings = { voiceId: ttsVoiceId, pitch: ttsPitch, rate: ttsRate };

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark');
    }, [])
  );

  useEffect(() => {
    Speech.getAvailableVoicesAsync().then((all) => {
      setTtsVoices(all.filter((v) => v.language?.toLowerCase().startsWith('ja')));
    });
    AsyncStorage.getItem(TTS_SETTINGS_KEY).then((raw) => {
      if (raw) {
        try {
          const saved = JSON.parse(raw) as Partial<TtsSettings>;
          if (saved.voiceId) setTtsVoiceId(saved.voiceId);
          if (typeof saved.pitch === 'number') setTtsPitch(saved.pitch);
          if (typeof saved.rate === 'number') setTtsRate(saved.rate);
        } catch {
          // ignore malformed saved settings, defaults already in state
        }
      }
      setTtsLoaded(true);
    });
  }, []);

  useEffect(() => {
    // Gate on ttsLoaded so this doesn't fire with defaults before the saved
    // settings above finish loading and clobber them.
    if (!ttsLoaded) return;
    AsyncStorage.setItem(TTS_SETTINGS_KEY, JSON.stringify(ttsSettings));
  }, [ttsLoaded, ttsVoiceId, ttsPitch, ttsRate]);

  const adjustPitch = useCallback((delta: number) => {
    setTtsPitch((p) => Math.round(Math.min(PITCH_RATE_MAX, Math.max(PITCH_RATE_MIN, p + delta)) * 10) / 10);
  }, []);

  const adjustRate = useCallback((delta: number) => {
    setTtsRate((r) => Math.round(Math.min(PITCH_RATE_MAX, Math.max(PITCH_RATE_MIN, r + delta)) * 10) / 10);
  }, []);

  const handleTranslate = useCallback(async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError(false);
    try {
      const translated = await translate(input, 'ko', 'ja');
      const pronunciation = await getPronunciation(translated);
      setResult({ translated, pronunciation });
    } catch (e) {
      console.warn(e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [input]);

  const handleListen = useCallback(async () => {
    setVoiceError(null);
    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      setVoiceError('마이크 권한이 필요합니다.');
      return;
    }
    setListening(true);
    setVoiceResult(null);
    try {
      const heard = await recognizeSpeech('ja-JP');
      if (!heard.trim()) {
        setVoiceError('알아듣지 못했어요. 다시 시도해주세요.');
        return;
      }
      const [translated, pronunciation] = await Promise.all([
        translate(heard, 'ja', 'ko'),
        getPronunciation(heard),
      ]);
      setVoiceResult({ heard, translated, pronunciation });
    } catch (e) {
      console.warn(e);
      setVoiceError('음성 인식에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setListening(false);
    }
  }, []);

  return (
    <View style={[styles.container, { paddingTop: 20 + insets.top }]}>
      <View style={styles.titleRow}>
        <Text style={styles.screenTitle}>역번역</Text>
        <Pressable style={styles.ttsSettingsButton} onPress={() => setShowTtsSettings(true)}>
          <Text style={styles.ttsSettingsButtonText}>음성 설정</Text>
        </Pressable>
      </View>

      <View style={styles.modeRow}>
        <Pressable
          style={[styles.modeChip, reverseMode === 'text' && styles.modeChipActive]}
          onPress={() => setReverseMode('text')}
        >
          <Text style={[styles.modeChipText, reverseMode === 'text' && styles.modeChipTextActive]}>텍스트 입력</Text>
        </Pressable>
        <Pressable
          style={[styles.modeChip, reverseMode === 'voice' && styles.modeChipActive]}
          onPress={() => setReverseMode('voice')}
        >
          <Text style={[styles.modeChipText, reverseMode === 'voice' && styles.modeChipTextActive]}>
            일본어 듣기
          </Text>
        </Pressable>
      </View>

      {reverseMode === 'text' ? (
        <>
          <Text style={styles.screenSubtitle}>한국어를 입력하면 일본어로 바꿔드려요</Text>

          <View style={styles.inputCard}>
            <Text style={styles.cardLabel}>한국어</Text>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="예: 이거 얼마예요?"
              placeholderTextColor={colors.original}
              multiline
            />
          </View>

          <View style={styles.buttonGap} />
          <PrimaryButton title={loading ? '번역 중...' : '번역하기'} onPress={handleTranslate} disabled={loading} />

          {error && <Text style={styles.error}>번역에 실패했습니다. 다시 시도해주세요.</Text>}

          {result && !error && (
            <View style={styles.resultCard}>
              <View style={styles.resultHeaderRow}>
                <Text style={styles.cardLabel}>일본어</Text>
                <Pressable style={styles.speakButton} onPress={() => speakJapanese(result.translated, ttsSettings)}>
                  <Text style={styles.speakButtonText}>듣기</Text>
                </Pressable>
              </View>
              <Text style={styles.japanese}>{result.translated}</Text>
              <Text style={styles.pronunciation}>{result.pronunciation}</Text>
            </View>
          )}
        </>
      ) : (
        <>
          <Text style={styles.screenSubtitle}>일본어를 말하면 한국어 뜻과 발음을 알려드려요</Text>

          <View style={styles.micCard}>
            <Pressable
              style={[styles.micButton, listening && styles.micButtonActive]}
              onPress={handleListen}
              disabled={listening}
            >
              <Text style={styles.micButtonText}>{listening ? '듣는 중...' : '눌러서\n말하기'}</Text>
            </Pressable>
          </View>

          {voiceError && <Text style={styles.error}>{voiceError}</Text>}

          {voiceResult && !voiceError && (
            <View style={styles.resultCard}>
              <View style={styles.resultHeaderRow}>
                <Text style={styles.cardLabel}>들은 일본어</Text>
                <Pressable style={styles.speakButton} onPress={() => speakJapanese(voiceResult.heard, ttsSettings)}>
                  <Text style={styles.speakButtonText}>듣기</Text>
                </Pressable>
              </View>
              <Text style={styles.japanese}>{voiceResult.heard}</Text>
              <Text style={styles.pronunciation}>{voiceResult.pronunciation}</Text>
              <View style={styles.divider} />
              <Text style={styles.cardLabel}>한국어 뜻</Text>
              <Text style={styles.koreanMeaning}>{voiceResult.translated}</Text>
            </View>
          )}
        </>
      )}

      <Modal visible={showTtsSettings} transparent animationType="fade" onRequestClose={() => setShowTtsSettings(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowTtsSettings(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderText}>음성 설정</Text>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.settingsLabel}>높이 (pitch)</Text>
              <View style={styles.stepperRow}>
                <Pressable style={styles.stepperButton} onPress={() => adjustPitch(-PITCH_RATE_STEP)}>
                  <Text style={styles.stepperButtonText}>−</Text>
                </Pressable>
                <Text style={styles.stepperValue}>{ttsPitch.toFixed(1)}</Text>
                <Pressable style={styles.stepperButton} onPress={() => adjustPitch(PITCH_RATE_STEP)}>
                  <Text style={styles.stepperButtonText}>+</Text>
                </Pressable>
              </View>

              <Text style={styles.settingsLabel}>속도 (rate)</Text>
              <View style={styles.stepperRow}>
                <Pressable style={styles.stepperButton} onPress={() => adjustRate(-PITCH_RATE_STEP)}>
                  <Text style={styles.stepperButtonText}>−</Text>
                </Pressable>
                <Text style={styles.stepperValue}>{ttsRate.toFixed(1)}</Text>
                <Pressable style={styles.stepperButton} onPress={() => adjustRate(PITCH_RATE_STEP)}>
                  <Text style={styles.stepperButtonText}>+</Text>
                </Pressable>
              </View>

              <Text style={styles.settingsLabel}>음성</Text>
              <ScrollView style={styles.voiceList}>
                <Pressable
                  style={[styles.voiceOption, !ttsVoiceId && styles.voiceOptionActive]}
                  onPress={() => setTtsVoiceId(undefined)}
                >
                  <View style={[styles.voiceDot, !ttsVoiceId && styles.voiceDotActive]} />
                  <Text style={[styles.voiceOptionText, !ttsVoiceId && styles.voiceOptionTextActive]}>
                    기본값 (시스템 자동)
                  </Text>
                </Pressable>
                {ttsVoices.length === 0 && (
                  <Text style={styles.voiceEmptyText}>사용 가능한 일본어 음성이 더 없어요</Text>
                )}
                {ttsVoices.map((v) => (
                  <Pressable
                    key={v.identifier}
                    style={[styles.voiceOption, ttsVoiceId === v.identifier && styles.voiceOptionActive]}
                    onPress={() => setTtsVoiceId(v.identifier)}
                  >
                    <View style={[styles.voiceDot, ttsVoiceId === v.identifier && styles.voiceDotActive]} />
                    <Text
                      style={[styles.voiceOptionText, ttsVoiceId === v.identifier && styles.voiceOptionTextActive]}
                      numberOfLines={1}
                    >
                      {v.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <PrimaryButton title="닫기" onPress={() => setShowTtsSettings(false)} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingBottom: 20, backgroundColor: colors.bg },
  screenTitle: { fontSize: type.display, fontWeight: '900', color: colors.ink },
  screenSubtitle: { fontSize: type.body, color: colors.inkMuted, marginTop: 4, marginBottom: 18, fontWeight: '600' },
  modeRow: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    marginTop: 16,
    padding: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.chip,
  },
  modeChip: { paddingVertical: 9, paddingHorizontal: 18, borderRadius: radius.pill },
  modeChipActive: { backgroundColor: colors.card },
  modeChipText: { fontSize: 14, fontWeight: '800', color: colors.inkMuted },
  modeChipTextActive: { color: colors.ink },
  inputCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 20, gap: 8 },
  cardLabel: { fontSize: 13, fontWeight: '800', color: colors.inkMuted },
  input: {
    fontSize: type.title + 2,
    color: colors.ink,
    minHeight: 72,
    fontWeight: '800',
    textAlignVertical: 'top',
  },
  buttonGap: { height: 14 },
  resultCard: { marginTop: 20, gap: 10, backgroundColor: colors.skySoft, borderRadius: radius.lg, padding: 22 },
  resultHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  speakButton: { paddingVertical: 7, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: colors.card },
  speakButtonText: { fontSize: 13, fontWeight: '900', color: colors.skyDeep },
  japanese: { fontSize: type.japanese, fontWeight: '900', color: colors.ink, marginTop: 4 },
  pronunciation: { fontSize: type.translated, color: colors.pinkDeep, fontWeight: '900' },
  koreanMeaning: { fontSize: type.title, fontWeight: '900', color: colors.ink, marginTop: 4 },
  divider: { height: 1, backgroundColor: 'rgba(28,32,56,0.1)', marginVertical: 8 },
  error: { marginTop: 16, fontSize: type.body, color: colors.danger, textAlign: 'center', fontWeight: '600' },
  micCard: { alignItems: 'center', paddingVertical: 28 },
  micButton: {
    width: 156,
    height: 156,
    borderRadius: 78,
    backgroundColor: colors.pink,
    borderWidth: 8,
    borderColor: colors.pinkSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonActive: { backgroundColor: colors.sky, borderColor: colors.skySoft },
  micButtonText: { color: '#fff', fontSize: type.title, fontWeight: '900', textAlign: 'center', lineHeight: 28 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ttsSettingsButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.card },
  ttsSettingsButtonText: { fontSize: 13, fontWeight: '800', color: colors.inkMuted },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(20,24,48,0.5)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden', width: 300, maxHeight: '75%' },
  modalHeader: { paddingVertical: 18, paddingHorizontal: 20, backgroundColor: colors.pinkSoft },
  modalHeaderText: { color: colors.pinkDeep, fontSize: type.title, fontWeight: '900' },
  modalBody: { padding: 16, gap: 8 },
  settingsLabel: { fontSize: 13, fontWeight: '800', color: colors.inkMuted, marginTop: 8 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepperButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: { fontSize: 20, fontWeight: '900', color: colors.ink },
  stepperValue: { fontSize: type.body, fontWeight: '800', color: colors.ink, minWidth: 40, textAlign: 'center' },
  voiceList: { maxHeight: 160 },
  voiceOption: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  voiceOptionActive: {},
  voiceDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.border },
  voiceDotActive: { backgroundColor: colors.pink },
  voiceOptionText: { flex: 1, fontSize: 13, color: colors.inkMuted, fontWeight: '600' },
  voiceOptionTextActive: { color: colors.ink, fontWeight: '900' },
  voiceEmptyText: { fontSize: 12, color: colors.inkMuted, paddingVertical: 8 },
});
