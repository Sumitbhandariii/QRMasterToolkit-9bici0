import { AlertProvider } from '@/template';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AppProvider } from '@/contexts/AppContext';

export default function RootLayout() {
  return (
    <AlertProvider>
      <SafeAreaProvider>
        <AppProvider>
          <StatusBar style="dark" backgroundColor="#FFFFFF" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="scan-result"
              options={{
                headerShown: true,
                headerTitle: 'Scan Result',
                headerTintColor: '#22C55E',
                headerStyle: { backgroundColor: '#FFFFFF' },
                headerShadowVisible: false,
              }}
            />
            <Stack.Screen
              name="qr-detail"
              options={{
                headerShown: true,
                headerTitle: 'QR Code',
                headerTintColor: '#22C55E',
                headerStyle: { backgroundColor: '#FFFFFF' },
                headerShadowVisible: false,
              }}
            />
            <Stack.Screen
              name="scan-from-phone"
              options={{
                headerShown: true,
                headerTitle: 'Scan From Gallery',
                headerTintColor: '#22C55E',
                headerStyle: { backgroundColor: '#FFFFFF' },
                headerShadowVisible: false,
              }}
            />
          </Stack>
        </AppProvider>
      </SafeAreaProvider>
    </AlertProvider>
  );
}
