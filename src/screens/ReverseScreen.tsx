import { useState, useCallback } from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { setStatusBarStyle } from 'expo-status-bar';
import { translate } from '../lib/translate';
import { getPronunciation } from '../lib/pronounce';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors, type, radius, shadow, gradients } from '../theme';

export function ReverseScreen() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<{ translated: string; pronunciation: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark');
    }, [])
  );

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

  return (
    <View style={styles.container}>
      <Text style={styles.screenTitle}>역번역</Text>
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

      <View style={styles.arrowRow}>
        <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.arrowDivider} />
        <View style={styles.arrowBadge}>
          <Text style={styles.arrowBadgeText}>↓</Text>
        </View>
      </View>

      <PrimaryButton title={loading ? '번역 중...' : '번역하기'} onPress={handleTranslate} disabled={loading} />

      {error && <Text style={styles.error}>번역에 실패했습니다. 다시 시도해주세요.</Text>}

      {result && !error && (
        <View style={styles.resultCard}>
          <Text style={styles.cardLabel}>일본어</Text>
          <Text style={styles.japanese}>{result.translated}</Text>
          <Text style={styles.pronunciation}>{result.pronunciation}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: colors.bg },
  screenTitle: { fontSize: type.display, fontWeight: '800', color: colors.ink },
  screenSubtitle: { fontSize: type.body, color: colors.inkMuted, marginTop: 2, marginBottom: 20 },
  inputCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 8,
    ...shadow,
  },
  cardLabel: { fontSize: 12, fontWeight: '800', color: colors.indigo, letterSpacing: 0.5, textTransform: 'uppercase' },
  input: {
    fontSize: type.title,
    color: colors.ink,
    minHeight: 48,
    fontWeight: '600',
  },
  arrowRow: { alignItems: 'center', justifyContent: 'center', marginVertical: 4, height: 32 },
  arrowDivider: { position: 'absolute', left: 24, right: 24, top: 15, height: 2, borderRadius: 1 },
  arrowBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowBadgeText: { color: colors.indigo, fontWeight: '800', fontSize: 15 },
  resultCard: {
    marginTop: 20,
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.chip,
    padding: 20,
    ...shadow,
  },
  japanese: { fontSize: type.japanese, fontWeight: '800', color: colors.ink, marginTop: 4 },
  pronunciation: { fontSize: type.translated, color: colors.pronunciation, fontWeight: '700' },
  error: { marginTop: 16, fontSize: type.body, color: colors.danger, textAlign: 'center' },
});
