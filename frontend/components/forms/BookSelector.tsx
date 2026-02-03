import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Modal, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Book } from '@/types/book';
import { fetchBooks } from '@/services/booksService';
import { loanService } from '@/services/loanService';
import BookCover from '@/components/BookCover';

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
        style={[styles.bookItem, isLoaned && styles.bookItemLoaned]}
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
          <Text style={[styles.bookTitle, isLoaned && styles.bookTitleLoaned]} numberOfLines={2}>
            {item.title}
          </Text>
          {item.authors && item.authors.length > 0 && (
            <Text style={styles.bookAuthors} numberOfLines={1}>
              {item.authors.map((a) => a.name).join(', ')}
            </Text>
          )}
          {isLoaned ? (
            <View style={styles.loanedBadge}>
              <MaterialIcons name="person" size={12} color="#F44336" />
              <Text style={styles.loanedText}>Prêté à {item.loanedTo}</Text>
            </View>
          ) : (
            item.isbn && (
              <Text style={styles.bookIsbn}>ISBN: {item.isbn}</Text>
            )
          )}
        </View>
        {isLoaned ? (
          <MaterialIcons name="block" size={24} color="#F44336" />
        ) : (
          <MaterialIcons name="chevron-right" size={24} color="#BDBDBD" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Livre</Text>

      {selectedBook ? (
        <View style={styles.selectedContainer}>
          <BookCover
            url={selectedBook.cover_url}
            style={styles.selectedCover}
            containerStyle={styles.selectedCoverContainer}
            resizeMode="cover"
          />
          <View style={styles.selectedInfo}>
            <Text style={styles.selectedTitle} numberOfLines={2}>
              {selectedBook.title}
            </Text>
            {selectedBook.authors && selectedBook.authors.length > 0 && (
              <Text style={styles.selectedAuthors} numberOfLines={1}>
                {selectedBook.authors.map((a) => a.name).join(', ')}
              </Text>
            )}
          </View>
          {!disabled && (
            <TouchableOpacity onPress={handleRemoveBook}>
              <MaterialIcons name="close" size={24} color="#757575" />
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.selectButton, disabled && styles.selectButtonDisabled]}
          onPress={() => setIsModalOpen(true)}
          disabled={disabled}
        >
          <MaterialIcons name="library-books" size={20} color={disabled ? '#BDBDBD' : '#2196F3'} />
          <Text style={[styles.selectButtonText, disabled && styles.selectButtonTextDisabled]}>
            Sélectionner un livre
          </Text>
        </TouchableOpacity>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sélectionner un livre</Text>
            <TouchableOpacity onPress={() => setIsModalOpen(false)}>
              <MaterialIcons name="close" size={28} color="#212121" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un livre..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              autoFocus
            />
            <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
              <MaterialIcons name="search" size={24} color="#2196F3" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2196F3" />
            </View>
          ) : (
            <FlatList
              data={books}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderBookItem}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <MaterialIcons name="library-books" size={64} color="#E0E0E0" />
                  <Text style={styles.emptyText}>
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
    color: '#424242',
    marginBottom: 8,
  },
  selectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
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
    color: '#212121',
    marginBottom: 4,
  },
  selectedAuthors: {
    fontSize: 12,
    color: '#757575',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2196F3',
    borderStyle: 'dashed',
  },
  selectButtonDisabled: {
    borderColor: '#E0E0E0',
    backgroundColor: '#F5F5F5',
  },
  selectButtonText: {
    fontSize: 14,
    color: '#2196F3',
    marginLeft: 8,
  },
  selectButtonTextDisabled: {
    color: '#BDBDBD',
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#F5F5F5',
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
    color: '#757575',
    textAlign: 'center',
    marginTop: 16,
  },
  bookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  bookItemLoaned: {
    backgroundColor: '#FAFAFA',
    opacity: 0.6,
  },
  bookCover: {
    width: 50,
    height: 75,
  },
  bookCoverLoaned: {
    opacity: 0.5,
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
    color: '#212121',
    marginBottom: 4,
  },
  bookTitleLoaned: {
    color: '#9E9E9E',
  },
  bookAuthors: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 2,
  },
  bookIsbn: {
    fontSize: 11,
    color: '#9E9E9E',
  },
  loanedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  loanedText: {
    fontSize: 11,
    color: '#F44336',
    marginLeft: 4,
    fontWeight: '600',
  },
});
