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
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { accountService } from '@/services/accountService';
import { useTheme } from '@/contexts/ThemeContext';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setErrorMessage('Veuillez remplir tous les champs.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Les nouveaux mots de passe ne correspondent pas.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      await accountService.changePassword(currentPassword, newPassword, confirmPassword);
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/settings');
      }
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
        <View style={[styles.form, { backgroundColor: theme.bgCard, shadowColor: theme.accent }]}>
          {errorMessage ? (
            <View style={[styles.errorContainer, { backgroundColor: theme.dangerBg, borderLeftColor: theme.danger }]}>
              <MaterialIcons name="error-outline" size={20} color={theme.danger} />
              <Text style={[styles.errorText, { color: theme.danger }]}>{errorMessage}</Text>
            </View>
          ) : null}

          <Text style={[styles.label, { color: theme.textSecondary }]}>Mot de passe actuel</Text>
          <View style={[styles.inputContainer, { borderColor: theme.borderLight, backgroundColor: theme.bgInput }]}>
            <MaterialIcons name="lock" size={24} color={theme.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: theme.textPrimary }]}
              placeholder="Mot de passe actuel"
              placeholderTextColor={theme.textMuted}
              value={currentPassword}
              onChangeText={(text) => { setCurrentPassword(text); if (errorMessage) setErrorMessage(''); }}
              secureTextEntry={!showCurrent}
              editable={!isLoading}
            />
            <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} style={styles.eyeIcon}>
              <MaterialIcons name={showCurrent ? 'visibility-off' : 'visibility'} size={24} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { color: theme.textSecondary }]}>Nouveau mot de passe</Text>
          <View style={[styles.inputContainer, { borderColor: theme.borderLight, backgroundColor: theme.bgInput }]}>
            <MaterialIcons name="lock-outline" size={24} color={theme.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: theme.textPrimary }]}
              placeholder="Nouveau mot de passe"
              placeholderTextColor={theme.textMuted}
              value={newPassword}
              onChangeText={(text) => { setNewPassword(text); if (errorMessage) setErrorMessage(''); }}
              secureTextEntry={!showNew}
              editable={!isLoading}
            />
            <TouchableOpacity onPress={() => setShowNew(!showNew)} style={styles.eyeIcon}>
              <MaterialIcons name={showNew ? 'visibility-off' : 'visibility'} size={24} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { color: theme.textSecondary }]}>Confirmer le nouveau mot de passe</Text>
          <View style={[styles.inputContainer, { borderColor: theme.borderLight, backgroundColor: theme.bgInput }]}>
            <MaterialIcons name="lock-outline" size={24} color={theme.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: theme.textPrimary }]}
              placeholder="Confirmer le nouveau mot de passe"
              placeholderTextColor={theme.textMuted}
              value={confirmPassword}
              onChangeText={(text) => { setConfirmPassword(text); if (errorMessage) setErrorMessage(''); }}
              secureTextEntry={!showConfirm}
              editable={!isLoading}
            />
            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeIcon}>
              <MaterialIcons name={showConfirm ? 'visibility-off' : 'visibility'} size={24} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.hint, { color: theme.textMuted }]}>
            8 caractères minimum, avec majuscule, minuscule et chiffre.
          </Text>

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: theme.accent }, isLoading && { backgroundColor: theme.borderMedium }]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={theme.textInverse} size="small" />
            ) : (
              <Text style={[styles.submitButtonText, { color: theme.textInverse }]}>Modifier le mot de passe</Text>
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
  hint: {
    fontSize: 12,
    marginBottom: 20,
  },
  submitButton: {
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
