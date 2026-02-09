import { Platform, Alert, Linking } from 'react-native';
import Constants from 'expo-constants';
import API_CONFIG from '@/config/api';

const DOWNLOAD_URL = 'https://mabibliotheque.ovh/bibliotheque.apk';

/**
 * Compare deux versions semver (ex: "1.0.0" < "1.1.0")
 * Retourne true si current < required
 */
function isVersionOlder(current: string, required: string): boolean {
    const [cMajor, cMinor, cPatch] = current.split('.').map(Number);
    const [rMajor, rMinor, rPatch] = required.split('.').map(Number);

    if (cMajor !== rMajor) return cMajor < rMajor;
    if (cMinor !== rMinor) return cMinor < rMinor;
    return cPatch < rPatch;
}

/**
 * Verifie si une mise a jour de l'app est disponible.
 * Appelle /health pour comparer min_app_version avec la version installee.
 * Affiche un popup non-bloquant si une mise a jour est necessaire.
 * Uniquement sur mobile (pas pertinent sur web).
 */
export async function checkForUpdate(): Promise<void> {
    if (Platform.OS === 'web') return;

    try {
        const currentVersion = Constants.expoConfig?.version || '0.0.0';
        const response = await fetch(`${API_CONFIG.BASE_URL}/health`);
        const data = await response.json();
        const minVersion = data.min_app_version;

        if (!minVersion) return;

        if (isVersionOlder(currentVersion, minVersion)) {
            Alert.alert(
                'Mise à jour disponible',
                'Une nouvelle version de l\'application est disponible avec de nouvelles fonctionnalités.',
                [
                    { text: 'Plus tard', style: 'cancel' },
                    {
                        text: 'Télécharger',
                        onPress: () => Linking.openURL(DOWNLOAD_URL),
                    },
                ]
            );
        }
    } catch (err) {
        // Silencieux : ne pas bloquer l'app si la verification echoue
        console.warn('Version check failed:', err);
    }
}
