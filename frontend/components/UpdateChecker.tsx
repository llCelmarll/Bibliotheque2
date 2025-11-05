import { useEffect } from 'react';
import * as Updates from 'expo-updates';
import { Platform, Alert } from 'react-native';

export function UpdateChecker() {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    async function checkForUpdates() {
      try {
        console.log('🔍 Checking for updates...');
        const update = await Updates.checkForUpdateAsync();
        
        if (update.isAvailable) {
          console.log('✅ Update available! Downloading...');
          await Updates.fetchUpdateAsync();
          console.log('✅ Update downloaded! Reloading...');
          
          // Informer l'utilisateur et recharger
          Alert.alert(
            'Mise à jour disponible',
            'Une nouvelle version est disponible. L\'application va redémarrer.',
            [
              {
                text: 'OK',
                onPress: async () => {
                  await Updates.reloadAsync();
                }
              }
            ]
          );
        } else {
          console.log('ℹ️ No updates available');
        }
      } catch (error) {
        console.error('❌ Error checking for updates:', error);
      }
    }

    // Vérifier immédiatement
    checkForUpdates();
  }, []);

  return null;
}
