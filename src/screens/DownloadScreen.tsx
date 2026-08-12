import { useEffect, useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { isModelDownloaded, downloadModel } from '../lib/translate';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors, type } from '../theme';

type Status = 'checking' | 'downloading' | 'ready' | 'error';

export function DownloadScreen({ onReady }: { onReady: () => void }) {
  const [status, setStatus] = useState<Status>('checking');

  const checkAndDownload = useCallback(async () => {
    setStatus('checking');
    try {
      const [jaReady, koReady] = await Promise.all([isModelDownloaded('ja'), isModelDownloaded('ko')]);
      if (jaReady && koReady) {
        setStatus('ready');
        onReady();
        return;
      }
      setStatus('downloading');
      await Promise.all([downloadModel('ja'), downloadModel('ko')]);
      setStatus('ready');
      onReady();
    } catch (e) {
      console.warn(e);
      setStatus('error');
    }
  }, [onReady]);

  useEffect(() => {
    checkAndDownload();
  }, [checkAndDownload]);

  if (status === 'error') {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>번역 파일 다운로드에 실패했습니다. 최초 1회는 인터넷 연결이 필요합니다.</Text>
        <PrimaryButton title="다시 시도" onPress={checkAndDownload} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.text}>
        {status === 'checking' ? '확인 중...' : '번역 파일 다운로드 중... (최초 1회만 필요)'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16, backgroundColor: colors.bg },
  text: { fontSize: type.body, textAlign: 'center', color: colors.ink },
});
