import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { useEffect } from "react";
import { useSegments } from "expo-router";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";

export default function Index() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading } = useAuth();


  useEffect(() => {
    if (!isLoading) {
      const currentSegment = segments.join('/');

      setTimeout(() => {
        if (isAuthenticated && !currentSegment.includes('books')) {
          router.replace('/(tabs)/books');
        } else if (!isAuthenticated && !currentSegment.includes('auth')) {
          router.replace('/auth/login');
        }
      }, 200);
    }
  }, [isAuthenticated, isLoading, router, segments]);


  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }
  // Afficher un texte si le composant est monté et isLoading est faux
  return (
    <View style={styles.container}>
      <ActivityIndicator size="small" color="#2196F3" />
      <View style={{ marginTop: 20 }}>
        <Text>Page Index rendue</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});
