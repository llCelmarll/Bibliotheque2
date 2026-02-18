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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { userLoanRequestService } from '@/services/userLoanRequestService';
import { UserLoanRequest, UserLoanRequestStatus } from '@/types/userLoanRequest';
import BookCover from '@/components/BookCover';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

function UserLoanRequestDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const requestId = parseInt(id as string);
    const { user } = useAuth();

    const [request, setRequest] = useState<UserLoanRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [responseMessage, setResponseMessage] = useState('');

    useEffect(() => {
        loadRequest();
    }, [requestId]);

    const loadRequest = async () => {
        setLoading(true);
        try {
            const data = await userLoanRequestService.getById(requestId);
            setRequest(data);
        } catch (err: any) {
            Alert.alert('Erreur', 'Impossible de charger la demande', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const isLender = user?.id === request?.lender_id;
    const isRequester = user?.id === request?.requester_id;

    const handleAccept = async () => {
        setActionLoading(true);
        try {
            await userLoanRequestService.accept(requestId, {
                response_message: responseMessage.trim() || undefined,
            });
            await loadRequest();
            Alert.alert('Demande acceptée', 'Le livre est maintenant considéré comme prêté.');
        } catch (err: any) {
            Alert.alert('Erreur', err.response?.data?.detail || 'Impossible d\'accepter la demande');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDecline = () => {
        Alert.alert(
            'Refuser la demande',
            'Êtes-vous sûr de vouloir refuser cette demande ?',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Refuser',
                    style: 'destructive',
                    onPress: async () => {
                        setActionLoading(true);
                        try {
                            await userLoanRequestService.decline(requestId, {
                                response_message: responseMessage.trim() || undefined,
                            });
                            await loadRequest();
                        } catch (err: any) {
                            Alert.alert('Erreur', err.response?.data?.detail || 'Impossible de refuser la demande');
                        } finally {
                            setActionLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const handleCancel = () => {
        Alert.alert(
            'Annuler la demande',
            'Êtes-vous sûr de vouloir annuler votre demande ?',
            [
                { text: 'Non', style: 'cancel' },
                {
                    text: 'Oui, annuler',
                    style: 'destructive',
                    onPress: async () => {
                        setActionLoading(true);
                        try {
                            await userLoanRequestService.cancel(requestId);
                            await loadRequest();
                        } catch (err: any) {
                            Alert.alert('Erreur', err.response?.data?.detail || 'Impossible d\'annuler la demande');
                        } finally {
                            setActionLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const handleReturn = () => {
        Alert.alert(
            'Retour du livre',
            `Confirmer que "${request?.book.title}" a été retourné ?`,
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Confirmer',
                    onPress: async () => {
                        setActionLoading(true);
                        try {
                            await userLoanRequestService.returnBook(requestId);
                            await loadRequest();
                        } catch (err: any) {
                            Alert.alert('Erreur', err.response?.data?.detail || 'Impossible de marquer le retour');
                        } finally {
                            setActionLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    const statusLabel: Record<UserLoanRequestStatus, string> = {
        [UserLoanRequestStatus.PENDING]: 'En attente',
        [UserLoanRequestStatus.ACCEPTED]: 'Acceptée — livre prêté',
        [UserLoanRequestStatus.DECLINED]: 'Refusée',
        [UserLoanRequestStatus.CANCELLED]: 'Annulée',
        [UserLoanRequestStatus.RETURNED]: 'Retourné',
    };

    const statusColor: Record<UserLoanRequestStatus, string> = {
        [UserLoanRequestStatus.PENDING]: '#FF9800',
        [UserLoanRequestStatus.ACCEPTED]: '#4CAF50',
        [UserLoanRequestStatus.DECLINED]: '#F44336',
        [UserLoanRequestStatus.CANCELLED]: '#9E9E9E',
        [UserLoanRequestStatus.RETURNED]: '#9E9E9E',
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2196F3" />
                </View>
            </SafeAreaView>
        );
    }

    if (!request) return null;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color="#212121" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Demande de prêt</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Livre */}
                <View style={styles.card}>
                    <View style={styles.bookRow}>
                        <BookCover
                            url={request.book.cover_url}
                            style={styles.cover}
                            containerStyle={styles.coverContainer}
                            resizeMode="cover"
                        />
                        <View style={styles.bookMeta}>
                            <Text style={styles.bookTitle}>{request.book.title}</Text>
                            {request.book.authors && request.book.authors.length > 0 && (
                                <Text style={styles.bookAuthors}>
                                    {request.book.authors.map(a => a.name).join(', ')}
                                </Text>
                            )}
                        </View>
                    </View>
                </View>

                {/* Statut */}
                <View style={styles.card}>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor[request.status] + '22' }]}>
                        <Text style={[styles.statusText, { color: statusColor[request.status] }]}>
                            {statusLabel[request.status]}
                        </Text>
                    </View>
                </View>

                {/* Participants */}
                <View style={styles.card}>
                    <View style={styles.participantRow}>
                        <View style={styles.participant}>
                            <MaterialIcons name="person" size={16} color="#757575" />
                            <Text style={styles.participantLabel}>Demandeur</Text>
                            <Text style={styles.participantName}>{request.requester_username}</Text>
                        </View>
                        <MaterialIcons name="arrow-forward" size={20} color="#BDBDBD" />
                        <View style={styles.participant}>
                            <MaterialIcons name="person-outline" size={16} color="#757575" />
                            <Text style={styles.participantLabel}>Propriétaire</Text>
                            <Text style={styles.participantName}>{request.lender_username}</Text>
                        </View>
                    </View>
                </View>

                {/* Dates */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Dates</Text>
                    <View style={styles.dateRow}>
                        <Text style={styles.dateLabel}>Demande</Text>
                        <Text style={styles.dateValue}>{formatDate(request.request_date)}</Text>
                    </View>
                    {request.response_date && (
                        <View style={styles.dateRow}>
                            <Text style={styles.dateLabel}>Réponse</Text>
                            <Text style={styles.dateValue}>{formatDate(request.response_date)}</Text>
                        </View>
                    )}
                    {request.due_date && (
                        <View style={styles.dateRow}>
                            <Text style={styles.dateLabel}>Retour prévu</Text>
                            <Text style={styles.dateValue}>{formatDate(request.due_date)}</Text>
                        </View>
                    )}
                    {request.return_date && (
                        <View style={styles.dateRow}>
                            <Text style={styles.dateLabel}>Retourné le</Text>
                            <Text style={styles.dateValue}>{formatDate(request.return_date)}</Text>
                        </View>
                    )}
                </View>

                {/* Messages */}
                {request.message && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Message du demandeur</Text>
                        <Text style={styles.messageText}>{request.message}</Text>
                    </View>
                )}

                {request.response_message && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Réponse du propriétaire</Text>
                        <Text style={styles.messageText}>{request.response_message}</Text>
                    </View>
                )}

                {/* Actions selon le rôle et le statut */}
                {request.status === UserLoanRequestStatus.PENDING && isLender && (
                    <View style={styles.actionsCard}>
                        <Text style={styles.cardTitle}>Votre réponse</Text>
                        <TextInput
                            style={styles.responseInput}
                            placeholder="Message de réponse (optionnel)..."
                            value={responseMessage}
                            onChangeText={setResponseMessage}
                            multiline
                            numberOfLines={2}
                            placeholderTextColor="#9E9E9E"
                        />
                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={[styles.declineButton, actionLoading && styles.buttonDisabled]}
                                onPress={handleDecline}
                                disabled={actionLoading}
                            >
                                {actionLoading ? (
                                    <ActivityIndicator size="small" color="#F44336" />
                                ) : (
                                    <>
                                        <MaterialIcons name="close" size={18} color="#F44336" />
                                        <Text style={styles.declineButtonText}>Refuser</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.acceptButton, actionLoading && styles.buttonDisabled]}
                                onPress={handleAccept}
                                disabled={actionLoading}
                            >
                                {actionLoading ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <>
                                        <MaterialIcons name="check" size={18} color="#FFFFFF" />
                                        <Text style={styles.acceptButtonText}>Accepter</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {request.status === UserLoanRequestStatus.PENDING && isRequester && (
                    <TouchableOpacity
                        style={[styles.cancelButton, actionLoading && styles.buttonDisabled]}
                        onPress={handleCancel}
                        disabled={actionLoading}
                    >
                        {actionLoading ? (
                            <ActivityIndicator size="small" color="#F44336" />
                        ) : (
                            <Text style={styles.cancelButtonText}>Annuler ma demande</Text>
                        )}
                    </TouchableOpacity>
                )}

                {request.status === UserLoanRequestStatus.ACCEPTED && isLender && (
                    <TouchableOpacity
                        style={[styles.returnButton, actionLoading && styles.buttonDisabled]}
                        onPress={handleReturn}
                        disabled={actionLoading}
                    >
                        {actionLoading ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <>
                                <MaterialIcons name="assignment-return" size={20} color="#FFFFFF" />
                                <Text style={styles.returnButtonText}>Marquer comme retourné</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

export default function UserLoanRequestDetail() {
    return (
        <ProtectedRoute>
            <UserLoanRequestDetailScreen />
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: 16,
        gap: 12,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
    },
    cardTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#757575',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    bookRow: {
        flexDirection: 'row',
    },
    cover: {
        width: 60,
        height: 90,
    },
    coverContainer: {
        width: 60,
        height: 90,
        marginRight: 12,
    },
    bookMeta: {
        flex: 1,
    },
    bookTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#212121',
        marginBottom: 6,
    },
    bookAuthors: {
        fontSize: 14,
        color: '#757575',
    },
    statusBadge: {
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
    },
    statusText: {
        fontSize: 15,
        fontWeight: '700',
    },
    participantRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    participant: {
        alignItems: 'center',
        gap: 4,
    },
    participantLabel: {
        fontSize: 11,
        color: '#9E9E9E',
        textTransform: 'uppercase',
    },
    participantName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#212121',
    },
    dateRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
    },
    dateLabel: {
        fontSize: 14,
        color: '#757575',
    },
    dateValue: {
        fontSize: 14,
        color: '#212121',
        fontWeight: '500',
    },
    messageText: {
        fontSize: 14,
        color: '#424242',
        lineHeight: 20,
    },
    actionsCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
    },
    responseInput: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        padding: 10,
        fontSize: 14,
        color: '#212121',
        minHeight: 60,
        textAlignVertical: 'top',
        marginBottom: 12,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    declineButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderWidth: 1,
        borderColor: '#F44336',
        borderRadius: 10,
        padding: 14,
    },
    declineButtonText: {
        color: '#F44336',
        fontSize: 15,
        fontWeight: '600',
    },
    acceptButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#4CAF50',
        borderRadius: 10,
        padding: 14,
    },
    acceptButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
    cancelButton: {
        borderWidth: 1,
        borderColor: '#F44336',
        borderRadius: 10,
        padding: 14,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#F44336',
        fontSize: 15,
        fontWeight: '600',
    },
    returnButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#4CAF50',
        borderRadius: 10,
        padding: 14,
    },
    returnButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
});
