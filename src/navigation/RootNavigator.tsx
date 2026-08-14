import { View, Text, Image, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeScreen } from '../screens/HomeScreen';
import { ScanScreen } from '../screens/ScanScreen';
import { ReverseScreen } from '../screens/ReverseScreen';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();

function HomeIcon({ focused }: { focused: boolean }) {
  return (
    <Image source={require('../../assets/logo.png')} style={[styles.tabLogo, { opacity: focused ? 1 : 0.45 }]} />
  );
}

function ScanIcon({ focused }: { focused: boolean }) {
  return (
    <View style={[styles.badge, focused && styles.badgeActive]}>
      <View style={[styles.cameraGlyphOuter, focused && styles.cameraGlyphOuterActive]}>
        <View style={[styles.cameraGlyphInner, focused && styles.cameraGlyphInnerActive]} />
      </View>
    </View>
  );
}

function ReverseIcon({ focused }: { focused: boolean }) {
  return (
    <View style={[styles.badge, focused && styles.badgeActive]}>
      <Text style={[styles.badgeText, focused && styles.badgeTextActive]}>⇄</Text>
    </View>
  );
}

export function RootNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.indigo,
          tabBarInactiveTintColor: colors.inkMuted,
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            height: 56 + insets.bottom,
            paddingBottom: insets.bottom + 6,
            paddingTop: 8,
          },
          tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
        }}
      >
        <Tab.Screen name="홈" component={HomeScreen} options={{ tabBarIcon: HomeIcon }} />
        <Tab.Screen name="스캔" component={ScanScreen} options={{ tabBarIcon: ScanIcon }} />
        <Tab.Screen name="역번역" component={ReverseScreen} options={{ tabBarIcon: ReverseIcon }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabLogo: { width: 26, height: 26, borderRadius: 7 },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeActive: { backgroundColor: colors.indigo },
  badgeText: { fontSize: 15, fontWeight: '800', color: colors.inkMuted },
  badgeTextActive: { color: '#fff' },
  cameraGlyphOuter: {
    width: 15,
    height: 11,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: colors.inkMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraGlyphOuterActive: { borderColor: '#fff' },
  cameraGlyphInner: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.inkMuted },
  cameraGlyphInnerActive: { backgroundColor: '#fff' },
});
