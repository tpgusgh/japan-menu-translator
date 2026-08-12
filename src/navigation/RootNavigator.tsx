import { useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DownloadScreen } from '../screens/DownloadScreen';
import { ScanScreen } from '../screens/ScanScreen';
import { ReverseScreen } from '../screens/ReverseScreen';

const Tab = createBottomTabNavigator();

export function RootNavigator() {
  const [ready, setReady] = useState(false);
  const handleReady = useCallback(() => setReady(true), []);

  if (!ready) {
    return <DownloadScreen onReady={handleReady} />;
  }

  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={{ headerShown: false }}>
        <Tab.Screen name="스캔" component={ScanScreen} />
        <Tab.Screen name="역번역" component={ReverseScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
