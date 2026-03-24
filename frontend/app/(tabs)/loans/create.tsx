import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Contact } from '@/types/contact';
import { Book } from '@/types/book';
import { LoanCreate } from '@/types/loan';
import { loanService } from '@/services/loanService';
import { contactService } from '@/services/contactService';
import { ContactSelector } from '@/components/forms/ContactSelector';
import { BookSelector } from '@/components/forms/BookSelector';
import BookCover from '@/components/BookCover';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

function CreateLoanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const theme = useTheme();

  // Si un bookId ou contactId est passé en paramètre
  const preselectedBookId = params.bookId ? parseInt(params.bookId as string) : null;
  const preselectedContactId = params.contactId ? parseInt(params.contactId as string) : null;

  const [selectedBooks, setSelectedBooks] = useState<Book[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | string | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Charger le contact présélectionné
  useEffect(() => {
    if (preselectedContactId) {
      contactService.getContactById(preselectedContactId)
        .then((contact) => setSelectedContact(contact))
        .catch((error) => {
          console.error('Erreur lors du chargement du contact:', error);
        });
    }
  }, [preselectedContactId]);

  const handleContactChange = (contact: Contact | string) => {
    setSelectedContact(contact);
    if (errors.contact) {
      setErrors((prev) => ({ ...prev, contact: '' }));
    }
  };

  const handleBookChange = (book: Book | null) => {
    if (book && !selectedBooks.some(b => b.id === book.id)) {
      setSelectedBooks([...selectedBooks, book]);
      if (errors.books) {
        setErrors((prev) => ({ ...prev, books: '' }));
      }
    }
  };

  const handleRemoveBook = (bookId: number) => {
    setSelectedBooks(selectedBooks.filter(b => b.id !== bookId));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (selectedBooks.length === 0 && !preselectedBookId) {
      newErrors.books = 'Veuillez sélectionner au moins un livre';
    }

    if (!selectedContact) {
      newErrors.contact = 'Veuillez sélectionner un contact';
    }

    if (dueDate) {
      const dueDateObj = new Date(dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (isNaN(dueDateObj.getTime())) {
        newErrors.dueDate = 'Date invalide';
      } else if (dueDateObj < today) {
        newErrors.dueDate = 'La date d\'échéance doit être dans le futur';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const booksToLoan = preselectedBookId ? [{ id: preselectedBookId }] : selectedBooks;
      const contactValue = typeof selectedContact === 'string'
        ? selectedContact
        : (selectedContact as Contact).id;

      // Créer un prêt pour chaque livre
      const loanPromises = booksToLoan.map(book => {
        const loanData: LoanCreate = {
          book_id: book.id,
          contact: contactValue,
          due_date: dueDate || undefined,
          notes: notes || undefined,
        };

        const validationResult = loanService.validateLoanData(loanData);
        if (!validationResult.isValid) {
          throw new Error(validationResult.errors.join('\n'));
        }

        return loanService.createLoan(loanData);
      });

      const results = await Promise.allSettled(loanPromises);

      // Compter les succès et les échecs
      const successes = results.filter(r => r.status === 'fulfilled');
      const failures = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[];

      setLoading(false);

      if (failures.length === 0) {
        // Tout s'est bien passé
        const count = successes.length;
        const message = `${count} prêt${count > 1 ? 's ont' : ' a'} été créé${count > 1 ? 's' : ''} avec succès`;

        if (Platform.OS === 'web') {
          window.alert(message);
          router.replace('/(tabs)/loans/(subtabs)/loans-list');
        } else {
          Alert.alert(
            'Succès',
            message,
            [
              {
                text: 'OK',
                onPress: () => router.replace('/(tabs)/loans/(subtabs)/loans-list'),
              },
            ]
          );
        }
      } else if (successes.length === 0) {
        // Tout a échoué
        const errorMsg = failures[0].reason?.response?.data?.detail || failures[0].reason?.message || 'Impossible de créer les prêts';

        if (Platform.OS === 'web') {
          window.alert(`Erreur: ${errorMsg}`);
        } else {
          Alert.alert(
            'Erreur',
            errorMsg,
            [{ text: 'OK' }]
          );
        }
      } else {
        // Succès partiel
        const errorMessages = failures.map((f, i) => {
          const bookTitle = booksToLoan[results.indexOf(f)]?.title || 'Livre';
          const error = f.reason?.response?.data?.detail || f.reason?.message || 'Erreur inconnue';
          return `• ${bookTitle}: ${error}`;
        }).join('\n');

        const message = `${successes.length} prêt(s) créé(s) avec succès.\n\nÉchecs:\n${errorMessages}`;

        if (Platform.OS === 'web') {
          window.alert(message);
          router.replace('/(tabs)/loans/(subtabs)/loans-list');
        } else {
          Alert.alert(
            'Succès partiel',
            message,
            [
              {
                text: 'OK',
                onPress: () => router.replace('/(tabs)/loans/(subtabs)/loans-list'),
              },
            ]
          );
        }
      }
    } catch (error: any) {
      console.error('Erreur lors de la création des prêts:', error);
      setLoading(false);
      const errorMsg = error.response?.data?.detail || error.message || 'Impossible de créer les prêts';

      if (Platform.OS === 'web') {
        window.alert(`Erreur: ${errorMsg}`);
      } else {
        Alert.alert(
          'Erreur',
          errorMsg,
          [{ text: 'OK' }]
        );
      }
    }
  };

  const calculateDefaultDueDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
      <View style={[styles.header, { backgroundColor: theme.bgCard, borderBottomColor: theme.borderLight }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Nouveau prêt</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Sélection des livres */}
        {!preselectedBookId && (
          <View style={[styles.section, { backgroundColor: theme.bgCard }]}>
            <Text style={[styles.sectionLabel, { color: theme.textPrimary }]}>
              Livres ({selectedBooks.length} sélectionné{selectedBooks.length > 1 ? 's' : ''})
            </Text>

            {selectedBooks.length > 0 && (
              <View style={styles.selectedBooksContainer}>
                {selectedBooks.map((book) => (
                  <View key={book.id} style={[styles.selectedBookItem, { backgroundColor: theme.bgSecondary, borderColor: theme.borderLight }]}>
                    <BookCover
                      url={book.cover_url}
                      style={styles.miniCover}
                      containerStyle={styles.miniCoverContainer}
                      resizeMode="cover"
                    />
                    <View style={styles.bookItemInfo}>
                      <Text style={[styles.bookItemTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                        {book.title}
                      </Text>
                      {book.authors && book.authors.length > 0 && (
                        <Text style={[styles.bookItemAuthors, { color: theme.textSecondary }]} numberOfLines={1}>
                          {book.authors.map((a) => a.name).join(', ')}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity onPress={() => handleRemoveBook(book.id)}>
                      <MaterialIcons name="close" size={20} color={theme.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <BookSelector
              selectedBook={null}
              onBookChange={handleBookChange}
              error={errors.books}
            />
          </View>
        )}

        {/* Sélection du contact */}
        <View style={[styles.section, { backgroundColor: theme.bgCard }]}>
          <ContactSelector
            selectedContact={selectedContact}
            onContactChange={handleContactChange}
            error={errors.contact}
          />
        </View>

        {/* Date d'échéance */}
        <View style={[styles.section, { backgroundColor: theme.bgCard }]}>
          <Text style={[styles.sectionLabel, { color: theme.textPrimary }]}>Date de retour prévue (optionnel)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.bgInput, borderColor: theme.borderLight, color: theme.textPrimary }]}
            placeholder="AAAA-MM-JJ"
            value={dueDate}
            onChangeText={setDueDate}
          />
          {errors.dueDate && <Text style={[styles.errorText, { color: theme.danger }]}>{errors.dueDate}</Text>}

          <View style={styles.quickDatesContainer}>
            <TouchableOpacity
              style={[styles.quickDateButton, { backgroundColor: theme.accentLight }]}
              onPress={() => setDueDate(calculateDefaultDueDate(7))}
            >
              <Text style={[styles.quickDateText, { color: theme.accent }]}>+7 jours</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickDateButton, { backgroundColor: theme.accentLight }]}
              onPress={() => setDueDate(calculateDefaultDueDate(14))}
            >
              <Text style={[styles.quickDateText, { color: theme.accent }]}>+14 jours</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickDateButton, { backgroundColor: theme.accentLight }]}
              onPress={() => setDueDate(calculateDefaultDueDate(30))}
            >
              <Text style={[styles.quickDateText, { color: theme.accent }]}>+30 jours</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notes */}
        <View style={[styles.section, { backgroundColor: theme.bgCard }]}>
          <Text style={[styles.sectionLabel, { color: theme.textPrimary }]}>Notes (optionnel)</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: theme.bgInput, borderColor: theme.borderLight, color: theme.textPrimary }]}
            placeholder="Ajouter des notes..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
          />
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
              <Text style={[styles.submitButtonText, { color: theme.textInverse }]}>Créer le prêt</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default function CreateLoan() {
  return (
    <ProtectedRoute>
      <CreateLoanScreen />
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
  section: {
    padding: 16,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  selectedBooksContainer: {
    marginBottom: 12,
  },
  selectedBookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  miniCover: {
    width: 30,
    height: 45,
  },
  miniCoverContainer: {
    width: 30,
    height: 45,
    marginRight: 12,
  },
  bookItemInfo: {
    flex: 1,
  },
  bookItemTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  bookItemAuthors: {
    fontSize: 11,
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
  quickDatesContainer: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  quickDateButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  quickDateText: {
    fontSize: 12,
    fontWeight: '600',
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
