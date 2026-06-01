import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { magazineService } from '@/services/magazineService';

function parseRange(input: string): number[] | null {
    const numbers = new Set<number>();
    try {
        for (const part of input.split(',')) {
            const p = part.trim();
            if (!p) continue;
            if (p.includes('-')) {
                const [a, b] = p.split('-').map(s => parseInt(s.trim(), 10));
                if (isNaN(a) || isNaN(b) || a > b || b - a > 5000) return null;
                for (let n = a; n <= b; n++) numbers.add(n);
            } else {
                const n = parseInt(p, 10);
                if (isNaN(n)) return null;
                numbers.add(n);
            }
        }
    } catch {
        return null;
    }
    return [...numbers].sort((a, b) => a - b);
}

export default function AddIssuesScreen() {
    const { seriesId } = useLocalSearchParams<{ seriesId: string }>();
    const id = parseInt(seriesId, 10);
    const theme = useTheme();
    const router = useRouter();

    const [rangeInput, setRangeInput] = useState('');
    const [datePrefix, setDatePrefix] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const parsed = rangeInput.trim() ? parseRange(rangeInput) : null;
    const preview = parsed ? parsed.slice(0, 10) : null;
    const previewMore = parsed && parsed.length > 10 ? parsed.length - 10 : 0;
    const isValid = parsed !== null && parsed.length > 0;

    const handleAdd = async () => {
        if (!isValid || !parsed) return;
        setSaving(true);
        setError(null);
        try {
            const created = await magazineService.bulkCreateIssues(id, {
                issue_range: rangeInput.trim(),
                published_date_prefix: datePrefix.trim() || undefined,
            });
            const skipped = parsed.length - created.length;
            const msg = skipped > 0
                ? `${created.length} numéro(s) créé(s), ${skipped} déjà existant(s) ignoré(s).`
                : `${created.length} numéro(s) créé(s) avec succès.`;
            Alert.alert('Succès', msg, [{ text: 'OK', onPress: () => router.back() }]);
        } catch {
            setError('Impossible de créer les numéros');
            setSaving(false);
        }
    };

    return (
        <>
            <Stack.Screen
                options={{
                    title: 'Ajouter des numéros',
                    headerShown: true,
                    headerStyle: { backgroundColor: theme.bgCard },
                    headerTitleStyle: { color: theme.textPrimary },
                    headerTintColor: theme.textPrimary,
                    headerLeft: () => (
                        <MaterialIcons
                            name="arrow-back"
                            size={24}
                            color={theme.textPrimary}
                            style={{ marginLeft: 16 }}
                            onPress={() => router.back()}
                        />
                    ),
                }}
            />
            <ScrollView
                style={[styles.container, { backgroundColor: theme.bgSecondary }]}
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
            >
                {!!error && (
                    <View style={[styles.errorBanner, { backgroundColor: theme.dangerBg }]}>
                        <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
                    </View>
                )}

                <View style={[styles.card, { backgroundColor: theme.bgCard, borderRadius: theme.radiusCard }]}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>
                        Numéros à ajouter *
                    </Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.bgInput, color: theme.textPrimary, borderColor: isValid || !rangeInput ? theme.borderLight : theme.danger }]}
                        placeholder="Ex : 480-510, 520, 525"
                        placeholderTextColor={theme.textMuted}
                        value={rangeInput}
                        onChangeText={setRangeInput}
                        autoFocus
                        keyboardType="default"
                    />
                    <Text style={[styles.hint, { color: theme.textMuted }]}>
                        Utilisez des plages (480-510) et/ou des numéros séparés par des virgules
                    </Text>

                    {/* Prévisualisation */}
                    {rangeInput.trim().length > 0 && (
                        <View style={[styles.preview, { backgroundColor: theme.bgSecondary, borderColor: theme.borderLight }]}>
                            {!isValid ? (
                                <Text style={[styles.previewError, { color: theme.danger }]}>
                                    Format invalide
                                </Text>
                            ) : (
                                <>
                                    <Text style={[styles.previewTitle, { color: theme.textSecondary }]}>
                                        {parsed!.length} numéro(s) :
                                    </Text>
                                    <Text style={[styles.previewNumbers, { color: theme.textPrimary }]}>
                                        {preview!.map(n => `#${n}`).join('  ')}
                                        {previewMore > 0 ? `  … et ${previewMore} autres` : ''}
                                    </Text>
                                </>
                            )}
                        </View>
                    )}

                    <Text style={[styles.label, { color: theme.textSecondary, marginTop: 16 }]}>
                        Date / Année (optionnel)
                    </Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.bgInput, color: theme.textPrimary, borderColor: theme.borderLight }]}
                        placeholder="Ex : 2023, 2023-11"
                        placeholderTextColor={theme.textMuted}
                        value={datePrefix}
                        onChangeText={setDatePrefix}
                    />
                    <Text style={[styles.hint, { color: theme.textMuted }]}>
                        Sera appliquée à tous les numéros créés
                    </Text>
                </View>

                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: isValid ? theme.accent : theme.bgMuted }]}
                    onPress={handleAdd}
                    disabled={!isValid || saving}
                >
                    {saving ? (
                        <ActivityIndicator color={theme.textInverse} />
                    ) : (
                        <Text style={[styles.saveButtonText, { color: isValid ? theme.textInverse : theme.textMuted }]}>
                            Ajouter {parsed ? `${parsed.length} numéro${parsed.length > 1 ? 's' : ''}` : ''}
                        </Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 16, gap: 16 },
    errorBanner: { padding: 12, borderRadius: 8 },
    errorText: { fontSize: 14 },
    card: { padding: 16, gap: 6 },
    label: { fontSize: 13, fontWeight: '600', marginTop: 4 },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === 'ios' ? 12 : 8,
        fontSize: 16,
    },
    hint: { fontSize: 12, lineHeight: 16 },
    preview: {
        marginTop: 8,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        gap: 4,
    },
    previewTitle: { fontSize: 13, fontWeight: '600' },
    previewNumbers: { fontSize: 14, lineHeight: 22 },
    previewError: { fontSize: 14 },
    saveButton: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveButtonText: { fontSize: 16, fontWeight: '700' },
});
