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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { accountService } from '@/services/accountService';
import { useTheme } from '@/contexts/ThemeContext';

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const theme = useTheme();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!token) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: theme.bgPrimary }]}>
        <MaterialIcons name="error-outline" size={48} color={theme.danger} />
        <Text style={[styles.invalidTitle, { color: theme.textPrimary }]}>Lien invalide</Text>
        <Text style={[styles.invalidSubtitle, { color: theme.textMuted }]}>
          Ce lien de réinitialisation est invalide ou incomplet.
        </Text>
        <TouchableOpacity style={[styles.submitButton, { backgroundColor: theme.accent }]} onPress={() => router.replace('/auth/forgot-password')}>
          <Text style={[styles.submitButtonText, { color: theme.textInverse }]}>Faire une nouvelle demande</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleSubmit = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      setErrorMessage('Veuillez remplir tous les champs.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Les mots de passe ne correspondent pas.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await accountService.resetPassword(token as string, newPassword, confirmPassword);
      setSuccessMessage(response.message);
      setTimeout(() => router.replace('/auth/login'), 2500);
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
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Nouveau mot de passe</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Choisissez un mot de passe sécurisé (8 caractères minimum, avec majuscule, minuscule et chiffre).
          </Text>
        </View>

        <View style={[styles.form, { backgroundColor: theme.bgCard, shadowColor: theme.textPrimary }]}>
          {errorMessage ? (
            <View style={[styles.errorContainer, { backgroundColor: theme.dangerBg, borderLeftColor: theme.danger }]}>
              <MaterialIcons name="error-outline" size={20} color={theme.danger} />
              <Text style={[styles.errorText, { color: theme.danger }]}>{errorMessage}</Text>
            </View>
          ) : null}

          {successMessage ? (
            <View style={[styles.successContainer, { backgroundColor: theme.successBg, borderLeftColor: theme.success }]}>
              <MaterialIcons name="check-circle-outline" size={20} color={theme.success} />
              <Text style={[styles.successText, { color: theme.success }]}>{successMessage}</Text>
            </View>
          ) : null}

          {!successMessage ? (
            <>
              <View style={[styles.inputContainer, { borderColor: theme.borderLight, backgroundColor: theme.bgInput }]}>
                <MaterialIcons name="lock" size={24} color={theme.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.textPrimary }]}
                  placeholder="Nouveau mot de passe"
                  placeholderTextColor={theme.textMuted}
                  value={newPassword}
                  onChangeText={(text) => {
                    setNewPassword(text);
                    if (errorMessage) setErrorMessage('');
                  }}
                  secureTextEntry={!showNewPassword}
                  editable={!isLoading}
                />
                <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeIcon}>
                  <MaterialIcons name={showNewPassword ? 'visibility-off' : 'visibility'} size={24} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={[styles.inputContainer, { borderColor: theme.borderLight, backgroundColor: theme.bgInput }]}>
                <MaterialIcons name="lock-outline" size={24} color={theme.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.textPrimary }]}
                  placeholder="Confirmer le mot de passe"
                  placeholderTextColor={theme.textMuted}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (errorMessage) setErrorMessage('');
                  }}
                  secureTextEntry={!showConfirmPassword}
                  editable={!isLoading}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                  <MaterialIcons name={showConfirmPassword ? 'visibility-off' : 'visibility'} size={24} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: theme.accent }, isLoading && { backgroundColor: theme.bgMuted }]}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={theme.textInverse} size="small" />
                ) : (
                  <Text style={[styles.submitButtonText, { color: theme.textInverse }]}>Réinitialiser le mot de passe</Text>
                )}
              </TouchableOpacity>
            </>
          ) : null}
        </View>

        {!successMessage ? (
          <TouchableOpacity style={styles.backLink} onPress={() => router.replace('/auth/login')}>
            <MaterialIcons name="arrow-back" size={18} color={theme.accent} />
            <Text style={[styles.backLinkText, { color: theme.accent }]}>Retour à la connexion</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  invalidTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  invalidSubtitle: {
    fontSize: 15,
    textAlign: 'center',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
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
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  successText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
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
  submitButton: {
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 6,
  },
  backLinkText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
