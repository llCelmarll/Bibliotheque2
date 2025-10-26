import { View, Image, StyleSheet, Text } from "react-native";
import { BookDetail } from '@/types/book';
import BookCover from '@/components/BookCover';
import { BookActions } from './BookActions';

interface BookHeaderProps {
  book: BookDetail;
  onBookDeleted?: () => void;
}

export function BookHeader({book, onBookDeleted}: BookHeaderProps) {
  const coverUrl = book.base?.cover_url ||
    book.google_books?.imageLinks?.thumbnail ||
    undefined;

  const renderAuthors = () => {
    // Google Books authors
    if (book.google_books && book.google_books.authors && book.google_books.authors.length > 0) {
      return (
          <Text style={styles.author}>
            {book.google_books.authors.join(", ")} (Google Books)
          </Text>
      );
    }
    // Base authors
    if (book.base && book.base.authors && book.base.authors.length > 0) {
      return (
          <Text style={styles.author}>
            {book.base.authors.join(", ")} (Base)
          </Text>
      );
    }
    // Open Library by_statement
    if (book.open_library && book.open_library.by_statement) {
      return (
          <Text style={styles.author}>
            {book.open_library.by_statement} (Open Library)
          </Text>
      );
    }
    // Fallback
    return <Text style={styles.author}>Auteur inconnu</Text>;
  };



  return (
      <View style={styles.container}>
        <BookCover
            url={coverUrl}
            style={styles.cover}
            containerStyle={styles.coverContainer}
            resizeMode="contain"
        />
        <View style={styles.info}>
          <Text style={styles.title}>{book.base?.title || "Titre inconnu"}</Text>
          {renderAuthors()}
          <Text style={styles.isbn}>ISBN: {book.base?.isbn || "N/A"}</Text>
          
          {/* Actions seulement si le livre existe dans la base */}
          {book.base?.id && (
            <BookActions
              bookId={book.base.id.toString()}
              bookTitle={book.base.title || "Titre inconnu"}
              onBookDeleted={onBookDeleted}
            />
          )}
        </View>
      </View>
  );

}

const COVER_RATIO = 2/3; // width/height ratio pour les couvertures de livres
const COVER_WIDTH = 140; // largeur fixe de la couverture

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  coverContainer: {
    width: COVER_WIDTH,
    height: COVER_WIDTH / COVER_RATIO,
    marginRight: 16,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  cover: {
    width: COVER_WIDTH,
    height: COVER_WIDTH / COVER_RATIO,
    borderRadius: 8,
  },
  info: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  author: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  isbn: {
    fontSize: 14,
    color: '#888',
  },
});