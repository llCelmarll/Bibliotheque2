// components/settings/CalendarPreferencesSection.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Calendar from 'expo-calendar';
import {
  CalendarPreferences,
  calendarPreferencesService,
} from '@/services/calendarPreferences';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '@/contexts/ThemeContext';

export const CalendarPreferencesSection: React.FC = () => {
  const [preferences, setPreferences] = useState<CalendarPreferences | null>(null);
  const [calendars, setCalendars] = useState<Calendar.Calendar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    loadPreferencesAndCalendars();
  }, []);

  const loadPreferencesAndCalendars = async () => {
    setIsLoading(true);
    try {
      const prefs = await calendarPreferencesService.getPreferences();
      setPreferences(prefs);

      const { status } = await Calendar.getCalendarPermissionsAsync();
      setHasPermission(status === 'granted');

      if (status === 'granted') {
        const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
        const writableCalendars = cals.filter((cal) => cal.allowsModifications);
        setCalendars(writableCalendars);
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des préférences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const requestPermission = async () => {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status === 'granted') {
        setHasPermission(true);
        await loadPreferencesAndCalendars();
      } else {
        Alert.alert(
          'Permission refusée',
          'Pour configurer les rappels calendrier, autorisez l\'accès au calendrier dans les paramètres de votre appareil.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ Erreur lors de la demande de permission:', error);
    }
  };

  const updatePreference = async (update: Partial<CalendarPreferences>) => {
    try {
      await calendarPreferencesService.savePreferences(update);
      const updatedPrefs = await calendarPreferencesService.getPreferences();
      setPreferences(updatedPrefs);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder les préférences');
    }
  };

  const resetPreferences = async () => {
    Alert.alert(
      'Réinitialiser les préférences',
      'Voulez-vous vraiment réinitialiser les préférences de rappel aux valeurs par défaut ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réinitialiser',
          style: 'destructive',
          onPress: async () => {
            try {
              await calendarPreferencesService.resetPreferences();
              await loadPreferencesAndCalendars();
              Alert.alert('Succès', 'Les préférences ont été réinitialisées');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de réinitialiser les préférences');
            }
          },
        },
      ]
    );
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Rappels calendrier</Text>
        <View style={[styles.card, { backgroundColor: theme.bgCard, shadowColor: theme.accent }]}>
          <Text style={[styles.infoText, { color: theme.textMuted }]}>
            Les rappels calendrier ne sont disponibles que sur mobile (Android).
          </Text>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Rappels calendrier</Text>
        <View style={[styles.card, { backgroundColor: theme.bgCard, shadowColor: theme.accent }]}>
          <ActivityIndicator size="small" color={theme.accent} />
        </View>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Rappels calendrier</Text>
        <View style={[styles.card, { backgroundColor: theme.bgCard, shadowColor: theme.accent }]}>
          <Text style={[styles.infoText, { color: theme.textMuted }]}>
            Pour configurer les rappels, vous devez autoriser l'accès au calendrier.
          </Text>
          <TouchableOpacity style={[styles.permissionButton, { backgroundColor: theme.accent }]} onPress={requestPermission}>
            <MaterialIcons name="event" size={20} color={theme.textInverse} />
            <Text style={[styles.permissionButtonText, { color: theme.textInverse }]}>Autoriser l'accès</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!preferences) {
    return null;
  }

  const offsetOptions = [
    { label: '1 jour avant', value: 1 },
    { label: '2 jours avant', value: 2 },
    { label: '3 jours avant', value: 3 },
    { label: '1 semaine avant', value: 7 },
  ];

  const hourOptions = Array.from({ length: 24 }, (_, i) => ({
    label: `${i.toString().padStart(2, '0')}:00`,
    value: i,
  }));

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Rappels calendrier</Text>

      <View style={[styles.card, { backgroundColor: theme.bgCard, shadowColor: theme.accent }]}>
        {/* Calendrier par défaut */}
        <View style={styles.preferenceItem}>
          <View style={styles.preferenceHeader}>
            <MaterialIcons name="event" size={20} color={theme.accent} />
            <Text style={[styles.preferenceLabel, { color: theme.textPrimary }]}>Calendrier par défaut</Text>
          </View>
          {calendars.length > 0 ? (
            <View style={[styles.pickerContainer, { borderColor: theme.borderLight, backgroundColor: theme.bgInput }]}>
              <Picker
                selectedValue={preferences.defaultCalendarId}
                onValueChange={(value) => {
                  if (value) {
                    updatePreference({ defaultCalendarId: value });
                  }
                }}
                style={[styles.picker, { color: theme.textPrimary, backgroundColor: theme.bgInput }]}
                dropdownIconColor={theme.textSecondary}
              >
                <Picker.Item
                  label="Sélectionner un calendrier..."
                  value=""
                  enabled={false}
                  color={theme.textMuted}
                  style={{ backgroundColor: theme.bgCard }}
                />
                {calendars.map((cal) => (
                  <Picker.Item
                    key={cal.id}
                    label={`${cal.title} (${cal.source.name})`}
                    value={cal.id}
                    color={theme.textPrimary}
                    style={{ backgroundColor: theme.bgCard }}
                  />
                ))}
              </Picker>
            </View>
          ) : (
            <Text style={[styles.noCalendarText, { color: theme.textMuted }]}>
              Aucun calendrier accessible en écriture trouvé
            </Text>
          )}
        </View>

        {/* Délai de rappel par défaut */}
        <View style={styles.preferenceItem}>
          <View style={styles.preferenceHeader}>
            <MaterialIcons name="schedule" size={20} color={theme.accent} />
            <Text style={[styles.preferenceLabel, { color: theme.textPrimary }]}>Délai de rappel par défaut</Text>
          </View>
          <View style={[styles.pickerContainer, { borderColor: theme.borderLight, backgroundColor: theme.bgInput }]}>
            <Picker
              selectedValue={preferences.defaultReminderOffsetDays}
              onValueChange={(value) => updatePreference({ defaultReminderOffsetDays: value })}
              style={[styles.picker, { color: theme.textPrimary, backgroundColor: theme.bgInput }]}
              dropdownIconColor={theme.textSecondary}
            >
              {offsetOptions.map((option) => (
                <Picker.Item key={option.value} label={option.label} value={option.value} color={theme.textPrimary} style={{ backgroundColor: theme.bgCard }} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Heure du rappel */}
        <View style={styles.preferenceItem}>
          <View style={styles.preferenceHeader}>
            <MaterialIcons name="access-time" size={20} color={theme.accent} />
            <Text style={[styles.preferenceLabel, { color: theme.textPrimary }]}>Heure du rappel</Text>
          </View>
          <View style={[styles.pickerContainer, { borderColor: theme.borderLight, backgroundColor: theme.bgInput }]}>
            <Picker
              selectedValue={preferences.defaultReminderHour}
              onValueChange={(value) => updatePreference({ defaultReminderHour: value })}
              style={[styles.picker, { color: theme.textPrimary, backgroundColor: theme.bgInput }]}
              dropdownIconColor={theme.textSecondary}
            >
              {hourOptions.map((option) => (
                <Picker.Item key={option.value} label={option.label} value={option.value} color={theme.textPrimary} style={{ backgroundColor: theme.bgCard }} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Bouton de réinitialisation */}
        <TouchableOpacity style={[styles.resetButton, { borderTopColor: theme.borderLight }]} onPress={resetPreferences}>
          <MaterialIcons name="restore" size={20} color={theme.danger} />
          <Text style={[styles.resetButtonText, { color: theme.danger }]}>Réinitialiser aux valeurs par défaut</Text>
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={styles.infoContainer}>
        <MaterialIcons name="info-outline" size={16} color={theme.textMuted} />
        <Text style={[styles.infoText, { color: theme.textMuted }]}>
          Ces paramètres seront utilisés par défaut lors de la création de nouveaux rappels. Vous
          pourrez les modifier pour chaque rappel individuel.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  card: {
    borderRadius: 12,
    padding: 20,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  preferenceItem: {
    marginBottom: 20,
  },
  preferenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  preferenceLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
  },
  picker: {
    height: 50,
  },
  noCalendarText: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 8,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    marginTop: 8,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  infoContainer: {
    flexDirection: 'row',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  infoText: {
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
  },
  permissionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});
