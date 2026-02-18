import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Book } from '@/types/book';
import BookCover from '@/components/BookCover';

// Mêmes constantes que BookHeader
const COVER_WIDTH = 140;
const COVER_RATIO = 2 / 3;

interface SharedBookViewProps {
    book: Book;
    onRequestPress: () => void;
    isUnavailable: boolean;
}

export function SharedBookView({ book, onRequestPress, isUnavailable }: SharedBookViewProps) {
    return (
        <View style={styles.container}>
            {/* Header : couverture + infos (même layout que BookHeader) */}
            <View style={styles.bookHeader}>
                <BookCover
                    url={book.cover_url}
                    style={styles.cover}
                    containerStyle={styles.coverContainer}
                    resizeMode="contain"
                />
                <View style={styles.info}>
                    <Text style={styles.title}>{book.title}</Text>

                    {book.authors && book.authors.length > 0 && (
                        <Text style={styles.author}>
                            {book.authors.map(a => a.name).join(', ')}
                        </Text>
                    )}

                    {book.isbn && (
                        <Text style={styles.isbn}>ISBN : {book.isbn}</Text>
                    )}

                    {isUnavailable && (
                        <View style={styles.unavailableBadge}>
                            <Text style={styles.unavailableBadgeText}>📖 Actuellement prêté</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Détails */}
            <View style={styles.detailsCard}>
                {book.publisher && (
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Éditeur</Text>
                        <Text style={styles.infoValue}>{book.publisher.name}</Text>
                    </View>
                )}
                {book.published_date && (
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Publication</Text>
                        <Text style={styles.infoValue}>{book.published_date}</Text>
                    </View>
                )}
                {book.page_count && (
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Pages</Text>
                        <Text style={styles.infoValue}>{book.page_count}</Text>
                    </View>
                )}
                {book.genres && book.genres.length > 0 && (
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Genres</Text>
                        <View style={styles.tagsRow}>
                            {book.genres.map(g => (
                                <View key={g.id} style={styles.tag}>
                                    <Text style={styles.tagText}>{g.name}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}
            </View>

            {/* Action */}
            {isUnavailable ? (
                <View style={styles.unavailableContainer}>
                    <MaterialIcons name="info-outline" size={20} color="#FF9800" />
                    <Text style={styles.unavailableText}>
                        Ce livre est actuellement prêté et ne peut pas être demandé
                    </Text>
                </View>
            ) : (
                <TouchableOpacity style={styles.requestButton} onPress={onRequestPress}>
                    <MaterialIcons name="send" size={20} color="#FFFFFF" />
                    <Text style={styles.requestButtonText}>Demander ce livre</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    // Layout BookHeader
    bookHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    coverContainer: {
        width: COVER_WIDTH,
        height: COVER_WIDTH / COVER_RATIO,
        marginRight: 16,
        borderRadius: 8,
        backgroundColor: '#F0F0F0',
    },
    cover: {
        width: COVER_WIDTH,
        height: COVER_WIDTH / COVER_RATIO,
        borderRadius: 8,
    },
    info: {
        flex: 1,
        justifyContent: 'flex-start',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#212121',
        marginBottom: 8,
    },
    author: {
        fontSize: 16,
        color: '#666',
        marginBottom: 4,
    },
    isbn: {
        fontSize: 14,
        color: '#888',
        marginBottom: 8,
    },
    unavailableBadge: {
        marginTop: 8,
        padding: 8,
        backgroundColor: '#FFF3E0',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FF9800',
    },
    unavailableBadgeText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#E65100',
    },
    // Détails
    detailsCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        gap: 12,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    infoLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#757575',
        width: 80,
        flexShrink: 0,
    },
    infoValue: {
        fontSize: 14,
        color: '#212121',
        flex: 1,
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        flex: 1,
    },
    tag: {
        backgroundColor: '#E3F2FD',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    tagText: {
        fontSize: 12,
        color: '#1976D2',
        fontWeight: '500',
    },
    // Action
    requestButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#7C3AED',
        borderRadius: 12,
        padding: 16,
    },
    requestButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    unavailableContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FFF3E0',
        borderRadius: 8,
        padding: 12,
    },
    unavailableText: {
        fontSize: 14,
        color: '#FF9800',
        fontWeight: '500',
        flex: 1,
    },
});
