import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    Alert,
    TextInput,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { MaterialIcons } from '@expo/vector-icons';
import { userLoanRequestService } from '@/services/userLoanRequestService';
import { Book } from '@/types/book';
import { SharedBookView } from '@/components/BookDetail/SharedBookView';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

function SharedBookDetailScreen() {
    const router = useRouter();
    const { userId, bookId } = useLocalSearchParams();
    const lenderId = parseInt(userId as string);
    const bookIdNum = parseInt(bookId as string);

    const [book, setBook] = useState<Book | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [requestMessage, setRequestMessage] = useState('');
    const [requesting, setRequesting] = useState(false);

    useEffect(() => {
        loadBook();
    }, [bookIdNum, lenderId]);

    const loadBook = async () => {
        setLoading(true);
        setError(null);
        try {
            const found = await userLoanRequestService.getSharedBook(lenderId, bookIdNum);
            setBook(found);
        } catch (err: any) {
            if (err.response?.status === 404) {
                setError('Livre introuvable');
            } else {
                setError('Impossible de charger le livre');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRequest = async () => {
        if (!book) return;
        setRequesting(true);
        try {
            await userLoanRequestService.create({
                book_id: book.id,
                lender_id: lenderId,
                message: requestMessage.trim() || undefined,
            });
            setShowRequestModal(false);
            setRequestMessage('');
            Alert.alert(
                'Demande envoyée',
                "Votre demande a été envoyée. Le propriétaire doit l'accepter.",
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (err: any) {
            const detail = err.response?.data?.detail;
            Alert.alert('Erreur', detail || "Impossible d'envoyer la demande");
        } finally {
            setRequesting(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <MaterialIcons name="arrow-back" size={24} color="#212121" />
                    </TouchableOpacity>
                </View>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#2196F3" />
                </View>
            </SafeAreaView>
        );
    }

    if (error || !book) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <MaterialIcons name="arrow-back" size={24} color="#212121" />
                    </TouchableOpacity>
                </View>
                <View style={styles.centered}>
                    <MaterialIcons name="error-outline" size={64} color="#E0E0E0" />
                    <Text style={styles.errorText}>{error || 'Livre introuvable'}</Text>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Text style={styles.backBtnText}>Retour</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Head><title>{book.title}</title></Head>

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color="#212121" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{book.title}</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <SharedBookView
                    book={book}
                    isUnavailable={!!book.current_loan}
                    onRequestPress={() => setShowRequestModal(true)}
                />
            </ScrollView>

            <Modal
                visible={showRequestModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowRequestModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Demander "{book.title}"</Text>
                        <Text style={styles.modalSubtitle}>
                            Ajoutez un message optionnel pour accompagner votre demande.
                        </Text>
                        <TextInput
                            style={styles.messageInput}
                            placeholder="Message (optionnel)..."
                            value={requestMessage}
                            onChangeText={setRequestMessage}
                            multiline
                            numberOfLines={3}
                            placeholderTextColor="#9E9E9E"
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => {
                                    setShowRequestModal(false);
                                    setRequestMessage('');
                                }}
                            >
                                <Text style={styles.cancelButtonText}>Annuler</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmButton, requesting && styles.buttonDisabled]}
                                onPress={handleRequest}
                                disabled={requesting}
                            >
                                {requesting ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.confirmButtonText}>Envoyer</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

export default function SharedBookDetail() {
    return (
        <ProtectedRoute>
            <SharedBookDetailScreen />
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
    headerTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: '600',
        color: '#212121',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    errorText: {
        fontSize: 16,
        color: '#9E9E9E',
        marginTop: 16,
        marginBottom: 24,
        textAlign: 'center',
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
    scrollContent: {
        padding: 16,
        paddingBottom: 32,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#212121',
        marginBottom: 8,
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#757575',
        marginBottom: 16,
    },
    messageInput: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: '#212121',
        minHeight: 80,
        textAlignVertical: 'top',
        marginBottom: 16,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    cancelButton: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    cancelButtonText: {
        color: '#757575',
        fontSize: 14,
        fontWeight: '600',
    },
    confirmButton: {
        backgroundColor: '#7C3AED',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    confirmButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
});
