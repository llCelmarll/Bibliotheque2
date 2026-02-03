import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { BookActions } from '@/components/BookDetail/BookActions';
import { loanService } from '@/services/loanService';
import { Platform } from 'react-native';

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
const mockBack = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: mockPush,
    back: mockBack,
    replace: mockReplace,
  })),
  useLocalSearchParams: jest.fn(() => ({})),
}));

// Mock des services
jest.mock('@/services/bookService', () => ({
  bookService: {
    deleteBook: jest.fn(),
  },
}));

jest.mock('@/services/loanService', () => ({
  loanService: {
    returnLoan: jest.fn(),
  },
}));

describe('BookActions', () => {
  const defaultProps = {
    bookId: '123',
    bookTitle: 'Test Book',
    onBookDeleted: jest.fn(),
  };

  beforeEach(() => {
    // Nettoyer tous les mocks avant chaque test
    mockPush.mockClear();
    mockBack.mockClear();
    mockReplace.mockClear();
    defaultProps.onBookDeleted.mockClear();
    Platform.OS = 'web';
    // Use fake timers to control setTimeout
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Clean up all pending timers
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Loan/Return button', () => {
    it('should display "Prêter" when no active loan', () => {
      const { getByText } = render(<BookActions {...defaultProps} />);
      expect(getByText('Prêter')).toBeTruthy();
    });

    it('should display "Retourner" when book is loaned', () => {
      const currentLoan = {
        id: 1,
        contact_id: 1,
        contact: {
          id: 1,
          name: 'John Doe',
        },
        loan_date: '2025-01-01',
        status: 'active' as const,
      };

      const { getByText } = render(
        <BookActions {...defaultProps} currentLoan={currentLoan} />
      );

      expect(getByText('Retourner')).toBeTruthy();
    });

    it('should navigate to loan creation when clicking "Prêter"', async () => {
      const { getByText } = render(<BookActions {...defaultProps} />);

      await act(async () => {
        fireEvent.press(getByText('Prêter'));
      });

      expect(mockPush).toHaveBeenCalledWith('/(tabs)/loans/create?bookId=123');
    });

    it('should show return confirmation when clicking "Retourner"', async () => {
      const currentLoan = {
        id: 1,
        contact_id: 1,
        contact: {
          id: 1,
          name: 'John Doe',
        },
        loan_date: '2025-01-01',
        status: 'active' as const,
      };

      global.confirm = jest.fn().mockReturnValue(false);

      const { getByText } = render(
        <BookActions {...defaultProps} currentLoan={currentLoan} />
      );

      await act(async () => {
        fireEvent.press(getByText('Retourner'));
      });

      expect(global.confirm).toHaveBeenCalledWith(
        'Retourner le livre prêté à John Doe ?'
      );
    });

    it('should call returnLoan service when confirming return', async () => {
      const currentLoan = {
        id: 1,
        contact_id: 1,
        contact: {
          id: 1,
          name: 'John Doe',
        },
        loan_date: '2025-01-01',
        status: 'active' as const,
      };

      global.confirm = jest.fn().mockReturnValue(true);
      global.alert = jest.fn();
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { reload: jest.fn() },
      });

      (loanService.returnLoan as jest.Mock).mockResolvedValue(undefined);

      const { getByText } = render(
        <BookActions {...defaultProps} currentLoan={currentLoan} />
      );

      await act(async () => {
        fireEvent.press(getByText('Retourner'));
      });

      await waitFor(() => {
        expect(loanService.returnLoan).toHaveBeenCalledWith(1);
      });

      // Run all pending timers to execute setTimeout callbacks
      act(() => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith(
          'Le livre a été retourné avec succès.'
        );
      });
    });

    it('should show loading state when returning book', async () => {
      const currentLoan = {
        id: 1,
        contact_id: 1,
        contact: {
          id: 1,
          name: 'John Doe',
        },
        loan_date: '2025-01-01',
        status: 'active' as const,
      };

      global.confirm = jest.fn().mockReturnValue(true);
      global.alert = jest.fn();

      // Mock loanService pour retarder la réponse
      (loanService.returnLoan as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      const { getByText } = render(
        <BookActions {...defaultProps} currentLoan={currentLoan} />
      );

      await act(async () => {
        fireEvent.press(getByText('Retourner'));
      });

      // Vérifier que le texte change pendant le chargement
      await waitFor(() => {
        expect(getByText('Retour...')).toBeTruthy();
      });
    });

    it('should handle return error gracefully', async () => {
      const currentLoan = {
        id: 1,
        contact_id: 1,
        contact: {
          id: 1,
          name: 'John Doe',
        },
        loan_date: '2025-01-01',
        status: 'active' as const,
      };

      global.confirm = jest.fn().mockReturnValue(true);
      global.alert = jest.fn();

      (loanService.returnLoan as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const { getByText } = render(
        <BookActions {...defaultProps} currentLoan={currentLoan} />
      );

      await act(async () => {
        fireEvent.press(getByText('Retourner'));
      });

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith(
          'Une erreur est survenue lors du retour du livre.'
        );
      });
    });
  });

  describe('Edit button', () => {
    it('should navigate to edit screen when clicking "Modifier"', async () => {
      const { getByText } = render(<BookActions {...defaultProps} />);

      await act(async () => {
        fireEvent.press(getByText('Modifier'));
      });

      expect(mockPush).toHaveBeenCalledWith('/(tabs)/books/123/edit');
    });
  });

  describe('Buttons visibility', () => {
    it('should display all action buttons', () => {
      const { getByText } = render(<BookActions {...defaultProps} />);

      // Vérifier que tous les boutons sont présents
      expect(getByText('Prêter')).toBeTruthy();
      expect(getByText('Modifier')).toBeTruthy();
      expect(getByText('Supprimer')).toBeTruthy();
    });
  });
});
