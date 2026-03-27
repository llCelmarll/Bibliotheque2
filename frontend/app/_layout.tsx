import { View, ActivityIndicator } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack , SplashScreen } from 'expo-router';
import { useEffect } from 'react';
import 'react-native-reanimated';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PUSH_ENABLED_KEY, PUSH_PREFS_KEY } from '@/services/pushNotificationService';

// Afficher les notifications même quand l'app est en foreground, selon les préférences
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const globalEnabled = await AsyncStorage.getItem(PUSH_ENABLED_KEY);
    if (globalEnabled === 'false') {
      return { shouldShowAlert: false, shouldPlaySound: false, shouldSetBadge: false };
    }
    const notifType = (notification.request.content.data as any)?.type as string | undefined;
    if (notifType) {
      const rawPrefs = await AsyncStorage.getItem(PUSH_PREFS_KEY);
      const prefs = rawPrefs ? JSON.parse(rawPrefs) : {};
      if (prefs[notifType] === false) {
        return { shouldShowAlert: false, shouldPlaySound: false, shouldSetBadge: false };
      }
    }
    return { shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false };
  },
});

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppThemeProvider } from '@/contexts/ThemeContext';
import { UpdateChecker } from '@/components/UpdateChecker';
import { WhatsNewModal } from '@/components/WhatsNewModal';
import { useChangelog } from '@/utils/useChangelog';

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
    <AppThemeProvider>
      <AuthProvider>
        <UpdateChecker />
        <AuthRedirectWrapper>
          <RootLayoutNav />
        </AuthRedirectWrapper>
      </AuthProvider>
    </AppThemeProvider>
  );
}

import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect as useReactEffect, useRef, useState } from 'react';

function AuthRedirectWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading } = useAuth();
  const theme = useTheme();
  const initialCheckDone = useRef(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const { hasNew, latestEntry, markAsSeen, loading: changelogLoading } = useChangelog();

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

  // Afficher le popup nouveautés une fois authentifié et changelog chargé
  useReactEffect(() => {
    if (isAuthenticated && !changelogLoading && hasNew && latestEntry) {
      setShowWhatsNew(true);
    }
  }, [isAuthenticated, changelogLoading, hasNew, latestEntry]);

  // Naviguer vers l'écran pertinent quand l'utilisateur tape une notification
  useReactEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as any;
      if (!isAuthenticated) return;
      if (data?.screen) {
        router.push(data.screen);
      } else {
        // Par défaut : aller sur l'écran notifications
        router.push('/(tabs)/loans/(subtabs)/notifications');
      }
    });
    return () => subscription.remove();
  }, [isAuthenticated, router]);

  const handleCloseWhatsNew = () => {
    setShowWhatsNew(false);
    markAsSeen();
  };

  // Afficher un loader UNIQUEMENT pendant le check initial d'authentification
  // Pas pendant les opérations login/register
  if (isLoading && !initialCheckDone.current) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bgPrimary }}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }
  return (
    <>
      {children}
      {showWhatsNew && latestEntry && (
        <WhatsNewModal
          visible={showWhatsNew}
          entry={latestEntry}
          onClose={handleCloseWhatsNew}
        />
      )}
    </>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const theme = useTheme();

  const themedHeader = {
    headerStyle: { backgroundColor: theme.bgCard },
    headerTitleStyle: { color: theme.textPrimary },
    headerTintColor: theme.textPrimary,
  };

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        <Stack.Screen name="auth/register" options={{ headerShown: false }} />
        <Stack.Screen name="auth/forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="auth/reset-password" options={{ headerShown: false }} />
        <Stack.Screen name="account/change-password" options={{ headerShown: true, title: 'Changer le mot de passe', ...themedHeader }} />
        <Stack.Screen name="account/edit-profile" options={{ headerShown: true, title: 'Modifier le profil', ...themedHeader }} />
        <Stack.Screen name="account/delete-account" options={{ headerShown: true, title: 'Supprimer le compte', ...themedHeader }} />
        <Stack.Screen name="account/changelog" options={{ headerShown: true, title: 'Historique des versions', ...themedHeader }} />
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
