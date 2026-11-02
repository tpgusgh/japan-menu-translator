import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MenuItem } from '../types';

export interface HistoryEntry {
  id: string;
  createdAt: number;
  photoUri: string;
  items: MenuItem[];
}

const STORAGE_KEY = 'menu_scan_history';
// ponytail: flat JSON blob is plenty at this size; a real DB is overkill for a
// capped local list. Raise MAX_ENTRIES if that stops being true.
const MAX_ENTRIES = 30;

export async function loadHistory(): Promise<HistoryEntry[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

export async function addHistoryEntry(photoUri: string, items: MenuItem[]): Promise<void> {
  const entry: HistoryEntry = { id: `${Date.now()}`, createdAt: Date.now(), photoUri, items };
  const existing = await loadHistory();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([entry, ...existing].slice(0, MAX_ENTRIES)));
}

export async function removeHistoryEntry(id: string): Promise<void> {
  const existing = await loadHistory();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existing.filter((e) => e.id !== id)));
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
