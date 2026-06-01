import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, ActivityIndicator, Platform, Alert,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/contexts/ThemeContext';
import { useMagazineIssueDetail } from '@/hooks/useMagazineDetail';
import { magazineService } from '@/services/magazineService';
import BookCover from '@/components/BookCover';

export default function IssueEditScreen() {
    const { seriesId, issueId } = useLocalSearchParams<{ seriesId: string; issueId: string }>();
    const sId = parseInt(seriesId, 10);
    const iId = parseInt(issueId, 10);
    const theme = useTheme();
    const router = useRouter();
    const { issue, loading, refetch } = useMagazineIssueDetail(iId);

    const [title, setTitle] = useState('');
    const [publishedDate, setPublishedDate] = useState('');
    const [notes, setNotes] = useState('');
    const [rating, setRating] = useState(0);
    const [coverUri, setCoverUri] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        refetch();
    }, [refetch]);

    useEffect(() => {
        if (issue) {
            setTitle(issue.title || '');
            setPublishedDate(issue.published_date || '');
            setNotes(issue.notes || '');
            setRating(issue.rating || 0);
        }
    }, [issue]);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
        });
        if (!result.canceled) {
            setCoverUri(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            await magazineService.updateIssue(iId, {
                title: title.trim() || undefined,
                published_date: publishedDate.trim() || undefined,
                notes: notes.trim() || undefined,
                rating: rating || undefined,
            });
            if (coverUri) {
                await magazineService.uploadIssueCover(iId, coverUri);
            }
            router.back();
        } catch {
            setError('Impossible de sauvegarder les modifications');
            setSaving(false);
        }
    };

    const issueLabel = issue?.issue_number != null ? `#${issue.issue_number}` : 'Numéro';

    return (
        <>
            <Stack.Screen
                options={{
                    title: `Modifier ${issueLabel}`,
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
            {loading ? (
                <View style={[styles.center, { backgroundColor: theme.bgSecondary }]}>
                    <ActivityIndicator size="large" color={theme.accent} />
                </View>
            ) : (
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
                        {/* Couverture */}
                        <TouchableOpacity onPress={pickImage} style={styles.coverPicker}>
                            <BookCover
                                url={coverUri || issue?.cover_url}
                                containerStyle={styles.coverContainer}
                                style={styles.coverImg}
                                resizeMode="contain"
                            />
                            <View style={[styles.coverOverlay, { backgroundColor: theme.accent + 'CC' }]}>
                                <MaterialIcons name="photo-camera" size={24} color={theme.textInverse} />
                                <Text style={[styles.coverOverlayText, { color: theme.textInverse }]}>Changer</Text>
                            </View>
                        </TouchableOpacity>

                        <Text style={[styles.label, { color: theme.textSecondary }]}>Titre du numéro</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.bgInput, color: theme.textPrimary, borderColor: theme.borderLight }]}
                            placeholder="Titre spécifique (optionnel)"
                            placeholderTextColor={theme.textMuted}
                            value={title}
                            onChangeText={setTitle}
                        />

                        <Text style={[styles.label, { color: theme.textSecondary }]}>Date de parution</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.bgInput, color: theme.textPrimary, borderColor: theme.borderLight }]}
                            placeholder="Ex : 2023-11, Novembre 2023"
                            placeholderTextColor={theme.textMuted}
                            value={publishedDate}
                            onChangeText={setPublishedDate}
                        />

                        <Text style={[styles.label, { color: theme.textSecondary }]}>Note (0-5)</Text>
                        <View style={styles.stars}>
                            {[1, 2, 3, 4, 5].map(star => (
                                <TouchableOpacity key={star} onPress={() => setRating(rating === star ? 0 : star)}>
                                    <Text style={[styles.star, { color: star <= rating ? theme.accent : theme.textMuted }]}>
                                        {star <= rating ? '★' : '☆'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={[styles.label, { color: theme.textSecondary }]}>Notes personnelles</Text>
                        <TextInput
                            style={[styles.textarea, { backgroundColor: theme.bgInput, color: theme.textPrimary, borderColor: theme.borderLight }]}
                            placeholder="Vos notes..."
                            placeholderTextColor={theme.textMuted}
                            value={notes}
                            onChangeText={setNotes}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.saveButton, { backgroundColor: theme.accent }]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color={theme.textInverse} />
                        ) : (
                            <Text style={[styles.saveButtonText, { color: theme.textInverse }]}>Enregistrer</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    container: { flex: 1 },
    content: { padding: 16, gap: 16 },
    errorBanner: { padding: 12, borderRadius: 8 },
    errorText: { fontSize: 14 },
    card: { padding: 16, gap: 8 },
    coverPicker: {
        alignSelf: 'center',
        marginBottom: 8,
    },
    coverContainer: {
        width: 100,
        height: 150,
        borderRadius: 8,
    },
    coverImg: {
        width: 100,
        height: 150,
        borderRadius: 8,
    },
    coverOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingVertical: 6,
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
        gap: 2,
    },
    coverOverlayText: { fontSize: 11, fontWeight: '600' },
    label: { fontSize: 13, fontWeight: '600', marginTop: 8 },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === 'ios' ? 12 : 8,
        fontSize: 16,
    },
    textarea: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingTop: 10,
        fontSize: 15,
        minHeight: 100,
    },
    stars: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
    },
    star: { fontSize: 28 },
    saveButton: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveButtonText: { fontSize: 16, fontWeight: '700' },
});
