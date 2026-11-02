import { View, Text, StyleSheet } from 'react-native';
import { MenuItemCard } from './MenuItemCard';
import type { MenuItem } from '../types';
import { colors, radius, type } from '../theme';
import { useExchangeRate } from '../lib/useExchangeRate';
import { per100Yen } from '../lib/exchange';

export function MenuList({
  items,
  onShowDescription,
  embedded,
}: {
  items: MenuItem[];
  onShowDescription: (id: string) => void;
  embedded?: boolean;
}) {
  const rate = useExchangeRate();
  const hasPrice = items.some((i) => i.price);
  if (items.length === 0) return null;
  return (
    <View style={embedded ? styles.embedded : styles.list}>
      {!embedded && (
        <View style={styles.header}>
          <Text style={styles.title}>메뉴 {items.length}개</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>번역 완료</Text>
          </View>
        </View>
      )}
      {hasPrice && rate && (
        <Text style={styles.rateNote}>
          100엔 = {per100Yen(rate.rate)} · {rate.date} 기준{rate.stale ? ' (저장된 환율)' : ''}
        </Text>
      )}
      {items.map((item, index) => (
        <MenuItemCard
          key={item.id}
          item={item}
          index={index}
          onShowDescription={onShowDescription}
          krwPerYen={rate?.rate}
          last={index === items.length - 1}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingTop: 20, gap: 10 },
  embedded: { gap: 8, padding: 8, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingBottom: 4 },
  rateNote: { fontSize: type.hint, fontWeight: '700', color: colors.inkMuted, paddingHorizontal: 4, marginTop: -4 },
  title: { fontSize: type.title + 2, fontWeight: '900', color: colors.ink },
  badge: { backgroundColor: colors.skySoft, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  badgeText: { fontSize: type.hint, fontWeight: '800', color: colors.skyDeep },
});
