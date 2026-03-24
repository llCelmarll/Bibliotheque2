import React, { useState, useEffect } from 'react';
import Checkbox from 'expo-checkbox';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

let SecureStore: any;
if (Platform.OS !== 'web') {
  SecureStore = require('expo-secure-store');
}

async function setItem(key: string, value: string) {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

export default function LoginScreen() {
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { login, isLoading } = useAuth();
  const router = useRouter();
  const theme = useTheme();

  useEffect(() => {
    const loadError = async () => {
      const error = await AsyncStorage.getItem('register_error');
      if (error) {
        setErrorMessage(error);
        await AsyncStorage.removeItem('register_error');
      }
    };
    loadError();
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Veuillez remplir tous les champs');
      return;
    }
    setIsLoginLoading(true);
    setErrorMessage('');
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://mabibliotheque.ovh/api';
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `username=${encodeURIComponent(email.trim())}&password=${encodeURIComponent(password)}&remember_me=${rememberMe}`,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Erreur de connexion');
      }
      if (rememberMe) {
        await setItem('access_token', data.access_token);
      } else {
        await AsyncStorage.setItem('access_token', data.access_token);
      }
      if (login) {
        await login({ email: email.trim(), password });
      }
      router.replace('/(tabs)/books');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Une erreur est survenue';
      setErrorMessage(message);
      if (Platform.OS !== 'web') {
        Alert.alert('Erreur de connexion', message);
      }
    } finally {
      setIsLoginLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bgPrimary }}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.bgPrimary }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <View style={[styles.logoContainer, { backgroundColor: theme.accent }]}>
              <MaterialIcons name="menu-book" size={44} color={theme.textInverse} />
            </View>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Ma Bibliothèque</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Connectez-vous à votre compte</Text>
          </View>

          <View style={[styles.form, { backgroundColor: theme.bgCard, shadowColor: theme.accent }]}>
            {errorMessage ? (
              <View style={[styles.errorContainer, { backgroundColor: theme.dangerBg, borderLeftColor: theme.danger }]}>
                <MaterialIcons name="error-outline" size={20} color={theme.danger} />
                <Text style={[styles.errorText, { color: theme.danger }]}>{errorMessage}</Text>
              </View>
            ) : null}

            <View style={[styles.inputContainer, { borderColor: theme.borderLight, backgroundColor: theme.bgInput }]}>
              <MaterialIcons name="email" size={24} color={theme.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.textPrimary }]}
                placeholder="Email (ex: user@example.com)"
                placeholderTextColor={theme.textMuted}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errorMessage) setErrorMessage('');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!isLoginLoading}
              />
            </View>

            <View style={[styles.inputContainer, { borderColor: theme.borderLight, backgroundColor: theme.bgInput }]}>
              <MaterialIcons name="lock" size={24} color={theme.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.textPrimary }]}
                placeholder="Mot de passe"
                placeholderTextColor={theme.textMuted}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errorMessage) setErrorMessage('');
                }}
                secureTextEntry={!showPassword}
                autoComplete="password"
                editable={!isLoginLoading}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
                disabled={isLoginLoading}
              >
                <MaterialIcons
                  name={showPassword ? "visibility-off" : "visibility"}
                  size={24}
                  color={theme.textMuted}
                />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Checkbox
                value={rememberMe}
                onValueChange={setRememberMe}
                color={rememberMe ? theme.accent : undefined}
                style={{ marginRight: 8 }}
              />
              <Text style={{ fontSize: 16, color: theme.textSecondary }}>Se souvenir de moi</Text>
            </View>

            <TouchableOpacity
              style={{ alignSelf: 'flex-end', marginBottom: 16 }}
              onPress={() => router.push('/auth/forgot-password')}
              disabled={isLoginLoading}
            >
              <Text style={{ color: theme.accent, fontSize: 14 }}>Mot de passe oublié ?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginButton, { backgroundColor: theme.accent }, isLoginLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoginLoading}
            >
              {isLoginLoading ? (
                <ActivityIndicator color={theme.textInverse} size="small" />
              ) : (
                <Text style={[styles.loginButtonText, { color: theme.textInverse }]}>Se connecter</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Register Link */}
          <View style={styles.registerLink}>
            <Text style={[styles.registerText, { color: theme.textSecondary }]}>Pas encore de compte ? </Text>
            <TouchableOpacity onPress={() => router.push('/auth/register')}>
              <Text style={[styles.registerLinkText, { color: theme.accent }]}>S'inscrire</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.textMuted }]}>
              Version de développement avec authentification
            </Text>
          </View>

          {Platform.OS === 'web' && (
            <TouchableOpacity
              style={[styles.downloadButton, { backgroundColor: theme.success }]}
              onPress={() => Linking.openURL('https://mabibliotheque.ovh/bibliotheque.apk')}
            >
              <Text style={[styles.downloadButtonText, { color: theme.textInverse }]}>📱 Télécharger l'application Android</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
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
  logoContainer: {
    width: 88,
    height: 88,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  downloadButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
  },
  downloadButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  form: {
    borderRadius: 12,
    padding: 24,
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
  loginButton: {
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  loginButtonDisabled: {
    opacity: 0.5,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  registerLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  registerText: {
    fontSize: 16,
  },
  registerLinkText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
  },
});