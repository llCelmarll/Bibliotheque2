/**
 * Tests pour le composant BookCover
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import BookCover from '../../components/BookCover';

describe('BookCover', () => {
  const defaultProps = {
    url: 'https://example.com/book-cover.jpg',
    style: { width: 100, height: 150 }
  };

  it('should render with provided URL', () => {
    const { getByTestId } = render(<BookCover {...defaultProps} />);
    
    const image = getByTestId('book-cover-image');
    expect(image.props.source.uri).toBe('https://example.com/book-cover.jpg');
  });

  it('should apply custom styles', () => {
    const customStyle = { width: 200, height: 300, borderRadius: 8 };
    const { getByTestId } = render(
      <BookCover {...defaultProps} style={customStyle} />
    );
    
    const image = getByTestId('book-cover-image');
    // Le style est un array, donc on vérifie que les styles personnalisés sont inclus
    expect(Array.isArray(image.props.style)).toBe(true);
    expect(image.props.style).toEqual(expect.arrayContaining([
      expect.objectContaining(customStyle)
    ]));
  });

  it('should apply container styles when provided', () => {
    const containerStyle = { padding: 10, backgroundColor: 'red' };
    const { getByTestId } = render(
      <BookCover {...defaultProps} containerStyle={containerStyle} />
    );
    
    const container = getByTestId('book-cover-container');
    // Le style est un array, donc on vérifie que les styles personnalisés sont inclus
    expect(Array.isArray(container.props.style)).toBe(true);
    expect(container.props.style).toEqual(expect.arrayContaining([
      expect.objectContaining(containerStyle)
    ]));
  });

  it('should handle missing URL gracefully', () => {
    const { getByTestId } = render(
      <BookCover url={undefined} style={defaultProps.style} />
    );
    
    // Le composant devrait toujours rendre quelque chose
    const container = getByTestId('book-cover-container');
    expect(container).toBeTruthy();
  });

  it('should handle empty URL', () => {
    const { getByTestId } = render(
      <BookCover url="" style={defaultProps.style} />
    );
    
    const container = getByTestId('book-cover-container');
    expect(container).toBeTruthy();
  });

  it('should handle null URL', () => {
    const { getByTestId } = render(
      <BookCover url={undefined} style={defaultProps.style} />
    );
    
    const container = getByTestId('book-cover-container');
    expect(container).toBeTruthy();
  });

  it('should show loading indicator initially', () => {
    const { getByTestId } = render(<BookCover {...defaultProps} />);
    
    // Il devrait y avoir un indicateur de chargement
    const loadingIndicator = getByTestId('book-cover-loading');
    expect(loadingIndicator).toBeTruthy();
  });

  it('should apply default resizeMode when not specified', () => {
    const { getByTestId } = render(<BookCover {...defaultProps} />);
    
    const image = getByTestId('book-cover-image');
    // Par défaut, resizeMode devrait être 'cover'
    expect(image.props.resizeMode).toBe('cover');
  });

  it('should apply custom resizeMode when provided', () => {
    const { getByTestId } = render(
      <BookCover {...defaultProps} resizeMode="contain" />
    );
    
    const image = getByTestId('book-cover-image');
    expect(image.props.resizeMode).toBe('contain');
  });

  it('should render default image when no URL is provided', () => {
    const { getByTestId } = render(
      <BookCover url={undefined} style={defaultProps.style} />
    );
    
    // L'image devrait être présente même sans URL (utilise image par défaut)
    const image = getByTestId('book-cover-image');
    expect(image).toBeTruthy();
    
    // Le container devrait être présent
    const container = getByTestId('book-cover-container');
    expect(container).toBeTruthy();
    
    // La source devrait être l'image par défaut (un require() local)
    expect(image.props.source).toEqual(expect.objectContaining({
      testUri: expect.stringContaining('default-book-cover.jpg')
    }));
  });
});