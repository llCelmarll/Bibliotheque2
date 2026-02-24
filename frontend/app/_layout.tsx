import { View, ActivityIndicator } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack , SplashScreen } from 'expo-router';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider } from '@/contexts/AuthContext';
import { UpdateChecker } from '@/components/UpdateChecker';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '/',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  // Ajout de la logique de redirection ici
  return (
    <AuthProvider>
      <UpdateChecker />
      <AuthRedirectWrapper>
        <RootLayoutNav />
      </AuthRedirectWrapper>
    </AuthProvider>
  );
}

import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect as useReactEffect, useRef } from 'react';

function AuthRedirectWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading } = useAuth();
  const initialCheckDone = useRef(false);

  // Redirection uniquement au démarrage de l'app (une seule fois quand isLoading passe à false)
  useReactEffect(() => {
    // Ne s'exécute qu'une seule fois après le chargement initial
    if (!isLoading && !initialCheckDone.current) {
      initialCheckDone.current = true;

      const currentSegment = segments.join('/');
      const isRoot = currentSegment === '' || currentSegment === '/';

      // Redirection vers books si authentifié et sur la racine
      if (isAuthenticated && isRoot) {
        router.replace('/(tabs)/books');
      }
      // Redirection vers login si pas authentifié et à la racine
      else if (!isAuthenticated && isRoot) {
        router.replace('/auth/login');
      }
    }
  }, [isLoading, isAuthenticated, segments, router]);

  // Afficher un loader UNIQUEMENT pendant le check initial d'authentification
  // Pas pendant les opérations login/register
  if (isLoading && !initialCheckDone.current) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }
  return children;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        <Stack.Screen name="auth/register" options={{ headerShown: false }} />
        <Stack.Screen name="auth/forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="auth/reset-password" options={{ headerShown: false }} />
        <Stack.Screen name="account/change-password" options={{ headerShown: true, title: 'Changer le mot de passe' }} />
        <Stack.Screen name="account/edit-profile" options={{ headerShown: true, title: 'Modifier le profil' }} />
        <Stack.Screen name="account/delete-account" options={{ headerShown: true, title: 'Supprimer le compte' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen 
          name="scan" 
          options={{ 
            headerShown: false,
            gestureEnabled: false,
          }} 
        />
      </Stack>
    </ThemeProvider>
  );
}
