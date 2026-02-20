import React, { useState } from 'react';
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

function NotificationsScreen() {
    const router = useRouter();
    const [tab, setTab] = useState<'loans' | 'contacts'>('loans');

    const {
        incomingLoanRequests,
        receivedInvitations: received,
        sentInvitations: sent,
        invitationPendingCount,
        loading,
        refresh,
    } = useNotifications();

    const pendingLoanRequests = incomingLoanRequests.filter(
        r => r.status === UserLoanRequestStatus.PENDING
    );

    const [refreshing, setRefreshing] = useState(false);
    const [contactsSubTab, setContactsSubTab] = useState<'received' | 'sent'>('received');
    const [showSendModal, setShowSendModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{ id: number; username: string }[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [inviteMessage, setInviteMessage] = useState('');
    const [selectedUser, setSelectedUser] = useState<{ id: number; username: string } | null>(null);
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);

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
            Alert.alert('Invitation envoyée', `Votre invitation a été envoyée à ${selectedUser.username}.`);
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
            Alert.alert('Connecté !', `Vous êtes maintenant connecté avec ${inv.sender_username}.`);
        } catch (err: any) {
            Alert.alert('Erreur', err.response?.data?.detail || "Impossible d'accepter");
        }
    };

    const handleDecline = (inv: ContactInvitation) => {
        Alert.alert(
            "Refuser l'invitation",
            `Refuser l'invitation de ${inv.sender_username} ?`,
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Refuser',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await contactInvitationService.decline(inv.id);
                            await refresh();
                        } catch (err: any) {
                            Alert.alert('Erreur', err.response?.data?.detail || 'Impossible de refuser');
                        }
                    },
                },
            ]
        );
    };

    const handleCancel = (inv: ContactInvitation) => {
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
        <View style={styles.invitationCard}>
            <View style={styles.invitationHeader}>
                <View style={styles.userIcon}>
                    <MaterialIcons name="person" size={20} color="#7C3AED" />
                </View>
                <View style={styles.invitationInfo}>
                    <Text style={styles.invitationName}>{item.sender_username}</Text>
                    <Text style={styles.invitationDate}>{formatDate(item.created_at)}</Text>
                </View>
                {item.status === InvitationStatus.PENDING && (
                    <View style={styles.pendingBadge}><Text style={styles.pendingBadgeText}>En attente</Text></View>
                )}
                {item.status === InvitationStatus.ACCEPTED && (
                    <View style={[styles.pendingBadge, { backgroundColor: '#E8F5E9' }]}>
                        <Text style={[styles.pendingBadgeText, { color: '#4CAF50' }]}>Acceptée</Text>
                    </View>
                )}
                {item.status === InvitationStatus.DECLINED && (
                    <View style={[styles.pendingBadge, { backgroundColor: '#FFEBEE' }]}>
                        <Text style={[styles.pendingBadgeText, { color: '#F44336' }]}>Refusée</Text>
                    </View>
                )}
            </View>
            {item.message && <Text style={styles.invitationMessage}>"{item.message}"</Text>}
            {item.status === InvitationStatus.PENDING && (
                <View style={styles.invitationActions}>
                    <TouchableOpacity style={styles.declineBtn} onPress={() => handleDecline(item)}>
                        <MaterialIcons name="close" size={16} color="#F44336" />
                        <Text style={styles.declineBtnText}>Refuser</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(item)}>
                        <MaterialIcons name="check" size={16} color="#FFFFFF" />
                        <Text style={styles.acceptBtnText}>Accepter</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    const renderSentItem = ({ item }: { item: ContactInvitation }) => (
        <View style={styles.invitationCard}>
            <View style={styles.invitationHeader}>
                <View style={[styles.userIcon, { backgroundColor: '#E3F2FD' }]}>
                    <MaterialIcons name="person-outline" size={20} color="#2196F3" />
                </View>
                <View style={styles.invitationInfo}>
                    <Text style={styles.invitationName}>{item.recipient_username}</Text>
                    <Text style={styles.invitationDate}>{formatDate(item.created_at)}</Text>
                </View>
                {item.status === InvitationStatus.PENDING && (
                    <TouchableOpacity style={styles.cancelSmallBtn} onPress={() => handleCancel(item)}>
                        <Text style={styles.cancelSmallBtnText}>Annuler</Text>
                    </TouchableOpacity>
                )}
                {item.status === InvitationStatus.ACCEPTED && (
                    <View style={[styles.pendingBadge, { backgroundColor: '#E8F5E9' }]}>
                        <Text style={[styles.pendingBadgeText, { color: '#4CAF50' }]}>Acceptée</Text>
                    </View>
                )}
                {item.status === InvitationStatus.DECLINED && (
                    <View style={[styles.pendingBadge, { backgroundColor: '#FFEBEE' }]}>
                        <Text style={[styles.pendingBadgeText, { color: '#F44336' }]}>Refusée</Text>
                    </View>
                )}
            </View>
            {item.message && <Text style={styles.invitationMessage}>"{item.message}"</Text>}
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Onglets principaux : Emprunts / Contacts */}
            <View style={styles.mainTabRow}>
                <TouchableOpacity
                    style={[styles.mainTabBtn, tab === 'loans' && styles.mainTabBtnActive]}
                    onPress={() => setTab('loans')}
                >
                    <MaterialIcons
                        name="swap-horizontal-circle"
                        size={16}
                        color={tab === 'loans' ? '#7C3AED' : '#757575'}
                    />
                    <Text style={[styles.mainTabBtnText, tab === 'loans' && styles.mainTabBtnTextActive]}>
                        Emprunts
                    </Text>
                    {pendingLoanRequests.length > 0 && (
                        <View style={styles.smallBadge}>
                            <Text style={styles.smallBadgeText}>
                                {pendingLoanRequests.length > 9 ? '9+' : pendingLoanRequests.length}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.mainTabBtn, tab === 'contacts' && styles.mainTabBtnActive]}
                    onPress={() => setTab('contacts')}
                >
                    <MaterialIcons
                        name="person-add"
                        size={16}
                        color={tab === 'contacts' ? '#7C3AED' : '#757575'}
                    />
                    <Text style={[styles.mainTabBtnText, tab === 'contacts' && styles.mainTabBtnTextActive]}>
                        Contacts
                    </Text>
                    {invitationPendingCount > 0 && (
                        <View style={styles.smallBadge}>
                            <Text style={styles.smallBadgeText}>
                                {invitationPendingCount > 9 ? '9+' : invitationPendingCount}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#7C3AED" />
                </View>
            ) : tab === 'loans' ? (
                /* ---- Onglet Emprunts ---- */
                <FlatList
                    data={pendingLoanRequests}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <UserLoanRequestListItem
                            request={item as UserLoanRequest}
                            onAction={refresh}
                        />
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <MaterialIcons name="swap-horizontal-circle" size={64} color="#E0E0E0" />
                            <Text style={styles.emptyText}>Aucune demande d'emprunt en attente</Text>
                        </View>
                    }
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                    }
                    contentContainerStyle={pendingLoanRequests.length === 0 ? styles.emptyListContainer : undefined}
                />
            ) : (
                /* ---- Onglet Contacts ---- */
                <>
                    {/* Sous-onglets Reçues / Envoyées */}
                    <View style={styles.subTabRow}>
                        <TouchableOpacity
                            style={[styles.subTabBtn, contactsSubTab === 'received' && styles.subTabBtnActive]}
                            onPress={() => setContactsSubTab('received')}
                        >
                            <Text style={[styles.subTabBtnText, contactsSubTab === 'received' && styles.subTabBtnTextActive]}>
                                Reçues {invitationPendingCount > 0 && contactsSubTab !== 'received' ? `(${invitationPendingCount})` : ''}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.subTabBtn, contactsSubTab === 'sent' && styles.subTabBtnActive]}
                            onPress={() => setContactsSubTab('sent')}
                        >
                            <Text style={[styles.subTabBtnText, contactsSubTab === 'sent' && styles.subTabBtnTextActive]}>
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
                                <MaterialIcons name="person-add" size={64} color="#E0E0E0" />
                                <Text style={styles.emptyText}>
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
                        style={styles.fab}
                        onPress={() => setShowSendModal(true)}
                        accessibilityLabel="Envoyer une invitation"
                    >
                        <MaterialIcons name="person-add" size={24} color="#FFFFFF" />
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
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContent}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Inviter un utilisateur</Text>
                                    <TouchableOpacity onPress={() => {
                                        setShowSendModal(false);
                                        setSelectedUser(null);
                                        setSearchQuery('');
                                        setSearchResults([]);
                                        setInviteMessage('');
                                        setSendError(null);
                                    }}>
                                        <MaterialIcons name="close" size={24} color="#757575" />
                                    </TouchableOpacity>
                                </View>

                                {selectedUser ? (
                                    <View style={styles.selectedUser}>
                                        <MaterialIcons name="person" size={20} color="#7C3AED" />
                                        <Text style={styles.selectedUserName}>{selectedUser.username}</Text>
                                        <TouchableOpacity onPress={() => { setSelectedUser(null); setSearchQuery(''); }}>
                                            <MaterialIcons name="close" size={18} color="#9E9E9E" />
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <>
                                        <View style={styles.searchBox}>
                                            <MaterialIcons name="search" size={20} color="#757575" />
                                            <TextInput
                                                style={styles.searchInput}
                                                placeholder="Rechercher par nom d'utilisateur..."
                                                value={searchQuery}
                                                onChangeText={handleSearch}
                                                placeholderTextColor="#9E9E9E"
                                                autoFocus
                                            />
                                            {searchLoading && <ActivityIndicator size="small" color="#7C3AED" />}
                                        </View>
                                        {searchResults.map(u => (
                                            <TouchableOpacity
                                                key={u.id}
                                                style={styles.searchResult}
                                                onPress={() => {
                                                    setSelectedUser(u);
                                                    setSearchResults([]);
                                                    setSendError(null);
                                                }}
                                            >
                                                <MaterialIcons name="person-outline" size={20} color="#757575" />
                                                <Text style={styles.searchResultName}>{u.username}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </>
                                )}

                                <TextInput
                                    style={styles.messageInput}
                                    placeholder="Message d'invitation (optionnel)..."
                                    value={inviteMessage}
                                    onChangeText={(t) => { setInviteMessage(t); setSendError(null); }}
                                    multiline
                                    numberOfLines={2}
                                    placeholderTextColor="#9E9E9E"
                                />

                                {sendError && (
                                    <View style={styles.errorBanner}>
                                        <MaterialIcons name="error-outline" size={16} color="#F44336" />
                                        <Text style={styles.errorBannerText}>{sendError}</Text>
                                    </View>
                                )}

                                <TouchableOpacity
                                    style={[styles.sendButton, (!selectedUser || sending) && styles.buttonDisabled]}
                                    onPress={handleSendInvitation}
                                    disabled={!selectedUser || sending}
                                >
                                    {sending ? (
                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                    ) : (
                                        <>
                                            <MaterialIcons name="send" size={18} color="#FFFFFF" />
                                            <Text style={styles.sendButtonText}>Envoyer l'invitation</Text>
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
        backgroundColor: '#F5F5F5',
        paddingTop: Platform.OS === 'android' ? 40 : Platform.OS === 'ios' ? 44 : 0,
    },
    mainTabRow: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    mainTabBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 6,
    },
    mainTabBtnActive: {
        borderBottomWidth: 2,
        borderBottomColor: '#7C3AED',
    },
    mainTabBtnText: {
        fontSize: 14,
        color: '#757575',
        fontWeight: '500',
    },
    mainTabBtnTextActive: {
        color: '#7C3AED',
        fontWeight: '700',
    },
    subTabRow: {
        flexDirection: 'row',
        backgroundColor: '#FAFAFA',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    subTabBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        gap: 4,
    },
    subTabBtnActive: {
        borderBottomWidth: 2,
        borderBottomColor: '#7C3AED',
    },
    subTabBtnText: {
        fontSize: 13,
        color: '#757575',
    },
    subTabBtnTextActive: {
        color: '#7C3AED',
        fontWeight: '600',
    },
    smallBadge: {
        backgroundColor: '#F44336',
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 3,
    },
    smallBadgeText: {
        color: '#FFFFFF',
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
        backgroundColor: '#FFFFFF',
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
        backgroundColor: '#F3F0FF',
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
        color: '#212121',
    },
    invitationDate: {
        fontSize: 12,
        color: '#9E9E9E',
    },
    pendingBadge: {
        backgroundColor: '#FFF3E0',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    pendingBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#FF9800',
    },
    invitationMessage: {
        fontSize: 13,
        color: '#757575',
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
        borderColor: '#F44336',
        borderRadius: 8,
        padding: 10,
    },
    declineBtnText: { color: '#F44336', fontSize: 13, fontWeight: '600' },
    acceptBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        backgroundColor: '#7C3AED',
        borderRadius: 8,
        padding: 10,
    },
    acceptBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
    cancelSmallBtn: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    cancelSmallBtnText: { fontSize: 12, color: '#757575' },
    emptyListContainer: { flexGrow: 1 },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 64,
    },
    emptyText: { fontSize: 16, color: '#9E9E9E', marginTop: 16, textAlign: 'center' },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#7C3AED',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
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
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#212121' },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 8,
        gap: 8,
    },
    searchInput: { flex: 1, fontSize: 14, color: '#212121', padding: 0 },
    searchResult: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
    },
    searchResultName: { fontSize: 15, color: '#212121', fontWeight: '500' },
    selectedUser: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#F3F0FF',
        borderRadius: 8,
        padding: 10,
        marginBottom: 8,
    },
    selectedUserName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#7C3AED' },
    messageInput: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: '#212121',
        minHeight: 60,
        textAlignVertical: 'top',
        marginVertical: 12,
    },
    sendButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#7C3AED',
        borderRadius: 10,
        padding: 14,
    },
    sendButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
    buttonDisabled: { opacity: 0.5 },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FFEBEE',
        borderRadius: 8,
        padding: 10,
        marginBottom: 8,
    },
    errorBannerText: { flex: 1, fontSize: 13, color: '#F44336', fontWeight: '500' },
});
