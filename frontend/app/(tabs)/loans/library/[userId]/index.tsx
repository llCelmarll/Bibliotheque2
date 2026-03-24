import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
    Pressable,
    TextInput,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { MaterialIcons } from '@expo/vector-icons';
import { Book } from '@/types/book';
import BookCover from '@/components/BookCover';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { SortMenu } from '@/components/SortMenu';
import { SharedLibraryAdvancedModal, SharedLibraryAdvancedParams } from '@/components/SharedLibraryAdvancedModal';
import { useSharedLibrary } from '@/hooks/useSharedLibrary';
import { useTheme } from '@/contexts/ThemeContext';

function SharedLibraryScreen() {
    const router = useRouter();
    const theme = useTheme();
    const { userId, username } = useLocalSearchParams();
    const ownerId = parseInt(userId as string);
    const displayName = username ? decodeURIComponent(username as string) : 'Bibliothèque';
    const [advancedModalVisible, setAdvancedModalVisible] = useState(false);

    const {
        books,
        total,
        loading,
        loadingMore,
        hasMore,
        searchQuery,
        setSearchQuery,
        sortBy,
        sortOrder,
        isAdvancedMode,
        error,
        load,
        handleSearch,
        runAdvancedSearch,
        clearAdvancedSearch,
        handleLoadMore,
        handleSortChange,
        handleRefresh,
    } = useSharedLibrary({ userId: ownerId });

    useEffect(() => {
        load();
    }, []);

    const handleBookPress = (book: Book) => {
        router.push(`/(tabs)/loans/library/${ownerId}/book/${book.id}` as any);
    };

    const renderBook = ({ item }: { item: Book }) => (
        <TouchableOpacity style={[styles.bookItem, { backgroundColor: theme.bgCard, borderBottomColor: theme.borderLight }]} onPress={() => handleBookPress(item)}>
            <BookCover
                url={item.cover_url}
                style={styles.cover}
                containerStyle={styles.coverContainer}
                resizeMode="cover"
            />
            <View style={styles.bookInfo}>
                <Text style={[styles.bookTitle, { color: theme.textPrimary }]} numberOfLines={2}>{item.title}</Text>
                {item.authors && item.authors.length > 0 && (
                    <Text style={[styles.bookAuthors, { color: theme.textSecondary }]} numberOfLines={1}>
                        {item.authors.map(a => a.name).join(', ')}
                    </Text>
                )}
                {item.publisher && (
                    <Text style={[styles.bookPublisher, { color: theme.textMuted }]} numberOfLines={1}>{item.publisher.name}</Text>
                )}
            </View>
            <MaterialIcons name="chevron-right" size={24} color={theme.textMuted} />
        </TouchableOpacity>
    );

    const renderFooter = () => {
        if (!loadingMore) return null;
        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={theme.accent} />
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.bgSecondary }]} edges={['top']}>
            <Head><title>{`Bibliothèque de ${displayName}`}</title></Head>

            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.bgCard, borderBottomColor: theme.borderLight }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerTitles}>
                    <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Bibliothèque</Text>
                    <Text style={[styles.headerSubtitle, { color: theme.accentMedium }]}>{displayName}</Text>
                </View>
                <Text style={[styles.totalCount, { color: theme.textSecondary }]}>{total} livre{total !== 1 ? 's' : ''}</Text>
            </View>

            {/* Barre de recherche */}
            <View style={[styles.searchSection, { backgroundColor: theme.bgCard, borderBottomColor: theme.borderLight }]}>
                <View style={styles.searchRow}>
                    <TextInput
                        style={[styles.searchInput, { borderColor: theme.borderLight, backgroundColor: theme.bgCard, color: theme.textPrimary }]}
                        placeholder="Rechercher (titre, auteur, isbn…)"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={() => handleSearch(searchQuery)}
                        returnKeyType="search"
                        placeholderTextColor={theme.textMuted}
                    />
                    <Pressable
                        style={[styles.iconButton, { backgroundColor: theme.bgSecondary }, isAdvancedMode && { backgroundColor: theme.accent }]}
                        onPress={() => setAdvancedModalVisible(true)}
                    >
                        <MaterialIcons
                            name="tune"
                            size={22}
                            color={isAdvancedMode ? theme.textInverse : theme.textPrimary}
                        />
                    </Pressable>
                    <Pressable
                        style={[styles.iconButton, { backgroundColor: theme.bgSecondary }]}
                        onPress={() => handleSearch(searchQuery)}
                    >
                        <MaterialIcons name="search" size={22} color={theme.textPrimary} />
                    </Pressable>
                </View>

                <View style={styles.sortRow}>
                    <SortMenu
                        currentSort={sortBy}
                        currentOrder={sortOrder}
                        onSortChange={handleSortChange}
                    />
                    {isAdvancedMode && (
                        <View style={styles.advancedBadge}>
                            <Text style={[styles.advancedBadgeText, { color: theme.accent }]}>Recherche avancée</Text>
                            <Pressable onPress={clearAdvancedSearch}>
                                <Text style={[styles.advancedBadgeClear, { color: theme.accent }]}>Réinitialiser</Text>
                            </Pressable>
                        </View>
                    )}
                </View>
            </View>

            {/* Contenu */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.accent} />
                </View>
            ) : error ? (
                <View style={styles.errorContainer}>
                    <MaterialIcons name="lock-outline" size={64} color={theme.borderLight} />
                    <Text style={[styles.errorText, { color: theme.textMuted }]}>{error}</Text>
                    {error.includes('partagé') && (
                        <Text style={[styles.errorHint, { color: theme.textMuted }]}>
                            Demandez-lui d'activer le partage de bibliothèque depuis votre fiche contact chez lui.
                        </Text>
                    )}
                    <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.accent }]} onPress={() => router.back()}>
                        <Text style={[styles.backBtnText, { color: theme.textInverse }]}>Retour</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={books}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderBook}
                    ListFooterComponent={renderFooter}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.3}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <MaterialIcons name="library-books" size={64} color={theme.borderLight} />
                            <Text style={[styles.emptyText, { color: theme.textMuted }]}>Aucun livre disponible</Text>
                        </View>
                    }
                    refreshControl={
                        <RefreshControl refreshing={false} onRefresh={handleRefresh} />
                    }
                    contentContainerStyle={books.length === 0 ? styles.emptyListContainer : undefined}
                />
            )}

            <SharedLibraryAdvancedModal
                visible={advancedModalVisible}
                onClose={() => setAdvancedModalVisible(false)}
                onSearch={(params: SharedLibraryAdvancedParams) => {
                    runAdvancedSearch(params);
                    setAdvancedModalVisible(false);
                }}
                sortBy={sortBy}
                sortOrder={sortOrder}
            />
        </SafeAreaView>
    );
}

export default function SharedLibrary() {
    return (
        <ProtectedRoute>
            <SharedLibraryScreen />
        </ProtectedRoute>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 4,
        marginRight: 12,
    },
    headerTitles: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    headerSubtitle: {
        fontSize: 13,
        fontWeight: '500',
    },
    totalCount: {
        fontSize: 13,
    },
    searchSection: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
        gap: 8,
        borderBottomWidth: 1,
    },
    searchRow: {
        flexDirection: 'row',
        gap: 8,
    },
    searchInput: {
        flex: 1,
        height: 40,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        fontSize: 14,
    },
    iconButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
    },
    sortRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 4,
    },
    advancedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    advancedBadgeText: {
        fontSize: 12,
        fontWeight: '500',
    },
    advancedBadgeClear: {
        fontSize: 12,
        textDecorationLine: 'underline',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    errorText: {
        fontSize: 16,
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'center',
    },
    errorHint: {
        fontSize: 13,
        marginBottom: 24,
        textAlign: 'center',
        paddingHorizontal: 16,
    },
    backBtn: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    backBtnText: {
        fontSize: 14,
        fontWeight: '600',
    },
    bookItem: {
        flexDirection: 'row',
        padding: 12,
        borderBottomWidth: 1,
        alignItems: 'center',
    },
    cover: {
        width: 50,
        height: 75,
    },
    coverContainer: {
        width: 50,
        height: 75,
        marginRight: 12,
    },
    bookInfo: {
        flex: 1,
    },
    bookTitle: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 4,
    },
    bookAuthors: {
        fontSize: 13,
        marginBottom: 2,
    },
    bookPublisher: {
        fontSize: 12,
    },
    footerLoader: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    emptyListContainer: {
        flexGrow: 1,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 64,
    },
    emptyText: {
        fontSize: 16,
        marginTop: 16,
    },
});
