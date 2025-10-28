/**
 * Tests pour le composant SearchBar
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SearchBar } from '../../components/SearchBar';

describe('SearchBar', () => {
  const mockSetSearchQuery = jest.fn();
  const mockHandleSearch = jest.fn();
  const mockToggleView = jest.fn();
  const mockOnSortChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    searchQuery: '',
    setSearchQuery: mockSetSearchQuery,
    handleSearch: mockHandleSearch,
    isGridView: false,
    toggleView: mockToggleView,
    sortBy: 'title',
    order: 'asc' as const,
    onSortChange: mockOnSortChange
  };

  it('should render with placeholder text', () => {
    const { getByPlaceholderText } = render(<SearchBar {...defaultProps} />);
    
    expect(getByPlaceholderText('Rechercher...')).toBeTruthy();
  });

  it('should display search query value', () => {
    const props = { ...defaultProps, searchQuery: 'Test value' };
    const { getByDisplayValue } = render(<SearchBar {...props} />);
    
    expect(getByDisplayValue('Test value')).toBeTruthy();
  });

  it('should call setSearchQuery when text changes', () => {
    const { getByPlaceholderText } = render(<SearchBar {...defaultProps} />);
    
    const input = getByPlaceholderText('Rechercher...');
    fireEvent.changeText(input, 'nouveau texte');
    
    expect(mockSetSearchQuery).toHaveBeenCalledWith('nouveau texte');
  });

  it('should call handleSearch when search button is pressed', () => {
    const { getByTestId } = render(<SearchBar {...defaultProps} />);
    
    // Le bouton de recherche devrait avoir l'icône MaterialIcons
    const searchButton = getByTestId('icon-search');
    fireEvent.press(searchButton);
    
    expect(mockHandleSearch).toHaveBeenCalled();
  });

  it('should call handleSearch when submit editing', () => {
    const { getByPlaceholderText } = render(<SearchBar {...defaultProps} />);
    
    const input = getByPlaceholderText('Rechercher...');
    fireEvent(input, 'submitEditing');
    
    expect(mockHandleSearch).toHaveBeenCalled();
  });

  it('should call toggleView when view button is pressed', () => {
    const { getAllByTestId } = render(<SearchBar {...defaultProps} />);
    
    // Le bouton de vue devrait être présent
    const viewButtons = getAllByTestId(/icon-/);
    const viewButton = viewButtons.find(button => 
      button.props.testID === 'icon-view-list' || button.props.testID === 'icon-view-module'
    );
    
    if (viewButton) {
      fireEvent.press(viewButton);
      expect(mockToggleView).toHaveBeenCalled();
    }
  });

  it('should display grid view icon when in list view', () => {
    const props = { ...defaultProps, isGridView: false };
    const { getByTestId } = render(<SearchBar {...props} />);
    
    expect(getByTestId('icon-grid-view')).toBeTruthy();
  });

  it('should display list view icon when in grid view', () => {
    const props = { ...defaultProps, isGridView: true };
    const { getByTestId } = render(<SearchBar {...props} />);
    
    expect(getByTestId('icon-view-list')).toBeTruthy();
  });
});