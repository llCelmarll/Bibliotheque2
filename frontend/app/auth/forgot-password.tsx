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

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const router = useRouter();
  const theme = useTheme();

  const handleSubmit = async () => {
    if (!email.trim()) {
      setErrorMessage('Veuillez entrer votre adresse email.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await accountService.forgotPassword(email.trim());
      setSuccessMessage(response.message);
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
          <Text style={[styles.title, { color: theme.textPrimary }]}>Mot de passe oublié</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
          </Text>
        </View>

        <View style={[styles.form, { backgroundColor: theme.bgCard, shadowColor: theme.accent }]}>
          {errorMessage ? (
            <View style={[styles.errorContainer, { backgroundColor: theme.dangerBg, borderLeftColor: theme.danger }]}>
              <MaterialIcons name="error-outline" size={20} color={theme.danger} />
              <Text style={[styles.errorText, { color: theme.danger }]}>{errorMessage}</Text>
            </View>
          ) : null}

          {successMessage ? (
            <>
              <View style={[styles.successContainer, { backgroundColor: theme.successBg, borderLeftColor: theme.success }]}>
                <MaterialIcons name="check-circle-outline" size={20} color={theme.success} />
                <Text style={[styles.successText, { color: theme.success }]}>{successMessage}</Text>
              </View>
              <View style={[styles.spamWarning, { backgroundColor: theme.warningBg, borderLeftColor: theme.warning }]}>
                <MaterialIcons name="info-outline" size={16} color={theme.warning} />
                <Text style={[styles.spamWarningText, { color: theme.warning }]}>
                  Si vous ne voyez pas l'email dans votre boîte de réception, vérifiez votre dossier spam ou courrier indésirable.
                </Text>
              </View>
            </>
          ) : null}

          {!successMessage ? (
            <>
              <View style={[styles.inputContainer, { borderColor: theme.borderLight, backgroundColor: theme.bgInput }]}>
                <MaterialIcons name="email" size={24} color={theme.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.textPrimary }]}
                  placeholder="Email"
                  placeholderTextColor={theme.textMuted}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errorMessage) setErrorMessage('');
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!isLoading}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: theme.accent }, isLoading && { backgroundColor: theme.borderMedium }]}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={theme.textInverse} size="small" />
                ) : (
                  <Text style={[styles.submitButtonText, { color: theme.textInverse }]}>Envoyer le lien</Text>
                )}
              </TouchableOpacity>
            </>
          ) : null}
        </View>

        <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={18} color={theme.accent} />
          <Text style={[styles.backLinkText, { color: theme.accent }]}>Retour à la connexion</Text>
        </TouchableOpacity>
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
  spamWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    borderLeftWidth: 4,
    gap: 8,
  },
  spamWarningText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
});
