import { useCallback } from 'react';
import { View, Text, Image, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setStatusBarStyle } from 'expo-status-bar';
import { colors, type, radius } from '../theme';

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark');
    }, [])
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}>
      <View style={styles.brandRow}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} />
        <Text style={styles.brand}>메뉴 렌즈</Text>
      </View>

      <Text style={styles.headline}>일본 메뉴판,{'\n'}찍으면 바로 읽혀요</Text>
      <Text style={styles.sub}>뜻과 한글 발음, 가격까지 한 번에 알려줘요.</Text>

      <Pressable
        style={({ pressed }) => [styles.scanButton, pressed && styles.pressed]}
        onPress={() => navigation.navigate('스캔')}
      >
        <View style={styles.lens}>
          <View style={styles.lensInner} />
        </View>
        <View style={styles.scanTextGroup}>
          <Text style={styles.scanTitle}>메뉴판 스캔하기</Text>
          <Text style={styles.scanDesc}>카메라로 찍거나 사진을 골라요</Text>
        </View>
      </Pressable>

      <View style={styles.tiles}>
        <Pressable
          style={({ pressed }) => [styles.tile, styles.tileSky, pressed && styles.pressed]}
          onPress={() => navigation.navigate('역번역')}
        >
          <Text style={styles.tileTitle}>역번역</Text>
          <Text style={styles.tileDesc}>한국어로 물어볼 말을{'\n'}일본어로</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.tile, styles.tileYellow, pressed && styles.pressed]}
          onPress={() => navigation.navigate('히스토리')}
        >
          <Text style={styles.tileTitle}>스캔 기록</Text>
          <Text style={styles.tileDesc}>전에 번역한 메뉴를{'\n'}다시 보기</Text>
        </Pressable>
      </View>

      <View style={styles.steps}>
        <Text style={styles.stepsTitle}>이렇게 써요</Text>
        <Step n={1} text="메뉴판이 프레임 안에 들어오게 맞춰요" />
        <Step n={2} text="찍으면 메뉴마다 뜻과 읽는 법이 나와요" />
        <Step n={3} text="궁금한 메뉴는 설명 보기를 눌러요" />
      </View>
    </ScrollView>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNo}>
        <Text style={styles.stepNoText}>{n}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 40, height: 40, borderRadius: 12 },
  brand: { fontSize: type.title - 2, fontWeight: '900', color: colors.ink },
  headline: { marginTop: 28, fontSize: type.display, lineHeight: 44, fontWeight: '900', color: colors.ink },
  sub: { marginTop: 10, fontSize: type.body, color: colors.inkMuted },
  scanButton: {
    marginTop: 28,
    backgroundColor: colors.pink,
    borderRadius: radius.lg,
    paddingVertical: 24,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  lens: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lensInner: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' },
  scanTextGroup: { flex: 1, gap: 3 },
  scanTitle: { fontSize: type.title + 1, fontWeight: '900', color: '#fff' },
  scanDesc: { fontSize: type.hint + 1, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  pressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  tiles: { flexDirection: 'row', gap: 12, marginTop: 12 },
  tile: { flex: 1, borderRadius: radius.lg, padding: 20, minHeight: 132, justifyContent: 'space-between' },
  tileSky: { backgroundColor: colors.skySoft },
  tileYellow: { backgroundColor: colors.yellowSoft },
  tileTitle: { fontSize: type.title, fontWeight: '900', color: colors.ink },
  tileDesc: { fontSize: type.hint + 1, lineHeight: 19, color: colors.ink, opacity: 0.7, fontWeight: '600' },
  steps: { marginTop: 24, backgroundColor: colors.card, borderRadius: radius.lg, padding: 22, gap: 16 },
  stepsTitle: { fontSize: type.title, fontWeight: '900', color: colors.ink },
  step: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepNo: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.pinkSoft, alignItems: 'center', justifyContent: 'center' },
  stepNoText: { fontSize: 14, fontWeight: '900', color: colors.pinkDeep },
  stepText: { flex: 1, fontSize: type.body, color: colors.ink, lineHeight: 21, fontWeight: '600' },
});
