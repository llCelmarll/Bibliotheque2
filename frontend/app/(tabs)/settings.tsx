import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform, Alert } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import * as Updates from 'expo-updates';
import ImportCSV from "@/components/ImportCSV";

export default function SettingsScreen() {
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{id?: string, createdAt?: string} | null>(null);

  useEffect(() => {
    async function fetchUpdateInfo() {
      try {
        const info = await import('expo-updates');
        setUpdateInfo({
          id: info.manifest?.id || info.updateId || undefined
        });
      } catch (e) {
        setUpdateInfo(null);
      }
    }
    fetchUpdateInfo();
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [isAuthenticated, isLoading, router]);

  const checkForUpdates = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Non disponible', 'Les mises à jour automatiques ne sont pas disponibles sur le web.');
      return;
    }

    setIsCheckingUpdates(true);
    try {
      console.log('🔍 Checking for updates...');
      const update = await Updates.checkForUpdateAsync();
      
      if (update.isAvailable) {
        console.log('✅ Update available! Downloading...');
        Alert.alert(
          'Mise à jour disponible',
          'Une nouvelle version est disponible. Téléchargement en cours...',
          [{ text: 'OK' }]
        );
        
        await Updates.fetchUpdateAsync();
        console.log('✅ Update downloaded! Reloading...');
        
        Alert.alert(
          'Mise à jour téléchargée',
          'L\'application va redémarrer pour appliquer la mise à jour.',
          [
            {
              text: 'Redémarrer',
              onPress: async () => {
                await Updates.reloadAsync();
              }
            }
          ]
        );
      } else {
        console.log('ℹ️ No updates available');
        Alert.alert('À jour', 'Vous avez déjà la dernière version de l\'application.');
      }
    } catch (error) {
      console.error('❌ Error checking for updates:', error);
      Alert.alert('Erreur', 'Impossible de vérifier les mises à jour. Veuillez réessayer plus tard.');
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return null; // Redirection en cours
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>⚙️ Paramètres</Text>

        {/* Section Utilisateur */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations utilisateur</Text>
          <View style={styles.userCard}>
            <View style={styles.userInfo}>
              <MaterialIcons name="account-circle" size={60} color="#2196F3" />
              <View style={styles.userDetails}>
                <Text style={styles.username}>{user?.username}</Text>
                <Text style={styles.email}>{user?.email}</Text>
                <Text style={styles.userMeta}>
                  Compte créé le {user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR') : 'N/A'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Section Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>

          {Platform.OS !== 'web' && (
            <TouchableOpacity 
              style={[styles.actionButton, { marginBottom: 12 }]} 
              onPress={checkForUpdates}
              disabled={isCheckingUpdates}
            >
              <MaterialIcons name="system-update" size={24} color="#2196F3" />
              <Text style={styles.updateButtonText}>
                {isCheckingUpdates ? 'Vérification...' : 'Vérifier les mises à jour'}
              </Text>
              {isCheckingUpdates ? (
                <ActivityIndicator size="small" color="#2196F3" />
              ) : (
                <MaterialIcons name="chevron-right" size={24} color="#ccc" />
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={async () => {
              try {
                await logout();
                router.replace("/auth/login");
              } catch (error) {
                console.error("Erreur lors de la déconnexion:", error);
              }
            }}
          >
            <MaterialIcons name="logout" size={24} color="#f44336" />
            <Text style={styles.logoutButtonText}>Se déconnecter</Text>
            <MaterialIcons name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* Section Import CSV (Web uniquement) */}
        {Platform.OS === 'web' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Import de données</Text>
            <ImportCSV />
          </View>
        )}

        {/* Section Informations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Application</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>Version de développement</Text>
            <Text style={styles.infoText}>Authentification activée</Text>
            <Text style={styles.infoText}>Bibliothèque personnelle</Text>
            {/* Ajout de l'info de mise à jour OTA */}
            {updateInfo?.id && (
              <Text style={styles.infoText}>
                Dernière mise à jour OTA : {updateInfo.id}
              </Text>
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 30,
    color: "#333",
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  userCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  userDetails: {
    marginLeft: 16,
    flex: 1,
  },
  username: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: "#666",
    marginBottom: 4,
  },
  userMeta: {
    fontSize: 14,
    color: "#999",
  },
  actionButton: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  updateButtonText: {
    fontSize: 16,
    color: "#2196F3",
    fontWeight: "500",
    flex: 1,
    marginLeft: 12,
  },
  logoutButtonText: {
    fontSize: 16,
    color: "#f44336",
    fontWeight: "500",
    flex: 1,
    marginLeft: 12,
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
});
