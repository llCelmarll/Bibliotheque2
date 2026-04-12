import { useEffect } from "react";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, StyleSheet } from "react-native";
import { checkForUpdate } from "@/utils/versionCheck";
import { NotificationsProvider, useNotifications } from "@/contexts/NotificationsContext";
import { useTheme } from "@/contexts/ThemeContext";

const isStaging = process.env.EXPO_PUBLIC_APP_VARIANT === 'staging';

function TabLayoutInner() {
  const router = useRouter();
  const { totalPendingCount: totalNotifications } = useNotifications();
  const theme = useTheme();

  useEffect(() => {
    checkForUpdate();
  }, []);

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: theme.tabActive,
      tabBarInactiveTintColor: theme.tabInactive,
      tabBarStyle: { backgroundColor: theme.tabBg },
    }}>
      <Tabs.Screen
        name="books"
        options={{
          title: "Livres",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" size={size} color={color} />
          ),
        }}
        listeners={{
          tabPress: () => {
            router.replace('/(tabs)/books');
          },
        }}
      />
      <Tabs.Screen
        name="loans"
        options={{
          title: "Prêts & Emprunts",
          tabBarIcon: ({ color, size}) => (
            <View>
              <Ionicons name="swap-horizontal-outline" size={size} color={color} />
              {totalNotifications > 0 && (
                <View style={[styles.badge, { backgroundColor: theme.danger }]}>
                  <Text style={[styles.badgeText, { color: theme.textInverse }]}>
                    {totalNotifications > 9 ? '9+' : totalNotifications}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
        listeners={{
          tabPress: () => {
            router.replace('/(tabs)/loans/(subtabs)/loans-list');
          },
        }}
      />
      <Tabs.Screen
        name="borrowed"
        options={{
          href: null, // Masqué - intégré dans l'onglet Prêts & Emprunts
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: "Scanner",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="camera-outline" size={size} color={color} />
          ),
        }}
        listeners={{
          tabPress: () => {
            router.replace('/(tabs)/scanner');
          },
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Réglages",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
        listeners={{
          tabPress: () => {
            router.replace('/(tabs)/settings');
          },
        }}
      />
      <Tabs.Screen
        name="borrows"
        options={{
          href: null, // Cache cet onglet de la barre de navigation
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  return (
    <NotificationsProvider>
      <View style={{ flex: 1 }}>
        {isStaging && (
          <View style={styles.stagingBanner}>
            <Text style={styles.stagingBannerText}>⚗ PRÉPRODUCTION</Text>
          </View>
        )}
        <TabLayoutInner />
      </View>
    </NotificationsProvider>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  stagingBanner: {
    backgroundColor: '#e67e00',
    alignItems: 'center',
    paddingVertical: 4,
  },
  stagingBannerText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
