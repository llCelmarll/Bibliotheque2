import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { ContactCreate } from '@/types/contact';
import { useContacts } from '@/hooks/useContacts';
import { contactInvitationService } from '@/services/contactInvitationService';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useTheme } from '@/contexts/ThemeContext';

type Mode = 'manual' | 'invite';

function CreateContactScreen() {
  const router = useRouter();
  const { createContact } = useContacts({ autoLoad: false });
  const theme = useTheme();

  const [mode, setMode] = useState<Mode>('manual');

  // Mode manuel
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Mode invitation
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: number; username: string }[]>([]);
  const [selectedUser, setSelectedUser] = useState<{ id: number; username: string } | null>(null);
  const [inviteMessage, setInviteMessage] = useState('');
  const [searching, setSearching] = useState(false);

  const [loading, setLoading] = useState(false);

  // Debounce de la recherche d'utilisateurs
  useEffect(() => {
    if (mode !== 'invite') return;
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await contactInvitationService.searchUsers(searchQuery);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, mode]);

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Le nom est obligatoire';
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Email invalide';
    }

    if (phone && !/^[\d\s+()-]+$/.test(phone)) {
      newErrors.phone = 'Numéro de téléphone invalide';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const contactData: ContactCreate = {
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      await createContact(contactData);

      if (Platform.OS === 'web') {
        window.alert('Le contact a été créé avec succès');
        router.back();
      } else {
        Alert.alert('Succès', 'Le contact a été créé avec succès', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (error: any) {
      const msg = error.response?.data?.detail || error.message || 'Impossible de créer le contact';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Erreur', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteSubmit = async () => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      await contactInvitationService.send({
        recipient_id: selectedUser.id,
        message: inviteMessage.trim() || undefined,
      });
      if (Platform.OS === 'web') {
        window.alert(`Invitation envoyée à @${selectedUser.username}`);
        router.back();
      } else {
        Alert.alert('Invitation envoyée', `Invitation envoyée à @${selectedUser.username}`, [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (error: any) {
      const msg = error.response?.data?.detail || "Impossible d'envoyer l'invitation";
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Erreur', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bgSecondary }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.bgCard, borderBottomColor: theme.borderLight }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          {mode === 'manual' ? 'Nouveau contact' : 'Inviter un membre'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Sélecteur de mode */}
      <View style={[styles.modeSelector, { backgroundColor: theme.bgCard, borderBottomColor: theme.borderLight }]}>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'manual' && { backgroundColor: theme.accent }]}
          onPress={() => handleModeChange('manual')}
        >
          <MaterialIcons name="person-add" size={16} color={mode === 'manual' ? theme.textInverse : theme.textMuted} />
          <Text style={[styles.modeButtonText, { color: mode === 'manual' ? theme.textInverse : theme.textMuted }]}>
            Contact manuel
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'invite' && { backgroundColor: theme.accent }]}
          onPress={() => handleModeChange('invite')}
        >
          <MaterialIcons name="group-add" size={16} color={mode === 'invite' ? theme.textInverse : theme.textMuted} />
          <Text style={[styles.modeButtonText, { color: mode === 'invite' ? theme.textInverse : theme.textMuted }]}>
            Inviter un membre
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {mode === 'manual' ? (
          <View style={[styles.form, { backgroundColor: theme.bgCard }]}>
            {/* Nom */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.textPrimary }]}>
                Nom <Text style={[styles.required, { color: theme.danger }]}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.bgInput, borderColor: theme.borderLight, color: theme.textPrimary }, errors.name && { borderColor: theme.danger }]}
                placeholder="Nom complet"
                placeholderTextColor={theme.textMuted}
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                }}
                autoCapitalize="words"
              />
              {errors.name && <Text style={[styles.errorText, { color: theme.danger }]}>{errors.name}</Text>}
            </View>

            {/* Email */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.textPrimary }]}>Email (optionnel)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.bgInput, borderColor: theme.borderLight, color: theme.textPrimary }, errors.email && { borderColor: theme.danger }]}
                placeholder="email@example.com"
                placeholderTextColor={theme.textMuted}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email && <Text style={[styles.errorText, { color: theme.danger }]}>{errors.email}</Text>}
            </View>

            {/* Téléphone */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.textPrimary }]}>Téléphone (optionnel)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.bgInput, borderColor: theme.borderLight, color: theme.textPrimary }, errors.phone && { borderColor: theme.danger }]}
                placeholder="+33 6 12 34 56 78"
                placeholderTextColor={theme.textMuted}
                value={phone}
                onChangeText={(text) => {
                  setPhone(text);
                  if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
                }}
                keyboardType="phone-pad"
              />
              {errors.phone && <Text style={[styles.errorText, { color: theme.danger }]}>{errors.phone}</Text>}
            </View>

            {/* Notes */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.textPrimary }]}>Notes (optionnel)</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: theme.bgInput, borderColor: theme.borderLight, color: theme.textPrimary }]}
                placeholder="Ajouter des notes..."
                placeholderTextColor={theme.textMuted}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
              />
            </View>
          </View>
        ) : (
          <View style={[styles.form, { backgroundColor: theme.bgCard }]}>
            <Text style={[styles.inviteHint, { color: theme.textSecondary }]}>
              Recherchez un utilisateur par son nom d'utilisateur pour lui envoyer une invitation de contact.
            </Text>

            {/* Champ de recherche */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.textPrimary }]}>Nom d'utilisateur</Text>
              <View style={[styles.searchRow, { backgroundColor: theme.bgInput, borderColor: theme.borderLight }]}>
                <MaterialIcons name="search" size={20} color={theme.textMuted} />
                <TextInput
                  style={[styles.searchInput, { color: theme.textPrimary }]}
                  placeholder="Rechercher par nom d'utilisateur..."
                  placeholderTextColor={theme.textMuted}
                  value={searchQuery}
                  onChangeText={(text) => {
                    setSearchQuery(text);
                    if (selectedUser) setSelectedUser(null);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searching && <ActivityIndicator size="small" color={theme.accent} />}
              </View>
            </View>

            {/* Résultats */}
            {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
              <Text style={[styles.noResults, { color: theme.textMuted }]}>Aucun utilisateur trouvé</Text>
            )}
            {searchResults.length > 0 && (
              <View style={[styles.resultsList, { borderColor: theme.borderLight }]}>
                {searchResults.map((user) => {
                  const isSelected = selectedUser?.id === user.id;
                  return (
                    <TouchableOpacity
                      key={user.id}
                      style={[
                        styles.resultItem,
                        { borderBottomColor: theme.borderLight },
                        isSelected && { backgroundColor: theme.accentLight },
                      ]}
                      onPress={() => setSelectedUser(isSelected ? null : user)}
                    >
                      <MaterialIcons name="person" size={20} color={isSelected ? theme.accent : theme.textMuted} />
                      <Text style={[styles.resultUsername, { color: isSelected ? theme.accent : theme.textPrimary }]}>
                        @{user.username}
                      </Text>
                      {isSelected && (
                        <MaterialIcons name="check-circle" size={20} color={theme.accent} style={styles.checkIcon} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Message optionnel (visible après sélection) */}
            {selectedUser && (
              <View style={[styles.field, { marginTop: 16 }]}>
                <Text style={[styles.label, { color: theme.textPrimary }]}>Message (optionnel)</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: theme.bgInput, borderColor: theme.borderLight, color: theme.textPrimary }]}
                  placeholder={`Ajouter un message pour @${selectedUser.username}...`}
                  placeholderTextColor={theme.textMuted}
                  value={inviteMessage}
                  onChangeText={setInviteMessage}
                  multiline
                  numberOfLines={3}
                />
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Bouton de soumission */}
      <View style={[styles.footer, { backgroundColor: theme.bgCard, borderTopColor: theme.borderLight }]}>
        {mode === 'manual' ? (
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: theme.accent }, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.textInverse} />
            ) : (
              <>
                <MaterialIcons name="check" size={20} color={theme.textInverse} />
                <Text style={[styles.submitButtonText, { color: theme.textInverse }]}>Créer le contact</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: theme.accent }, (!selectedUser || loading) && styles.submitButtonDisabled]}
            onPress={handleInviteSubmit}
            disabled={!selectedUser || loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.textInverse} />
            ) : (
              <>
                <MaterialIcons name="send" size={20} color={theme.textInverse} />
                <Text style={[styles.submitButtonText, { color: theme.textInverse }]}>Envoyer l'invitation</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

export default function CreateContact() {
  return (
    <ProtectedRoute>
      <CreateContactScreen />
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
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modeSelector: {
    flexDirection: 'row',
    padding: 8,
    gap: 8,
    borderBottomWidth: 1,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  form: {
    borderRadius: 12,
    padding: 16,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  required: {},
  input: {
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    borderWidth: 1,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  inviteHint: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  noResults: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 12,
  },
  resultsList: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 4,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  resultUsername: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  checkIcon: {
    marginLeft: 'auto',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
