import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { MenuItem } from '../types';
import { colors, type, radius, shadow, gradients } from '../theme';

export function MenuItemCard({
  item,
  index,
  onShowDescription,
}: {
  item: MenuItem;
  index: number;
  onShowDescription: (id: string) => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.badge}>
          <Text style={styles.badgeText}>{index + 1}</Text>
        </LinearGradient>
        <Text style={styles.original}>{item.original}</Text>
        {item.price && (
          <View style={styles.priceChip}>
            <Text style={styles.price}>{item.price}</Text>
          </View>
        )}
      </View>
      <Text style={styles.translated}>{item.translated}</Text>
      <Text style={styles.pronunciation}>{item.pronunciation}</Text>

      {item.descriptionState === 'idle' && (
        <Pressable style={styles.chip} onPress={() => onShowDescription(item.id)}>
          <Text style={styles.chipText}>설명 보기</Text>
        </Pressable>
      )}
      {item.descriptionState === 'loading' && <Text style={styles.desc}>불러오는 중...</Text>}
      {item.descriptionState === 'loaded' && <Text style={styles.desc}>{item.description}</Text>}
      {item.descriptionState === 'unavailable' && (
        <Text style={styles.desc}>설명을 찾을 수 없습니다. (오프라인이거나 관련 항목 없음)</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginHorizontal: 14,
    marginVertical: 8,
    gap: 6,
    ...shadow,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
  priceChip: {
    marginLeft: 'auto',
    backgroundColor: colors.chip,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  price: { fontSize: type.hint, color: colors.indigo, fontWeight: '700' },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  original: { fontSize: type.hint, textDecorationLine: 'line-through', color: colors.original },
  translated: { fontSize: type.translated, fontWeight: '800', color: colors.ink },
  pronunciation: { fontSize: type.body, color: colors.pronunciation, fontWeight: '600' },
  chip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.chip,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginTop: 8,
  },
  chipText: { fontSize: type.hint, color: colors.indigo, fontWeight: '700' },
  desc: { fontSize: type.body, color: colors.inkMuted, marginTop: 8, lineHeight: 20 },
});
