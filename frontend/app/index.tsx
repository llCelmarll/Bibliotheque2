import { Redirect } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { useEffect } from "react";
import { useRouter } from "expo-router";

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Écouter les changements d'authentification pour rediriger
  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace("/(tabs)/books");
      } else {
        router.replace("/auth/login");
      }
    }
  }, [isAuthenticated, isLoading, router]);

  // Affichage d'un loader pendant la vérification de l'authentification
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  // Par défaut, redirection en fonction de l'état d'authentification
  if (isAuthenticated) {
    return <Redirect href="/(tabs)/books" />;
  } else {
    return <Redirect href="/auth/login" />;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});
