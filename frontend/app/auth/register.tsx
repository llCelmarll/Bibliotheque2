import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

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
  const theme = useTheme();

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
    setServerError('');
    try {
      await registerUser({
        email: form.email,
        username: form.username,
        password: form.password,
        confirm_password: form.confirmPassword,
      });

      router.replace('/(tabs)/books');

    } catch (error: any) {
      const errorMessage = error.message || 'Une erreur est survenue lors de l\'inscription';
      setServerError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (field: keyof RegisterForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    if (serverError) {
      setServerError('');
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bgPrimary }]} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <MaterialIcons name="library-books" size={60} color={theme.accent} />
        <Text style={[styles.title, { color: theme.textPrimary }]}>Créer un compte</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Rejoignez votre bibliothèque personnelle</Text>
      </View>

      <View style={styles.form}>
        {/* Server Error Message */}
        {serverError ? (
          <View style={[styles.serverErrorContainer, { backgroundColor: theme.dangerBg, borderColor: theme.danger }]}>
            <MaterialIcons name="error-outline" size={20} color={theme.danger} />
            <Text style={[styles.serverErrorText, { color: theme.danger }]}>{serverError}</Text>
          </View>
        ) : null}

        {/* Email */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: theme.textPrimary }]}>Email</Text>
          <View style={[styles.inputWrapper, { backgroundColor: theme.bgCard, borderColor: errors.email ? theme.danger : theme.borderLight }]}>
            <MaterialIcons name="email" size={20} color={theme.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: theme.textPrimary }]}
              placeholder="votre@email.com"
              placeholderTextColor={theme.textMuted}
              value={form.email}
              onChangeText={(value) => updateForm('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>
          {errors.email && <Text style={[styles.errorText, { color: theme.danger }]}>{errors.email}</Text>}
        </View>

        {/* Username */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: theme.textPrimary }]}>Nom d'utilisateur</Text>
          <View style={[styles.inputWrapper, { backgroundColor: theme.bgCard, borderColor: errors.username ? theme.danger : theme.borderLight }]}>
            <MaterialIcons name="person" size={20} color={theme.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: theme.textPrimary }]}
              placeholder="Votre nom d'utilisateur"
              placeholderTextColor={theme.textMuted}
              value={form.username}
              onChangeText={(value) => updateForm('username', value)}
              autoCapitalize="none"
              autoComplete="username"
            />
          </View>
          {errors.username && <Text style={[styles.errorText, { color: theme.danger }]}>{errors.username}</Text>}
        </View>

        {/* Password */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: theme.textPrimary }]}>Mot de passe</Text>
          <View style={[styles.inputWrapper, { backgroundColor: theme.bgCard, borderColor: errors.password ? theme.danger : theme.borderLight }]}>
            <MaterialIcons name="lock" size={20} color={theme.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: theme.textPrimary }]}
              placeholder="Votre mot de passe"
              placeholderTextColor={theme.textMuted}
              value={form.password}
              onChangeText={(value) => updateForm('password', value)}
              secureTextEntry={!showPassword}
              autoComplete="new-password"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <MaterialIcons name={showPassword ? 'visibility' : 'visibility-off'} size={20} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
          {errors.password && <Text style={[styles.errorText, { color: theme.danger }]}>{errors.password}</Text>}
        </View>

        {/* Confirm Password */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: theme.textPrimary }]}>Confirmer le mot de passe</Text>
          <View style={[styles.inputWrapper, { backgroundColor: theme.bgCard, borderColor: errors.confirmPassword ? theme.danger : theme.borderLight }]}>
            <MaterialIcons name="lock" size={20} color={theme.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: theme.textPrimary }]}
              placeholder="Confirmez votre mot de passe"
              placeholderTextColor={theme.textMuted}
              value={form.confirmPassword}
              onChangeText={(value) => updateForm('confirmPassword', value)}
              secureTextEntry={!showConfirmPassword}
              autoComplete="new-password"
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
              <MaterialIcons name={showConfirmPassword ? 'visibility' : 'visibility-off'} size={20} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
          {errors.confirmPassword && <Text style={[styles.errorText, { color: theme.danger }]}>{errors.confirmPassword}</Text>}
        </View>

        {/* Register Button */}
        <TouchableOpacity
          style={[styles.registerButton, { backgroundColor: theme.accent }, loading && { backgroundColor: theme.borderMedium }]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={theme.textInverse} />
          ) : (
            <>
              <MaterialIcons name="person-add" size={20} color={theme.textInverse} />
              <Text style={[styles.registerButtonText, { color: theme.textInverse }]}>Créer mon compte</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Login Link */}
        <View style={styles.loginLink}>
          <Text style={[styles.loginText, { color: theme.textSecondary }]}>Vous avez déjà un compte ? </Text>
          <TouchableOpacity onPress={() => router.replace('/auth/login')}>
            <Text style={[styles.loginLinkText, { color: theme.accent }]}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  form: {
    gap: 20,
  },
  serverErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 12,
    gap: 8,
    borderWidth: 1,
  },
  serverErrorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 4,
  },
  errorText: {
    fontSize: 14,
    marginLeft: 4,
  },
  registerButton: {
    borderRadius: 12,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  registerButtonText: {
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
  },
  loginLinkText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
