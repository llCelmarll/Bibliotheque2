import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SharedBookView } from '@/components/BookDetail/SharedBookView';

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    MaterialIcons: ({ name, testID, ...props }: any) =>
      React.createElement(Text, { testID: testID || `icon-${name}` }, name),
  };
});

// Mock BookCover pour éviter les dépendances image
jest.mock('@/components/BookCover', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ testID }: any) => React.createElement(View, { testID: testID || 'book-cover' }),
  };
});

// Livre minimal pour les tests
const mockBook = {
  id: 1,
  title: 'Le Seigneur des Anneaux',
  isbn: '9780618640157',
  cover_url: null,
  authors: [{ id: 1, name: 'J.R.R. Tolkien' }],
  genres: [{ id: 1, name: 'Fantasy' }],
  publisher: { id: 1, name: 'Houghton Mifflin' },
  published_date: '1954',
  page_count: 1178,
  is_lendable: true,
  current_loan: null,
  is_read: null,
  rating: null,
  notes: null,
  barcode: null,
  created_at: '2026-01-01T00:00:00',
  updated_at: null,
  series: [],
  borrowed_book: null,
} as any;

const mockBookMinimal = {
  id: 2,
  title: 'Minimal Book',
  isbn: null,
  cover_url: null,
  authors: [],
  genres: [],
  publisher: null,
  published_date: null,
  page_count: null,
  is_lendable: true,
  current_loan: null,
  is_read: null,
  rating: null,
  notes: null,
  barcode: null,
  created_at: '2026-01-01T00:00:00',
  updated_at: null,
  series: [],
  borrowed_book: null,
} as any;

describe('SharedBookView', () => {
  const onRequestPressMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Affichage de base
  // -------------------------------------------------------------------------
  describe('Affichage du livre', () => {
    it('affiche le titre du livre', () => {
      const { getByText } = render(
        <SharedBookView
          book={mockBook}
          onRequestPress={onRequestPressMock}
          isUnavailable={false}
        />
      );
      expect(getByText('Le Seigneur des Anneaux')).toBeTruthy();
    });

    it("affiche l'auteur du livre", () => {
      const { getByText } = render(
        <SharedBookView
          book={mockBook}
          onRequestPress={onRequestPressMock}
          isUnavailable={false}
        />
      );
      expect(getByText('J.R.R. Tolkien')).toBeTruthy();
    });

    it("affiche l'ISBN quand il est présent", () => {
      const { getByText } = render(
        <SharedBookView
          book={mockBook}
          onRequestPress={onRequestPressMock}
          isUnavailable={false}
        />
      );
      expect(getByText('ISBN : 9780618640157')).toBeTruthy();
    });

    it("n'affiche pas l'ISBN quand il est absent", () => {
      const { queryByText } = render(
        <SharedBookView
          book={mockBookMinimal}
          onRequestPress={onRequestPressMock}
          isUnavailable={false}
        />
      );
      expect(queryByText(/ISBN/)).toBeNull();
    });

    it("affiche l'éditeur quand présent", () => {
      const { getByText } = render(
        <SharedBookView
          book={mockBook}
          onRequestPress={onRequestPressMock}
          isUnavailable={false}
        />
      );
      expect(getByText('Houghton Mifflin')).toBeTruthy();
    });

    it("n'affiche pas l'éditeur quand absent", () => {
      const { queryByText } = render(
        <SharedBookView
          book={mockBookMinimal}
          onRequestPress={onRequestPressMock}
          isUnavailable={false}
        />
      );
      expect(queryByText('Éditeur')).toBeNull();
    });

    it('affiche le nombre de pages quand présent', () => {
      const { getByText } = render(
        <SharedBookView
          book={mockBook}
          onRequestPress={onRequestPressMock}
          isUnavailable={false}
        />
      );
      expect(getByText('1178')).toBeTruthy();
    });

    it('affiche les genres quand présents', () => {
      const { getByText } = render(
        <SharedBookView
          book={mockBook}
          onRequestPress={onRequestPressMock}
          isUnavailable={false}
        />
      );
      expect(getByText('Fantasy')).toBeTruthy();
    });

    it("n'affiche pas les genres quand vide", () => {
      const { queryByText } = render(
        <SharedBookView
          book={mockBookMinimal}
          onRequestPress={onRequestPressMock}
          isUnavailable={false}
        />
      );
      expect(queryByText('Genres')).toBeNull();
    });

    it('affiche plusieurs auteurs séparés par une virgule', () => {
      const bookMultipleAuthors = {
        ...mockBook,
        authors: [
          { id: 1, name: 'Auteur A' },
          { id: 2, name: 'Auteur B' },
        ],
      };
      const { getByText } = render(
        <SharedBookView
          book={bookMultipleAuthors}
          onRequestPress={onRequestPressMock}
          isUnavailable={false}
        />
      );
      expect(getByText('Auteur A, Auteur B')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // État disponible (bouton "Demander ce livre")
  // -------------------------------------------------------------------------
  describe('Livre disponible', () => {
    it('affiche le bouton "Demander ce livre" quand disponible', () => {
      const { getByText } = render(
        <SharedBookView
          book={mockBook}
          onRequestPress={onRequestPressMock}
          isUnavailable={false}
        />
      );
      expect(getByText('Demander ce livre')).toBeTruthy();
    });

    it('appelle onRequestPress au clic sur le bouton', () => {
      const { getByText } = render(
        <SharedBookView
          book={mockBook}
          onRequestPress={onRequestPressMock}
          isUnavailable={false}
        />
      );
      fireEvent.press(getByText('Demander ce livre'));
      expect(onRequestPressMock).toHaveBeenCalledTimes(1);
    });

    it("n'affiche pas le message d'indisponibilité quand disponible", () => {
      const { queryByText } = render(
        <SharedBookView
          book={mockBook}
          onRequestPress={onRequestPressMock}
          isUnavailable={false}
        />
      );
      expect(queryByText(/actuellement prêté/i)).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // État indisponible (isUnavailable=true)
  // -------------------------------------------------------------------------
  describe('Livre indisponible (isUnavailable=true)', () => {
    it('affiche le badge "Actuellement prêté" dans le header', () => {
      const { getAllByText } = render(
        <SharedBookView
          book={mockBook}
          onRequestPress={onRequestPressMock}
          isUnavailable={true}
        />
      );
      // Le badge et le message utilisent "prêté"
      const matches = getAllByText(/prêté/i);
      expect(matches.length).toBeGreaterThan(0);
    });

    it('affiche le message d\'indisponibilité sous le détail', () => {
      const { getByText } = render(
        <SharedBookView
          book={mockBook}
          onRequestPress={onRequestPressMock}
          isUnavailable={true}
        />
      );
      expect(getByText(/Ce livre est actuellement prêté/i)).toBeTruthy();
    });

    it("n'affiche PAS le bouton \"Demander ce livre\" quand indisponible", () => {
      const { queryByText } = render(
        <SharedBookView
          book={mockBook}
          onRequestPress={onRequestPressMock}
          isUnavailable={true}
        />
      );
      expect(queryByText('Demander ce livre')).toBeNull();
    });

    it("n'appelle pas onRequestPress quand isUnavailable=true", () => {
      const { queryByText } = render(
        <SharedBookView
          book={mockBook}
          onRequestPress={onRequestPressMock}
          isUnavailable={true}
        />
      );
      // Pas de bouton donc pas de clic possible
      expect(queryByText('Demander ce livre')).toBeNull();
      expect(onRequestPressMock).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // État déjà emprunté (isAlreadyBorrowed=true)
  // -------------------------------------------------------------------------
  describe('Déjà emprunté par moi (isAlreadyBorrowed=true)', () => {
    it('affiche le message "Vous empruntez actuellement ce livre"', () => {
      const { getByText } = render(
        <SharedBookView
          book={mockBook}
          onRequestPress={onRequestPressMock}
          isUnavailable={false}
          isAlreadyBorrowed={true}
        />
      );
      expect(getByText('Vous empruntez actuellement ce livre')).toBeTruthy();
    });

    it("n'affiche PAS le bouton quand isAlreadyBorrowed=true", () => {
      const { queryByText } = render(
        <SharedBookView
          book={mockBook}
          onRequestPress={onRequestPressMock}
          isUnavailable={false}
          isAlreadyBorrowed={true}
        />
      );
      expect(queryByText('Demander ce livre')).toBeNull();
    });

    it("isAlreadyBorrowed a priorité sur isUnavailable", () => {
      // Les deux à true → message "Vous empruntez" (pas "actuellement prêté")
      const { getByText, queryByText } = render(
        <SharedBookView
          book={mockBook}
          onRequestPress={onRequestPressMock}
          isUnavailable={true}
          isAlreadyBorrowed={true}
        />
      );
      expect(getByText('Vous empruntez actuellement ce livre')).toBeTruthy();
      expect(queryByText(/Ce livre est actuellement prêté et ne peut pas être demandé/)).toBeNull();
      expect(queryByText('Demander ce livre')).toBeNull();
    });

    it("n'affiche PAS le message 'déjà emprunté' par défaut (isAlreadyBorrowed absent)", () => {
      const { queryByText } = render(
        <SharedBookView
          book={mockBook}
          onRequestPress={onRequestPressMock}
          isUnavailable={false}
        />
      );
      expect(queryByText('Vous empruntez actuellement ce livre')).toBeNull();
    });

    it("n'affiche PAS le message 'déjà emprunté' quand isAlreadyBorrowed=false", () => {
      const { queryByText } = render(
        <SharedBookView
          book={mockBook}
          onRequestPress={onRequestPressMock}
          isUnavailable={false}
          isAlreadyBorrowed={false}
        />
      );
      expect(queryByText('Vous empruntez actuellement ce livre')).toBeNull();
    });
  });
});
