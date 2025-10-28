/**
 * Tests pour le composant BookListItem
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TouchableOpacity } from 'react-native';
import { BookListItem } from '../../components/BookListItem';
import { Book } from '../../types/book';

// Mock expo-router
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
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
    jest.clearAllMocks();
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
});