import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Book } from '@/types/book';
import BookCover from '@/components/BookCover';
import { useTheme } from '@/contexts/ThemeContext';

// Mêmes constantes que BookHeader
const COVER_WIDTH = 140;
const COVER_RATIO = 2 / 3;

interface SharedBookViewProps {
    book: Book;
    onRequestPress: () => void;
    isUnavailable: boolean;
    isAlreadyBorrowed?: boolean;
}

export function SharedBookView({ book, onRequestPress, isUnavailable, isAlreadyBorrowed }: SharedBookViewProps) {
    const theme = useTheme();
    return (
        <View style={styles.container}>
            {/* Header : couverture + infos (même layout que BookHeader) */}
            <View style={[styles.bookHeader, { backgroundColor: theme.bgCard }]}>
                <BookCover
                    url={book.cover_url}
                    style={styles.cover}
                    containerStyle={[styles.coverContainer, { backgroundColor: theme.bgMuted }]}
                    resizeMode="contain"
                />
                <View style={styles.info}>
                    <Text style={[styles.title, { color: theme.textPrimary }]}>{book.title}</Text>

                    {book.authors && book.authors.length > 0 && (
                        <Text style={[styles.author, { color: theme.textSecondary }]}>
                            {book.authors.map(a => a.name).join(', ')}
                        </Text>
                    )}

                    {book.isbn && (
                        <Text style={[styles.isbn, { color: theme.textMuted }]}>ISBN : {book.isbn}</Text>
                    )}

                    {isUnavailable && (
                        <View style={[styles.unavailableBadge, { backgroundColor: theme.warningBg, borderColor: theme.warning }]}>
                            <Text style={[styles.unavailableBadgeText, { color: theme.warning }]}>📖 Actuellement prêté</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Détails */}
            <View style={[styles.detailsCard, { backgroundColor: theme.bgCard }]}>
                {book.publisher && (
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Éditeur</Text>
                        <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{book.publisher.name}</Text>
                    </View>
                )}
                {book.published_date && (
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Publication</Text>
                        <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{book.published_date}</Text>
                    </View>
                )}
                {book.page_count && (
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Pages</Text>
                        <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{book.page_count}</Text>
                    </View>
                )}
                {book.genres && book.genres.length > 0 && (
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Genres</Text>
                        <View style={styles.tagsRow}>
                            {book.genres.map(g => (
                                <View key={g.id} style={[styles.tag, { backgroundColor: theme.accentLight }]}>
                                    <Text style={[styles.tagText, { color: theme.accent }]}>{g.name}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}
            </View>

            {/* Action */}
            {isAlreadyBorrowed ? (
                <View style={[styles.alreadyBorrowedContainer, { backgroundColor: theme.accentLight, borderColor: theme.accentMedium }]}>
                    <MaterialIcons name="check-circle" size={20} color={theme.accentMedium} />
                    <Text style={[styles.alreadyBorrowedText, { color: theme.accentMedium }]}>
                        Vous empruntez actuellement ce livre
                    </Text>
                </View>
            ) : isUnavailable ? (
                <View style={[styles.unavailableContainer, { backgroundColor: theme.warningBg }]}>
                    <MaterialIcons name="info-outline" size={20} color={theme.warning} />
                    <Text style={[styles.unavailableText, { color: theme.warning }]}>
                        Ce livre est actuellement prêté et ne peut pas être demandé
                    </Text>
                </View>
            ) : (
                <TouchableOpacity style={[styles.requestButton, { backgroundColor: theme.accentMedium }]} onPress={onRequestPress}>
                    <MaterialIcons name="send" size={20} color={theme.textInverse} />
                    <Text style={[styles.requestButtonText, { color: theme.textInverse }]}>Demander ce livre</Text>
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
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    coverContainer: {
        width: COVER_WIDTH,
        height: COVER_WIDTH / COVER_RATIO,
        marginRight: 16,
        borderRadius: 8,
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
        marginBottom: 8,
    },
    author: {
        fontSize: 16,
        marginBottom: 4,
    },
    isbn: {
        fontSize: 14,
        marginBottom: 8,
    },
    unavailableBadge: {
        marginTop: 8,
        padding: 8,
        borderRadius: 8,
        borderWidth: 1,
    },
    unavailableBadgeText: {
        fontSize: 13,
        fontWeight: '600',
    },
    // Détails
    detailsCard: {
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
        width: 80,
        flexShrink: 0,
    },
    infoValue: {
        fontSize: 14,
        flex: 1,
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        flex: 1,
    },
    tag: {
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    tagText: {
        fontSize: 12,
        fontWeight: '500',
    },
    // Action
    requestButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 12,
        padding: 16,
    },
    requestButtonText: {
        fontSize: 16,
        fontWeight: '700',
    },
    unavailableContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderRadius: 8,
        padding: 12,
    },
    unavailableText: {
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
    },
    alreadyBorrowedContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
    },
    alreadyBorrowedText: {
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
    },
});
