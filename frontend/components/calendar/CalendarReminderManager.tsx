import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Calendar from 'expo-calendar';
import { useCalendarReminder } from '@/hooks/useCalendarReminder';
import { calendarPreferencesService } from '@/services/calendarPreferences';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Props du composant CalendarReminderManager
 */
export interface CalendarReminderManagerProps {
  bookTitle: string;
  dueDate?: string;
  borrowerName?: string;
  lenderName?: string;
  existingEventId?: string;
  onReminderCreated?: (eventId: string) => void;
  onReminderUpdated?: (eventId: string) => void;
  onReminderDeleted?: () => void;
  type: 'loan' | 'borrow';
}

/**
 * Composant de gestion des rappels calendrier
 */
export const CalendarReminderManager: React.FC<CalendarReminderManagerProps> = ({
  bookTitle,
  dueDate,
  borrowerName,
  lenderName,
  existingEventId,
  onReminderCreated,
  onReminderUpdated,
  onReminderDeleted,
  type,
}) => {
  const theme = useTheme();
  const {
    hasPermission,
    isLoading,
    userCalendars,
    defaultCalendar,
    requestPermission,
    createReminder,
    deleteReminder,
    updateReminder,
    refreshCalendars,
  } = useCalendarReminder();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('');
  const [reminderOffsetDays, setReminderOffsetDays] = useState<number>(1);
  const [isCreating, setIsCreating] = useState(false);
  const [reminderInfo, setReminderInfo] = useState<{
    date: string;
    calendarName: string;
  } | null>(null);

  // Options de délai disponibles (0 = jour même)
  const OFFSET_OPTIONS = [0, 1, 2, 3, 7];

  // Calculer les options de délai valides (celles qui ne sont pas dans le passé)
  const validOffsetOptions = useMemo(() => {
    if (!dueDate) return OFFSET_OPTIONS;

    const dueDateObj = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDateObj.setHours(0, 0, 0, 0);

    const daysRemaining = Math.ceil((dueDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Retourner seulement les options où le rappel serait dans le futur (ou aujourd'hui)
    return OFFSET_OPTIONS.filter(offset => daysRemaining >= offset);
  }, [dueDate]);

  // Charger les préférences au montage
  useEffect(() => {
    loadPreferences();
  }, []);

  // Mettre à jour le calendrier sélectionné quand les calendriers sont chargés
  useEffect(() => {
    if (userCalendars.length > 0 && !selectedCalendarId) {
      // Essayer de charger la préférence sauvegardée
      calendarPreferencesService.getDefaultCalendarId().then(savedId => {
        if (savedId && userCalendars.some(cal => cal.id === savedId)) {
          setSelectedCalendarId(savedId);
        } else if (defaultCalendar) {
          setSelectedCalendarId(defaultCalendar.id);
        } else {
          setSelectedCalendarId(userCalendars[0].id);
        }
      });
    }
  }, [userCalendars, defaultCalendar]);

  // Charger les informations du rappel existant
  useEffect(() => {
    if (existingEventId && dueDate) {
      loadReminderInfo();
    } else {
      setReminderInfo(null);
    }
  }, [existingEventId, dueDate]);

  /**
   * Charge les préférences sauvegardées
   */
  const loadPreferences = async () => {
    try {
      const prefs = await calendarPreferencesService.getPreferences();
      setReminderOffsetDays(prefs.defaultReminderOffsetDays);
      if (prefs.defaultCalendarId) {
        setSelectedCalendarId(prefs.defaultCalendarId);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des préférences:', error);
    }
  };

  /**
   * Sauvegarde les préférences
   */
  const savePreferences = async () => {
    try {
      await calendarPreferencesService.savePreferences({
        defaultCalendarId: selectedCalendarId,
        defaultReminderOffsetDays: reminderOffsetDays,
      });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des préférences:', error);
    }
  };

  /**
   * Charge les informations du rappel existant
   */
  const loadReminderInfo = () => {
    if (!dueDate) return;

    const dueDateObj = new Date(dueDate);
    const selectedCal = userCalendars.find(cal => cal.id === selectedCalendarId);
    const calName = selectedCal?.title || defaultCalendar?.title || 'Calendrier par défaut';

    setReminderInfo({
      date: dueDateObj.toLocaleDateString('fr-FR'),
      calendarName: calName,
    });
  };

  /**
   * Calcule et formate la date du rappel pour l'aperçu
   */
  const getReminderPreview = (): string => {
    if (!dueDate) return '';

    const dueDateObj = new Date(dueDate);
    const reminderDate = new Date(dueDateObj);
    reminderDate.setDate(reminderDate.getDate() - reminderOffsetDays);
    reminderDate.setHours(9, 0, 0, 0);

    return reminderDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Gère le clic sur "Ajouter un rappel"
   */
  const handleAddReminder = async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        showPermissionDeniedAlert();
        return;
      }
    }

    setModalVisible(true);
  };

  /**
   * Affiche une alerte si les permissions sont refusées
   */
  const showPermissionDeniedAlert = () => {
    Alert.alert(
      'Permission requise',
      'L\'accès au calendrier est nécessaire pour créer des rappels. Vous pouvez activer cette permission dans les paramètres de votre appareil.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Ouvrir les paramètres',
          onPress: () => {
            if (Platform.OS === 'android') {
              Linking.openSettings();
            }
          },
        },
      ]
    );
  };

  /**
   * Crée le rappel calendrier
   */
  const handleCreateReminder = async () => {
    if (!dueDate || !selectedCalendarId) {
      Alert.alert('Erreur', 'Veuillez sélectionner un calendrier');
      return;
    }

    setIsCreating(true);

    try {
      const dueDateObj = new Date(dueDate);

      const eventId = await createReminder({
        bookTitle,
        borrowerName,
        lenderName,
        dueDate: dueDateObj,
        reminderOffsetDays,
        calendarId: selectedCalendarId,
      });

      if (eventId) {
        await savePreferences();
        setModalVisible(false);
        Alert.alert('Succès', 'Rappel créé avec succès');
        onReminderCreated?.(eventId);
      } else {
        Alert.alert('Erreur', 'Impossible de créer le rappel. Veuillez réessayer.');
      }
    } catch (error) {
      console.error('Erreur lors de la création du rappel:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la création du rappel');
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Supprime le rappel existant
   */
  const handleDeleteReminder = () => {
    Alert.alert(
      'Supprimer le rappel',
      'Voulez-vous vraiment supprimer ce rappel de votre calendrier?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            if (!existingEventId) return;

            const success = await deleteReminder(existingEventId);
            if (success) {
              Alert.alert('Succès', 'Rappel supprimé');
              onReminderDeleted?.();
            } else {
              Alert.alert('Erreur', 'Impossible de supprimer le rappel');
            }
          },
        },
      ]
    );
  };

  /**
   * Modifie le rappel existant
   */
  const handleModifyReminder = async () => {
    if (!existingEventId || !dueDate || !selectedCalendarId) {
      return;
    }

    setIsCreating(true);

    try {
      const dueDateObj = new Date(dueDate);

      // Supprimer l'ancien et créer un nouveau
      await deleteReminder(existingEventId);

      const newEventId = await createReminder({
        bookTitle,
        borrowerName,
        lenderName,
        dueDate: dueDateObj,
        reminderOffsetDays,
        calendarId: selectedCalendarId,
      });

      if (newEventId) {
        await savePreferences();
        setModalVisible(false);
        Alert.alert('Succès', 'Rappel modifié avec succès');
        onReminderUpdated?.(newEventId);
      } else {
        Alert.alert('Erreur', 'Impossible de modifier le rappel');
      }
    } catch (error) {
      console.error('Erreur lors de la modification du rappel:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setIsCreating(false);
    }
  };

  // Ne pas afficher sur web
  if (Platform.OS === 'web') {
    return null;
  }

  // Ne pas afficher s'il n'y a pas de date d'échéance
  if (!dueDate) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bgCard }]}>
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Rappel calendrier</Text>

      {existingEventId && reminderInfo ? (
        <View style={[styles.reminderInfo, { backgroundColor: theme.bgSecondary }]}>
          <View style={styles.reminderHeader}>
            <MaterialIcons name="event" size={20} color={theme.success} />
            <Text style={[styles.reminderActiveText, { color: theme.success }]}>Rappel configuré</Text>
          </View>
          <Text style={[styles.reminderDetails, { color: theme.textSecondary }]}>
            Calendrier: {reminderInfo.calendarName}
          </Text>
          <Text style={[styles.reminderDetails, { color: theme.textSecondary }]}>
            Date de retour: {reminderInfo.date}
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.accentLight }]}
              onPress={() => setModalVisible(true)}
            >
              <MaterialIcons name="edit" size={18} color={theme.accent} />
              <Text style={[styles.secondaryButtonText, { color: theme.accent }]}>Modifier</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.dangerBg }]}
              onPress={handleDeleteReminder}
            >
              <MaterialIcons name="delete" size={18} color={theme.danger} />
              <Text style={[styles.dangerButtonText, { color: theme.danger }]}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.noReminder}>
          <Text style={[styles.noReminderText, { color: theme.textSecondary }]}>Aucun rappel configuré</Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.accent }]}
            onPress={handleAddReminder}
            disabled={isLoading}
          >
            <MaterialIcons name="add-alert" size={20} color={theme.textInverse} />
            <Text style={[styles.primaryButtonText, { color: theme.textInverse }]}>Ajouter un rappel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal de configuration */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: `${theme.textPrimary}80` }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.bgCard }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.borderLight }]}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                {existingEventId ? 'Modifier le rappel' : 'Nouveau rappel'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Sélection du calendrier */}
              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Calendrier</Text>
                {userCalendars.map((cal) => (
                  <TouchableOpacity
                    key={cal.id}
                    style={[
                      styles.calendarOption,
                      { backgroundColor: theme.bgSecondary },
                      selectedCalendarId === cal.id && { backgroundColor: theme.accentLight, borderWidth: 1, borderColor: theme.accent },
                    ]}
                    onPress={() => setSelectedCalendarId(cal.id)}
                  >
                    <View style={[styles.calendarColor, { backgroundColor: cal.color || theme.accent }]} />
                    <Text style={[styles.calendarName, { color: theme.textPrimary }]}>{cal.title}</Text>
                    {selectedCalendarId === cal.id && (
                      <MaterialIcons name="check" size={20} color={theme.accent} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Sélection du timing */}
              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Rappeler</Text>
                {validOffsetOptions.length === 0 ? (
                  <View style={[styles.warningContainer, { backgroundColor: theme.warningBg }]}>
                    <MaterialIcons name="warning" size={20} color={theme.warning} />
                    <Text style={[styles.warningText, { color: theme.warning }]}>
                      La date de retour est passée, impossible de configurer un rappel.
                    </Text>
                  </View>
                ) : (
                  OFFSET_OPTIONS.map((days) => {
                    const isValid = validOffsetOptions.includes(days);
                    const getLabel = (d: number) => {
                      if (d === 0) return 'Le jour même';
                      if (d === 1) return '1 jour avant';
                      return `${d} jours avant`;
                    };
                    return (
                      <TouchableOpacity
                        key={days}
                        style={[
                          styles.timingOption,
                          { backgroundColor: isValid ? theme.bgSecondary : theme.bgMuted },
                          reminderOffsetDays === days && isValid && { backgroundColor: theme.accentLight, borderWidth: 1, borderColor: theme.accent },
                          !isValid && styles.timingOptionDisabled,
                        ]}
                        onPress={() => isValid && setReminderOffsetDays(days)}
                        disabled={!isValid}
                      >
                        <View style={styles.timingTextContainer}>
                          <Text style={[styles.timingText, { color: isValid ? theme.textPrimary : theme.textMuted }]}>
                            {getLabel(days)}
                          </Text>
                          {!isValid && (
                            <Text style={[styles.timingDisabledHint, { color: theme.textMuted }]}>(passé)</Text>
                          )}
                        </View>
                        {reminderOffsetDays === days && isValid && (
                          <MaterialIcons name="check-circle" size={20} color={theme.accent} />
                        )}
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>

              {/* Aperçu */}
              <View style={[styles.previewSection, { backgroundColor: theme.warningBg }]}>
                <MaterialIcons name="info-outline" size={20} color={theme.warning} />
                <Text style={[styles.previewText, { color: theme.warning }]}>
                  Le rappel sera créé le {getReminderPreview()}
                </Text>
              </View>
            </ScrollView>

            {/* Boutons d'action */}
            <View style={[styles.modalFooter, { borderTopColor: theme.borderLight }]}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.bgSecondary }]}
                onPress={() => setModalVisible(false)}
                disabled={isCreating}
              >
                <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.accent }, (isCreating || validOffsetOptions.length === 0) && styles.buttonDisabled]}
                onPress={existingEventId ? handleModifyReminder : handleCreateReminder}
                disabled={isCreating || !selectedCalendarId || validOffsetOptions.length === 0}
              >
                {isCreating ? (
                  <ActivityIndicator color={theme.textInverse} size="small" />
                ) : (
                  <Text style={[styles.confirmButtonText, { color: theme.textInverse }]}>
                    {existingEventId ? 'Modifier' : 'Créer'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginVertical: 8,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  reminderInfo: {
    padding: 12,
    borderRadius: 8,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reminderActiveText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  reminderDetails: {
    fontSize: 13,
    marginBottom: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  noReminder: {
    alignItems: 'center',
    padding: 16,
  },
  noReminderText: {
    fontSize: 14,
    marginBottom: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
    flex: 1,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dangerButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalBody: {
    padding: 16,
  },
  formSection: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  calendarOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  calendarColor: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 12,
  },
  calendarName: {
    flex: 1,
    fontSize: 14,
  },
  timingOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  timingOptionDisabled: {
    opacity: 0.7,
  },
  timingTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timingText: {
    fontSize: 14,
  },
  timingDisabledHint: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
  },
  previewSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  previewText: {
    flex: 1,
    fontSize: 13,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
