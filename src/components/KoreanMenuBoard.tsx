import { View, Text, StyleSheet } from 'react-native';
import type { MenuItem } from '../types';
import { colors, type, radius, shadow } from '../theme';

export function KoreanMenuBoard({ items }: { items: MenuItem[] }) {
  if (items.length === 0) return null;

  return (
    <View style={styles.board}>
      <Text style={styles.title}>한글 메뉴판</Text>
      {items.map((item, index) => (
        <View key={item.id} style={styles.row}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{index + 1}</Text>
          </View>
          <Text style={styles.name} numberOfLines={2}>
            {item.translated}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    marginHorizontal: 14,
    marginTop: 12,
    padding: 18,
    gap: 10,
    ...shadow,
  },
  title: { fontSize: type.hint, color: colors.inkMuted, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  name: { flex: 1, fontSize: type.translated, fontWeight: '700', color: colors.ink },
});
