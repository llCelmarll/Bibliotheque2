import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Alert, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { bookService } from '@/services/bookService';

export default function ExportCSV() {
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = async () => {
    setIsLoading(true);
    try {
      await bookService.exportBooks();
      if (Platform.OS !== 'web') {
        Alert.alert('Succès', 'Votre bibliothèque a été partagée.');
      }
    } catch (error) {
      console.error('Erreur export CSV:', error);
      Alert.alert('Erreur', "Impossible d'exporter la bibliothèque. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.bgCard, borderColor: theme.accent }]}
        onPress={handleExport}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={theme.accent} />
        ) : (
          <MaterialIcons name="file-download" size={20} color={theme.accent} />
        )}
        <Text style={[styles.buttonText, { color: theme.text }]}>
          {isLoading ? 'Export en cours…' : 'Exporter ma bibliothèque (CSV)'}
        </Text>
        {!isLoading && (
          <MaterialIcons name="chevron-right" size={20} color={theme.textSecondary} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  buttonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
});
