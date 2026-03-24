import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Pressable, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { UserLoanRequest, UserLoanRequestStatus } from '@/types/userLoanRequest';
import BookCover from '@/components/BookCover';
import { useRouter } from 'expo-router';
import { userLoanRequestService } from '@/services/userLoanRequestService';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

interface UserLoanRequestListItemProps {
    request: UserLoanRequest;
    onAction?: () => void;
}

export const UserLoanRequestListItem: React.FC<UserLoanRequestListItemProps> = ({ request, onAction }) => {
    const router = useRouter();
    const theme = useTheme();
    const { user } = useAuth();
    const [actioning, setActioning] = useState(false);

    const isLender = user?.id === request.lender_id;

    const handlePress = () => {
        router.push(`/(tabs)/loans/user-loan-request/${request.id}`);
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Non définie';
        return new Date(dateString).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    const handleReturn = (e: any) => {
        e?.stopPropagation?.();
        const confirm = () => {
            setActioning(true);
            userLoanRequestService.returnBook(request.id)
                .then(() => onAction?.())
                .catch(() => Alert.alert('Erreur', 'Impossible de marquer le retour'))
                .finally(() => setActioning(false));
        };

        if (Platform.OS === 'web') {
            if (window.confirm(`Confirmer le retour de "${request.book.title}" ?`)) confirm();
        } else {
            Alert.alert('Retour du livre', `Confirmer le retour de "${request.book.title}" ?`, [
                { text: 'Annuler', style: 'cancel' },
                { text: 'Confirmer', onPress: confirm },
            ]);
        }
    };

    const canReturn = isLender && request.status === UserLoanRequestStatus.ACCEPTED;

    const statusLabel: Record<UserLoanRequestStatus, string> = {
        [UserLoanRequestStatus.PENDING]: 'En attente',
        [UserLoanRequestStatus.ACCEPTED]: 'En cours',
        [UserLoanRequestStatus.DECLINED]: 'Refusé',
        [UserLoanRequestStatus.CANCELLED]: 'Annulé',
        [UserLoanRequestStatus.RETURNED]: 'Retourné',
    };

    const statusColor: Record<UserLoanRequestStatus, string> = {
        [UserLoanRequestStatus.PENDING]: theme.warning,
        [UserLoanRequestStatus.ACCEPTED]: theme.success,
        [UserLoanRequestStatus.DECLINED]: theme.danger,
        [UserLoanRequestStatus.CANCELLED]: theme.textMuted,
        [UserLoanRequestStatus.RETURNED]: theme.textMuted,
    };

    const statusBgColor: Record<UserLoanRequestStatus, string> = {
        [UserLoanRequestStatus.PENDING]: theme.warningBg,
        [UserLoanRequestStatus.ACCEPTED]: theme.successBg,
        [UserLoanRequestStatus.DECLINED]: theme.dangerBg,
        [UserLoanRequestStatus.CANCELLED]: theme.bgMuted,
        [UserLoanRequestStatus.RETURNED]: theme.bgMuted,
    };

    return (
        <TouchableOpacity
            style={[styles.container, { borderBottomColor: theme.borderLight, backgroundColor: theme.bgSecondary }]}
            onPress={handlePress}
        >
            <BookCover
                url={request.book.cover_url}
                style={styles.cover}
                containerStyle={styles.coverContainer}
                resizeMode="cover"
            />

            <View style={styles.infoContainer}>
                <View style={styles.titleRow}>
                    <Text style={[styles.bookTitle, { color: theme.textPrimary }]} numberOfLines={2}>
                        {request.book.title}
                    </Text>
                    <View style={[styles.memberBadge, { backgroundColor: theme.accentLight }]}>
                        <MaterialIcons name="people" size={10} color={theme.accentMedium} />
                        <Text style={[styles.memberBadgeText, { color: theme.accentMedium }]}>Membre</Text>
                    </View>
                </View>

                <Text style={[styles.userName, { color: theme.textSecondary }]}>
                    {isLender ? 'Demandé par : ' : 'Demandé à : '}
                    <Text style={[styles.userNameBold, { color: theme.textPrimary }]}>
                        {isLender ? request.requester_username : request.lender_username}
                    </Text>
                </Text>

                <Text style={[styles.dateText, { color: theme.textMuted }]}>
                    Le {formatDate(request.request_date)}
                </Text>
                {request.due_date && (
                    <Text style={[styles.dateText, { color: theme.textMuted }]}>
                        Retour prévu : {formatDate(request.due_date)}
                    </Text>
                )}

                <View style={[styles.statusBadge, { backgroundColor: statusBgColor[request.status] }]}>
                    <Text style={[styles.statusText, { color: statusColor[request.status] }]}>
                        {statusLabel[request.status]}
                    </Text>
                </View>
            </View>

            {canReturn && (
                <Pressable
                    style={styles.returnButton}
                    onPress={handleReturn}
                    disabled={actioning}
                    accessibilityLabel="Marquer comme retourné"
                >
                    <MaterialIcons
                        name="assignment-return"
                        size={20}
                        color={actioning ? theme.textMuted : theme.success}
                    />
                    <Text style={[styles.returnButtonText, { color: actioning ? theme.textMuted : theme.success }]}>
                        Retourner
                    </Text>
                </Pressable>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        padding: 12,
        borderBottomWidth: 1,
        alignItems: 'center',
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
    infoContainer: {
        flex: 1,
        justifyContent: 'space-between',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        marginBottom: 4,
    },
    bookTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
    },
    memberBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        borderRadius: 8,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginTop: 2,
    },
    memberBadgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    userName: {
        fontSize: 14,
        marginBottom: 4,
    },
    userNameBold: {
        fontWeight: '600',
    },
    dateText: {
        fontSize: 12,
        marginBottom: 2,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        marginTop: 4,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
    },
    returnButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        padding: 8,
        marginLeft: 8,
    },
    returnButtonText: {
        fontSize: 12,
        fontWeight: '600',
    },
});
