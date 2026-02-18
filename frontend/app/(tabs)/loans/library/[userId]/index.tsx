import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
    RefreshControl,
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import Head from 'expo-router/head';
import { MaterialIcons } from '@expo/vector-icons';
import { userLoanRequestService } from '@/services/userLoanRequestService';
import { Book } from '@/types/book';
import { LibraryPage } from '@/types/userLoanRequest';
import BookCover from '@/components/BookCover';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

function SharedLibraryScreen() {
    const router = useRouter();
    const { userId, username } = useLocalSearchParams();
    const ownerId = parseInt(userId as string);

    const [books, setBooks] = useState<Book[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (search?: string) => {
        setError(null);
        try {
            const data: LibraryPage = await userLoanRequestService.getUserLibrary(ownerId, {
                search: search || undefined,
                limit: 100,
            });
            setBooks(data.items);
            setTotal(data.total);
        } catch (err: any) {
            if (err.response?.status === 403) {
                setError("Cet utilisateur n'a pas encore partagé sa bibliothèque avec vous");
            } else {
                setError('Impossible de charger la bibliothèque');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [ownerId]);

    useEffect(() => {
        load();
    }, [load]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await load(searchQuery);
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        load(query);
    };

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

    const displayName = username ? decodeURIComponent(username as string) : 'Bibliothèque';

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Head><title>{`Bibliothèque de ${displayName}`}</title></Head>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color="#212121" />
                </TouchableOpacity>
                <View style={styles.headerTitles}>
                    <Text style={styles.headerTitle}>Bibliothèque</Text>
                    {displayName && (
                        <Text style={styles.headerSubtitle}>{displayName}</Text>
                    )}
                </View>
                <Text style={styles.totalCount}>{total} livre{total !== 1 ? 's' : ''}</Text>
            </View>

            <View style={styles.searchContainer}>
                <MaterialIcons name="search" size={20} color="#757575" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Rechercher un livre..."
                    value={searchQuery}
                    onChangeText={handleSearch}
                    placeholderTextColor="#9E9E9E"
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => handleSearch('')}>
                        <MaterialIcons name="close" size={20} color="#757575" />
                    </TouchableOpacity>
                )}
            </View>

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
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <MaterialIcons name="library-books" size={64} color="#E0E0E0" />
                            <Text style={styles.emptyText}>Aucun livre disponible</Text>
                        </View>
                    }
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                    }
                    contentContainerStyle={books.length === 0 ? styles.emptyListContainer : undefined}
                />
            )}
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
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        margin: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#212121',
        padding: 0,
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
