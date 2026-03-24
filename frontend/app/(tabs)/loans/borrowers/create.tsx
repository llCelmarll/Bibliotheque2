import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { BorrowerCreate } from '@/types/borrower';
import { useBorrowers } from '@/hooks/useBorrowers';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useTheme } from '@/contexts/ThemeContext';

function CreateBorrowerScreen() {
  const router = useRouter();
  const { createBorrower } = useBorrowers({ autoLoad: false });
  const theme = useTheme();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Le nom est obligatoire';
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Email invalide';
    }

    if (phone && !/^[\d\s+()-]+$/.test(phone)) {
      newErrors.phone = 'Numéro de téléphone invalide';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const borrowerData: BorrowerCreate = {
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      await createBorrower(borrowerData);

      Alert.alert(
        'Succès',
        'L\'emprunteur a été créé avec succès',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Erreur lors de la création de l\'emprunteur:', error);
      Alert.alert(
        'Erreur',
        error.response?.data?.detail || error.message || 'Impossible de créer l\'emprunteur'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bgSecondary }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.bgCard, borderBottomColor: theme.borderLight }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Nouvel emprunteur</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.form, { backgroundColor: theme.bgCard }]}>
          {/* Nom */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Nom <Text style={{ color: theme.danger }}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.bgInput, borderColor: theme.borderLight }, errors.name && { borderColor: theme.danger }]}
              placeholder="Nom complet"
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (errors.name) {
                  setErrors((prev) => ({ ...prev, name: '' }));
                }
              }}
              autoCapitalize="words"
            />
            {errors.name && <Text style={[styles.errorText, { color: theme.danger }]}>{errors.name}</Text>}
          </View>

          {/* Email */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Email (optionnel)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.bgInput, borderColor: theme.borderLight }, errors.email && { borderColor: theme.danger }]}
              placeholder="email@example.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) {
                  setErrors((prev) => ({ ...prev, email: '' }));
                }
              }}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email && <Text style={[styles.errorText, { color: theme.danger }]}>{errors.email}</Text>}
          </View>

          {/* Téléphone */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Téléphone (optionnel)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.bgInput, borderColor: theme.borderLight }, errors.phone && { borderColor: theme.danger }]}
              placeholder="+33 6 12 34 56 78"
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                if (errors.phone) {
                  setErrors((prev) => ({ ...prev, phone: '' }));
                }
              }}
              keyboardType="phone-pad"
            />
            {errors.phone && <Text style={[styles.errorText, { color: theme.danger }]}>{errors.phone}</Text>}
          </View>

          {/* Notes */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Notes (optionnel)</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: theme.bgInput, borderColor: theme.borderLight }]}
              placeholder="Ajouter des notes..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
            />
          </View>
        </View>
      </ScrollView>

      {/* Bouton de soumission */}
      <View style={[styles.footer, { backgroundColor: theme.bgCard, borderTopColor: theme.borderLight }]}>
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: theme.accent }, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={theme.textInverse} />
          ) : (
            <>
              <MaterialIcons name="check" size={20} color={theme.textInverse} />
              <Text style={[styles.submitButtonText, { color: theme.textInverse }]}>Créer l'emprunteur</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default function CreateBorrower() {
  return (
    <ProtectedRoute>
      <CreateBorrowerScreen />
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  form: {
    borderRadius: 12,
    padding: 16,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    borderWidth: 1,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
