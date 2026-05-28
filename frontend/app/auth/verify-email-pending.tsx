import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import API_CONFIG from '@/config/api';

export default function VerifyEmailPendingScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleResend = async () => {
    if (!email.trim()) {
      setIsError(true);
      setMessage('Entrez votre adresse email.');
      return;
    }

    setIsLoading(true);
    setMessage('');
    setIsError(false);

    try {
      await fetch(`${API_CONFIG.BASE_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      setMessage('Si cet email correspond à un compte non vérifié, vous recevrez un nouveau lien.');
    } catch {
      setIsError(true);
      setMessage('Erreur réseau. Réessayez dans quelques instants.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.bgPrimary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.iconContainer}>
          <MaterialIcons name="mark-email-unread" size={64} color={theme.accent} />
        </View>

        <Text style={[styles.title, { color: theme.textPrimary }]}>Vérifiez votre email</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Un lien de confirmation a été envoyé à votre adresse email lors de l'inscription.
          Cliquez sur ce lien pour activer votre compte.{'\n\n'}
          Si vous ne le trouvez pas, pensez à vérifier vos courriers indésirables (spam).
        </Text>

        <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderLight }]}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Renvoyer le lien</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.bgInput, borderColor: theme.borderLight, color: theme.textPrimary }]}
            placeholder="Votre adresse email"
            placeholderTextColor={theme.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.accent }, isLoading && styles.buttonDisabled]}
            onPress={handleResend}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Renvoyer le lien</Text>
            )}
          </TouchableOpacity>

          {message ? (
            <Text style={[styles.message, { color: isError ? theme.danger : theme.success }]}>
              {message}
            </Text>
          ) : null}
        </View>

        <TouchableOpacity style={styles.backLink} onPress={() => router.replace('/auth/login')}>
          <MaterialIcons name="arrow-back" size={16} color={theme.textSecondary} />
          <Text style={[styles.backText, { color: theme.textSecondary }]}>Retour à la connexion</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  iconContainer: { alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  card: { borderRadius: 12, borderWidth: 1, padding: 20, marginBottom: 24, gap: 12 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  input: {
    borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 15,
  },
  button: {
    borderRadius: 8, padding: 14, alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  message: { fontSize: 13, textAlign: 'center', marginTop: 4 },
  backLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  backText: { fontSize: 14 },
});
