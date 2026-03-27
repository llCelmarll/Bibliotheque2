import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, ActivityIndicator, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import {
    PUSH_TOKEN_KEY,
    PUSH_ENABLED_KEY,
    PUSH_PREFS_KEY,
    registerForPushNotificationsAsync,
    sendTokenToBackend,
    unregisterPushToken,
    syncPrefsToBackend,
    fetchPrefsFromBackend,
} from '@/services/pushNotificationService';

export { PUSH_PREFS_KEY };

export type PushNotificationPrefs = {
    contact_invitation: boolean;
    contact_accepted: boolean;
    loan_request: boolean;
    loan_accepted: boolean;
    loan_declined: boolean;
};

const DEFAULT_PREFS: PushNotificationPrefs = {
    contact_invitation: true,
    contact_accepted: true,
    loan_request: true,
    loan_accepted: true,
    loan_declined: true,
};

export async function getPushNotificationPrefs(): Promise<PushNotificationPrefs> {
    try {
        const raw = await AsyncStorage.getItem(PUSH_PREFS_KEY);
        if (!raw) return { ...DEFAULT_PREFS };
        return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
    } catch {
        return { ...DEFAULT_PREFS };
    }
}

const TYPE_LABELS: { key: keyof PushNotificationPrefs; label: string }[] = [
    { key: 'contact_invitation', label: 'Invitations de contact reçues' },
    { key: 'contact_accepted', label: 'Invitations acceptées' },
    { key: 'loan_request', label: 'Demandes de prêt reçues' },
    { key: 'loan_accepted', label: 'Demandes acceptées' },
    { key: 'loan_declined', label: 'Demandes refusées' },
];

export const PushNotificationsSection: React.FC = () => {
    const theme = useTheme();
    const [globalEnabled, setGlobalEnabled] = useState(true);
    const [prefs, setPrefs] = useState<PushNotificationPrefs>({ ...DEFAULT_PREFS });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            AsyncStorage.getItem(PUSH_ENABLED_KEY),
            getPushNotificationPrefs(),
            fetchPrefsFromBackend(),
        ]).then(([val, savedPrefs, backendPrefs]) => {
            setGlobalEnabled(val !== 'false');
            // Les prefs backend (multi-appareils) ont priorité sur le cache local
            const mergedPrefs = backendPrefs && Object.keys(backendPrefs).length > 0
                ? { ...DEFAULT_PREFS, ...backendPrefs }
                : savedPrefs;
            setPrefs(mergedPrefs);
            AsyncStorage.setItem(PUSH_PREFS_KEY, JSON.stringify(mergedPrefs));
            setLoading(false);
        });
    }, []);

    const handleGlobalToggle = async (value: boolean) => {
        setLoading(true);
        try {
            if (!value) {
                const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
                if (token) await unregisterPushToken(token);
                await AsyncStorage.setItem(PUSH_ENABLED_KEY, 'false');
            } else {
                const token = await registerForPushNotificationsAsync();
                if (token) await sendTokenToBackend(token);
                await AsyncStorage.setItem(PUSH_ENABLED_KEY, 'true');
            }
            setGlobalEnabled(value);
        } finally {
            setLoading(false);
        }
    };

    const handlePrefToggle = async (key: keyof PushNotificationPrefs, value: boolean) => {
        const newPrefs = { ...prefs, [key]: value };
        setPrefs(newPrefs);
        await AsyncStorage.setItem(PUSH_PREFS_KEY, JSON.stringify(newPrefs));
        await syncPrefsToBackend(newPrefs);
    };

    if (Platform.OS === 'web') return null;

    return (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Notifications</Text>
            <View style={[styles.card, { backgroundColor: theme.bgCard, shadowColor: theme.accent }]}>
                {/* Toggle global */}
                <View style={styles.row}>
                    <MaterialIcons name="notifications" size={24} color={theme.accent} />
                    <View style={styles.rowContent}>
                        <Text style={[styles.label, { color: theme.textPrimary }]}>Notifications push</Text>
                        <Text style={[styles.sublabel, { color: theme.textMuted }]}>
                            {globalEnabled ? 'Activées' : 'Désactivées'}
                        </Text>
                    </View>
                    {loading ? (
                        <ActivityIndicator size="small" color={theme.accent} />
                    ) : (
                        <Switch
                            value={globalEnabled}
                            onValueChange={handleGlobalToggle}
                            trackColor={{ false: theme.borderMedium, true: theme.accent }}
                            thumbColor={theme.textInverse}
                        />
                    )}
                </View>

                {/* Sous-toggles par type (visibles uniquement si global ON) */}
                {globalEnabled && !loading && (
                    <>
                        <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />
                        {TYPE_LABELS.map(({ key, label }, index) => (
                            <View
                                key={key}
                                style={[
                                    styles.subRow,
                                    index < TYPE_LABELS.length - 1 && styles.subRowBorder,
                                    { borderBottomColor: theme.borderLight },
                                ]}
                            >
                                <View style={styles.subRowContent}>
                                    <Text style={[styles.subLabel, { color: theme.textPrimary }]}>{label}</Text>
                                </View>
                                <Switch
                                    value={prefs[key]}
                                    onValueChange={(v) => handlePrefToggle(key, v)}
                                    trackColor={{ false: theme.borderMedium, true: theme.accent }}
                                    thumbColor={theme.textInverse}
                                />
                            </View>
                        ))}
                    </>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
    },
    card: {
        borderRadius: 12,
        padding: 16,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    rowContent: {
        flex: 1,
    },
    label: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 2,
    },
    sublabel: {
        fontSize: 13,
    },
    divider: {
        height: 1,
        marginVertical: 12,
    },
    subRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 36,
        paddingVertical: 8,
    },
    subRowBorder: {
        borderBottomWidth: 1,
    },
    subRowContent: {
        flex: 1,
    },
    subLabel: {
        fontSize: 14,
    },
});
