/**
 * Tests pour le composant ClickableTag
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ClickableTag } from '../../components/ClickableTag';
import { BookFilter, FilterType } from '../../types/filter';

describe('ClickableTag', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultFilter: BookFilter = {
    type: 'genre',
    id: 1,
    name: 'Fiction'
  };

  const defaultProps = {
    filter: defaultFilter,
    onPress: mockOnPress
  };

  it('should render tag text correctly', () => {
    const { getByText } = render(<ClickableTag {...defaultProps} />);
    
    expect(getByText('Fiction')).toBeTruthy();
  });

  it('should call onPress when tag is pressed', () => {
    const { getByText } = render(<ClickableTag {...defaultProps} />);
    
    const tagElement = getByText('Fiction');
    fireEvent.press(tagElement);
    
    expect(mockOnPress).toHaveBeenCalledWith(defaultFilter);
  });

  it('should render author tag with person icon', () => {
    const authorFilter: BookFilter = {
      type: 'author',
      id: 2,
      name: 'Stephen King'
    };

    const { getByTestId, getByText } = render(
      <ClickableTag filter={authorFilter} onPress={mockOnPress} />
    );
    
    expect(getByText('Stephen King')).toBeTruthy();
    expect(getByTestId('icon-person-outline')).toBeTruthy();
  });

  it('should render genre tag with bookmark icon', () => {
    const { getByTestId, getByText } = render(<ClickableTag {...defaultProps} />);
    
    expect(getByText('Fiction')).toBeTruthy();
    expect(getByTestId('icon-bookmark-outline')).toBeTruthy();
  });

  it('should render publisher tag with book icon', () => {
    const publisherFilter: BookFilter = {
      type: 'publisher',
      id: 3,
      name: 'Penguin Books'
    };

    const { getByTestId, getByText } = render(
      <ClickableTag filter={publisherFilter} onPress={mockOnPress} />
    );
    
    expect(getByText('Penguin Books')).toBeTruthy();
    expect(getByTestId('icon-book-outline')).toBeTruthy();
  });

  it('should handle long text', () => {
    const longTextFilter: BookFilter = {
      type: 'genre',
      id: 4,
      name: 'This is a very long tag name that might need truncation or special handling'
    };

    const { getByText } = render(
      <ClickableTag filter={longTextFilter} onPress={mockOnPress} />
    );
    
    expect(getByText('This is a very long tag name that might need truncation or special handling')).toBeTruthy();
  });

  it('should handle missing name gracefully', () => {
    const emptyNameFilter: BookFilter = {
      type: 'genre',
      id: 5
      // name is optional
    };

    const { getByTestId } = render(
      <ClickableTag filter={emptyNameFilter} onPress={mockOnPress} />
    );
    
    // Le composant devrait toujours être rendu même sans nom
    const touchableElement = getByTestId('clickable-tag');
    expect(touchableElement).toBeTruthy();
  });

  it('should create correct filter object for each type', () => {
    const testCases = [
      {
        filter: { type: 'author' as FilterType, id: 10, name: 'J.K. Rowling' },
        expectedFilter: { type: 'author', id: 10, name: 'J.K. Rowling' }
      },
      {
        filter: { type: 'genre' as FilterType, id: 11, name: 'Science Fiction' },
        expectedFilter: { type: 'genre', id: 11, name: 'Science Fiction' }
      },
      {
        filter: { type: 'publisher' as FilterType, id: 12, name: 'Oxford University Press' },
        expectedFilter: { type: 'publisher', id: 12, name: 'Oxford University Press' }
      }
    ];

    testCases.forEach(({ filter, expectedFilter }) => {
      const { getByText } = render(
        <ClickableTag filter={filter} onPress={mockOnPress} />
      );

      fireEvent.press(getByText(filter.name!));
      expect(mockOnPress).toHaveBeenCalledWith(expectedFilter);
      
      // Clear mock for next iteration
      mockOnPress.mockClear();
    });
  });

  it('should be accessible', () => {
    const { getByTestId } = render(<ClickableTag {...defaultProps} />);
    
    // TouchableOpacity should be accessible
    const button = getByTestId('clickable-tag');
    expect(button).toBeTruthy();
    expect(button.props.accessible).toBe(true);
  });
});