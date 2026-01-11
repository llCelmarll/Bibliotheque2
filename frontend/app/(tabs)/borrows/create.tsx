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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Book } from '@/types/book';
import { BorrowedBookCreate } from '@/types/borrowedBook';
import { borrowedBookService } from '@/services/borrowedBookService';
import { BookSelector } from '@/components/forms/BookSelector';
import BookCover from '@/components/BookCover';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

function CreateBorrowScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Si un bookId est passé en paramètre
  const preselectedBookId = params.bookId ? parseInt(params.bookId as string) : null;

  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [borrowedFrom, setBorrowedFrom] = useState('');
  const [borrowedDate, setBorrowedDate] = useState(new Date().toLocaleDateString('fr-FR'));
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const convertDateToISO = (dateStr: string): string | undefined => {
    if (!dateStr || dateStr.trim() === '') return undefined;
    const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return undefined;
    const [, day, month, year] = match;
    return `${year}-${month}-${day}`;
  };

  const handleBookChange = (book: Book | null) => {
    setSelectedBook(book);
    if (errors.book) {
      setErrors((prev) => ({ ...prev, book: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedBook && !preselectedBookId) {
      newErrors.book = 'Veuillez sélectionner un livre';
    }

    if (!borrowedFrom.trim()) {
      newErrors.borrowedFrom = 'Veuillez indiquer de qui vous avez emprunté le livre';
    }

    if (!borrowedDate.trim()) {
      newErrors.borrowedDate = 'Veuillez indiquer la date d\'emprunt';
    } else if (!borrowedDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)) {
      newErrors.borrowedDate = 'Format de date invalide (JJ/MM/AAAA)';
    }

    if (expectedReturnDate && !expectedReturnDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)) {
      newErrors.expectedReturnDate = 'Format de date invalide (JJ/MM/AAAA)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const bookId = preselectedBookId || selectedBook?.id;
      if (!bookId) {
        throw new Error('Aucun livre sélectionné');
      }

      const borrowData: BorrowedBookCreate = {
        book_id: bookId,
        borrowed_from: borrowedFrom,
        borrowed_date: convertDateToISO(borrowedDate),
        expected_return_date: convertDateToISO(expectedReturnDate),
        notes: notes || undefined,
      };

      await borrowedBookService.createBorrowedBook(borrowData);

      setLoading(false);

      const message = 'L\'emprunt a été créé avec succès';

      if (Platform.OS === 'web') {
        window.alert(message);
        router.replace('/(tabs)/books');
      } else {
        Alert.alert(
          'Succès',
          message,
          [
            {
              text: 'OK',
              onPress: () => router.replace('/(tabs)/books'),
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('Erreur lors de la création de l\'emprunt:', error);
      setLoading(false);
      const errorMsg = error.response?.data?.detail || error.message || 'Impossible de créer l\'emprunt';

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

  const calculateDefaultReturnDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toLocaleDateString('fr-FR');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nouvel emprunt</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Sélection du livre */}
        {!preselectedBookId && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Livre</Text>

            {selectedBook && (
              <View style={styles.selectedBookContainer}>
                <BookCover
                  url={selectedBook.cover_url}
                  style={styles.bookCover}
                  containerStyle={styles.bookCoverContainer}
                  resizeMode="cover"
                />
                <View style={styles.bookInfo}>
                  <Text style={styles.bookTitle} numberOfLines={2}>
                    {selectedBook.title}
                  </Text>
                  {selectedBook.authors && selectedBook.authors.length > 0 && (
                    <Text style={styles.bookAuthors} numberOfLines={1}>
                      {selectedBook.authors.map((a) => a.name).join(', ')}
                    </Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => setSelectedBook(null)}>
                  <MaterialIcons name="close" size={20} color="#757575" />
                </TouchableOpacity>
              </View>
            )}

            {!selectedBook && (
              <BookSelector
                selectedBook={selectedBook}
                onBookChange={handleBookChange}
                error={errors.book}
              />
            )}
          </View>
        )}

        {/* Emprunté à */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Emprunté à *</Text>
          <TextInput
            style={styles.input}
            placeholder="Nom de la personne ou bibliothèque..."
            value={borrowedFrom}
            onChangeText={setBorrowedFrom}
          />
          {errors.borrowedFrom && <Text style={styles.errorText}>{errors.borrowedFrom}</Text>}
        </View>

        {/* Date d'emprunt */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Date d'emprunt *</Text>
          <TextInput
            style={styles.input}
            placeholder="JJ/MM/AAAA"
            value={borrowedDate}
            onChangeText={setBorrowedDate}
          />
          {errors.borrowedDate && <Text style={styles.errorText}>{errors.borrowedDate}</Text>}
        </View>

        {/* Date de retour prévue */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Date de retour prévue (optionnel)</Text>
          <TextInput
            style={styles.input}
            placeholder="JJ/MM/AAAA"
            value={expectedReturnDate}
            onChangeText={setExpectedReturnDate}
          />
          {errors.expectedReturnDate && <Text style={styles.errorText}>{errors.expectedReturnDate}</Text>}

          <View style={styles.quickDatesContainer}>
            <TouchableOpacity
              style={styles.quickDateButton}
              onPress={() => setExpectedReturnDate(calculateDefaultReturnDate(7))}
            >
              <Text style={styles.quickDateText}>+7 jours</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickDateButton}
              onPress={() => setExpectedReturnDate(calculateDefaultReturnDate(14))}
            >
              <Text style={styles.quickDateText}>+14 jours</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickDateButton}
              onPress={() => setExpectedReturnDate(calculateDefaultReturnDate(30))}
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
              <Text style={styles.submitButtonText}>Créer l'emprunt</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default function CreateBorrow() {
  return (
    <ProtectedRoute>
      <CreateBorrowScreen />
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
  selectedBookContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 12,
  },
  bookCover: {
    width: 50,
    height: 75,
  },
  bookCoverContainer: {
    width: 50,
    height: 75,
    marginRight: 12,
  },
  bookInfo: {
    flex: 1,
  },
  bookTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 4,
  },
  bookAuthors: {
    fontSize: 13,
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
