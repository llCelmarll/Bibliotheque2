import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const STAR_SIZE = 24;
const MAX_STARS = 5;

export interface StarRatingProps {
  /** Valeur de la notation (0-5, 0 = non renseigné) */
  value: number | null | undefined;
  /** Mode édition : clics pour modifier la note */
  editable?: boolean;
  /** Callback appelé quand l'utilisateur sélectionne une étoile (mode édition) */
  onChange?: (value: number) => void;
  /** Taille des étoiles en px */
  size?: number;
}

export function StarRating({ value, editable = false, onChange, size = STAR_SIZE }: StarRatingProps) {
  const rating = value != null ? Math.min(MAX_STARS, Math.max(0, Math.round(value))) : 0;

  const handlePress = (starIndex: number) => {
    if (editable && onChange) {
      const newValue = starIndex + 1;
      onChange(newValue);
    }
  };

  return (
    <View style={styles.container}>
      {Array.from({ length: MAX_STARS }, (_, index) => {
        const isFilled = index < rating;
        const starValue = index + 1;
        return (
          <TouchableOpacity
            key={index}
            onPress={() => handlePress(index)}
            disabled={!editable}
            style={[styles.starButton, !editable && styles.starButtonDisabled]}
            accessibilityRole={editable ? 'button' : undefined}
            accessibilityLabel={`${starValue} sur ${MAX_STARS}${editable ? ', appuyer pour modifier' : ''}`}
          >
            <MaterialIcons
              name={isFilled ? 'star' : 'star-border'}
              size={size}
              color={isFilled ? '#f1c40f' : '#bdc3c7'}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  starButton: {
    padding: 4,
  },
  starButtonDisabled: {
    // Désactiver le feedback visuel en mode lecture
  },
});
