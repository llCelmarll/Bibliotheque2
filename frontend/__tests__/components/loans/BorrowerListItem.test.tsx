/**
 * Tests pour le composant BorrowerListItem
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BorrowerListItem } from '../../../components/loans/BorrowerListItem';
import { Borrower } from '../../../types/borrower';

describe('BorrowerListItem', () => {
  const mockBorrower: Borrower = {
    id: 1,
    name: 'Jean Dupont',
    email: 'jean@example.com',
    phone: '0123456789',
    notes: 'Ami de confiance',
    created_at: '2025-01-01',
    active_loans_count: 2,
  };

  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render borrower name correctly', () => {
    const { getByText } = render(
      <BorrowerListItem borrower={mockBorrower} onPress={mockOnPress} />
    );

    expect(getByText('Jean Dupont')).toBeTruthy();
  });

  it('should display email when showContact is true', () => {
    const { getByText } = render(
      <BorrowerListItem
        borrower={mockBorrower}
        onPress={mockOnPress}
        showContact={true}
      />
    );

    expect(getByText('jean@example.com')).toBeTruthy();
  });

  it('should display phone when showContact is true', () => {
    const { getByText } = render(
      <BorrowerListItem
        borrower={mockBorrower}
        onPress={mockOnPress}
        showContact={true}
      />
    );

    expect(getByText('0123456789')).toBeTruthy();
  });

  it('should not display contact info when showContact is false', () => {
    const { queryByText } = render(
      <BorrowerListItem
        borrower={mockBorrower}
        onPress={mockOnPress}
        showContact={false}
      />
    );

    expect(queryByText('jean@example.com')).toBeNull();
    expect(queryByText('0123456789')).toBeNull();
  });

  it('should display active loans count when showStats is true', () => {
    const { getByText } = render(
      <BorrowerListItem
        borrower={mockBorrower}
        onPress={mockOnPress}
        showStats={true}
      />
    );

    expect(getByText('2 prêts en cours')).toBeTruthy();
  });

  it('should not display stats when showStats is false', () => {
    const { queryByText } = render(
      <BorrowerListItem
        borrower={mockBorrower}
        onPress={mockOnPress}
        showStats={false}
      />
    );

    expect(queryByText(/prêts en cours/)).toBeNull();
  });

  it('should call onPress when borrower is pressed', () => {
    const { getByTestId } = render(
      <BorrowerListItem borrower={mockBorrower} onPress={mockOnPress} />
    );

    const borrowerItem = getByTestId(`borrower-item-${mockBorrower.id}`);
    fireEvent.press(borrowerItem);

    expect(mockOnPress).toHaveBeenCalledWith(mockBorrower);
  });

  it('should handle borrower without email', () => {
    const borrowerWithoutEmail = {
      ...mockBorrower,
      email: null,
    };

    const { getByText, queryByText } = render(
      <BorrowerListItem
        borrower={borrowerWithoutEmail}
        onPress={mockOnPress}
        showContact={true}
      />
    );

    expect(getByText('Jean Dupont')).toBeTruthy();
    expect(queryByText('jean@example.com')).toBeNull();
  });

  it('should handle borrower without phone', () => {
    const borrowerWithoutPhone = {
      ...mockBorrower,
      phone: null,
    };

    const { getByText, queryByText } = render(
      <BorrowerListItem
        borrower={borrowerWithoutPhone}
        onPress={mockOnPress}
        showContact={true}
      />
    );

    expect(getByText('Jean Dupont')).toBeTruthy();
    expect(queryByText('0123456789')).toBeNull();
  });

  it('should handle borrower with zero active loans', () => {
    const borrowerWithNoLoans = {
      ...mockBorrower,
      active_loans_count: 0,
    };

    const { getByText } = render(
      <BorrowerListItem
        borrower={borrowerWithNoLoans}
        onPress={mockOnPress}
        showStats={true}
      />
    );

    expect(getByText('Aucun prêt en cours')).toBeTruthy();
  });

  it('should display correct singular/plural for active loans', () => {
    const borrowerWithOneLoan = {
      ...mockBorrower,
      active_loans_count: 1,
    };

    const { getByText } = render(
      <BorrowerListItem
        borrower={borrowerWithOneLoan}
        onPress={mockOnPress}
        showStats={true}
      />
    );

    expect(getByText('1 prêt en cours')).toBeTruthy();
  });

  it('should handle borrower without active_loans_count field', () => {
    const borrowerWithoutCount = {
      ...mockBorrower,
      active_loans_count: undefined,
    };

    const { getByText } = render(
      <BorrowerListItem
        borrower={borrowerWithoutCount}
        onPress={mockOnPress}
        showStats={true}
      />
    );

    expect(getByText('Jean Dupont')).toBeTruthy();
  });
});
