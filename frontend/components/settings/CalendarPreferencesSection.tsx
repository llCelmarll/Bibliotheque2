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

export const CalendarPreferencesSection: React.FC = () => {
  const [preferences, setPreferences] = useState<CalendarPreferences | null>(null);
  const [calendars, setCalendars] = useState<Calendar.Calendar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    loadPreferencesAndCalendars();
  }, []);

  const loadPreferencesAndCalendars = async () => {
    setIsLoading(true);
    try {
      // Charger les préférences
      const prefs = await calendarPreferencesService.getPreferences();
      setPreferences(prefs);

      // Vérifier les permissions
      const { status } = await Calendar.getCalendarPermissionsAsync();
      setHasPermission(status === 'granted');

      if (status === 'granted') {
        // Charger les calendriers disponibles
        const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
        // Filtrer pour ne garder que les calendriers accessibles en écriture
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
        <Text style={styles.sectionTitle}>Rappels calendrier</Text>
        <View style={styles.card}>
          <Text style={styles.infoText}>
            Les rappels calendrier ne sont disponibles que sur mobile (Android).
          </Text>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rappels calendrier</Text>
        <View style={styles.card}>
          <ActivityIndicator size="small" color="#2196F3" />
        </View>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rappels calendrier</Text>
        <View style={styles.card}>
          <Text style={styles.infoText}>
            Pour configurer les rappels, vous devez autoriser l'accès au calendrier.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <MaterialIcons name="event" size={20} color="#FFFFFF" />
            <Text style={styles.permissionButtonText}>Autoriser l'accès</Text>
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
      <Text style={styles.sectionTitle}>Rappels calendrier</Text>

      <View style={styles.card}>
        {/* Calendrier par défaut */}
        <View style={styles.preferenceItem}>
          <View style={styles.preferenceHeader}>
            <MaterialIcons name="event" size={20} color="#2196F3" />
            <Text style={styles.preferenceLabel}>Calendrier par défaut</Text>
          </View>
          {calendars.length > 0 ? (
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={preferences.defaultCalendarId}
                onValueChange={(value) => {
                  if (value) {
                    updatePreference({ defaultCalendarId: value });
                  }
                }}
                style={styles.picker}
              >
                <Picker.Item
                  label="Sélectionner un calendrier..."
                  value=""
                  enabled={false}
                  color="#999"
                />
                {calendars.map((cal) => (
                  <Picker.Item
                    key={cal.id}
                    label={`${cal.title} (${cal.source.name})`}
                    value={cal.id}
                  />
                ))}
              </Picker>
            </View>
          ) : (
            <Text style={styles.noCalendarText}>
              Aucun calendrier accessible en écriture trouvé
            </Text>
          )}
        </View>

        {/* Délai de rappel par défaut */}
        <View style={styles.preferenceItem}>
          <View style={styles.preferenceHeader}>
            <MaterialIcons name="schedule" size={20} color="#2196F3" />
            <Text style={styles.preferenceLabel}>Délai de rappel par défaut</Text>
          </View>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={preferences.defaultReminderOffsetDays}
              onValueChange={(value) => updatePreference({ defaultReminderOffsetDays: value })}
              style={styles.picker}
            >
              {offsetOptions.map((option) => (
                <Picker.Item key={option.value} label={option.label} value={option.value} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Heure du rappel */}
        <View style={styles.preferenceItem}>
          <View style={styles.preferenceHeader}>
            <MaterialIcons name="access-time" size={20} color="#2196F3" />
            <Text style={styles.preferenceLabel}>Heure du rappel</Text>
          </View>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={preferences.defaultReminderHour}
              onValueChange={(value) => updatePreference({ defaultReminderHour: value })}
              style={styles.picker}
            >
              {hourOptions.map((option) => (
                <Picker.Item key={option.value} label={option.label} value={option.value} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Bouton de réinitialisation */}
        <TouchableOpacity style={styles.resetButton} onPress={resetPreferences}>
          <MaterialIcons name="restore" size={20} color="#F44336" />
          <Text style={styles.resetButtonText}>Réinitialiser aux valeurs par défaut</Text>
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={styles.infoContainer}>
        <MaterialIcons name="info-outline" size={16} color="#757575" />
        <Text style={styles.infoText}>
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
    color: '#333',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
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
    color: '#333',
    marginLeft: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
  },
  picker: {
    height: 50,
  },
  noCalendarText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 8,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    marginTop: 8,
  },
  resetButtonText: {
    fontSize: 14,
    color: '#F44336',
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
    color: '#757575',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
  },
  permissionButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 8,
  },
});
