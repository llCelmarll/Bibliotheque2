import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform, Alert } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import * as Updates from 'expo-updates';
import ImportCSV from "@/components/ImportCSV";
import ExportCSV from "@/components/ExportCSV";
import { CalendarPreferencesSection } from "@/components/settings/CalendarPreferencesSection";
import { PushNotificationsSection } from "@/components/settings/PushNotificationsSection";
import { useTheme, useThemeControls } from "@/contexts/ThemeContext";
import { themes, ThemeName, AppTheme } from '@/constants/Theme';

export default function SettingsScreen() {
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const { themeName, setTheme } = useThemeControls();
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{
    updateId?: string;
    channel?: string;
    runtimeVersion?: string;
    createdAt?: string;
    isEmbeddedLaunch?: boolean;
    isEmergencyLaunch?: boolean;
  } | null>(null);

  useEffect(() => {
    async function fetchUpdateInfo() {
      try {
        setUpdateInfo({
          updateId: Updates.updateId || undefined,
          channel: Updates.channel || undefined,
          runtimeVersion: Updates.runtimeVersion || undefined,
          createdAt: Updates.createdAt?.toISOString() || undefined,
          isEmbeddedLaunch: Updates.isEmbeddedLaunch,
          isEmergencyLaunch: Updates.isEmergencyLaunch,
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
      <View style={[styles.loadingContainer, { backgroundColor: theme.bgPrimary }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return null; // Redirection en cours
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bgPrimary }]}>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <MaterialIcons name="settings" size={28} color={theme.accent} />
          <Text style={[styles.title, { color: theme.textPrimary }]}>Paramètres</Text>
        </View>

        {/* Section Utilisateur */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Informations utilisateur</Text>
          <View style={[styles.userCard, { backgroundColor: theme.bgCard, shadowColor: theme.accent }]}>
            <View style={styles.userInfo}>
              <MaterialIcons name="account-circle" size={60} color={theme.accent} />
              <View style={styles.userDetails}>
                <Text style={[styles.username, { color: theme.textPrimary }]}>{user?.username}</Text>
                <Text style={[styles.email, { color: theme.textSecondary }]}>{user?.email}</Text>
                <Text style={[styles.userMeta, { color: theme.textMuted }]}>
                  Compte créé le {user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR') : 'N/A'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Section Rappels calendrier */}
        <CalendarPreferencesSection />

        {/* Section Notifications push */}
        <PushNotificationsSection />

        {/* Section Gestion du compte */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Gestion du compte</Text>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.bgCard, shadowColor: theme.accent, marginBottom: 12 }]}
            onPress={() => router.push('/account/edit-profile')}
          >
            <MaterialIcons name="edit" size={24} color={theme.accent} />
            <Text style={[styles.updateButtonText, { color: theme.accent }]}>Modifier le profil</Text>
            <MaterialIcons name="chevron-right" size={24} color={theme.borderMedium} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.bgCard, shadowColor: theme.accent, marginBottom: 12 }]}
            onPress={() => router.push('/account/change-password')}
          >
            <MaterialIcons name="lock" size={24} color={theme.accent} />
            <Text style={[styles.updateButtonText, { color: theme.accent }]}>Changer le mot de passe</Text>
            <MaterialIcons name="chevron-right" size={24} color={theme.borderMedium} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.bgCard, shadowColor: theme.accent }]}
            onPress={() => router.push('/account/delete-account')}
          >
            <MaterialIcons name="delete-forever" size={24} color={theme.danger} />
            <Text style={[styles.logoutButtonText, { color: theme.danger }]}>Supprimer le compte</Text>
            <MaterialIcons name="chevron-right" size={24} color={theme.borderMedium} />
          </TouchableOpacity>
        </View>

        {/* Section Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Actions</Text>

          {Platform.OS !== 'web' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.bgCard, shadowColor: theme.accent, marginBottom: 12 }]}
              onPress={checkForUpdates}
              disabled={isCheckingUpdates}
            >
              <MaterialIcons name="system-update" size={24} color={theme.accent} />
              <Text style={[styles.updateButtonText, { color: theme.accent }]}>
                {isCheckingUpdates ? 'Vérification...' : 'Vérifier les mises à jour'}
              </Text>
              {isCheckingUpdates ? (
                <ActivityIndicator size="small" color={theme.accent} />
              ) : (
                <MaterialIcons name="chevron-right" size={24} color={theme.borderMedium} />
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.bgCard, shadowColor: theme.accent }]}
            onPress={async () => {
              try {
                await logout();
                router.replace("/auth/login");
              } catch (error) {
                console.error("Erreur lors de la déconnexion:", error);
              }
            }}
          >
            <MaterialIcons name="logout" size={24} color={theme.danger} />
            <Text style={[styles.logoutButtonText, { color: theme.danger }]}>Se déconnecter</Text>
            <MaterialIcons name="chevron-right" size={24} color={theme.borderMedium} />
          </TouchableOpacity>
        </View>

        {/* Section Import / Export CSV */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Import / Export de données</Text>
          <ExportCSV />
          {Platform.OS === 'web' && <ImportCSV />}
        </View>

        {/* Section Informations */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Application</Text>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.bgCard, shadowColor: theme.accent, marginBottom: 12 }]}
            onPress={() => router.push('/account/changelog')}
          >
            <MaterialIcons name="new-releases" size={24} color={theme.accent} />
            <Text style={[styles.updateButtonText, { color: theme.accent }]}>Historique des versions</Text>
            <MaterialIcons name="chevron-right" size={24} color={theme.borderMedium} />
          </TouchableOpacity>

          {/* Sélecteur de thème */}
          <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginTop: 16, marginBottom: 10 }]}>Apparence</Text>
          <View style={styles.themesGrid}>
            {(Object.entries(themes) as [ThemeName, AppTheme][]).map(([name, t]) => (
              <TouchableOpacity
                key={name}
                onPress={() => setTheme(name)}
                style={[
                  styles.themeCard,
                  {
                    backgroundColor: t.bgPrimary,
                    borderColor: themeName === name ? t.accent : t.borderLight,
                    borderWidth: themeName === name ? 2 : 1,
                  },
                ]}
              >
                {/* Mini UI preview */}
                <View style={[styles.themePreviewContainer, { backgroundColor: t.bgSecondary }]}>
                  {/* Header bar */}
                  <View style={[styles.themePreviewHeader, { backgroundColor: t.bgCard, borderBottomColor: t.borderLight }]}>
                    <View style={[styles.themePreviewDot, { backgroundColor: t.accent }]} />
                    <View style={[styles.themePreviewLine, { backgroundColor: t.borderLight, width: '50%' }]} />
                  </View>
                  {/* Book card */}
                  <View style={[styles.themePreviewBookCard, { backgroundColor: t.bgCard, borderColor: t.borderLight }]}>
                    <View style={[styles.themePreviewCover, { backgroundColor: t.accentLight }]}>
                      <View style={[styles.themePreviewCoverAccent, { backgroundColor: t.accent }]} />
                    </View>
                    <View style={styles.themePreviewBookInfo}>
                      <View style={[styles.themePreviewLine, { backgroundColor: t.textPrimary, width: '80%', marginBottom: 3 }]} />
                      <View style={[styles.themePreviewLine, { backgroundColor: t.textMuted, width: '55%', marginBottom: 6 }]} />
                      <View style={[styles.themePreviewBadge, { backgroundColor: t.accentLight }]}>
                        <View style={[{ width: 16, height: 3, borderRadius: 2, backgroundColor: t.accent }]} />
                      </View>
                    </View>
                  </View>
                </View>
                {/* Label + check */}
                <View style={styles.themeCardFooter}>
                  <Text style={[styles.themeCardLabel, { color: t.textPrimary }]}>{t.label}</Text>
                  {themeName === name && (
                    <MaterialIcons name="check-circle" size={14} color={t.accent} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.infoCard, { backgroundColor: theme.bgCard, shadowColor: theme.accent }]}>
            <Text style={[styles.infoText, { color: theme.textMuted }]}>Version de développement</Text>
            <Text style={[styles.infoText, { color: theme.textMuted }]}>Authentification activée</Text>
            <Text style={[styles.infoText, { color: theme.textMuted }]}>Bibliothèque personnelle</Text>

            {/* Debug OTA - Informations dynamiques */}
            {Platform.OS !== 'web' && (
              <>
                <Text style={[styles.infoText, { color: theme.textSecondary, marginTop: 12, fontWeight: '600' }]}>
                  Informations OTA :
                </Text>
                <Text style={[styles.infoText, { color: theme.textMuted }]}>
                  Channel : {updateInfo?.channel || 'Non défini'}
                </Text>
                <Text style={[styles.infoText, { color: theme.textMuted }]}>
                  RuntimeVersion : {updateInfo?.runtimeVersion || 'Non défini'}
                </Text>
                <Text style={[styles.infoText, { color: theme.textMuted }]}>
                  Update ID : {updateInfo?.updateId || 'Aucune mise à jour'}
                </Text>
                {updateInfo?.createdAt && (
                  <Text style={[styles.infoText, { color: theme.textMuted }]}>
                    Date update : {new Date(updateInfo.createdAt).toLocaleString('fr-FR')}
                  </Text>
                )}
                <Text style={[styles.infoText, { color: theme.textMuted }]}>
                  Embedded launch : {updateInfo?.isEmbeddedLaunch ? 'Oui' : 'Non'}
                </Text>
                <Text style={[styles.infoText, { color: theme.textMuted }]}>
                  Emergency launch : {updateInfo?.isEmergencyLaunch ? 'Oui' : 'Non'}
                </Text>
              </>
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
    paddingTop: Platform.OS === 'android' ? 40 : Platform.OS === 'ios' ? 44 : 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    padding: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  userCard: {
    borderRadius: 12,
    padding: 20,
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
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    marginBottom: 4,
  },
  userMeta: {
    fontSize: 14,
  },
  actionButton: {
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
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
    fontWeight: "500",
    flex: 1,
    marginLeft: 12,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
    marginLeft: 12,
  },
  infoCard: {
    borderRadius: 12,
    padding: 20,
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
    marginBottom: 8,
  },
  themesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  themeCard: {
    width: '47%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  themePreviewContainer: {
    padding: 8,
    gap: 6,
  },
  themePreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    padding: 5,
    borderRadius: 6,
    borderBottomWidth: 1,
  },
  themePreviewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  themePreviewLine: {
    height: 4,
    borderRadius: 2,
  },
  themePreviewBookCard: {
    flexDirection: 'row',
    gap: 7,
    padding: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  themePreviewCover: {
    width: 24,
    height: 34,
    borderRadius: 3,
    justifyContent: 'flex-end',
    padding: 3,
  },
  themePreviewCoverAccent: {
    height: 4,
    borderRadius: 2,
  },
  themePreviewBookInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  themePreviewBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  themeCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  themeCardLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  themeCheckIcon: {
    marginTop: 0,
  },
});
