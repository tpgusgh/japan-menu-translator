import { useState, useCallback } from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { translate } from '../lib/translate';
import { getPronunciation } from '../lib/pronounce';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors, type, radius, shadow } from '../theme';

export function ReverseScreen() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<{ translated: string; pronunciation: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

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
      <TextInput
        style={styles.input}
        value={input}
        onChangeText={setInput}
        placeholder="한국어를 입력하세요"
        placeholderTextColor={colors.inkMuted}
      />
      <PrimaryButton title="번역" onPress={handleTranslate} disabled={loading} />
      {error && <Text style={styles.error}>번역에 실패했습니다. 다시 시도해주세요.</Text>}
      {result && !error && (
        <View style={styles.result}>
          <Text style={styles.japanese}>{result.translated}</Text>
          <Text style={styles.pronunciation}>{result.pronunciation}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: colors.bg },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    fontSize: type.body,
    color: colors.ink,
    backgroundColor: colors.card,
    marginBottom: 8,
  },
  result: {
    marginTop: 20,
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 20,
    ...shadow,
  },
  japanese: { fontSize: type.japanese, fontWeight: '700', color: colors.ink },
  pronunciation: { fontSize: type.translated, color: colors.pronunciation, fontWeight: '600' },
  error: { marginTop: 16, fontSize: type.body, color: colors.danger, textAlign: 'center' },
});
