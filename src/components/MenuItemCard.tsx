import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { MenuItem } from '../types';
import { colors, type, radius } from '../theme';

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
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{index + 1}</Text>
        </View>
        <Text style={styles.original}>{item.original}</Text>
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
    borderRadius: radius.md,
    padding: 16,
    marginHorizontal: 12,
    marginVertical: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  original: { fontSize: type.hint, textDecorationLine: 'line-through', color: colors.original },
  translated: { fontSize: type.translated, fontWeight: '700', color: colors.ink },
  pronunciation: { fontSize: type.body, color: colors.pronunciation, fontWeight: '600' },
  chip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.chip,
    borderRadius: radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  chipText: { fontSize: type.hint, color: colors.primary, fontWeight: '600' },
  desc: { fontSize: type.body, color: colors.inkMuted, marginTop: 8, lineHeight: 20 },
});
