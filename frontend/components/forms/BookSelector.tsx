import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Modal, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Book } from '@/types/book';
import { fetchBooks } from '@/services/booksService';
import { loanService } from '@/services/loanService';
import BookCover from '@/components/BookCover';
import { useTheme } from '@/contexts/ThemeContext';

interface BookSelectorProps {
  selectedBook: Book | null;
  onBookChange: (book: Book | null) => void;
  disabled?: boolean;
  error?: string;
}

interface BookWithLoanStatus extends Book {
  isLoaned?: boolean;
  loanedTo?: string;
}

export const BookSelector: React.FC<BookSelectorProps> = ({
  selectedBook,
  onBookChange,
  disabled = false,
  error,
}) => {
  const theme = useTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [books, setBooks] = useState<BookWithLoanStatus[]>([]);
  const [loading, setLoading] = useState(false);

  const loadBooks = async (query: string = '') => {
    setLoading(true);
    try {
      const [booksData, activeLoans] = await Promise.all([
        fetchBooks({
          page: 1,
          pageSize: 20,
          sortBy: 'title',
          order: 'asc',
          searchQuery: query.trim(),
          filters: [],
        }),
        loanService.getActiveLoans()
      ]);

      // Marquer les livres déjà prêtés
      const booksWithStatus: BookWithLoanStatus[] = booksData.map(book => {
        const activeLoan = activeLoans.find(loan => loan.book_id === book.id);
        return {
          ...book,
          isLoaned: !!activeLoan,
          loanedTo: activeLoan?.contact.name
        };
      });

      setBooks(booksWithStatus);
    } catch (error) {
      console.error('Erreur lors du chargement des livres:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isModalOpen) {
      loadBooks();
    }
  }, [isModalOpen]);

  const handleSearch = () => {
    loadBooks(searchQuery.trim());
  };

  const handleSelectBook = (book: Book) => {
    onBookChange(book);
    setIsModalOpen(false);
    setSearchQuery('');
  };

  const handleRemoveBook = () => {
    onBookChange(null);
  };

  const renderBookItem = ({ item }: { item: BookWithLoanStatus }) => {
    const isLoaned = item.isLoaned;

    return (
      <TouchableOpacity
        style={[styles.bookItem, { backgroundColor: theme.bgCard, borderBottomColor: theme.borderLight }, isLoaned && { backgroundColor: theme.bgSecondary, opacity: 0.6 }]}
        onPress={() => !isLoaned && handleSelectBook(item)}
        disabled={isLoaned}
      >
        <BookCover
          url={item.cover_url}
          style={[styles.bookCover, isLoaned && styles.bookCoverLoaned]}
          containerStyle={styles.bookCoverContainer}
          resizeMode="cover"
        />
        <View style={styles.bookInfo}>
          <Text style={[styles.bookTitle, { color: theme.textPrimary }, isLoaned && { color: theme.textMuted }]} numberOfLines={2}>
            {item.title}
          </Text>
          {item.authors && item.authors.length > 0 && (
            <Text style={[styles.bookAuthors, { color: theme.textSecondary }]} numberOfLines={1}>
              {item.authors.map((a) => a.name).join(', ')}
            </Text>
          )}
          {isLoaned ? (
            <View style={[styles.loanedBadge, { backgroundColor: theme.dangerBg }]}>
              <MaterialIcons name="person" size={12} color={theme.danger} />
              <Text style={[styles.loanedText, { color: theme.danger }]}>Prêté à {item.loanedTo}</Text>
            </View>
          ) : (
            item.isbn && (
              <Text style={[styles.bookIsbn, { color: theme.textMuted }]}>ISBN: {item.isbn}</Text>
            )
          )}
        </View>
        {isLoaned ? (
          <MaterialIcons name="block" size={24} color={theme.danger} />
        ) : (
          <MaterialIcons name="chevron-right" size={24} color={theme.textMuted} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>Livre</Text>

      {selectedBook ? (
        <View style={[styles.selectedContainer, { backgroundColor: theme.bgSecondary, borderColor: theme.borderLight }]}>
          <BookCover
            url={selectedBook.cover_url}
            style={styles.selectedCover}
            containerStyle={styles.selectedCoverContainer}
            resizeMode="cover"
          />
          <View style={styles.selectedInfo}>
            <Text style={[styles.selectedTitle, { color: theme.textPrimary }]} numberOfLines={2}>
              {selectedBook.title}
            </Text>
            {selectedBook.authors && selectedBook.authors.length > 0 && (
              <Text style={[styles.selectedAuthors, { color: theme.textSecondary }]} numberOfLines={1}>
                {selectedBook.authors.map((a) => a.name).join(', ')}
              </Text>
            )}
          </View>
          {!disabled && (
            <TouchableOpacity onPress={handleRemoveBook}>
              <MaterialIcons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.selectButton, { backgroundColor: theme.bgCard, borderColor: theme.accent }, disabled && { borderColor: theme.borderLight, backgroundColor: theme.bgSecondary }]}
          onPress={() => setIsModalOpen(true)}
          disabled={disabled}
        >
          <MaterialIcons name="library-books" size={20} color={disabled ? theme.textMuted : theme.accent} />
          <Text style={[styles.selectButtonText, { color: theme.accent }, disabled && { color: theme.textMuted }]}>
            Sélectionner un livre
          </Text>
        </TouchableOpacity>
      )}

      {error && <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>}

      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.bgCard }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.borderLight }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Sélectionner un livre</Text>
            <TouchableOpacity onPress={() => setIsModalOpen(false)}>
              <MaterialIcons name="close" size={28} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.searchContainer, { borderBottomColor: theme.borderLight }]}>
            <TextInput
              style={[styles.searchInput, { backgroundColor: theme.bgSecondary, color: theme.textPrimary }]}
              placeholder="Rechercher un livre..."
              placeholderTextColor={theme.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              autoFocus
            />
            <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
              <MaterialIcons name="search" size={24} color={theme.accent} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.accent} />
            </View>
          ) : (
            <FlatList
              data={books}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderBookItem}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <MaterialIcons name="library-books" size={64} color={theme.borderLight} />
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                    {searchQuery ? 'Aucun livre trouvé' : 'Aucun livre'}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  selectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  selectedCover: {
    width: 40,
    height: 60,
  },
  selectedCoverContainer: {
    width: 40,
    height: 60,
    marginRight: 12,
  },
  selectedInfo: {
    flex: 1,
  },
  selectedTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  selectedAuthors: {
    fontSize: 12,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  selectButtonText: {
    fontSize: 14,
    marginLeft: 8,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  searchButton: {
    marginLeft: 8,
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
  bookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  bookCoverLoaned: {
    opacity: 0.5,
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
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  bookAuthors: {
    fontSize: 12,
    marginBottom: 2,
  },
  bookIsbn: {
    fontSize: 11,
  },
  loanedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  loanedText: {
    fontSize: 11,
    marginLeft: 4,
    fontWeight: '600',
  },
});
