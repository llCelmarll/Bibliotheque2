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

function SharedLibraryScreen() {
    const router = useRouter();
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
        <TouchableOpacity style={styles.bookItem} onPress={() => handleBookPress(item)}>
            <BookCover
                url={item.cover_url}
                style={styles.cover}
                containerStyle={styles.coverContainer}
                resizeMode="cover"
            />
            <View style={styles.bookInfo}>
                <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
                {item.authors && item.authors.length > 0 && (
                    <Text style={styles.bookAuthors} numberOfLines={1}>
                        {item.authors.map(a => a.name).join(', ')}
                    </Text>
                )}
                {item.publisher && (
                    <Text style={styles.bookPublisher} numberOfLines={1}>{item.publisher.name}</Text>
                )}
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#BDBDBD" />
        </TouchableOpacity>
    );

    const renderFooter = () => {
        if (!loadingMore) return null;
        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#2196F3" />
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Head><title>{`Bibliothèque de ${displayName}`}</title></Head>

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color="#212121" />
                </TouchableOpacity>
                <View style={styles.headerTitles}>
                    <Text style={styles.headerTitle}>Bibliothèque</Text>
                    <Text style={styles.headerSubtitle}>{displayName}</Text>
                </View>
                <Text style={styles.totalCount}>{total} livre{total !== 1 ? 's' : ''}</Text>
            </View>

            {/* Barre de recherche */}
            <View style={styles.searchSection}>
                <View style={styles.searchRow}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Rechercher (titre, auteur, isbn…)"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={() => handleSearch(searchQuery)}
                        returnKeyType="search"
                        placeholderTextColor="#9E9E9E"
                    />
                    <Pressable
                        style={[styles.iconButton, isAdvancedMode && styles.iconButtonActive]}
                        onPress={() => setAdvancedModalVisible(true)}
                    >
                        <MaterialIcons
                            name="tune"
                            size={22}
                            color={isAdvancedMode ? '#fff' : '#333'}
                        />
                    </Pressable>
                    <Pressable
                        style={styles.iconButton}
                        onPress={() => handleSearch(searchQuery)}
                    >
                        <MaterialIcons name="search" size={22} color="#333" />
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
                            <Text style={styles.advancedBadgeText}>Recherche avancée</Text>
                            <Pressable onPress={clearAdvancedSearch}>
                                <Text style={styles.advancedBadgeClear}>Réinitialiser</Text>
                            </Pressable>
                        </View>
                    )}
                </View>
            </View>

            {/* Contenu */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2196F3" />
                </View>
            ) : error ? (
                <View style={styles.errorContainer}>
                    <MaterialIcons name="lock-outline" size={64} color="#E0E0E0" />
                    <Text style={styles.errorText}>{error}</Text>
                    {error.includes('partagé') && (
                        <Text style={styles.errorHint}>
                            Demandez-lui d'activer le partage de bibliothèque depuis votre fiche contact chez lui.
                        </Text>
                    )}
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Text style={styles.backBtnText}>Retour</Text>
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
                            <MaterialIcons name="library-books" size={64} color="#E0E0E0" />
                            <Text style={styles.emptyText}>Aucun livre disponible</Text>
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
        backgroundColor: '#F5F5F5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
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
        color: '#212121',
    },
    headerSubtitle: {
        fontSize: 13,
        color: '#7C3AED',
        fontWeight: '500',
    },
    totalCount: {
        fontSize: 13,
        color: '#757575',
    },
    searchSection: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
        gap: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    searchRow: {
        flexDirection: 'row',
        gap: 8,
    },
    searchInput: {
        flex: 1,
        height: 40,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 12,
        backgroundColor: '#fff',
        fontSize: 14,
        color: '#212121',
    },
    iconButton: {
        width: 40,
        height: 40,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
    },
    iconButtonActive: {
        backgroundColor: '#3498db',
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
        color: '#3498db',
        fontWeight: '500',
    },
    advancedBadgeClear: {
        fontSize: 12,
        color: '#3498db',
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
        color: '#9E9E9E',
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'center',
    },
    errorHint: {
        fontSize: 13,
        color: '#BDBDBD',
        marginBottom: 24,
        textAlign: 'center',
        paddingHorizontal: 16,
    },
    backBtn: {
        backgroundColor: '#2196F3',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    backBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    bookItem: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
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
        color: '#212121',
        marginBottom: 4,
    },
    bookAuthors: {
        fontSize: 13,
        color: '#757575',
        marginBottom: 2,
    },
    bookPublisher: {
        fontSize: 12,
        color: '#9E9E9E',
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
        color: '#9E9E9E',
        marginTop: 16,
    },
});
