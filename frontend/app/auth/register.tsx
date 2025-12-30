import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';

interface RegisterForm {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterScreen() {
  const [form, setForm] = useState<RegisterForm>({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<RegisterForm>>({});
  const [serverError, setServerError] = useState<string>('');

  const router = useRouter();
  const { register: registerUser } = useAuth();

  const validateForm = (): boolean => {
    const newErrors: Partial<RegisterForm> = {};

    // Email validation
    if (!form.email) {
      newErrors.email = 'L\'email est requis';
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = 'Format d\'email invalide';
    }

    // Username validation
    if (!form.username) {
      newErrors.username = 'Le nom d\'utilisateur est requis';
    } else if (form.username.length < 3) {
      newErrors.username = 'Le nom d\'utilisateur doit contenir au moins 3 caractères';
    }

    // Password validation
    if (!form.password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (form.password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }

    // Confirm password validation
    if (!form.confirmPassword) {
      newErrors.confirmPassword = 'Veuillez confirmer votre mot de passe';
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setServerError(''); // Réinitialiser l'erreur serveur
    try {
      // Inscription avec connexion automatique
      await registerUser({
        email: form.email,
        username: form.username,
        password: form.password,
        confirm_password: form.confirmPassword,
      });

      // En cas de SUCCÈS : rediriger vers books
      router.replace('/(tabs)/books');

    } catch (error: any) {
      const errorMessage = error.message || 'Une erreur est survenue lors de l\'inscription';

      // Afficher l'erreur sur l'écran d'inscription
      setServerError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (field: keyof RegisterForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    // Clear server error when user starts typing
    if (serverError) {
      setServerError('');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <MaterialIcons name="library-books" size={60} color="#2196F3" />
        <Text style={styles.title}>Créer un compte</Text>
        <Text style={styles.subtitle}>Rejoignez votre bibliothèque personnelle</Text>
      </View>

      <View style={styles.form}>
        {/* Server Error Message */}
        {serverError ? (
          <View style={styles.serverErrorContainer}>
            <MaterialIcons name="error-outline" size={20} color="#e74c3c" />
            <Text style={styles.serverErrorText}>{serverError}</Text>
          </View>
        ) : null}

        {/* Email */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
            <MaterialIcons name="email" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="votre@email.com"
              value={form.email}
              onChangeText={(value) => updateForm('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
        </View>

        {/* Username */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Nom d'utilisateur</Text>
          <View style={[styles.inputWrapper, errors.username && styles.inputError]}>
            <MaterialIcons name="person" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Votre nom d'utilisateur"
              value={form.username}
              onChangeText={(value) => updateForm('username', value)}
              autoCapitalize="none"
              autoComplete="username"
            />
          </View>
          {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}
        </View>

        {/* Password */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Mot de passe</Text>
          <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
            <MaterialIcons name="lock" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Votre mot de passe"
              value={form.password}
              onChangeText={(value) => updateForm('password', value)}
              secureTextEntry={!showPassword}
              autoComplete="new-password"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <MaterialIcons
                name={showPassword ? 'visibility' : 'visibility-off'}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
          </View>
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
        </View>

        {/* Confirm Password */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Confirmer le mot de passe</Text>
          <View style={[styles.inputWrapper, errors.confirmPassword && styles.inputError]}>
            <MaterialIcons name="lock" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirmez votre mot de passe"
              value={form.confirmPassword}
              onChangeText={(value) => updateForm('confirmPassword', value)}
              secureTextEntry={!showConfirmPassword}
              autoComplete="new-password"
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeIcon}
            >
              <MaterialIcons
                name={showConfirmPassword ? 'visibility' : 'visibility-off'}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
          </View>
          {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
        </View>

        {/* Register Button */}
        <TouchableOpacity
          style={[styles.registerButton, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <MaterialIcons name="person-add" size={20} color="#ffffff" />
              <Text style={styles.registerButtonText}>Créer mon compte</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Login Link */}
        <View style={styles.loginLink}>
          <Text style={styles.loginText}>Vous avez déjà un compte ? </Text>
          <TouchableOpacity onPress={() => router.replace('/auth/login')}>
            <Text style={styles.loginLinkText}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
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
    color: '#2c3e50',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  form: {
    gap: 20,
  },
  serverErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee',
    borderRadius: 8,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  serverErrorText: {
    flex: 1,
    fontSize: 14,
    color: '#c0392b',
    fontWeight: '500',
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e8ed',
    paddingHorizontal: 16,
    height: 56,
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
  },
  eyeIcon: {
    padding: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#e74c3c',
    marginLeft: 4,
  },
  registerButton: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  loginText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  loginLinkText: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600',
  },
});