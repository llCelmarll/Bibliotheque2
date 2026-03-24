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
import { useAuth } from '@/contexts/AuthContext';
import { accountService } from '@/services/accountService';
import { useTheme } from '@/contexts/ThemeContext';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const theme = useTheme();

  const [username, setUsername] = useState(user?.username ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const hasChanges = username !== user?.username || email !== user?.email;

  const handleSubmit = async () => {
    if (!hasChanges) {
      router.back();
      return;
    }

    const data: { username?: string; email?: string } = {};
    if (username !== user?.username) data.username = username.trim();
    if (email !== user?.email) data.email = email.trim();

    setIsLoading(true);
    setErrorMessage('');

    try {
      const updatedUser = await accountService.updateProfile(data);
      await updateUser(updatedUser);
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

          <Text style={[styles.label, { color: theme.textSecondary }]}>Nom d'utilisateur</Text>
          <View style={[styles.inputContainer, { borderColor: theme.borderLight, backgroundColor: theme.bgInput }]}>
            <MaterialIcons name="person" size={24} color={theme.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: theme.textPrimary }]}
              value={username}
              onChangeText={(text) => { setUsername(text); if (errorMessage) setErrorMessage(''); }}
              placeholder="Nom d'utilisateur"
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              editable={!isLoading}
            />
          </View>

          <Text style={[styles.label, { color: theme.textSecondary }]}>Adresse email</Text>
          <View style={[styles.inputContainer, { borderColor: theme.borderLight, backgroundColor: theme.bgInput }]}>
            <MaterialIcons name="email" size={24} color={theme.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: theme.textPrimary }]}
              value={email}
              onChangeText={(text) => { setEmail(text); if (errorMessage) setErrorMessage(''); }}
              placeholder="Email"
              placeholderTextColor={theme.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
            />
          </View>

          <Text style={[styles.hint, { color: theme.textMuted }]}>
            La modification de l'email nécessite que la nouvelle adresse soit autorisée par l'administrateur.
          </Text>

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: theme.accent }, (!hasChanges || isLoading) && { backgroundColor: theme.borderMedium }]}
            onPress={handleSubmit}
            disabled={!hasChanges || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={theme.textInverse} size="small" />
            ) : (
              <Text style={[styles.submitButtonText, { color: theme.textInverse }]}>Enregistrer les modifications</Text>
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
  hint: {
    fontSize: 12,
    marginBottom: 20,
    lineHeight: 18,
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
