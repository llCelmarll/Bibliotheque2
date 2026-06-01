import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, ActivityIndicator, Platform, Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { magazineService } from '@/services/magazineService';
import { Periodicity } from '@/types/magazine';

const PERIODICITIES: { value: Periodicity; label: string }[] = [
    { value: 'monthly', label: 'Mensuel' },
    { value: 'weekly', label: 'Hebdomadaire' },
    { value: 'quarterly', label: 'Trimestriel' },
    { value: 'irregular', label: 'Irrégulier' },
];

export default function CreateSeriesScreen() {
    const theme = useTheme();
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [publisher, setPublisher] = useState('');
    const [periodicity, setPeriodicity] = useState<Periodicity | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const canSave = title.trim().length > 0;

    const handleSave = async () => {
        if (!canSave) return;
        setSaving(true);
        setError(null);
        try {
            const series = await magazineService.createSeries({
                title: title.trim(),
                publisher: publisher.trim() || undefined,
                periodicity: periodicity || undefined,
            });
            router.replace(`/(tabs)/magazines/${series.id}`);
        } catch {
            setError('Impossible de créer la série');
            setSaving(false);
        }
    };

    return (
        <>
            <Stack.Screen
                options={{
                    title: 'Nouvelle série',
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
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Titre *</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.bgInput, color: theme.textPrimary, borderColor: theme.borderLight }]}
                        placeholder="Ex : White Dwarf, Géo, Science & Vie..."
                        placeholderTextColor={theme.textMuted}
                        value={title}
                        onChangeText={setTitle}
                        autoFocus
                    />

                    <Text style={[styles.label, { color: theme.textSecondary }]}>Éditeur</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.bgInput, color: theme.textPrimary, borderColor: theme.borderLight }]}
                        placeholder="Ex : Games Workshop, Prisma Media..."
                        placeholderTextColor={theme.textMuted}
                        value={publisher}
                        onChangeText={setPublisher}
                    />

                    <Text style={[styles.label, { color: theme.textSecondary }]}>Périodicité</Text>
                    <View style={styles.chips}>
                        {PERIODICITIES.map((p) => {
                            const selected = periodicity === p.value;
                            return (
                                <TouchableOpacity
                                    key={p.value}
                                    onPress={() => setPeriodicity(selected ? null : p.value)}
                                    style={[
                                        styles.chip,
                                        {
                                            backgroundColor: selected ? theme.accent : theme.bgMuted,
                                            borderRadius: theme.radiusChip,
                                        },
                                    ]}
                                >
                                    <Text style={[styles.chipText, { color: selected ? theme.textInverse : theme.textSecondary }]}>
                                        {p.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                <TouchableOpacity
                    style={[
                        styles.saveButton,
                        { backgroundColor: canSave ? theme.accent : theme.bgMuted },
                    ]}
                    onPress={handleSave}
                    disabled={!canSave || saving}
                >
                    {saving ? (
                        <ActivityIndicator color={theme.textInverse} />
                    ) : (
                        <Text style={[styles.saveButtonText, { color: canSave ? theme.textInverse : theme.textMuted }]}>
                            Créer la série
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
    errorBanner: {
        padding: 12,
        borderRadius: 8,
    },
    errorText: { fontSize: 14 },
    card: {
        padding: 16,
        gap: 8,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        marginTop: 8,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === 'ios' ? 12 : 8,
        fontSize: 16,
    },
    chips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 4,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 7,
    },
    chipText: { fontSize: 14, fontWeight: '500' },
    saveButton: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '700',
    },
});
