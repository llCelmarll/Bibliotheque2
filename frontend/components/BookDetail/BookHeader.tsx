import { View, Image, StyleSheet, Text } from "react-native";
import { BookDetail } from '@/types/book';
import BookCover from '@/components/BookCover';
import { BookActions } from './BookActions';
import { StarRating } from '@/components/StarRating';
import { useTheme } from '@/contexts/ThemeContext';

interface BookHeaderProps {
  book: BookDetail;
  onBookDeleted?: () => void;
  readOnly?: boolean;
}

export function BookHeader({book, onBookDeleted, readOnly}: BookHeaderProps) {
  const theme = useTheme();

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
          <Text style={[styles.author, { color: theme.textSecondary }]}>
            {book.google_books.authors.join(", ")} (Google Books)
          </Text>
      );
    }
    // Base authors
    if (book.base && book.base.authors && book.base.authors.length > 0) {
      return (
          <Text style={[styles.author, { color: theme.textSecondary }]}>
            {book.base.authors.map(author => author.name).join(", ")} (Base)
          </Text>
      );
    }
    // Open Library by_statement
    if (book.open_library && book.open_library.by_statement) {
      return (
          <Text style={[styles.author, { color: theme.textSecondary }]}>
            {book.open_library.by_statement} (Open Library)
          </Text>
      );
    }
    // Fallback
    return <Text style={[styles.author, { color: theme.textSecondary }]}>Auteur inconnu</Text>;
  };



  return (
      <View style={styles.container}>
        <BookCover
            url={coverUrl}
            style={styles.cover}
            containerStyle={[styles.coverContainer, { backgroundColor: theme.bgMuted }]}
            resizeMode="contain"
        />
        <View style={styles.info}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>{book.base?.title || "Titre inconnu"}</Text>
          {renderAuthors()}
          <Text style={[styles.isbn, { color: theme.textMuted }]}>ISBN: {book.base?.isbn || "N/A"}</Text>

          {/* Badge de prêt */}
          {book.base?.current_loan && (
            <View style={[styles.loanBadge, { backgroundColor: theme.warningBg, borderColor: theme.warning }]}>
              <Text style={[styles.loanBadgeText, { color: theme.textPrimary }]}>
                📖 Prêté à {book.base.current_loan.contact?.name || 'Contact inconnu'}
              </Text>
              {book.base.current_loan.due_date && (
                <Text style={[
                  styles.loanDateText,
                  { color: theme.textPrimary },
                  new Date(book.base.current_loan.due_date) < new Date() && { color: theme.danger, fontWeight: '600' }
                ]}>
                  Retour prévu : {formatDate(book.base.current_loan.due_date)}
                </Text>
              )}
            </View>
          )}

          {/* Badge d'emprunt */}
          {book.base?.borrowed_book && book.base.borrowed_book.status === 'active' && (
            <View style={[styles.borrowBadge, { backgroundColor: theme.accentLight, borderColor: theme.accent }]}>
              <Text style={[styles.borrowBadgeText, { color: theme.textPrimary }]}>
                📚 Emprunté à {book.base.borrowed_book.contact?.name || book.base.borrowed_book.borrowed_from}
              </Text>
              {book.base.borrowed_book.expected_return_date && (
                <Text style={[
                  styles.borrowDateText,
                  { color: theme.textPrimary },
                  new Date(book.base.borrowed_book.expected_return_date) < new Date() && { color: theme.danger, fontWeight: '600' }
                ]}>
                  {new Date(book.base.borrowed_book.expected_return_date) < new Date() ? '⚠️ ' : ''}
                  Retour prévu : {formatDate(book.base.borrowed_book.expected_return_date)}
                </Text>
              )}
            </View>
          )}

          {/* Badge de lecture */}
          {book.base?.is_read === true && (
            <View style={[styles.readBadge, { backgroundColor: theme.successBg, borderColor: theme.success }]}>
              <Text style={[styles.readBadgeText, { color: theme.success }]}>
                ✓ Lu {book.base.read_date ? `le ${formatDate(book.base.read_date)}` : ''}
              </Text>
            </View>
          )}
          {book.base?.is_read === false && (
            <View style={[styles.unreadBadge, { backgroundColor: theme.bgMuted, borderColor: theme.borderMedium }]}>
              <Text style={[styles.unreadBadgeText, { color: theme.textSecondary }]}>Non lu</Text>
            </View>
          )}

          {/* Notation (étoiles) */}
          {book.base?.rating != null && book.base.rating > 0 && (
            <View style={styles.ratingContainer}>
              <StarRating value={book.base.rating} editable={false} size={20} />
            </View>
          )}

          {/* Actions seulement si le livre existe dans la base et n'est pas en lecture seule */}
          {book.base?.id && !readOnly && (
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
    marginBottom: 4,
  },
  isbn: {
    fontSize: 14,
    marginBottom: 8,
  },
  loanBadge: {
    marginTop: 8,
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  loanBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  loanDateText: {
    fontSize: 12,
  },
  borrowBadge: {
    marginTop: 8,
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  borrowBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  borrowDateText: {
    fontSize: 12,
  },
  readBadge: {
    marginTop: 8,
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  readBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  unreadBadge: {
    marginTop: 8,
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  unreadBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  ratingContainer: {
    marginTop: 8,
    marginBottom: 4,
  },
});
