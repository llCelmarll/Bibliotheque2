/**
 * Tests pour le composant StarRating
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StarRating } from '../../components/StarRating';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  const createMockIcon = (name: string) => ({ name: iconName, size, color, ...props }: any) =>
    React.createElement(Text, {
      ...props,
      testID: `icon-${iconName}`,
      style: { fontSize: size, color }
    }, iconName || name);

  return {
    MaterialIcons: ({ name, ...props }: any) =>
      React.createElement(Text, { ...props, testID: `star-${name}` }, name),
  };
});

describe('StarRating', () => {
  it('renders correct number of filled stars based on value', () => {
    const { getAllByTestId } = render(
      <StarRating value={3} editable={false} />
    );

    const stars = getAllByTestId(/^star-/);
    expect(stars.length).toBe(5);
  });

  it('renders empty stars when value is 0', () => {
    const { getAllByTestId } = render(
      <StarRating value={0} editable={false} />
    );

    const stars = getAllByTestId(/^star-/);
    expect(stars.length).toBe(5);
  });

  it('renders empty stars when value is null', () => {
    const { getAllByTestId } = render(
      <StarRating value={null} editable={false} />
    );

    const stars = getAllByTestId(/^star-/);
    expect(stars.length).toBe(5);
  });

  it('calls onChange with correct value when star is pressed in edit mode', () => {
    const onChange = jest.fn();
    const { getAllByTestId } = render(
      <StarRating value={0} editable={true} onChange={onChange} />
    );

    const stars = getAllByTestId(/^star-/);
    fireEvent.press(stars[2]); // 3rd star = value 3

    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('calls onChange with 1 when first star is pressed', () => {
    const onChange = jest.fn();
    const { getAllByTestId } = render(
      <StarRating value={0} editable={true} onChange={onChange} />
    );

    const stars = getAllByTestId(/^star-/);
    fireEvent.press(stars[0]);

    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('calls onChange with 5 when last star is pressed', () => {
    const onChange = jest.fn();
    const { getAllByTestId } = render(
      <StarRating value={0} editable={true} onChange={onChange} />
    );

    const stars = getAllByTestId(/^star-/);
    fireEvent.press(stars[4]);

    expect(onChange).toHaveBeenCalledWith(5);
  });

  it('does not call onChange when editable is false', () => {
    const onChange = jest.fn();
    const { getAllByTestId } = render(
      <StarRating value={2} editable={false} onChange={onChange} />
    );

    const stars = getAllByTestId(/^star-/);
    fireEvent.press(stars[3]);

    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not call onChange when onChange callback is not provided', () => {
    const { getAllByTestId } = render(
      <StarRating value={0} editable={true} />
    );

    const stars = getAllByTestId(/^star-/);
    expect(() => fireEvent.press(stars[0])).not.toThrow();
  });
});
