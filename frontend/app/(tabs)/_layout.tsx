import { useEffect } from "react";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, StyleSheet } from "react-native";
import { checkForUpdate } from "@/utils/versionCheck";
import { NotificationsProvider, useNotifications } from "@/contexts/NotificationsContext";

function TabLayoutInner() {
  const router = useRouter();
  const { totalPendingCount: totalNotifications } = useNotifications();

  useEffect(() => {
    checkForUpdate();
  }, []);

  return (
    <Tabs screenOptions={{
      headerShown: false, // Cache le header par défaut pour tous les onglets
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
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
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
      <TabLayoutInner />
    </NotificationsProvider>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#F44336',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
});
