import { useCallback } from 'react';
import { View, Text, Image, Pressable, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setStatusBarStyle } from 'expo-status-bar';
import { colors, type, radius, shadow, gradients, glowShadow } from '../theme';

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
    }, [])
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <LinearGradient
        colors={gradients.brand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 28 }]}
      >
        <View style={styles.heroSheen} pointerEvents="none" />
        <Image source={require('../../assets/logo.png')} style={styles.heroLogo} />
        <Text style={styles.heroTitle}>메뉴 렌즈</Text>
        <Text style={styles.heroSubtitle}>일본 메뉴판을 사진 한 장으로{'\n'}한국어로 바꿔드려요</Text>
      </LinearGradient>

      <View style={styles.actions}>
        <Pressable style={styles.actionCard} onPress={() => navigation.navigate('스캔')}>
          <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionIcon}>
            <View style={styles.cameraGlyphOuter}>
              <View style={styles.cameraGlyphInner} />
            </View>
          </LinearGradient>
          <View style={styles.actionTextGroup}>
            <Text style={styles.actionTitle}>메뉴판 스캔하기</Text>
            <Text style={styles.actionDesc}>카메라로 찍으면 바로 번역돼요</Text>
          </View>
          <Text style={styles.actionArrow}>›</Text>
        </Pressable>

        <Pressable style={styles.actionCard} onPress={() => navigation.navigate('역번역')}>
          <View style={[styles.actionIcon, styles.actionIconAlt]}>
            <Text style={styles.actionIconTextAlt}>⇄</Text>
          </View>
          <View style={styles.actionTextGroup}>
            <Text style={styles.actionTitle}>역번역</Text>
            <Text style={styles.actionDesc}>한국어로 물어볼 말을 일본어로</Text>
          </View>
          <Text style={styles.actionArrow}>›</Text>
        </Pressable>
      </View>

      <View style={styles.stepsCard}>
        <Text style={styles.stepsTitle}>이렇게 써요</Text>
        <Step number={1} text="메뉴판을 스캔 프레임 안에 맞춰요" />
        <Step number={2} text="촬영하면 자동으로 번역돼요" />
        <Step number={3} text="궁금한 메뉴는 설명 보기를 눌러요" />
      </View>
    </ScrollView>
  );
}

function Step({ number, text }: { number: number; text: string }) {
  return (
    <View style={styles.step}>
      <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.stepBadge}>
        <Text style={styles.stepBadgeText}>{number}</Text>
      </LinearGradient>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  hero: {
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    overflow: 'hidden',
  },
  heroSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  heroLogo: { width: 72, height: 72, borderRadius: 20, marginBottom: 14, ...glowShadow },
  heroTitle: { fontSize: type.display, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  heroSubtitle: {
    fontSize: type.body,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 21,
  },
  actions: { paddingHorizontal: 16, marginTop: -18, gap: 12 },
  actionCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    ...shadow,
  },
  actionIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  actionIconAlt: { backgroundColor: colors.chip },
  actionIconTextAlt: { fontSize: 22, fontWeight: '800', color: colors.indigo },
  cameraGlyphOuter: {
    width: 24,
    height: 18,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraGlyphInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  actionTextGroup: { flex: 1, gap: 2 },
  actionTitle: { fontSize: type.body, fontWeight: '800', color: colors.ink },
  actionDesc: { fontSize: 12, color: colors.inkMuted },
  actionArrow: { fontSize: 24, color: colors.original, fontWeight: '700' },
  stepsCard: {
    marginTop: 24,
    marginHorizontal: 16,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 14,
  },
  stepsTitle: { fontSize: 12, fontWeight: '800', color: colors.indigo, letterSpacing: 0.5, textTransform: 'uppercase' },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBadge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stepBadgeText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  stepText: { flex: 1, fontSize: type.body, color: colors.ink, fontWeight: '500' },
});
