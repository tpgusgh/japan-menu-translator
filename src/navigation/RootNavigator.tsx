import { View, Text, Image, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ScanScreen } from '../screens/ScanScreen';
import { ReverseScreen } from '../screens/ReverseScreen';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();

function ScanIcon({ focused }: { focused: boolean }) {
  return (
    <Image
      source={require('../../assets/logo.png')}
      style={[styles.tabLogo, { opacity: focused ? 1 : 0.45 }]}
    />
  );
}

function ReverseIcon({ focused }: { focused: boolean }) {
  return (
    <View style={[styles.reverseIcon, focused && styles.reverseIconActive]}>
      <Text style={[styles.reverseIconText, focused && styles.reverseIconTextActive]}>⇄</Text>
    </View>
  );
}

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.indigo,
          tabBarInactiveTintColor: colors.inkMuted,
          tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border, height: 64, paddingBottom: 8, paddingTop: 8 },
          tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
        }}
      >
        <Tab.Screen name="스캔" component={ScanScreen} options={{ tabBarIcon: ScanIcon }} />
        <Tab.Screen name="역번역" component={ReverseScreen} options={{ tabBarIcon: ReverseIcon }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabLogo: { width: 26, height: 26, borderRadius: 7 },
  reverseIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reverseIconActive: { backgroundColor: colors.indigo },
  reverseIconText: { fontSize: 15, fontWeight: '800', color: colors.inkMuted },
  reverseIconTextActive: { color: '#fff' },
});
