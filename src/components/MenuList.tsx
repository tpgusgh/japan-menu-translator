import { View } from 'react-native';
import { MenuItemCard } from './MenuItemCard';
import type { MenuItem } from '../types';

export function MenuList({
  items,
  onShowDescription,
}: {
  items: MenuItem[];
  onShowDescription: (id: string) => void;
}) {
  return (
    <View>
      {items.map((item) => (
        <MenuItemCard key={item.id} item={item} onShowDescription={onShowDescription} />
      ))}
    </View>
  );
}
