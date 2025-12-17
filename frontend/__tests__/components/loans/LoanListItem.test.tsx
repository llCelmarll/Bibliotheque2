/**
 * Tests pour le composant LoanListItem
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { Loan, LoanStatus } from '../../../types/loan';

// Mock axios
const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  interceptors: {
    request: { use: jest.fn(), eject: jest.fn() },
    response: { use: jest.fn(), eject: jest.fn() }
  }
};

jest.mock('axios', () => {
  return {
    __esModule: true,
    default: {
      create: jest.fn(() => mockAxiosInstance)
    }
  };
});

// Mock setupAuthInterceptor
jest.mock('../../../services/api/authInterceptor', () => ({
  setupAuthInterceptor: jest.fn()
}));

// Mock expo-router
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

import { LoanListItem } from '../../../components/loans/LoanListItem';
import { Alert } from 'react-native';

// Mock Platform
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  select: jest.fn((obj) => obj.ios),
}));

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('LoanListItem', () => {
  const mockLoan: Loan = {
    id: 1,
    book_id: 1,
    borrower_id: 1,
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
    borrower: {
      id: 1,
      name: 'Test Borrower',
      email: 'test@example.com',
      phone: null,
      notes: null,
      created_at: '2025-01-01',
      active_loans_count: 1,
    },
  };

  const mockOnReturn = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loan information correctly', () => {
    const { getByText } = render(
      <LoanListItem loan={mockLoan} onReturn={mockOnReturn} />
    );

    expect(getByText('Test Book')).toBeTruthy();
    expect(getByText('Test Borrower')).toBeTruthy();
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

  it('should navigate to loan details when pressed', () => {
    const { getByTestId } = render(
      <LoanListItem loan={mockLoan} onReturn={mockOnReturn} />
    );

    const loanItem = getByTestId(`loan-item-${mockLoan.id}`);
    fireEvent.press(loanItem);

    expect(mockPush).toHaveBeenCalledWith(`/(tabs)/loans/${mockLoan.id}`);
  });

  it('should show alert when return button is pressed on mobile', () => {
    const { getByText } = render(
      <LoanListItem loan={mockLoan} onReturn={mockOnReturn} />
    );

    const returnButton = getByText('Retourner');
    fireEvent.press(returnButton);

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
