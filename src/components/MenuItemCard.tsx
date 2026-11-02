import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { MenuItem } from '../types';
import { colors, radius, type } from '../theme';
import { formatKrw, parseYen } from '../lib/exchange';

// One sticker per dish: Korean name big, how to say it as a pink pill, the Japanese as
// printed underneath, and the price as a highlighter-yellow pill on the right.
export function MenuItemCard({
  item,
  onShowDescription,
  krwPerYen,
}: {
  item: MenuItem;
  index?: number;
  last?: boolean;
  onShowDescription: (id: string) => void;
  krwPerYen?: number | null;
}) {
  const yen = parseYen(item.price);
  const krw = yen && krwPerYen ? formatKrw(yen, krwPerYen) : null;
  return (
    <View style={styles.card}>
      <View style={styles.topLine}>
        <Text style={styles.translated}>{item.translated}</Text>
        {item.price ? (
          <View style={styles.priceGroup}>
            {krw ? <Text style={styles.krw}>{krw}</Text> : null}
            <View style={styles.pricePill}>
              <Text style={styles.price}>{item.price}</Text>
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.readingLine}>
        <View style={styles.readingPill}>
          <Text style={styles.reading}>{item.pronunciation}</Text>
        </View>
        <Text style={styles.original} numberOfLines={1}>
          {item.original}
        </Text>
      </View>

      {item.descriptionState === 'idle' && (
        <Pressable onPress={() => onShowDescription(item.id)} hitSlop={8} style={styles.moreButton}>
          <Text style={styles.moreText}>설명 보기</Text>
        </Pressable>
      )}
      {item.descriptionState === 'loading' && <Text style={styles.desc}>불러오는 중...</Text>}
      {item.descriptionState === 'loaded' && <Text style={styles.desc}>{item.description}</Text>}
      {item.descriptionState === 'unavailable' && (
        <Text style={styles.desc}>설명을 찾을 수 없어요. 오프라인이거나 관련 항목이 없어요.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: 18, gap: 10 },
  topLine: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  translated: { flex: 1, fontSize: type.translated, fontWeight: '900', color: colors.ink, lineHeight: 28 },
  priceGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  krw: { fontSize: type.hint, fontWeight: '800', color: colors.inkMuted },
  pricePill: { backgroundColor: colors.yellow, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  price: { fontSize: type.hint + 1, fontWeight: '900', color: colors.ink, fontVariant: ['tabular-nums'] },
  readingLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  readingPill: { backgroundColor: colors.pinkSoft, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4 },
  reading: { fontSize: type.body, fontWeight: '800', color: colors.pinkDeep },
  original: { flexShrink: 1, fontSize: type.hint + 1, color: colors.original, fontWeight: '600' },
  moreButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.skySoft,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  moreText: { fontSize: type.hint, color: colors.skyDeep, fontWeight: '800' },
  desc: { fontSize: type.body, color: colors.inkMuted, lineHeight: 22 },
});
