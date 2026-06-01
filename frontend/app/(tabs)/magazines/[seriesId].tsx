import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, ActivityIndicator,
    TouchableOpacity, Alert, Platform,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useMagazineDetail } from '@/hooks/useMagazineDetail';
import { MagazineIssueItem } from '@/components/MagazineIssueItem';
import { ErrorMessage } from '@/components/ErrorMessage';
import BookCover from '@/components/BookCover';
import { magazineService } from '@/services/magazineService';
import { MagazineIssue } from '@/types/magazine';

export default function SeriesDetailScreen() {
    const { seriesId } = useLocalSearchParams<{ seriesId: string }>();
    const id = parseInt(seriesId, 10);
    const theme = useTheme();
    const router = useRouter();
    const { series, issues, loading, error, refetch } = useMagazineDetail(id);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        refetch();
    }, [refetch]);

    const handleDelete = () => {
        Alert.alert(
            'Supprimer la série',
            `Supprimer "${series?.title}" et tous ses numéros ?`,
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: async () => {
                        setDeleting(true);
                        try {
                            await magazineService.deleteSeries(id);
                            router.replace('/(tabs)/magazines');
                        } catch {
                            Alert.alert('Erreur', 'Impossible de supprimer la série');
                            setDeleting(false);
                        }
                    },
                },
            ],
        );
    };

    const readCount = issues.filter(i => i.is_read === true).length;
    const lentCount = issues.filter(i => !!i.current_loan).length;

    return (
        <>
            <Stack.Screen
                options={{
                    title: series?.title || 'Série',
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
                            onPress={() => router.replace('/(tabs)/magazines')}
                        />
                    ),
                    headerRight: () => (
                        <View style={{ flexDirection: 'row', gap: 16, marginRight: 16 }}>
                            <TouchableOpacity onPress={() => router.push(`/(tabs)/magazines/${id}/add-issues`)}>
                                <MaterialIcons name="add-circle-outline" size={24} color={theme.accent} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleDelete} disabled={deleting}>
                                <MaterialIcons name="delete-outline" size={24} color={theme.danger} />
                            </TouchableOpacity>
                        </View>
                    ),
                }}
            />

            {loading ? (
                <View style={[styles.center, { backgroundColor: theme.bgSecondary }]}>
                    <ActivityIndicator size="large" color={theme.accent} />
                </View>
            ) : error ? (
                <ErrorMessage message={error} onRetry={refetch} />
            ) : (
                <FlatList
                    style={{ backgroundColor: theme.bgSecondary }}
                    data={issues}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => <MagazineIssueItem issue={item} seriesId={id} />}
                    ListHeaderComponent={
                        <View style={[styles.header, { backgroundColor: theme.bgCard }]}>
                            {/* Couverture + infos */}
                            <View style={styles.headerTop}>
                                <BookCover
                                    url={series?.cover_url}
                                    containerStyle={styles.cover}
                                    style={styles.cover}
                                    resizeMode="contain"
                                />
                                <View style={styles.headerInfo}>
                                    <Text style={[styles.seriesTitle, { color: theme.textPrimary }]}>
                                        {series?.title}
                                    </Text>
                                    {!!series?.publisher && (
                                        <Text style={[styles.publisher, { color: theme.textSecondary }]}>
                                            {series.publisher}
                                        </Text>
                                    )}
                                    {!!series?.periodicity && (
                                        <Text style={[styles.periodicity, { color: theme.textMuted }]}>
                                            {periodicityLabel(series.periodicity)}
                                        </Text>
                                    )}
                                </View>
                            </View>

                            {/* Stats */}
                            <View style={[styles.stats, { borderTopColor: theme.borderLight }]}>
                                <StatItem icon="collections" value={issues.length} label="numéros" theme={theme} />
                                <StatItem icon="check-circle" value={readCount} label="lus" theme={theme} />
                                {lentCount > 0 && (
                                    <StatItem icon="swap-horiz" value={lentCount} label="prêtés" theme={theme} />
                                )}
                            </View>

                            {/* Bouton ajout */}
                            <TouchableOpacity
                                style={[styles.addIssuesBtn, { backgroundColor: theme.accentLight, borderColor: theme.accent }]}
                                onPress={() => router.push(`/(tabs)/magazines/${id}/add-issues`)}
                            >
                                <MaterialIcons name="add" size={18} color={theme.accent} />
                                <Text style={[styles.addIssuesBtnText, { color: theme.accent }]}>Ajouter des numéros</Text>
                            </TouchableOpacity>

                            <Text style={[styles.issuesHeader, { color: theme.textSecondary, borderBottomColor: theme.borderLight }]}>
                                Numéros ({issues.length})
                            </Text>
                        </View>
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyIssues}>
                            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                                Aucun numéro — ajoutez-en via le bouton ci-dessus
                            </Text>
                        </View>
                    }
                />
            )}
        </>
    );
}

function periodicityLabel(p: string) {
    const map: Record<string, string> = {
        monthly: 'Mensuel',
        weekly: 'Hebdomadaire',
        quarterly: 'Trimestriel',
        irregular: 'Irrégulier',
    };
    return map[p] ?? p;
}

function StatItem({ icon, value, label, theme }: any) {
    return (
        <View style={styles.statItem}>
            <MaterialIcons name={icon} size={20} color={theme.accent} />
            <Text style={[styles.statValue, { color: theme.textPrimary }]}>{value}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        marginBottom: 8,
    },
    headerTop: {
        flexDirection: 'row',
        padding: 16,
        gap: 16,
    },
    cover: {
        width: 80,
        height: 120,
        borderRadius: 6,
    },
    headerInfo: {
        flex: 1,
        justifyContent: 'center',
        gap: 4,
    },
    seriesTitle: {
        fontSize: 20,
        fontWeight: '800',
    },
    publisher: {
        fontSize: 14,
    },
    periodicity: {
        fontSize: 13,
    },
    stats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 12,
        borderTopWidth: 1,
        marginHorizontal: 16,
    },
    statItem: {
        alignItems: 'center',
        gap: 2,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
    },
    statLabel: {
        fontSize: 12,
    },
    addIssuesBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginHorizontal: 16,
        marginVertical: 12,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
    },
    addIssuesBtnText: {
        fontSize: 15,
        fontWeight: '600',
    },
    issuesHeader: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 13,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        borderBottomWidth: 1,
    },
    emptyIssues: {
        padding: 32,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        textAlign: 'center',
    },
});
