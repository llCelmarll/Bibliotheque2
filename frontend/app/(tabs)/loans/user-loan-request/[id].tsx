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
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { userLoanRequestService } from '@/services/userLoanRequestService';
import { UserLoanRequest, UserLoanRequestStatus } from '@/types/userLoanRequest';
import BookCover from '@/components/BookCover';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { DatePickerField } from '@/components/DatePickerField';

function UserLoanRequestDetailScreen() {
    const router = useRouter();
    const theme = useTheme();
    const { id } = useLocalSearchParams();
    const requestId = parseInt(id as string);
    const { user } = useAuth();
    const { refresh: refreshNotifications, markDeclinedAsSeen } = useNotifications();

    const [request, setRequest] = useState<UserLoanRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [responseMessage, setResponseMessage] = useState('');
    const [dueDateInput, setDueDateInput] = useState<Date | null>(null);
    const [dueDateError, setDueDateError] = useState('');

    useEffect(() => {
        loadRequest();
    }, [requestId]);

    const loadRequest = async () => {
        setLoading(true);
        try {
            const data = await userLoanRequestService.getById(requestId);
            setRequest(data);
            setDueDateInput(data.due_date ? new Date(data.due_date) : null);
            if (data.status === UserLoanRequestStatus.DECLINED) {
                markDeclinedAsSeen(requestId);
            }
        } catch (err: any) {
            if (Platform.OS === 'web') { window.alert('Erreur\nImpossible de charger la demande'); router.back(); }
            else Alert.alert('Erreur', 'Impossible de charger la demande', [{ text: 'OK', onPress: () => router.back() }]);
        } finally {
            setLoading(false);
        }
    };

    const isLender = user?.id === request?.lender_id;
    const isRequester = user?.id === request?.requester_id;

    const showAlert = (title: string, message: string) => {
        if (Platform.OS === 'web') window.alert(`${title}\n${message}`);
        else Alert.alert(title, message);
    };

    const showConfirm = (title: string, message: string, onConfirm: () => void) => {
        if (Platform.OS === 'web') {
            if (window.confirm(`${title}\n${message}`)) onConfirm();
        } else {
            Alert.alert(title, message, [
                { text: 'Annuler', style: 'cancel' },
                { text: 'Confirmer', style: 'destructive', onPress: onConfirm },
            ]);
        }
    };

    const handleAccept = async () => {
        setDueDateError('');
        setActionLoading(true);
        try {
            await userLoanRequestService.accept(requestId, {
                response_message: responseMessage.trim() || undefined,
                due_date: dueDateInput ? dueDateInput.toISOString() : undefined,
            });
            await loadRequest();
            refreshNotifications();
            showAlert('Demande acceptée', 'Le livre est maintenant considéré comme prêté.');
        } catch (err: any) {
            showAlert('Erreur', err.response?.data?.detail || 'Impossible d\'accepter la demande');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDecline = () => {
        showConfirm(
            'Refuser la demande',
            'Êtes-vous sûr de vouloir refuser cette demande ?',
            async () => {
                setActionLoading(true);
                try {
                    await userLoanRequestService.decline(requestId, {
                        response_message: responseMessage.trim() || undefined,
                    });
                    await loadRequest();
                    refreshNotifications();
                } catch (err: any) {
                    showAlert('Erreur', err.response?.data?.detail || 'Impossible de refuser la demande');
                } finally {
                    setActionLoading(false);
                }
            }
        );
    };

    const handleCancel = () => {
        showConfirm(
            'Annuler la demande',
            'Êtes-vous sûr de vouloir annuler votre demande ?',
            async () => {
                setActionLoading(true);
                try {
                    await userLoanRequestService.cancel(requestId);
                    await loadRequest();
                } catch (err: any) {
                    showAlert('Erreur', err.response?.data?.detail || 'Impossible d\'annuler la demande');
                } finally {
                    setActionLoading(false);
                }
            }
        );
    };

    const handleReturn = () => {
        showConfirm(
            'Retour du livre',
            `Confirmer que "${request?.book.title}" a été retourné ?`,
            async () => {
                setActionLoading(true);
                try {
                    await userLoanRequestService.returnBook(requestId);
                    await loadRequest();
                } catch (err: any) {
                    showAlert('Erreur', err.response?.data?.detail || 'Impossible de marquer le retour');
                } finally {
                    setActionLoading(false);
                }
            }
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
        [UserLoanRequestStatus.PENDING]: theme.warning,
        [UserLoanRequestStatus.ACCEPTED]: theme.success,
        [UserLoanRequestStatus.DECLINED]: theme.danger,
        [UserLoanRequestStatus.CANCELLED]: theme.textMuted,
        [UserLoanRequestStatus.RETURNED]: theme.textMuted,
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.bgSecondary }]} edges={['top']}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.accent} />
                </View>
            </SafeAreaView>
        );
    }

    if (!request) return null;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.bgSecondary }]} edges={['top']}>
            <View style={[styles.header, { backgroundColor: theme.bgCard, borderBottomColor: theme.borderLight }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Demande de prêt</Text>
                <View style={{ width: 32 }} />
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                {/* Livre */}
                <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
                    <View style={styles.bookRow}>
                        <BookCover
                            url={request.book.cover_url}
                            style={styles.cover}
                            containerStyle={styles.coverContainer}
                            resizeMode="cover"
                        />
                        <View style={styles.bookMeta}>
                            <Text style={[styles.bookTitle, { color: theme.textPrimary }]}>{request.book.title}</Text>
                            {request.book.authors && request.book.authors.length > 0 && (
                                <Text style={[styles.bookAuthors, { color: theme.textSecondary }]}>
                                    {request.book.authors.map(a => a.name).join(', ')}
                                </Text>
                            )}
                        </View>
                    </View>
                </View>

                {/* Statut */}
                <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor[request.status] + '22' }]}>
                        <Text style={[styles.statusText, { color: statusColor[request.status] }]}>
                            {statusLabel[request.status]}
                        </Text>
                    </View>
                </View>

                {/* Participants */}
                <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
                    <View style={styles.participantRow}>
                        <View style={styles.participant}>
                            <MaterialIcons name="person" size={16} color={theme.textSecondary} />
                            <Text style={[styles.participantLabel, { color: theme.textMuted }]}>Demandeur</Text>
                            <Text style={[styles.participantName, { color: theme.textPrimary }]}>{request.requester_username}</Text>
                        </View>
                        <MaterialIcons name="arrow-forward" size={20} color={theme.textMuted} />
                        <View style={styles.participant}>
                            <MaterialIcons name="person-outline" size={16} color={theme.textSecondary} />
                            <Text style={[styles.participantLabel, { color: theme.textMuted }]}>Propriétaire</Text>
                            <Text style={[styles.participantName, { color: theme.textPrimary }]}>{request.lender_username}</Text>
                        </View>
                    </View>
                </View>

                {/* Dates */}
                <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
                    <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>Dates</Text>
                    <View style={[styles.dateRow, { borderBottomColor: theme.bgSecondary }]}>
                        <Text style={[styles.dateLabel, { color: theme.textSecondary }]}>Demande</Text>
                        <Text style={[styles.dateValue, { color: theme.textPrimary }]}>{formatDate(request.request_date)}</Text>
                    </View>
                    {request.response_date && (
                        <View style={[styles.dateRow, { borderBottomColor: theme.bgSecondary }]}>
                            <Text style={[styles.dateLabel, { color: theme.textSecondary }]}>Réponse</Text>
                            <Text style={[styles.dateValue, { color: theme.textPrimary }]}>{formatDate(request.response_date)}</Text>
                        </View>
                    )}
                    {request.due_date && (
                        <View style={[styles.dateRow, { borderBottomColor: theme.bgSecondary }]}>
                            <Text style={[styles.dateLabel, { color: theme.textSecondary }]}>Retour prévu</Text>
                            <Text style={[styles.dateValue, { color: theme.textPrimary }]}>{formatDate(request.due_date)}</Text>
                        </View>
                    )}
                    {request.return_date && (
                        <View style={[styles.dateRow, { borderBottomColor: theme.bgSecondary }]}>
                            <Text style={[styles.dateLabel, { color: theme.textSecondary }]}>Retourné le</Text>
                            <Text style={[styles.dateValue, { color: theme.textPrimary }]}>{formatDate(request.return_date)}</Text>
                        </View>
                    )}
                </View>

                {/* Messages */}
                {request.message && (
                    <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
                        <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>Message du demandeur</Text>
                        <Text style={[styles.messageText, { color: theme.textPrimary }]}>{request.message}</Text>
                    </View>
                )}

                {request.response_message && (
                    <View style={[styles.card, { backgroundColor: theme.bgCard }]}>
                        <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>Réponse du propriétaire</Text>
                        <Text style={[styles.messageText, { color: theme.textPrimary }]}>{request.response_message}</Text>
                    </View>
                )}

                {/* Actions selon le rôle et le statut */}
                {request.status === UserLoanRequestStatus.PENDING && isLender && (
                    <View style={[styles.actionsCard, { backgroundColor: theme.bgCard }]}>
                        <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>Votre réponse</Text>
                        <TextInput
                            style={[styles.responseInput, { borderColor: theme.borderLight, color: theme.textPrimary }]}
                            placeholder="Message de réponse (optionnel)..."
                            value={responseMessage}
                            onChangeText={setResponseMessage}
                            multiline
                            numberOfLines={2}
                            placeholderTextColor={theme.textMuted}
                        />
                        <DatePickerField
                            label="Date de retour"
                            value={dueDateInput}
                            onChange={setDueDateInput}
                            error={dueDateError}
                            minimumDate={new Date()}
                        />
                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={[styles.declineButton, { borderColor: theme.danger }, actionLoading && styles.buttonDisabled]}
                                onPress={handleDecline}
                                disabled={actionLoading}
                            >
                                {actionLoading ? (
                                    <ActivityIndicator size="small" color={theme.danger} />
                                ) : (
                                    <>
                                        <MaterialIcons name="close" size={18} color={theme.danger} />
                                        <Text style={[styles.declineButtonText, { color: theme.danger }]}>Refuser</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.acceptButton, { backgroundColor: theme.success }, actionLoading && styles.buttonDisabled]}
                                onPress={handleAccept}
                                disabled={actionLoading}
                            >
                                {actionLoading ? (
                                    <ActivityIndicator size="small" color={theme.textInverse} />
                                ) : (
                                    <>
                                        <MaterialIcons name="check" size={18} color={theme.textInverse} />
                                        <Text style={[styles.acceptButtonText, { color: theme.textInverse }]}>Accepter</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {request.status === UserLoanRequestStatus.PENDING && isRequester && (
                    <TouchableOpacity
                        style={[styles.cancelButton, { borderColor: theme.danger }, actionLoading && styles.buttonDisabled]}
                        onPress={handleCancel}
                        disabled={actionLoading}
                    >
                        {actionLoading ? (
                            <ActivityIndicator size="small" color={theme.danger} />
                        ) : (
                            <Text style={[styles.cancelButtonText, { color: theme.danger }]}>Annuler ma demande</Text>
                        )}
                    </TouchableOpacity>
                )}

                {request.status === UserLoanRequestStatus.ACCEPTED && isLender && (
                    <TouchableOpacity
                        style={[styles.returnButton, { backgroundColor: theme.success }, actionLoading && styles.buttonDisabled]}
                        onPress={handleReturn}
                        disabled={actionLoading}
                    >
                        {actionLoading ? (
                            <ActivityIndicator size="small" color={theme.textInverse} />
                        ) : (
                            <>
                                <MaterialIcons name="assignment-return" size={20} color={theme.textInverse} />
                                <Text style={[styles.returnButtonText, { color: theme.textInverse }]}>Marquer comme retourné</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}
            </ScrollView>
            </KeyboardAvoidingView>
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
    headerTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: '600',
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
        borderRadius: 12,
        padding: 16,
    },
    cardTitle: {
        fontSize: 13,
        fontWeight: '600',
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
        marginBottom: 6,
    },
    bookAuthors: {
        fontSize: 14,
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
        textTransform: 'uppercase',
    },
    participantName: {
        fontSize: 15,
        fontWeight: '700',
    },
    dateRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
        borderBottomWidth: 1,
    },
    dateLabel: {
        fontSize: 14,
    },
    dateValue: {
        fontSize: 14,
        fontWeight: '500',
    },
    messageText: {
        fontSize: 14,
        lineHeight: 20,
    },
    actionsCard: {
        borderRadius: 12,
        padding: 16,
    },
    responseInput: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
        fontSize: 14,
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
        borderRadius: 10,
        padding: 14,
    },
    declineButtonText: {
        fontSize: 15,
        fontWeight: '600',
    },
    acceptButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderRadius: 10,
        padding: 14,
    },
    acceptButtonText: {
        fontSize: 15,
        fontWeight: '600',
    },
    cancelButton: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 14,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 15,
        fontWeight: '600',
    },
    returnButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 10,
        padding: 14,
    },
    returnButtonText: {
        fontSize: 15,
        fontWeight: '700',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
});
