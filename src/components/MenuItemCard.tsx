import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { MenuItem } from '../types';

export function MenuItemCard({
  item,
  onShowDescription,
}: {
  item: MenuItem;
  onShowDescription: (id: string) => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.original}>{item.original}</Text>
      <Text style={styles.pronunciation}>{item.pronunciation}</Text>
      <Text style={styles.translated}>{item.translated}</Text>

      {item.descriptionState === 'idle' && (
        <Pressable onPress={() => onShowDescription(item.id)}>
          <Text style={styles.link}>설명 보기</Text>
        </Pressable>
      )}
      {item.descriptionState === 'loading' && <Text style={styles.desc}>불러오는 중...</Text>}
      {item.descriptionState === 'loaded' && <Text style={styles.desc}>{item.description}</Text>}
      {item.descriptionState === 'unavailable' && (
        <Text style={styles.desc}>오프라인 상태이거나 설명을 찾을 수 없습니다.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 12, borderBottomWidth: 1, borderColor: '#eee', gap: 4 },
  original: { fontSize: 13, textDecorationLine: 'line-through', color: '#888' },
  pronunciation: { fontSize: 13, color: '#c00' },
  translated: { fontSize: 18, fontWeight: '700' },
  link: { fontSize: 13, color: '#06c' },
  desc: { fontSize: 13, color: '#333', marginTop: 4 },
});
