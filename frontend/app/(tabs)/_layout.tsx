import { useEffect } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { checkForUpdate } from "@/utils/versionCheck";

export default function TabLayout() {
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
      />
      <Tabs.Screen
        name="loans"
        options={{
          title: "Prêts & Emprunts",
          tabBarIcon: ({ color, size}) => (
            <Ionicons name="swap-horizontal-outline" size={size} color={color} />
          ),
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
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Réglages",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
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