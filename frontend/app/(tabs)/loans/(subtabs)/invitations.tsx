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
import { useContactInvitations } from '@/hooks/useContactInvitations';
import { contactInvitationService } from '@/services/contactInvitationService';
import { ContactInvitation, InvitationStatus } from '@/types/contactInvitation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

function InvitationsScreen() {
    const {
        received,
        sent,
        pendingCount,
        loading,
        refresh,
        accept,
        decline,
        cancel,
    } = useContactInvitations();
    const [refreshing, setRefreshing] = useState(false);
    const [tab, setTab] = useState<'received' | 'sent'>('received');
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
            setSendError(err.response?.data?.detail || 'Impossible d\'envoyer l\'invitation');
        } finally {
            setSending(false);
        }
    };

    const handleAccept = async (inv: ContactInvitation) => {
        try {
            await accept(inv.id);
            Alert.alert('Connecté !', `Vous êtes maintenant connecté avec ${inv.sender_username}.`);
        } catch (err: any) {
            Alert.alert('Erreur', err.response?.data?.detail || 'Impossible d\'accepter');
        }
    };

    const handleDecline = (inv: ContactInvitation) => {
        Alert.alert(
            'Refuser l\'invitation',
            `Refuser l'invitation de ${inv.sender_username} ?`,
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Refuser',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await decline(inv.id);
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
            'Annuler l\'invitation',
            `Annuler l'invitation envoyée à ${inv.recipient_username} ?`,
            [
                { text: 'Non', style: 'cancel' },
                {
                    text: 'Oui, annuler',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await cancel(inv.id);
                        } catch (err: any) {
                            Alert.alert('Erreur', err.response?.data?.detail || 'Impossible d\'annuler');
                        }
                    },
                },
            ]
        );
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

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
                    <View style={styles.pendingBadge}>
                        <Text style={styles.pendingBadgeText}>En attente</Text>
                    </View>
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
            {item.message && (
                <Text style={styles.invitationMessage}>"{item.message}"</Text>
            )}
            {item.status === InvitationStatus.PENDING && (
                <View style={styles.invitationActions}>
                    <TouchableOpacity
                        style={styles.declineBtn}
                        onPress={() => handleDecline(item)}
                    >
                        <MaterialIcons name="close" size={16} color="#F44336" />
                        <Text style={styles.declineBtnText}>Refuser</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.acceptBtn}
                        onPress={() => handleAccept(item)}
                    >
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
                    <TouchableOpacity
                        style={styles.cancelSmallBtn}
                        onPress={() => handleCancel(item)}
                    >
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
            {item.message && (
                <Text style={styles.invitationMessage}>"{item.message}"</Text>
            )}
        </View>
    );

    const data = tab === 'received' ? received : sent;

    return (
        <View style={styles.container}>
            {/* Tabs received / sent */}
            <View style={styles.tabRow}>
                <TouchableOpacity
                    style={[styles.tabBtn, tab === 'received' && styles.tabBtnActive]}
                    onPress={() => setTab('received')}
                >
                    <Text style={[styles.tabBtnText, tab === 'received' && styles.tabBtnTextActive]}>
                        Reçues {pendingCount > 0 && tab !== 'received' ? `(${pendingCount})` : ''}
                    </Text>
                    {pendingCount > 0 && tab !== 'received' && (
                        <View style={styles.smallBadge}>
                            <Text style={styles.smallBadgeText}>{pendingCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabBtn, tab === 'sent' && styles.tabBtnActive]}
                    onPress={() => setTab('sent')}
                >
                    <Text style={[styles.tabBtnText, tab === 'sent' && styles.tabBtnTextActive]}>
                        Envoyées
                    </Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#7C3AED" />
                </View>
            ) : (
                <FlatList
                    data={tab === 'received' ? received : sent}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={tab === 'received' ? renderReceivedItem : renderSentItem}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <MaterialIcons name="person-add" size={64} color="#E0E0E0" />
                            <Text style={styles.emptyText}>
                                {tab === 'received' ? 'Aucune invitation reçue' : 'Aucune invitation envoyée'}
                            </Text>
                        </View>
                    }
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                    }
                    contentContainerStyle={data.length === 0 ? styles.emptyListContainer : styles.listContent}
                />
            )}

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
                                <TouchableOpacity onPress={() => {
                                    setSelectedUser(null);
                                    setSearchQuery('');
                                }}>
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
                            style={[
                                styles.sendButton,
                                (!selectedUser || sending) && styles.buttonDisabled,
                            ]}
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
        </View>
    );
}

export default function InvitationsTab() {
    return (
        <ProtectedRoute>
            <InvitationsScreen />
        </ProtectedRoute>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        paddingTop: Platform.OS === 'android' ? 40 : Platform.OS === 'ios' ? 44 : 0,
    },
    tabRow: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    tabBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 6,
    },
    tabBtnActive: {
        borderBottomWidth: 2,
        borderBottomColor: '#7C3AED',
    },
    tabBtnText: {
        fontSize: 14,
        color: '#757575',
        fontWeight: '500',
    },
    tabBtnTextActive: {
        color: '#7C3AED',
        fontWeight: '700',
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
    declineBtnText: {
        color: '#F44336',
        fontSize: 13,
        fontWeight: '600',
    },
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
    acceptBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600',
    },
    cancelSmallBtn: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    cancelSmallBtnText: {
        fontSize: 12,
        color: '#757575',
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
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#212121',
    },
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
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#212121',
        padding: 0,
    },
    searchResult: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
    },
    searchResultName: {
        fontSize: 15,
        color: '#212121',
        fontWeight: '500',
    },
    selectedUser: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#F3F0FF',
        borderRadius: 8,
        padding: 10,
        marginBottom: 8,
    },
    selectedUserName: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: '#7C3AED',
    },
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
    sendButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FFEBEE',
        borderRadius: 8,
        padding: 10,
        marginBottom: 8,
    },
    errorBannerText: {
        flex: 1,
        fontSize: 13,
        color: '#F44336',
        fontWeight: '500',
    },
});
