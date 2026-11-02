import { useCallback, useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setStatusBarStyle } from 'expo-status-bar';
import { loadHistory, removeHistoryEntry, type HistoryEntry } from '../lib/history';
import { fetchSummary } from '../lib/wikipedia';
import { MenuList } from '../components/MenuList';
import type { MenuItem } from '../types';
import { colors, type, radius } from '../theme';

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function HistoryScreen() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark');
      loadHistory().then(setEntries);
    }, [])
  );

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((cur) => (cur === id ? null : id));
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    await removeHistoryEntry(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const updateEntryItem = useCallback((entryId: string, itemId: string, patch: Partial<MenuItem>) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId ? { ...e, items: e.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)) } : e
      )
    );
  }, []);

  const handleShowDescription = useCallback(
    async (entry: HistoryEntry, itemId: string) => {
      updateEntryItem(entry.id, itemId, { descriptionState: 'loading' });
      const item = entry.items.find((it) => it.id === itemId);
      if (!item) return;
      const summary = await fetchSummary(item.translated);
      updateEntryItem(entry.id, itemId, { description: summary, descriptionState: summary ? 'loaded' : 'unavailable' });
    },
    [updateEntryItem]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <Text style={styles.header}>스캔 기록</Text>
      <Text style={styles.subheader}>{entries.length > 0 ? `지금까지 ${entries.length}번 스캔했어요` : '번역한 메뉴판이 여기에 쌓여요'}</Text>
      <FlatList
        data={entries}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>아직 스캔한 메뉴판이 없어요.{"\n"}스캔 탭에서 메뉴판을 찍어 보세요.</Text>}
        renderItem={({ item: entry }) => {
          const expanded = expandedId === entry.id;
          return (
            <View style={styles.card}>
              <Pressable style={styles.cardRow} onPress={() => toggleExpand(entry.id)}>
                <Image source={{ uri: entry.photoUri }} style={styles.thumb} />
                <View style={styles.cardTextGroup}>
                  <Text style={styles.cardDate}>{formatDate(entry.createdAt)}</Text>
                  <Text style={styles.cardCount}>메뉴 {entry.items.length}개</Text>
                </View>
                <Pressable style={styles.deleteButton} onPress={() => handleDelete(entry.id)}>
                  <Text style={styles.deleteButtonText}>삭제</Text>
                </Pressable>
              </Pressable>
              {expanded && (
                <View style={styles.expanded}>
                  <MenuList embedded items={entry.items} onShowDescription={(itemId) => handleShowDescription(entry, itemId)} />
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { fontSize: type.display, fontWeight: '900', color: colors.ink, paddingHorizontal: 20 },
  subheader: { fontSize: type.body, color: colors.inkMuted, paddingHorizontal: 20, marginTop: 4, marginBottom: 16, fontWeight: '600' },
  listContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  emptyText: { textAlign: 'center', color: colors.inkMuted, marginTop: 60, fontSize: type.body, lineHeight: 24, fontWeight: '600' },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  thumb: { width: 60, height: 60, borderRadius: radius.sm, backgroundColor: colors.chip },
  cardTextGroup: { flex: 1, gap: 3 },
  cardDate: { fontSize: type.body + 1, fontWeight: '900', color: colors.ink },
  cardCount: { fontSize: 13, color: colors.inkMuted, fontWeight: '600' },
  deleteButton: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.pinkSoft },
  deleteButtonText: { fontSize: 13, color: colors.pinkDeep, fontWeight: '800' },
  expanded: { paddingBottom: 4 },
});
