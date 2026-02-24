import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { accountService } from '@/services/accountService';

const CONFIRMATION_WORD = 'SUPPRIMER';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { logout } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmationText, setConfirmationText] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const canSubmit = password.trim().length > 0 && confirmationText === CONFIRMATION_WORD;

  const handleDelete = async () => {
    if (!canSubmit) return;

    if (Platform.OS !== 'web') {
      Alert.alert(
        'Confirmer la suppression',
        'Cette action est irréversible. Toutes vos données seront supprimées définitivement.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Supprimer', style: 'destructive', onPress: () => performDelete() },
        ]
      );
    } else {
      performDelete();
    }
  };

  const performDelete = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      await accountService.deleteAccount(password);
      await logout();
      router.replace('/auth/login');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Une erreur est survenue.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Avertissement */}
        <View style={styles.warningBanner}>
          <MaterialIcons name="warning" size={24} color="#b71c1c" />
          <Text style={styles.warningText}>
            Cette action est irréversible. Toutes vos données seront supprimées définitivement.
          </Text>
        </View>

        {/* Liste des données supprimées */}
        <View style={styles.dataList}>
          <Text style={styles.dataListTitle}>Données qui seront supprimées :</Text>
          {['Votre compte et vos informations', 'Tous vos livres', 'Tous vos prêts', 'Tous vos contacts', 'Tous vos livres empruntés'].map((item) => (
            <View key={item} style={styles.dataListItem}>
              <MaterialIcons name="remove-circle-outline" size={16} color="#f44336" />
              <Text style={styles.dataListItemText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.form}>
          {errorMessage ? (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={20} color="#f44336" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>Mot de passe</Text>
          <View style={styles.inputContainer}>
            <MaterialIcons name="lock" size={24} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Votre mot de passe actuel"
              value={password}
              onChangeText={(text) => { setPassword(text); if (errorMessage) setErrorMessage(''); }}
              secureTextEntry={!showPassword}
              editable={!isLoading}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <MaterialIcons name={showPassword ? 'visibility-off' : 'visibility'} size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>
            Tapez <Text style={styles.confirmWord}>{CONFIRMATION_WORD}</Text> pour confirmer
          </Text>
          <View style={styles.inputContainer}>
            <MaterialIcons name="delete-forever" size={24} color="#f44336" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={CONFIRMATION_WORD}
              value={confirmationText}
              onChangeText={(text) => { setConfirmationText(text); if (errorMessage) setErrorMessage(''); }}
              autoCapitalize="characters"
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity
            style={[styles.deleteButton, (!canSubmit || isLoading) && styles.buttonDisabled]}
            onPress={handleDelete}
            disabled={!canSubmit || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.deleteButtonText}>Supprimer définitivement mon compte</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    gap: 16,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    borderRadius: 10,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
    gap: 12,
  },
  warningText: {
    flex: 1,
    color: '#b71c1c',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  dataList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  dataListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  dataListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  dataListItemText: {
    fontSize: 14,
    color: '#555',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
  },
  confirmWord: {
    color: '#f44336',
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
    backgroundColor: '#fafafa',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    padding: 4,
  },
  deleteButton: {
    backgroundColor: '#f44336',
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
