import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import API_CONFIG from '@/config/api';

export default function VerifyEmailScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const theme = useTheme();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Lien invalide ou incomplet.');
      return;
    }

    fetch(`${API_CONFIG.BASE_URL}/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStatus('success');
          setMessage(data.message || 'Email vérifié avec succès.');
        } else {
          setStatus('error');
          setMessage(data.detail || 'Lien invalide ou expiré.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Erreur réseau. Réessayez dans quelques instants.');
      });
  }, [token]);

  return (
    <View style={[styles.container, { backgroundColor: theme.bgPrimary }]}>
      {status === 'loading' && (
        <>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.text, { color: theme.textSecondary }]}>Vérification en cours...</Text>
        </>
      )}

      {status === 'success' && (
        <>
          <MaterialIcons name="check-circle" size={72} color={theme.success} />
          <Text style={[styles.title, { color: theme.textPrimary }]}>Email confirmé !</Text>
          <Text style={[styles.text, { color: theme.textSecondary }]}>{message}</Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.accent }]}
            onPress={() => router.replace('/auth/login')}
          >
            <Text style={styles.buttonText}>Se connecter</Text>
          </TouchableOpacity>
        </>
      )}

      {status === 'error' && (
        <>
          <MaterialIcons name="error-outline" size={72} color={theme.danger} />
          <Text style={[styles.title, { color: theme.textPrimary }]}>Lien invalide</Text>
          <Text style={[styles.text, { color: theme.textSecondary }]}>{message}</Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.accent }]}
            onPress={() => router.replace('/auth/verify-email-pending')}
          >
            <Text style={styles.buttonText}>Demander un nouveau lien</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  text: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  button: { borderRadius: 8, padding: 14, paddingHorizontal: 32, marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
