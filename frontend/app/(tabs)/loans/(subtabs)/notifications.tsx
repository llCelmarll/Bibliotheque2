import React, { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
    RefreshControl,
    TextInput,
    Alert,
    Modal,
    Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNotifications } from '@/contexts/NotificationsContext';
import { contactInvitationService } from '@/services/contactInvitationService';
import { ContactInvitation, InvitationStatus } from '@/types/contactInvitation';
import { UserLoanRequest, UserLoanRequestStatus } from '@/types/userLoanRequest';
import { UserLoanRequestListItem } from '@/components/loans/UserLoanRequestListItem';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

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

function NotificationsScreen() {
    const router = useRouter();
    const theme = useTheme();
    const [tab, setTab] = useState<'loans' | 'contacts'>('loans');

    const {
        incomingLoanRequests,
        outgoingLoanRequests,
        receivedInvitations: received,
        sentInvitations: sent,
        invitationPendingCount,
        declinedLoanRequestCount,
        seenDeclinedIds,
        loading,
        refresh,
    } = useNotifications();

    const pendingLoanRequests = incomingLoanRequests.filter(
        r => r.status === UserLoanRequestStatus.PENDING
    );
    const declinedLoanRequests = outgoingLoanRequests.filter(
        r => r.status !== UserLoanRequestStatus.DECLINED || !seenDeclinedIds.has(r.id)
    );

    const [refreshing, setRefreshing] = useState(false);
    const [loansSubTab, setLoansSubTab] = useState<'incoming' | 'declined'>('incoming');
    const [contactsSubTab, setContactsSubTab] = useState<'received' | 'sent'>('received');
    const [showSendModal, setShowSendModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{ id: number; username: string }[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [inviteMessage, setInviteMessage] = useState('');
    const [selectedUser, setSelectedUser] = useState<{ id: number; username: string } | null>(null);
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);

    useFocusEffect(useCallback(() => {
        refresh();
    }, [refresh]));

    const handleRefresh = async () => {
        setRefreshing(true);
        await refresh();
        setRefreshing(false);
    };

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        setSelectedUser(null);
        if (query.trim().length < 2) {
            setSearchResults([]);
            return;
        }
        setSearchLoading(true);
        try {
            const results = await contactInvitationService.searchUsers(query.trim());
            setSearchResults(results);
        } catch {
            setSearchResults([]);
        } finally {
            setSearchLoading(false);
        }
    };

    const handleSendInvitation = async () => {
        if (!selectedUser) return;
        setSending(true);
        setSendError(null);
        try {
            await contactInvitationService.send({
                recipient_id: selectedUser.id,
                message: inviteMessage.trim() || undefined,
            });
            await refresh();
            setShowSendModal(false);
            setSelectedUser(null);
            setSearchQuery('');
            setSearchResults([]);
            setInviteMessage('');
            setSendError(null);
            showAlert('Invitation envoyée', `Votre invitation a été envoyée à ${selectedUser.username}.`);
        } catch (err: any) {
            setSendError(err.response?.data?.detail || "Impossible d'envoyer l'invitation");
        } finally {
            setSending(false);
        }
    };

    const handleAccept = async (inv: ContactInvitation) => {
        try {
            await contactInvitationService.accept(inv.id);
            await refresh();
            showAlert('Connecté !', `Vous êtes maintenant connecté avec ${inv.sender_username}.`);
        } catch (err: any) {
            showAlert('Erreur', err.response?.data?.detail || "Impossible d'accepter");
        }
    };

    const handleDecline = (inv: ContactInvitation) => {
        showConfirm(
            "Refuser l'invitation",
            `Refuser l'invitation de ${inv.sender_username} ?`,
            async () => {
                try {
                    await contactInvitationService.decline(inv.id);
                    await refresh();
                } catch (err: any) {
                    showAlert('Erreur', err.response?.data?.detail || 'Impossible de refuser');
                }
            }
        );
    };

    const handleCancel = async (inv: ContactInvitation) => {
        if (Platform.OS === 'web') {
            if (!window.confirm(`Annuler l'invitation envoyée à ${inv.recipient_username} ?`)) return;
            try {
                await contactInvitationService.cancel(inv.id);
                await refresh();
            } catch (err: any) {
                window.alert(err.response?.data?.detail || "Impossible d'annuler");
            }
            return;
        }
        Alert.alert(
            "Annuler l'invitation",
            `Annuler l'invitation envoyée à ${inv.recipient_username} ?`,
            [
                { text: 'Non', style: 'cancel' },
                {
                    text: 'Oui, annuler',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await contactInvitationService.cancel(inv.id);
                            await refresh();
                        } catch (err: any) {
                            Alert.alert('Erreur', err.response?.data?.detail || "Impossible d'annuler");
                        }
                    },
                },
            ]
        );
    };

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString('fr-FR', {
            day: 'numeric', month: 'short', year: 'numeric',
        });

    const renderReceivedItem = ({ item }: { item: ContactInvitation }) => (
        <View style={[styles.invitationCard, { backgroundColor: theme.bgCard }]}>
            <View style={styles.invitationHeader}>
                <View style={[styles.userIcon, { backgroundColor: theme.accentLight }]}>
                    <MaterialIcons name="person" size={20} color={theme.accent} />
                </View>
                <View style={styles.invitationInfo}>
                    <Text style={[styles.invitationName, { color: theme.textPrimary }]}>{item.sender_username}</Text>
                    <Text style={[styles.invitationDate, { color: theme.textMuted }]}>{formatDate(item.created_at)}</Text>
                </View>
                {item.status === InvitationStatus.PENDING && (
                    <View style={[styles.pendingBadge, { backgroundColor: theme.warningBg }]}>
                        <Text style={[styles.pendingBadgeText, { color: theme.warning }]}>En attente</Text>
                    </View>
                )}
                {item.status === InvitationStatus.ACCEPTED && (
                    <View style={[styles.pendingBadge, { backgroundColor: theme.successBg }]}>
                        <Text style={[styles.pendingBadgeText, { color: theme.success }]}>Acceptée</Text>
                    </View>
                )}
                {item.status === InvitationStatus.DECLINED && (
                    <View style={[styles.pendingBadge, { backgroundColor: theme.dangerBg }]}>
                        <Text style={[styles.pendingBadgeText, { color: theme.danger }]}>Refusée</Text>
                    </View>
                )}
            </View>
            {item.message && <Text style={[styles.invitationMessage, { color: theme.textSecondary }]}>"{item.message}"</Text>}
            {item.status === InvitationStatus.PENDING && (
                <View style={styles.invitationActions}>
                    <TouchableOpacity style={[styles.declineBtn, { borderColor: theme.danger }]} onPress={() => handleDecline(item)}>
                        <MaterialIcons name="close" size={16} color={theme.danger} />
                        <Text style={[styles.declineBtnText, { color: theme.danger }]}>Refuser</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.acceptBtn, { backgroundColor: theme.accent }]} onPress={() => handleAccept(item)}>
                        <MaterialIcons name="check" size={16} color={theme.textInverse} />
                        <Text style={[styles.acceptBtnText, { color: theme.textInverse }]}>Accepter</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    const renderSentItem = ({ item }: { item: ContactInvitation }) => (
        <View style={[styles.invitationCard, { backgroundColor: theme.bgCard }]}>
            <View style={styles.invitationHeader}>
                <View style={[styles.userIcon, { backgroundColor: theme.bgMuted }]}>
                    <MaterialIcons name="person-outline" size={20} color={theme.textSecondary} />
                </View>
                <View style={styles.invitationInfo}>
                    <Text style={[styles.invitationName, { color: theme.textPrimary }]}>{item.recipient_username}</Text>
                    <Text style={[styles.invitationDate, { color: theme.textMuted }]}>{formatDate(item.created_at)}</Text>
                </View>
                {item.status === InvitationStatus.PENDING && (
                    <TouchableOpacity style={[styles.cancelSmallBtn, { borderColor: theme.borderMedium }]} onPress={() => handleCancel(item)}>
                        <Text style={[styles.cancelSmallBtnText, { color: theme.textSecondary }]}>Annuler</Text>
                    </TouchableOpacity>
                )}
                {item.status === InvitationStatus.ACCEPTED && (
                    <View style={[styles.pendingBadge, { backgroundColor: theme.successBg }]}>
                        <Text style={[styles.pendingBadgeText, { color: theme.success }]}>Acceptée</Text>
                    </View>
                )}
                {item.status === InvitationStatus.DECLINED && (
                    <View style={[styles.pendingBadge, { backgroundColor: theme.dangerBg }]}>
                        <Text style={[styles.pendingBadgeText, { color: theme.danger }]}>Refusée</Text>
                    </View>
                )}
            </View>
            {item.message && <Text style={[styles.invitationMessage, { color: theme.textSecondary }]}>"{item.message}"</Text>}
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
            {/* Onglets principaux : Emprunts / Contacts */}
            <View style={[styles.mainTabRow, { backgroundColor: theme.bgPrimary, borderBottomColor: theme.borderLight }]}>
                <TouchableOpacity
                    style={[styles.mainTabBtn, tab === 'loans' && { borderBottomColor: theme.accent, borderBottomWidth: 2 }]}
                    onPress={() => setTab('loans')}
                >
                    <MaterialIcons
                        name="swap-horizontal-circle"
                        size={16}
                        color={tab === 'loans' ? theme.accent : theme.textMuted}
                    />
                    <Text style={[styles.mainTabBtnText, { color: tab === 'loans' ? theme.accent : theme.textMuted }, tab === 'loans' && { fontWeight: '700' }]}>
                        Emprunts
                    </Text>
                    {(pendingLoanRequests.length + declinedLoanRequestCount) > 0 && (
                        <View style={[styles.smallBadge, { backgroundColor: theme.danger }]}>
                            <Text style={[styles.smallBadgeText, { color: theme.textInverse }]}>
                                {(pendingLoanRequests.length + declinedLoanRequestCount) > 9 ? '9+' : pendingLoanRequests.length + declinedLoanRequestCount}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.mainTabBtn, tab === 'contacts' && { borderBottomColor: theme.accent, borderBottomWidth: 2 }]}
                    onPress={() => setTab('contacts')}
                >
                    <MaterialIcons
                        name="person-add"
                        size={16}
                        color={tab === 'contacts' ? theme.accent : theme.textMuted}
                    />
                    <Text style={[styles.mainTabBtnText, { color: tab === 'contacts' ? theme.accent : theme.textMuted }, tab === 'contacts' && { fontWeight: '700' }]}>
                        Contacts
                    </Text>
                    {invitationPendingCount > 0 && (
                        <View style={[styles.smallBadge, { backgroundColor: theme.danger }]}>
                            <Text style={[styles.smallBadgeText, { color: theme.textInverse }]}>
                                {invitationPendingCount > 9 ? '9+' : invitationPendingCount}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.accent} />
                </View>
            ) : tab === 'loans' ? (
                /* ---- Onglet Emprunts ---- */
                <>
                    <View style={[styles.subTabRow, { backgroundColor: theme.bgSecondary, borderBottomColor: theme.borderLight }]}>
                        <TouchableOpacity
                            style={[styles.subTabBtn, loansSubTab === 'incoming' && { borderBottomColor: theme.accent, borderBottomWidth: 2 }]}
                            onPress={() => setLoansSubTab('incoming')}
                        >
                            <Text style={[styles.subTabBtnText, { color: loansSubTab === 'incoming' ? theme.accent : theme.textMuted }, loansSubTab === 'incoming' && { fontWeight: '600' }]}>
                                Reçues {pendingLoanRequests.length > 0 && loansSubTab !== 'incoming' ? `(${pendingLoanRequests.length})` : ''}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.subTabBtn, loansSubTab === 'declined' && { borderBottomColor: theme.accent, borderBottomWidth: 2 }]}
                            onPress={() => setLoansSubTab('declined')}
                        >
                            <Text style={[styles.subTabBtnText, { color: loansSubTab === 'declined' ? theme.accent : theme.textMuted }, loansSubTab === 'declined' && { fontWeight: '600' }]}>
                                Envoyées {declinedLoanRequestCount > 0 && loansSubTab !== 'declined' ? `(${declinedLoanRequestCount})` : ''}
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={loansSubTab === 'incoming' ? pendingLoanRequests : declinedLoanRequests}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item }) => (
                            <UserLoanRequestListItem
                                request={item as UserLoanRequest}
                                onAction={refresh}
                            />
                        )}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <MaterialIcons name="swap-horizontal-circle" size={64} color={theme.borderMedium} />
                                <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                                    {loansSubTab === 'incoming' ? 'Aucune demande d\'emprunt en attente' : 'Aucune demande envoyée'}
                                </Text>
                            </View>
                        }
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                        }
                        contentContainerStyle={(loansSubTab === 'incoming' ? pendingLoanRequests : declinedLoanRequests).length === 0 ? styles.emptyListContainer : undefined}
                    />
                </>
            ) : (
                /* ---- Onglet Contacts ---- */
                <>
                    {/* Sous-onglets Reçues / Envoyées */}
                    <View style={[styles.subTabRow, { backgroundColor: theme.bgSecondary, borderBottomColor: theme.borderLight }]}>
                        <TouchableOpacity
                            style={[styles.subTabBtn, contactsSubTab === 'received' && { borderBottomColor: theme.accent, borderBottomWidth: 2 }]}
                            onPress={() => setContactsSubTab('received')}
                        >
                            <Text style={[styles.subTabBtnText, { color: contactsSubTab === 'received' ? theme.accent : theme.textMuted }, contactsSubTab === 'received' && { fontWeight: '600' }]}>
                                Reçues {invitationPendingCount > 0 && contactsSubTab !== 'received' ? `(${invitationPendingCount})` : ''}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.subTabBtn, contactsSubTab === 'sent' && { borderBottomColor: theme.accent, borderBottomWidth: 2 }]}
                            onPress={() => setContactsSubTab('sent')}
                        >
                            <Text style={[styles.subTabBtnText, { color: contactsSubTab === 'sent' ? theme.accent : theme.textMuted }, contactsSubTab === 'sent' && { fontWeight: '600' }]}>
                                Envoyées
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={contactsSubTab === 'received' ? received : sent}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={contactsSubTab === 'received' ? renderReceivedItem : renderSentItem}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <MaterialIcons name="person-add" size={64} color={theme.borderMedium} />
                                <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                                    {contactsSubTab === 'received' ? 'Aucune invitation reçue' : 'Aucune invitation envoyée'}
                                </Text>
                            </View>
                        }
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                        }
                        contentContainerStyle={styles.listContent}
                    />

                    {/* FAB pour envoyer une invitation */}
                    <TouchableOpacity
                        style={[styles.fab, { backgroundColor: theme.accent }]}
                        onPress={() => setShowSendModal(true)}
                        accessibilityLabel="Envoyer une invitation"
                    >
                        <MaterialIcons name="person-add" size={24} color={theme.textInverse} />
                    </TouchableOpacity>

                    {/* Modal d'invitation */}
                    <Modal
                        visible={showSendModal}
                        transparent
                        animationType="slide"
                        onRequestClose={() => {
                            setShowSendModal(false);
                            setSelectedUser(null);
                            setSearchQuery('');
                            setSearchResults([]);
                            setInviteMessage('');
                            setSendError(null);
                        }}
                    >
                        <View style={[styles.modalOverlay, { backgroundColor: `${theme.textPrimary}80` }]}>
                            <View style={[styles.modalContent, { backgroundColor: theme.bgCard }]}>
                                <View style={styles.modalHeader}>
                                    <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Inviter un utilisateur</Text>
                                    <TouchableOpacity onPress={() => {
                                        setShowSendModal(false);
                                        setSelectedUser(null);
                                        setSearchQuery('');
                                        setSearchResults([]);
                                        setInviteMessage('');
                                        setSendError(null);
                                    }}>
                                        <MaterialIcons name="close" size={24} color={theme.textMuted} />
                                    </TouchableOpacity>
                                </View>

                                {selectedUser ? (
                                    <View style={[styles.selectedUser, { backgroundColor: theme.accentLight }]}>
                                        <MaterialIcons name="person" size={20} color={theme.accent} />
                                        <Text style={[styles.selectedUserName, { color: theme.accent }]}>{selectedUser.username}</Text>
                                        <TouchableOpacity onPress={() => { setSelectedUser(null); setSearchQuery(''); }}>
                                            <MaterialIcons name="close" size={18} color={theme.textMuted} />
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <>
                                        <View style={[styles.searchBox, { backgroundColor: theme.bgInput }]}>
                                            <MaterialIcons name="search" size={20} color={theme.textMuted} />
                                            <TextInput
                                                style={[styles.searchInput, { color: theme.textPrimary }]}
                                                placeholder="Rechercher par nom d'utilisateur..."
                                                value={searchQuery}
                                                onChangeText={handleSearch}
                                                placeholderTextColor={theme.textMuted}
                                                autoFocus
                                            />
                                            {searchLoading && <ActivityIndicator size="small" color={theme.accent} />}
                                        </View>
                                        {searchResults.map(u => (
                                            <TouchableOpacity
                                                key={u.id}
                                                style={[styles.searchResult, { borderBottomColor: theme.borderLight }]}
                                                onPress={() => {
                                                    setSelectedUser(u);
                                                    setSearchResults([]);
                                                    setSendError(null);
                                                }}
                                            >
                                                <MaterialIcons name="person-outline" size={20} color={theme.textMuted} />
                                                <Text style={[styles.searchResultName, { color: theme.textPrimary }]}>{u.username}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </>
                                )}

                                <TextInput
                                    style={[styles.messageInput, { borderColor: theme.borderLight, color: theme.textPrimary }]}
                                    placeholder="Message d'invitation (optionnel)..."
                                    value={inviteMessage}
                                    onChangeText={(t) => { setInviteMessage(t); setSendError(null); }}
                                    multiline
                                    numberOfLines={2}
                                    placeholderTextColor={theme.textMuted}
                                />

                                {sendError && (
                                    <View style={[styles.errorBanner, { backgroundColor: theme.dangerBg }]}>
                                        <MaterialIcons name="error-outline" size={16} color={theme.danger} />
                                        <Text style={[styles.errorBannerText, { color: theme.danger }]}>{sendError}</Text>
                                    </View>
                                )}

                                <TouchableOpacity
                                    style={[styles.sendButton, { backgroundColor: theme.accent }, (!selectedUser || sending) && styles.buttonDisabled]}
                                    onPress={handleSendInvitation}
                                    disabled={!selectedUser || sending}
                                >
                                    {sending ? (
                                        <ActivityIndicator size="small" color={theme.textInverse} />
                                    ) : (
                                        <>
                                            <MaterialIcons name="send" size={18} color={theme.textInverse} />
                                            <Text style={[styles.sendButtonText, { color: theme.textInverse }]}>Envoyer l'invitation</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Modal>
                </>
            )}
        </View>
    );
}

export default function NotificationsTab() {
    return (
        <ProtectedRoute>
            <NotificationsScreen />
        </ProtectedRoute>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: Platform.OS === 'android' ? 40 : Platform.OS === 'ios' ? 44 : 0,
    },
    mainTabRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
    },
    mainTabBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 6,
    },
    mainTabBtnText: {
        fontSize: 14,
        fontWeight: '500',
    },
    subTabRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
    },
    subTabBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        gap: 4,
    },
    subTabBtnText: {
        fontSize: 13,
    },
    smallBadge: {
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 3,
    },
    smallBadgeText: {
        fontSize: 9,
        fontWeight: '700',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingVertical: 8,
    },
    invitationCard: {
        marginHorizontal: 12,
        marginVertical: 6,
        borderRadius: 12,
        padding: 16,
    },
    invitationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    userIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    invitationInfo: {
        flex: 1,
    },
    invitationName: {
        fontSize: 15,
        fontWeight: '700',
    },
    invitationDate: {
        fontSize: 12,
    },
    pendingBadge: {
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    pendingBadgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    invitationMessage: {
        fontSize: 13,
        fontStyle: 'italic',
        marginBottom: 8,
    },
    invitationActions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
    },
    declineBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
    },
    declineBtnText: { fontSize: 13, fontWeight: '600' },
    acceptBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        borderRadius: 8,
        padding: 10,
    },
    acceptBtnText: { fontSize: 13, fontWeight: '600' },
    cancelSmallBtn: {
        borderWidth: 1,
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    cancelSmallBtnText: { fontSize: 12 },
    emptyListContainer: { flexGrow: 1 },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 64,
    },
    emptyText: { fontSize: 16, marginTop: 16, textAlign: 'center' },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: { fontSize: 18, fontWeight: '700' },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 8,
        gap: 8,
    },
    searchInput: { flex: 1, fontSize: 14, padding: 0 },
    searchResult: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
    },
    searchResultName: { fontSize: 15, fontWeight: '500' },
    selectedUser: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderRadius: 8,
        padding: 10,
        marginBottom: 8,
    },
    selectedUserName: { flex: 1, fontSize: 15, fontWeight: '600' },
    messageInput: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        minHeight: 60,
        textAlignVertical: 'top',
        marginVertical: 12,
    },
    sendButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 10,
        padding: 14,
    },
    sendButtonText: { fontSize: 15, fontWeight: '600' },
    buttonDisabled: { opacity: 0.5 },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderRadius: 8,
        padding: 10,
        marginBottom: 8,
    },
    errorBannerText: { flex: 1, fontSize: 13, fontWeight: '500' },
});
