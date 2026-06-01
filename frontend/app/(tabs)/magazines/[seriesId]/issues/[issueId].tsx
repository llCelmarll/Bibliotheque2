import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, ActivityIndicator,
    TouchableOpacity, Alert, Platform,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useMagazineIssueDetail } from '@/hooks/useMagazineDetail';
import { ErrorMessage } from '@/components/ErrorMessage';
import BookCover from '@/components/BookCover';
import { magazineService } from '@/services/magazineService';

export default function IssueDetailScreen() {
    const { seriesId, issueId } = useLocalSearchParams<{ seriesId: string; issueId: string }>();
    const sId = parseInt(seriesId, 10);
    const iId = parseInt(issueId, 10);
    const theme = useTheme();
    const router = useRouter();
    const { issue, loading, error, refetch } = useMagazineIssueDetail(iId);
    const [togglingRead, setTogglingRead] = useState(false);

    useEffect(() => {
        refetch();
    }, [refetch]);

    const handleToggleRead = async () => {
        if (!issue) return;
        setTogglingRead(true);
        try {
            const newValue = issue.is_read ? null : true;
            await magazineService.updateReadStatus(iId, newValue);
            refetch();
        } catch {
            Alert.alert('Erreur', 'Impossible de mettre à jour le statut de lecture');
        } finally {
            setTogglingRead(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Supprimer le numéro',
            `Supprimer ce numéro définitivement ?`,
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await magazineService.deleteIssue(iId);
                            router.back();
                        } catch {
                            Alert.alert('Erreur', 'Impossible de supprimer le numéro');
                        }
                    },
                },
            ],
        );
    };

    const label = issue?.issue_number != null ? `#${issue.issue_number}` : issue?.title || 'Numéro';

    return (
        <>
            <Stack.Screen
                options={{
                    title: label,
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
                    headerRight: () => (
                        <View style={{ flexDirection: 'row', gap: 16, marginRight: 16 }}>
                            <TouchableOpacity onPress={() => router.push(`/(tabs)/magazines/${sId}/issues/${iId}/edit`)}>
                                <MaterialIcons name="edit" size={22} color={theme.accent} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleDelete}>
                                <MaterialIcons name="delete-outline" size={22} color={theme.danger} />
                            </TouchableOpacity>
                        </View>
                    ),
                }}
            />

            {loading ? (
                <View style={[styles.center, { backgroundColor: theme.bgCard }]}>
                    <ActivityIndicator size="large" color={theme.accent} />
                </View>
            ) : error ? (
                <ErrorMessage message={error} onRetry={refetch} />
            ) : issue ? (
                <ScrollView style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
                    {/* En-tête */}
                    <View style={[styles.header, { backgroundColor: theme.bgCard }]}>
                        <BookCover
                            url={issue.cover_url}
                            containerStyle={styles.cover}
                            style={styles.cover}
                            resizeMode="contain"
                        />
                        <View style={styles.headerInfo}>
                            <Text style={[styles.issueLabel, { color: theme.textPrimary }]}>{label}</Text>
                            {!!issue.title && issue.issue_number != null && (
                                <Text style={[styles.issueTitle, { color: theme.textSecondary }]}>{issue.title}</Text>
                            )}
                            {!!issue.series_title && (
                                <Text style={[styles.seriesName, { color: theme.textMuted }]}>{issue.series_title}</Text>
                            )}
                            {!!issue.published_date && (
                                <Text style={[styles.date, { color: theme.textMuted }]}>{issue.published_date}</Text>
                            )}
                        </View>
                    </View>

                    {/* Statut prêt */}
                    {issue.current_loan && (
                        <View style={[styles.loanBanner, { backgroundColor: theme.warningBg, borderColor: theme.warning }]}>
                            <MaterialIcons name="swap-horiz" size={18} color={theme.warning} />
                            <Text style={[styles.loanText, { color: theme.warning }]}>
                                Prêté à {issue.current_loan.contact?.name || '—'}
                            </Text>
                        </View>
                    )}

                    {/* Actions rapides */}
                    <View style={[styles.actions, { backgroundColor: theme.bgCard }]}>
                        <TouchableOpacity
                            style={[
                                styles.actionBtn,
                                { backgroundColor: issue.is_read ? theme.successBg : theme.bgMuted },
                            ]}
                            onPress={handleToggleRead}
                            disabled={togglingRead}
                        >
                            {togglingRead ? (
                                <ActivityIndicator size="small" color={theme.success} />
                            ) : (
                                <>
                                    <Ionicons
                                        name={issue.is_read ? 'checkmark-circle' : 'ellipse-outline'}
                                        size={20}
                                        color={issue.is_read ? theme.success : theme.textMuted}
                                    />
                                    <Text style={[styles.actionBtnText, { color: issue.is_read ? theme.success : theme.textMuted }]}>
                                        {issue.is_read ? 'Lu' : 'Marquer comme lu'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>

                        {issue.is_lendable && !issue.current_loan && (
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: theme.accentLight }]}
                                onPress={() => router.push(`/(tabs)/magazines/${sId}/issues/${iId}/loan`)}
                            >
                                <MaterialIcons name="swap-horiz" size={20} color={theme.accent} />
                                <Text style={[styles.actionBtnText, { color: theme.accent }]}>Prêter</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Notes */}
                    {!!issue.notes && (
                        <View style={[styles.section, { backgroundColor: theme.bgCard }]}>
                            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Notes</Text>
                            <Text style={[styles.notes, { color: theme.textPrimary }]}>{issue.notes}</Text>
                        </View>
                    )}

                    {/* Note / rating */}
                    {issue.rating != null && issue.rating > 0 && (
                        <View style={[styles.section, { backgroundColor: theme.bgCard }]}>
                            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Note</Text>
                            <Text style={[styles.rating, { color: theme.accent }]}>
                                {'★'.repeat(issue.rating)}{'☆'.repeat(5 - issue.rating)}
                            </Text>
                        </View>
                    )}
                </ScrollView>
            ) : null}
        </>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        padding: 16,
        gap: 16,
        marginBottom: 8,
    },
    cover: {
        width: 90,
        height: 130,
        borderRadius: 6,
    },
    headerInfo: {
        flex: 1,
        justifyContent: 'center',
        gap: 4,
    },
    issueLabel: { fontSize: 22, fontWeight: '800' },
    issueTitle: { fontSize: 14 },
    seriesName: { fontSize: 13 },
    date: { fontSize: 12 },
    loanBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        marginHorizontal: 8,
        marginBottom: 8,
        borderRadius: 10,
        borderWidth: 1,
    },
    loanText: { fontSize: 14, fontWeight: '600' },
    actions: {
        flexDirection: 'row',
        gap: 10,
        padding: 12,
        marginBottom: 8,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 10,
    },
    actionBtnText: { fontSize: 14, fontWeight: '600' },
    section: {
        padding: 16,
        marginBottom: 8,
        gap: 6,
    },
    sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    notes: { fontSize: 15, lineHeight: 22 },
    rating: { fontSize: 22, letterSpacing: 2 },
});
