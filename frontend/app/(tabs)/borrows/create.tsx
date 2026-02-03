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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Book } from '@/types/book';
import { BorrowedBookCreate } from '@/types/borrowedBook';
import { SuggestedBook } from '@/types/scanTypes';
import { borrowedBookService } from '@/services/borrowedBookService';
import { bookService } from '@/services/bookService';
import { BookSelector } from '@/components/forms/BookSelector';
import { ContactSelector } from '@/components/forms/ContactSelector';
import BookCover from '@/components/BookCover';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Contact } from '@/types/contact';

function CreateBorrowScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Si un bookId est passé en paramètre
  const preselectedBookId = params.bookId ? parseInt(params.bookId as string) : null;

  // Parser le livre suggéré si fourni
  const [parsedSuggestedBook, setParsedSuggestedBook] = useState<SuggestedBook | null>(null);

  useEffect(() => {
    if (params.suggestedBook && typeof params.suggestedBook === 'string') {
      try {
        setParsedSuggestedBook(JSON.parse(params.suggestedBook));
      } catch (e) {
        console.error('Invalid suggestedBook JSON:', e);
      }
    }
  }, [params.suggestedBook]);

  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | string | null>(null);
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

    if (!selectedContact) {
      newErrors.contact = 'Veuillez indiquer de qui vous avez emprunté le livre';
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
    // Si livre suggéré fourni, créer le livre + emprunt en même temps
    if (parsedSuggestedBook) {
      return handleCreateFromSuggested();
    }

    if (!validateForm()) return;

    setLoading(true);

    try {
      const bookId = preselectedBookId || selectedBook?.id;
      if (!bookId) {
        throw new Error('Aucun livre sélectionné');
      }

      const contactValue = typeof selectedContact === 'string'
        ? selectedContact
        : (selectedContact as Contact).id;

      const borrowData: BorrowedBookCreate = {
        book_id: bookId,
        contact: contactValue,
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

  const handleCreateFromSuggested = async () => {
    if (!parsedSuggestedBook || !selectedContact) {
      Alert.alert('Erreur', 'Veuillez sélectionner un contact');
      return;
    }

    setLoading(true);
    try {
      const contactValue = typeof selectedContact === 'string'
        ? selectedContact
        : (selectedContact as Contact).id;

      // Créer le livre avec is_borrowed=true
      const bookCreate = {
        title: parsedSuggestedBook.title,
        isbn: parsedSuggestedBook.isbn,
        authors: parsedSuggestedBook.authors,
        publisher: parsedSuggestedBook.publisher,
        cover_url: parsedSuggestedBook.cover_url,
        published_date: parsedSuggestedBook.published_date,
        page_count: parsedSuggestedBook.page_count,
        genres: parsedSuggestedBook.genres,
        is_borrowed: true,
        contact: contactValue,
        borrowed_from: typeof selectedContact === 'string' ? selectedContact : (selectedContact as Contact).name,
        borrowed_date: convertDateToISO(borrowedDate),
        expected_return_date: convertDateToISO(expectedReturnDate),
        borrow_notes: notes,
      };

      // Le backend créera automatiquement le BorrowedBook
      await bookService.createBook(bookCreate);

      setLoading(false);

      if (Platform.OS === 'web') {
        window.alert('Livre emprunté à nouveau avec succès');
        router.replace('/(tabs)/books');
      } else {
        Alert.alert('Succès', 'Livre emprunté à nouveau avec succès', [
          {
            text: 'OK',
            onPress: () => router.replace('/(tabs)/books'),
          },
        ]);
      }
    } catch (error: any) {
      setLoading(false);
      const message = error.response?.data?.detail || 'Impossible de créer l\'emprunt';
      if (Platform.OS === 'web') {
        window.alert(`Erreur: ${message}`);
      } else {
        Alert.alert('Erreur', message);
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
        {!preselectedBookId && !parsedSuggestedBook && (
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

        {/* Afficher le livre suggéré si fourni */}
        {parsedSuggestedBook && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Livre à emprunter</Text>
            <View style={styles.selectedBookContainer}>
              <BookCover
                url={parsedSuggestedBook.cover_url}
                style={styles.bookCover}
                containerStyle={styles.bookCoverContainer}
                resizeMode="cover"
              />
              <View style={styles.bookInfo}>
                <Text style={styles.bookTitle} numberOfLines={2}>
                  {parsedSuggestedBook.title}
                </Text>
                {parsedSuggestedBook.authors && parsedSuggestedBook.authors.length > 0 && (
                  <Text style={styles.bookAuthors} numberOfLines={1}>
                    {parsedSuggestedBook.authors.map((a) => a.name).join(', ')}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Emprunté à */}
        <View style={styles.section}>
          <ContactSelector
            selectedContact={selectedContact}
            onContactChange={(contact) => {
              setSelectedContact(contact);
              if (errors.contact) {
                setErrors((prev) => ({ ...prev, contact: '' }));
              }
            }}
            label="Emprunté à *"
            error={errors.contact}
          />
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
