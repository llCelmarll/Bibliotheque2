/**
 * Tests pour le composant LoanListItem
 */
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Platform, Alert } from 'react-native';
import { Loan, LoanStatus } from '../../../types/loan';
import { LoanListItem } from '../../../components/loans/LoanListItem';

// Mock expo-secure-store before importing services
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

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

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

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

describe('LoanListItem', () => {
  const mockLoan: Loan = {
    id: 1,
    book_id: 1,
    contact_id: 1,
    loan_date: '2025-01-01',
    due_date: '2025-01-15',
    return_date: null,
    status: LoanStatus.ACTIVE,
    notes: null,
    book: {
      id: 1,
      title: 'Test Book',
      authors: [{ id: 1, name: 'Test Author' }],
      cover_url: null,
    },
    contact: {
      id: 1,
      name: 'Test Contact',
      email: 'test@example.com',
      phone: null,
      notes: null,
      created_at: '2025-01-01',
      active_loans_count: 1,
    },
  };

  const mockOnReturn = jest.fn();

  beforeEach(() => {
    // Nettoyer tous les mocks avant chaque test
    mockPush.mockClear();
    mockReplace.mockClear();
    mockBack.mockClear();
    mockOnReturn.mockClear();
    Platform.OS = 'ios';
  });

  it('should render loan information correctly', () => {
    const { getByText } = render(
      <LoanListItem loan={mockLoan} onReturn={mockOnReturn} />
    );

    expect(getByText('Test Book')).toBeTruthy();
    expect(getByText('Test Contact')).toBeTruthy();
    expect(getByText('Prêté le 01/01/2025')).toBeTruthy();
    expect(getByText('Retour prévu : 15/01/2025')).toBeTruthy();
  });

  it('should show "En cours" status for active loans', () => {
    const { getByText } = render(
      <LoanListItem loan={mockLoan} onReturn={mockOnReturn} />
    );

    expect(getByText('En cours')).toBeTruthy();
  });

  it('should show "En retard" status for overdue loans', () => {
    const overdueLoan = {
      ...mockLoan,
      status: LoanStatus.OVERDUE,
      due_date: null, // Without due_date, it shows just "En retard"
    };

    const { getByText } = render(
      <LoanListItem loan={overdueLoan} onReturn={mockOnReturn} />
    );

    expect(getByText('En retard')).toBeTruthy();
  });

  it('should show "Retourné" status for returned loans', () => {
    const returnedLoan = {
      ...mockLoan,
      status: LoanStatus.RETURNED,
      return_date: '2025-01-10',
    };

    const { getByText } = render(
      <LoanListItem loan={returnedLoan} onReturn={mockOnReturn} />
    );

    expect(getByText('Retourné')).toBeTruthy();
  });

  it('should show return button for active loans', () => {
    const { getByText } = render(
      <LoanListItem loan={mockLoan} onReturn={mockOnReturn} />
    );

    expect(getByText('Retourner')).toBeTruthy();
  });

  it('should show return button for overdue loans', () => {
    const overdueLoan = {
      ...mockLoan,
      status: LoanStatus.OVERDUE,
    };

    const { getByText } = render(
      <LoanListItem loan={overdueLoan} onReturn={mockOnReturn} />
    );

    expect(getByText('Retourner')).toBeTruthy();
  });

  it('should not show return button for returned loans', () => {
    const returnedLoan = {
      ...mockLoan,
      status: LoanStatus.RETURNED,
      return_date: '2025-01-10',
    };

    const { queryByText } = render(
      <LoanListItem loan={returnedLoan} onReturn={mockOnReturn} />
    );

    expect(queryByText('Retourner')).toBeNull();
  });

  it('should navigate to loan details when pressed', async () => {
    const { getByTestId } = render(
      <LoanListItem loan={mockLoan} onReturn={mockOnReturn} />
    );

    const loanItem = getByTestId(`loan-item-${mockLoan.id}`);

    await act(async () => {
      fireEvent.press(loanItem);
    });

    expect(mockPush).toHaveBeenCalledWith(`/(tabs)/loans/${mockLoan.id}`);
  });

  it('should show alert when return button is pressed on mobile', async () => {
    const { getByText } = render(
      <LoanListItem loan={mockLoan} onReturn={mockOnReturn} />
    );

    const returnButton = getByText('Retourner');

    await act(async () => {
      fireEvent.press(returnButton);
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Retour du livre',
      expect.stringContaining('Test Book'),
      expect.any(Array)
    );
  });

  it('should display overdue indicator correctly', () => {
    const overdueLoan = {
      ...mockLoan,
      status: LoanStatus.OVERDUE,
      due_date: '2024-12-01',
    };

    const { getByText } = render(
      <LoanListItem loan={overdueLoan} onReturn={mockOnReturn} />
    );

    // Should display "Xj de retard" pattern for overdue loans with a past due date
    expect(getByText(/\dj de retard/i)).toBeTruthy();
  });

  it('should handle loan without due date', () => {
    const loanWithoutDueDate = {
      ...mockLoan,
      due_date: null,
    };

    const { queryByText, getByText } = render(
      <LoanListItem loan={loanWithoutDueDate} onReturn={mockOnReturn} />
    );

    expect(getByText('Test Book')).toBeTruthy();
    expect(queryByText(/Retour prévu/)).toBeNull();
  });

  it('should display days overdue for overdue loans', () => {
    const today = new Date();
    const pastDate = new Date();
    pastDate.setDate(today.getDate() - 5);

    const overdueLoan = {
      ...mockLoan,
      status: LoanStatus.OVERDUE,
      due_date: pastDate.toISOString().split('T')[0],
    };

    const { getByText } = render(
      <LoanListItem loan={overdueLoan} onReturn={mockOnReturn} />
    );

    // Check for "Xj de retard" pattern (5 or 6 days depending on calculation)
    expect(getByText(/\dj de retard/)).toBeTruthy();
  });
});
