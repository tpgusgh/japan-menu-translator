import { Text, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../screens/HomeScreen';
import { ScanScreen } from '../screens/ScanScreen';
import { ReverseScreen } from '../screens/ReverseScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();

function TabLabel({ focused, children }: { focused: boolean; children: string }) {
  return <Text style={[styles.label, focused && styles.labelActive]}>{children}</Text>;
}

const navTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.bg } };

// Text-only tabs: the current page sits in a soft pink pill. No emoji or drawn glyphs, so
// the bar looks identical on every Android skin.
export function RootNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.pinkDeep,
          tabBarInactiveTintColor: colors.inkMuted,
          // No custom height/padding here -- @react-navigation/bottom-tabs already
          // measures the device's safe-area bottom inset itself and sizes the bar
          // accordingly. A manual height computed from our own insets read ended up
          // wrong on some Samsung devices (gesture bar still overlapped); trusting
          // the library's own default sizing is the more portable fix.
          tabBarStyle: { backgroundColor: colors.card, borderTopWidth: 0, elevation: 0 },
          tabBarIconStyle: { display: 'none' },
          tabBarItemStyle: { justifyContent: 'center' },
          tabBarLabel: ({ focused, children }) => <TabLabel focused={focused}>{children}</TabLabel>,
        }}
      >
        <Tab.Screen name="홈" component={HomeScreen} />
        <Tab.Screen name="스캔" component={ScanScreen} />
        <Tab.Screen name="역번역" component={ReverseScreen} />
        <Tab.Screen name="히스토리" component={HistoryScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '800', color: colors.inkMuted, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, overflow: 'hidden' },
  labelActive: { color: colors.pinkDeep, backgroundColor: colors.pinkSoft },
});
