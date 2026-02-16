/**
 * Tests pour le composant SearchBar
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SearchBar } from '../../components/SearchBar';

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

  const searchPlaceholder = 'Rechercher (titre, auteur, notes…)';

  it('should render with placeholder text', () => {
    const { getByPlaceholderText } = render(<SearchBar {...defaultProps} />);
    
    expect(getByPlaceholderText(searchPlaceholder)).toBeTruthy();
  });

  it('should display search query value', () => {
    const props = { ...defaultProps, searchQuery: 'Test value' };
    const { getByDisplayValue } = render(<SearchBar {...props} />);
    
    expect(getByDisplayValue('Test value')).toBeTruthy();
  });

  it('should call setSearchQuery when text changes', () => {
    const { getByPlaceholderText } = render(<SearchBar {...defaultProps} />);
    
    const input = getByPlaceholderText(searchPlaceholder);
    fireEvent.changeText(input, 'nouveau texte');
    
    expect(mockSetSearchQuery).toHaveBeenCalledWith('nouveau texte');
  });

  it('should call handleSearch when search button is pressed', () => {
    const { getAllByTestId } = render(<SearchBar {...defaultProps} />);
    
    // Plusieurs icônes (tune, search, sort, grid-view) : le bouton search est celui avec icon-search
    const searchButton = getAllByTestId('icon-search')[0];
    fireEvent.press(searchButton);
    
    expect(mockHandleSearch).toHaveBeenCalled();
  });

  it('should call handleSearch when submit editing', () => {
    const { getByPlaceholderText } = render(<SearchBar {...defaultProps} />);
    
    const input = getByPlaceholderText(searchPlaceholder);
    fireEvent(input, 'submitEditing');
    
    expect(mockHandleSearch).toHaveBeenCalled();
  });

  it('should call toggleView when view button is pressed', () => {
    const { getAllByTestId } = render(<SearchBar {...defaultProps} />);
    
    // Bouton de vue : grid-view (liste) ou view-list (grille)
    const viewButtons = getAllByTestId(/icon-/);
    const viewButton = viewButtons.find(button => 
      button.props.testID === 'icon-view-list' || button.props.testID === 'icon-grid-view'
    );
    
    expect(viewButton).toBeTruthy();
    fireEvent.press(viewButton!);
    expect(mockToggleView).toHaveBeenCalled();
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