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
      {items.map((item, index) => (
        <MenuItemCard key={item.id} item={item} index={index} onShowDescription={onShowDescription} />
      ))}
    </View>
  );
}
