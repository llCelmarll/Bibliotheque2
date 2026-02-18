import { useEffect } from "react";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { checkForUpdate } from "@/utils/versionCheck";

export default function TabLayout() {
  const router = useRouter();

  useEffect(() => {
    checkForUpdate();
  }, []);

  return (
    <Tabs screenOptions={{
      headerShown: false // Cache le header par défaut pour tous les onglets
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
            <Ionicons name="swap-horizontal-outline" size={size} color={color} />
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
