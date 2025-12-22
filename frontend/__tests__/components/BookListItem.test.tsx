/**
 * Tests pour le composant BookListItem
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TouchableOpacity } from 'react-native';
import { BookListItem } from '../../components/BookListItem';
import { Book } from '../../types/book';

// Mock @expo/vector-icons localement pour ce fichier
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  const createMockIcon = (name: string) => ({ name: iconName, size, color, ...props }: any) =>
    React.createElement(Text, {
      ...props,
      testID: `icon-${iconName}`,
      style: { fontSize: size, color }
    }, iconName);

  return {
    Ionicons: createMockIcon('Ionicons'),
    MaterialIcons: createMockIcon('MaterialIcons'),
    AntDesign: createMockIcon('AntDesign'),
    Feather: createMockIcon('Feather'),
    FontAwesome: createMockIcon('FontAwesome'),
    MaterialCommunityIcons: createMockIcon('MaterialCommunityIcons')
  };
});

// Mock expo-router - mock local pour ce fichier uniquement
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
  })),
  useLocalSearchParams: jest.fn(() => ({})),
}));

describe('BookListItem', () => {
  const mockBook: Book = {
    id: 1,
    title: 'Test Book Title',
    authors: [
      { id: 1, name: 'Test Author' }
    ],
    publisher: { id: 1, name: 'Test Publisher' },
    genres: [
      { id: 1, name: 'Fiction' }
    ],
    cover_url: 'https://example.com/cover.jpg',
    isbn: '9781234567890',
    published_date: '2023-01-01',
    page_count: 300,
    created_at: '2025-10-28T12:00:00Z',
    updated_at: '2025-10-28T12:00:00Z'
  };

  const mockOnFilterSelect = jest.fn();

  beforeEach(() => {
    // Nettoyer tous les mocks avant chaque test
    mockPush.mockClear();
    mockReplace.mockClear();
    mockBack.mockClear();
    mockOnFilterSelect.mockClear();
  });

  it('should render book information correctly', () => {
    const { getByText } = render(
      <BookListItem book={mockBook} onFilterSelect={mockOnFilterSelect} />
    );

    // Vérifier que le titre est affiché
    expect(getByText('Test Book Title')).toBeTruthy();
    
    // Vérifier que l'auteur est affiché
    expect(getByText('Test Author')).toBeTruthy();
    
    // Vérifier que l'éditeur est affiché
    expect(getByText('Test Publisher')).toBeTruthy();
    
    // Vérifier que le genre est affiché
    expect(getByText('Fiction')).toBeTruthy();
  });

  it('should navigate to book details when pressed', () => {
    const { getByTestId } = render(
      <BookListItem book={mockBook} onFilterSelect={mockOnFilterSelect} />
    );

    // Simuler un tap sur le TouchableOpacity principal
    const bookItem = getByTestId('book-item-touchable');
    fireEvent.press(bookItem);

    // Vérifier que la navigation est appelée
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/books/1');
  });

  it('should handle book without cover', () => {
    const bookWithoutCover = {
      ...mockBook,
      cover_url: undefined
    };

    const { getByText } = render(
      <BookListItem book={bookWithoutCover} onFilterSelect={mockOnFilterSelect} />
    );

    // Le composant doit s'afficher même sans couverture
    expect(getByText('Test Book Title')).toBeTruthy();
  });

  it('should handle book without publisher', () => {
    const bookWithoutPublisher = {
      ...mockBook,
      publisher: undefined
    };

    const { getByText } = render(
      <BookListItem book={bookWithoutPublisher} onFilterSelect={mockOnFilterSelect} />
    );

    // Le livre doit s'afficher même sans éditeur
    expect(getByText('Test Book Title')).toBeTruthy();
  });

  it('should handle empty authors array', () => {
    const bookWithoutAuthors = {
      ...mockBook,
      authors: []
    };

    const { getByText } = render(
      <BookListItem book={bookWithoutAuthors} onFilterSelect={mockOnFilterSelect} />
    );

    // Le livre doit s'afficher même sans auteurs
    expect(getByText('Test Book Title')).toBeTruthy();
  });

  it('should handle empty genres array', () => {
    const bookWithoutGenres = {
      ...mockBook,
      genres: []
    };

    const { getByText } = render(
      <BookListItem book={bookWithoutGenres} onFilterSelect={mockOnFilterSelect} />
    );

    // Le livre doit s'afficher même sans genres
    expect(getByText('Test Book Title')).toBeTruthy();
  });

  describe('Loan badge display', () => {
    it('should display loan badge when book has active loan', () => {
      const bookWithLoan = {
        ...mockBook,
        current_loan: {
          id: 1,
          borrower_id: 1,
          borrower: {
            id: 1,
            name: 'John Doe',
            email: 'john@example.com'
          },
          loan_date: '2025-01-01',
          due_date: '2025-01-15',
          status: 'active' as const
        }
      };

      const { getByText } = render(
        <BookListItem book={bookWithLoan} onFilterSelect={mockOnFilterSelect} />
      );

      // Vérifier que le badge de prêt est affiché
      expect(getByText('📖 Prêté à John Doe')).toBeTruthy();
      expect(getByText(/Retour :/)).toBeTruthy();
    });

    it('should not display loan badge when book has no active loan', () => {
      const { queryByText } = render(
        <BookListItem book={mockBook} onFilterSelect={mockOnFilterSelect} />
      );

      // Vérifier que le badge de prêt n'est pas affiché
      expect(queryByText(/Prêté à/)).toBeNull();
    });

    it('should display loan badge without borrower name when borrower is unknown', () => {
      const bookWithLoan = {
        ...mockBook,
        current_loan: {
          id: 1,
          borrower_id: 1,
          loan_date: '2025-01-01',
          status: 'active' as const
        }
      };

      const { getByText } = render(
        <BookListItem book={bookWithLoan} onFilterSelect={mockOnFilterSelect} />
      );

      // Vérifier que le message par défaut est affiché
      expect(getByText('📖 Prêté à Emprunteur inconnu')).toBeTruthy();
    });

    it('should format due date correctly', () => {
      const bookWithLoan = {
        ...mockBook,
        current_loan: {
          id: 1,
          borrower_id: 1,
          borrower: {
            id: 1,
            name: 'John Doe'
          },
          loan_date: '2025-01-01',
          due_date: '2025-01-15T00:00:00Z',
          status: 'active' as const
        }
      };

      const { getByText } = render(
        <BookListItem book={bookWithLoan} onFilterSelect={mockOnFilterSelect} />
      );

      // Vérifier que la date est formatée
      expect(getByText(/Retour : \d{2}\/\d{2}\/\d{4}/)).toBeTruthy();
    });

    it('should handle loan without due date', () => {
      const bookWithLoan = {
        ...mockBook,
        current_loan: {
          id: 1,
          borrower_id: 1,
          borrower: {
            id: 1,
            name: 'John Doe'
          },
          loan_date: '2025-01-01',
          status: 'active' as const
        }
      };

      const { getByText, queryByText } = render(
        <BookListItem book={bookWithLoan} onFilterSelect={mockOnFilterSelect} />
      );

      // Le badge devrait s'afficher sans la date de retour
      expect(getByText('📖 Prêté à John Doe')).toBeTruthy();
      expect(queryByText(/Retour :/)).toBeNull();
    });
  });
});