import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Linking, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { buildAmazonUrl } from '@/utils/amazonLink';

interface AmazonButtonProps {
  isbn?: string | null;
  title?: string;
  authors?: string[];
}

const AMAZON_DARK = '#232F3E';
const AMAZON_ORANGE = '#FF9900';

export function AmazonButton({ isbn, title, authors }: AmazonButtonProps) {
  const url = buildAmazonUrl(isbn, title, authors);
  if (!url) return null;

  return (
    <TouchableOpacity style={styles.button} onPress={() => Linking.openURL(url)}>
      <MaterialIcons name="shopping-cart" size={20} color={AMAZON_ORANGE} />
      <View>
        <Text style={styles.label}>Acheter sur</Text>
        <Text style={styles.brand}>amazon.fr</Text>
      </View>
      <MaterialIcons name="open-in-new" size={16} color={AMAZON_ORANGE} style={styles.externalIcon} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: AMAZON_DARK,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginTop: 12,
  },
  label: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
    lineHeight: 15,
  },
  brand: {
    fontSize: 16,
    fontWeight: '700',
    color: AMAZON_ORANGE,
    lineHeight: 19,
  },
  externalIcon: {
    marginLeft: 'auto',
  },
});
