import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Platform, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';

let DateTimePicker: any = null;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

interface DatePickerFieldProps {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  error?: string;
  minimumDate?: Date;
}

export function DatePickerField({ label, value, onChange, error, minimumDate }: DatePickerFieldProps) {
  const theme = useTheme();
  const [showPicker, setShowPicker] = useState(false);

  const formatDisplay = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Sur web : champ texte simple JJ/MM/AAAA
  if (Platform.OS === 'web') {
    const [textValue, setTextValue] = useState(formatDisplay(value));

    const handleTextChange = (text: string) => {
      setTextValue(text);
      if (!text.trim()) { onChange(null); return; }
      const parts = text.trim().split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts.map(Number);
        if (day && month && year > 2000) {
          const date = new Date(year, month - 1, day);
          if (!isNaN(date.getTime())) onChange(date);
        }
      }
    };

    return (
      <View style={styles.container}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
        <TextInput
          style={[styles.input, { borderColor: error ? theme.danger : theme.borderLight, color: theme.textPrimary, backgroundColor: theme.bgInput }]}
          placeholder="JJ/MM/AAAA"
          value={textValue}
          onChangeText={handleTextChange}
          placeholderTextColor={theme.textMuted}
          keyboardType="numeric"
        />
        {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
      </View>
    );
  }

  // Sur mobile : bouton qui ouvre le picker natif
  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      <TouchableOpacity
        style={[styles.button, { borderColor: error ? theme.danger : theme.borderLight, backgroundColor: theme.bgInput }]}
        onPress={() => setShowPicker(true)}
      >
        <MaterialIcons name="calendar-today" size={18} color={value ? theme.accent : theme.textMuted} />
        <Text style={[styles.buttonText, { color: value ? theme.textPrimary : theme.textMuted }]}>
          {value ? formatDisplay(value) : 'Sélectionner une date'}
        </Text>
        {value && (
          <TouchableOpacity onPress={() => onChange(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialIcons name="close" size={16} color={theme.textMuted} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
      {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}

      {showPicker && DateTimePicker && (
        <DateTimePicker
          value={value || minimumDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={minimumDate || new Date()}
          onChange={(_: any, selectedDate?: Date) => {
            setShowPicker(Platform.OS === 'ios');
            if (selectedDate) onChange(selectedDate);
            else setShowPicker(false);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  buttonText: {
    flex: 1,
    fontSize: 14,
  },
  error: {
    fontSize: 12,
    marginTop: 4,
  },
});
