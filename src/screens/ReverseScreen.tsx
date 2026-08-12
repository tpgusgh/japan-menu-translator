import { useState, useCallback } from 'react';
import { View, TextInput, Text, Button, StyleSheet } from 'react-native';
import { translate } from '../lib/translate';
import { getPronunciation } from '../lib/pronounce';

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
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [input]);

  return (
    <View style={styles.container}>
      <TextInput style={styles.input} value={input} onChangeText={setInput} placeholder="한국어를 입력하세요" />
      <Button title="번역" onPress={handleTranslate} disabled={loading} />
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
  container: { flex: 1, padding: 16, gap: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10, fontSize: 16 },
  result: { marginTop: 16, gap: 4 },
  japanese: { fontSize: 22, fontWeight: '700' },
  pronunciation: { fontSize: 16, color: '#c00' },
  error: { marginTop: 16, fontSize: 16, color: '#c00' },
});
