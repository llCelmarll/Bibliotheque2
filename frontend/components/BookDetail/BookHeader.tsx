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

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

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
            {book.base.authors.map(author => author.name).join(", ")} (Base)
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

          {/* Badge de prêt */}
          {book.base?.current_loan && (
            <View style={styles.loanBadge}>
              <Text style={styles.loanBadgeText}>
                📖 Prêté à {book.base.current_loan.contact?.name || 'Contact inconnu'}
              </Text>
              {book.base.current_loan.due_date && (
                <Text style={[
                  styles.loanDateText,
                  new Date(book.base.current_loan.due_date) < new Date() && styles.loanOverdue
                ]}>
                  Retour prévu : {formatDate(book.base.current_loan.due_date)}
                </Text>
              )}
            </View>
          )}

          {/* Badge d'emprunt */}
          {book.base?.borrowed_book && book.base.borrowed_book.status === 'active' && (
            <View style={styles.borrowBadge}>
              <Text style={styles.borrowBadgeText}>
                📚 Emprunté à {book.base.borrowed_book.contact?.name || book.base.borrowed_book.borrowed_from}
              </Text>
              {book.base.borrowed_book.expected_return_date && (
                <Text style={[
                  styles.borrowDateText,
                  new Date(book.base.borrowed_book.expected_return_date) < new Date() && styles.borrowOverdue
                ]}>
                  {new Date(book.base.borrowed_book.expected_return_date) < new Date() ? '⚠️ ' : ''}
                  Retour prévu : {formatDate(book.base.borrowed_book.expected_return_date)}
                </Text>
              )}
            </View>
          )}

          {/* Badge de lecture */}
          {book.base?.is_read === true && (
            <View style={styles.readBadge}>
              <Text style={styles.readBadgeText}>
                ✓ Lu {book.base.read_date ? `le ${formatDate(book.base.read_date)}` : ''}
              </Text>
            </View>
          )}
          {book.base?.is_read === false && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>Non lu</Text>
            </View>
          )}

          {/* Actions seulement si le livre existe dans la base */}
          {book.base?.id && (
            <BookActions
              bookId={book.base.id.toString()}
              bookTitle={book.base.title || "Titre inconnu"}
              currentLoan={book.base.current_loan}
              borrowedBook={book.base.borrowed_book}
              hasBorrowHistory={book.base.has_borrow_history}
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
    marginBottom: 8,
  },
  loanBadge: {
    marginTop: 8,
    marginBottom: 8,
    padding: 10,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  loanBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 4,
  },
  loanDateText: {
    fontSize: 12,
    color: '#856404',
  },
  loanOverdue: {
    color: '#dc3545',
    fontWeight: '600',
  },
  borrowBadge: {
    marginTop: 8,
    marginBottom: 8,
    padding: 10,
    backgroundColor: '#d1ecf1',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#17a2b8',
  },
  borrowBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0c5460',
    marginBottom: 4,
  },
  borrowDateText: {
    fontSize: 12,
    color: '#0c5460',
  },
  borrowOverdue: {
    color: '#dc3545',
    fontWeight: '600',
  },
  readBadge: {
    marginTop: 8,
    marginBottom: 8,
    padding: 10,
    backgroundColor: '#d4edda',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#28a745',
  },
  readBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#155724',
  },
  unreadBadge: {
    marginTop: 8,
    marginBottom: 8,
    padding: 10,
    backgroundColor: '#e9ecef',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6c757d',
  },
  unreadBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
  },
});