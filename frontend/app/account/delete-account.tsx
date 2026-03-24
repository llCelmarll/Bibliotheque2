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
import { useTheme } from '@/contexts/ThemeContext';

const CONFIRMATION_WORD = 'SUPPRIMER';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const theme = useTheme();

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
      style={[styles.container, { backgroundColor: theme.bgPrimary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Avertissement */}
        <View style={[styles.warningBanner, { backgroundColor: theme.dangerBg, borderLeftColor: theme.danger }]}>
          <MaterialIcons name="warning" size={24} color={theme.danger} />
          <Text style={[styles.warningText, { color: theme.danger }]}>
            Cette action est irréversible. Toutes vos données seront supprimées définitivement.
          </Text>
        </View>

        {/* Liste des données supprimées */}
        <View style={[styles.dataList, { backgroundColor: theme.bgCard, shadowColor: theme.accent }]}>
          <Text style={[styles.dataListTitle, { color: theme.textPrimary }]}>Données qui seront supprimées :</Text>
          {['Votre compte et vos informations', 'Tous vos livres', 'Tous vos prêts', 'Tous vos contacts', 'Tous vos livres empruntés'].map((item) => (
            <View key={item} style={styles.dataListItem}>
              <MaterialIcons name="remove-circle-outline" size={16} color={theme.danger} />
              <Text style={[styles.dataListItemText, { color: theme.textSecondary }]}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.form, { backgroundColor: theme.bgCard, shadowColor: theme.accent }]}>
          {errorMessage ? (
            <View style={[styles.errorContainer, { backgroundColor: theme.dangerBg, borderLeftColor: theme.danger }]}>
              <MaterialIcons name="error-outline" size={20} color={theme.danger} />
              <Text style={[styles.errorText, { color: theme.danger }]}>{errorMessage}</Text>
            </View>
          ) : null}

          <Text style={[styles.label, { color: theme.textSecondary }]}>Mot de passe</Text>
          <View style={[styles.inputContainer, { borderColor: theme.borderLight, backgroundColor: theme.bgInput }]}>
            <MaterialIcons name="lock" size={24} color={theme.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: theme.textPrimary }]}
              placeholder="Votre mot de passe actuel"
              placeholderTextColor={theme.textMuted}
              value={password}
              onChangeText={(text) => { setPassword(text); if (errorMessage) setErrorMessage(''); }}
              secureTextEntry={!showPassword}
              editable={!isLoading}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <MaterialIcons name={showPassword ? 'visibility-off' : 'visibility'} size={24} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { color: theme.textSecondary }]}>
            Tapez <Text style={{ color: theme.danger, fontWeight: '700' }}>{CONFIRMATION_WORD}</Text> pour confirmer
          </Text>
          <View style={[styles.inputContainer, { borderColor: theme.borderLight, backgroundColor: theme.bgInput }]}>
            <MaterialIcons name="delete-forever" size={24} color={theme.danger} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: theme.textPrimary }]}
              placeholder={CONFIRMATION_WORD}
              placeholderTextColor={theme.textMuted}
              value={confirmationText}
              onChangeText={(text) => { setConfirmationText(text); if (errorMessage) setErrorMessage(''); }}
              autoCapitalize="characters"
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity
            style={[styles.deleteButton, { backgroundColor: theme.danger }, (!canSubmit || isLoading) && { backgroundColor: theme.borderMedium }]}
            onPress={handleDelete}
            disabled={!canSubmit || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={theme.textInverse} size="small" />
            ) : (
              <Text style={[styles.deleteButtonText, { color: theme.textInverse }]}>Supprimer définitivement mon compte</Text>
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
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    gap: 16,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 16,
    borderLeftWidth: 4,
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  dataList: {
    borderRadius: 12,
    padding: 16,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  dataListTitle: {
    fontSize: 14,
    fontWeight: '600',
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
  },
  form: {
    borderRadius: 12,
    padding: 24,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
  },
  errorText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 4,
  },
  deleteButton: {
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
