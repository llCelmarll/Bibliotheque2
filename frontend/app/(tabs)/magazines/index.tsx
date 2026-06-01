import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, ActivityIndicator,
    TouchableOpacity, TextInput, Platform, useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useMagazines } from '@/hooks/useMagazines';
import { MagazineSeriesCard } from '@/components/MagazineSeriesCard';
import { MagazineSeries } from '@/types/magazine';
import { ErrorMessage } from '@/components/ErrorMessage';

export default function MagazinesIndex() {
    const theme = useTheme();
    const router = useRouter();
    const { width: screenWidth } = useWindowDimensions();
    const { series, loading, error, searchQuery, setSearchQuery, loadSeries } = useMagazines();

    useEffect(() => {
        loadSeries();
    }, [loadSeries]);

    const numColumns = Math.max(2, Math.min(4, Math.floor((screenWidth - 16) / 170)));
    const cardWidth = (screenWidth - 16 - 10 * (numColumns - 1)) / numColumns;

    const renderItem = ({ item }: { item: MagazineSeries }) => (
        <View style={{ width: cardWidth, marginBottom: 10 }}>
            <MagazineSeriesCard series={item} />
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
            {/* Barre de recherche */}
            <View style={[styles.searchBar, { backgroundColor: theme.bgCard, borderBottomColor: theme.borderLight }]}>
                <MaterialIcons name="search" size={20} color={theme.textMuted} />
                <TextInput
                    style={[styles.searchInput, { color: theme.textPrimary }]}
                    placeholder="Rechercher une série..."
                    placeholderTextColor={theme.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {!!searchQuery && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <MaterialIcons name="close" size={18} color={theme.textMuted} />
                    </TouchableOpacity>
                )}
            </View>

            {loading ? (
                <ActivityIndicator style={styles.loader} size="large" color={theme.accent} />
            ) : error ? (
                <ErrorMessage message={error} onRetry={loadSeries} />
            ) : series.length === 0 ? (
                <View style={styles.empty}>
                    <MaterialIcons name="menu-book" size={64} color={theme.textMuted} />
                    <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
                        {searchQuery ? 'Aucun résultat' : 'Aucun magazine'}
                    </Text>
                    {!searchQuery && (
                        <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                            Ajoutez votre première collection de magazines
                        </Text>
                    )}
                </View>
            ) : (
                <FlatList
                    key={`grid-${numColumns}`}
                    data={series}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    numColumns={numColumns}
                    contentContainerStyle={styles.listContainer}
                    columnWrapperStyle={styles.row}
                />
            )}

            {/* FAB */}
            <TouchableOpacity
                style={[
                    styles.addButton,
                    { backgroundColor: theme.accent },
                    Platform.OS === 'web' && ({ boxShadow: `0 4px 12px ${theme.textPrimary}4D` } as any),
                ]}
                onPress={() => router.push('/(tabs)/magazines/create-series')}
                activeOpacity={0.8}
            >
                <MaterialIcons name="add" size={24} color={theme.textInverse} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: Platform.OS === 'android' ? 40 : Platform.OS === 'ios' ? 44 : 0,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 8,
        borderBottomWidth: 1,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 4,
    },
    loader: {
        flex: 1,
        justifyContent: 'center',
    },
    listContainer: {
        padding: 8,
    },
    row: {
        gap: 10,
        justifyContent: 'flex-start',
    },
    empty: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        padding: 32,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    emptySubtitle: {
        fontSize: 15,
        textAlign: 'center',
    },
    addButton: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
    },
});
