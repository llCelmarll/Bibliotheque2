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
import { Borrower } from '@/types/borrower';
import { Book } from '@/types/book';
import { LoanCreate } from '@/types/loan';
import { loanService } from '@/services/loanService';
import { borrowerService } from '@/services/borrowerService';
import { BorrowerSelector } from '@/components/forms/BorrowerSelector';
import { BookSelector } from '@/components/forms/BookSelector';
import BookCover from '@/components/BookCover';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useLocalSearchParams } from 'expo-router';

function CreateLoanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Si un bookId ou borrowerId est passé en paramètre
  const preselectedBookId = params.bookId ? parseInt(params.bookId as string) : null;
  const preselectedBorrowerId = params.borrowerId ? parseInt(params.borrowerId as string) : null;

  const [selectedBooks, setSelectedBooks] = useState<Book[]>([]);
  const [selectedBorrower, setSelectedBorrower] = useState<Borrower | string | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Charger l'emprunteur présélectionné
  useEffect(() => {
    if (preselectedBorrowerId) {
      borrowerService.getBorrowerById(preselectedBorrowerId)
        .then((borrower) => setSelectedBorrower(borrower))
        .catch((error) => {
          console.error('Erreur lors du chargement de l\'emprunteur:', error);
        });
    }
  }, [preselectedBorrowerId]);

  const handleBorrowerChange = (borrower: Borrower | string) => {
    setSelectedBorrower(borrower);
    if (errors.borrower) {
      setErrors((prev) => ({ ...prev, borrower: '' }));
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

    if (!selectedBorrower) {
      newErrors.borrower = 'Veuillez sélectionner un emprunteur';
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
      const borrowerValue = typeof selectedBorrower === 'string'
        ? selectedBorrower
        : (selectedBorrower as Borrower).id;

      // Créer un prêt pour chaque livre
      const loanPromises = booksToLoan.map(book => {
        const loanData: LoanCreate = {
          book_id: book.id,
          borrower: borrowerValue,
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nouveau prêt</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Sélection des livres */}
        {!preselectedBookId && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              Livres ({selectedBooks.length} sélectionné{selectedBooks.length > 1 ? 's' : ''})
            </Text>

            {selectedBooks.length > 0 && (
              <View style={styles.selectedBooksContainer}>
                {selectedBooks.map((book) => (
                  <View key={book.id} style={styles.selectedBookItem}>
                    <BookCover
                      url={book.cover_url}
                      style={styles.miniCover}
                      containerStyle={styles.miniCoverContainer}
                      resizeMode="cover"
                    />
                    <View style={styles.bookItemInfo}>
                      <Text style={styles.bookItemTitle} numberOfLines={1}>
                        {book.title}
                      </Text>
                      {book.authors && book.authors.length > 0 && (
                        <Text style={styles.bookItemAuthors} numberOfLines={1}>
                          {book.authors.map((a) => a.name).join(', ')}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity onPress={() => handleRemoveBook(book.id)}>
                      <MaterialIcons name="close" size={20} color="#757575" />
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

        {/* Sélection de l'emprunteur */}
        <View style={styles.section}>
          <BorrowerSelector
            selectedBorrower={selectedBorrower}
            onBorrowerChange={handleBorrowerChange}
            error={errors.borrower}
          />
        </View>

        {/* Date d'échéance */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Date de retour prévue (optionnel)</Text>
          <TextInput
            style={styles.input}
            placeholder="AAAA-MM-JJ"
            value={dueDate}
            onChangeText={setDueDate}
          />
          {errors.dueDate && <Text style={styles.errorText}>{errors.dueDate}</Text>}

          <View style={styles.quickDatesContainer}>
            <TouchableOpacity
              style={styles.quickDateButton}
              onPress={() => setDueDate(calculateDefaultDueDate(7))}
            >
              <Text style={styles.quickDateText}>+7 jours</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickDateButton}
              onPress={() => setDueDate(calculateDefaultDueDate(14))}
            >
              <Text style={styles.quickDateText}>+14 jours</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickDateButton}
              onPress={() => setDueDate(calculateDefaultDueDate(30))}
            >
              <Text style={styles.quickDateText}>+30 jours</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Notes (optionnel)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Ajouter des notes..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
          />
        </View>
      </ScrollView>

      {/* Bouton de soumission */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <MaterialIcons name="check" size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Créer le prêt</Text>
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
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 8,
  },
  selectedBooksContainer: {
    marginBottom: 12,
  },
  selectedBookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
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
    color: '#212121',
    marginBottom: 2,
  },
  bookItemAuthors: {
    fontSize: 11,
    color: '#757575',
  },
  input: {
    height: 44,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
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
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
  },
  quickDateText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    borderRadius: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});
