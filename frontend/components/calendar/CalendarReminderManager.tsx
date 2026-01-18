import React, { useState, useEffect } from 'react';
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
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Rappel calendrier</Text>

      {existingEventId && reminderInfo ? (
        <View style={styles.reminderInfo}>
          <View style={styles.reminderHeader}>
            <MaterialIcons name="event" size={20} color="#4CAF50" />
            <Text style={styles.reminderActiveText}>Rappel configuré</Text>
          </View>
          <Text style={styles.reminderDetails}>
            Calendrier: {reminderInfo.calendarName}
          </Text>
          <Text style={styles.reminderDetails}>
            Date de retour: {reminderInfo.date}
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => setModalVisible(true)}
            >
              <MaterialIcons name="edit" size={18} color="#2196F3" />
              <Text style={styles.secondaryButtonText}>Modifier</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.dangerButton]}
              onPress={handleDeleteReminder}
            >
              <MaterialIcons name="delete" size={18} color="#F44336" />
              <Text style={styles.dangerButtonText}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.noReminder}>
          <Text style={styles.noReminderText}>Aucun rappel configuré</Text>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleAddReminder}
            disabled={isLoading}
          >
            <MaterialIcons name="add-alert" size={20} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Ajouter un rappel</Text>
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {existingEventId ? 'Modifier le rappel' : 'Nouveau rappel'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#757575" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Sélection du calendrier */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Calendrier</Text>
                {userCalendars.map((cal) => (
                  <TouchableOpacity
                    key={cal.id}
                    style={[
                      styles.calendarOption,
                      selectedCalendarId === cal.id && styles.calendarOptionSelected,
                    ]}
                    onPress={() => setSelectedCalendarId(cal.id)}
                  >
                    <View style={[styles.calendarColor, { backgroundColor: cal.color || '#2196F3' }]} />
                    <Text style={styles.calendarName}>{cal.title}</Text>
                    {selectedCalendarId === cal.id && (
                      <MaterialIcons name="check" size={20} color="#2196F3" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Sélection du timing */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Rappeler</Text>
                {[1, 2, 3, 7].map((days) => (
                  <TouchableOpacity
                    key={days}
                    style={[
                      styles.timingOption,
                      reminderOffsetDays === days && styles.timingOptionSelected,
                    ]}
                    onPress={() => setReminderOffsetDays(days)}
                  >
                    <Text style={styles.timingText}>
                      {days === 1 ? '1 jour avant' : `${days} jours avant`}
                    </Text>
                    {reminderOffsetDays === days && (
                      <MaterialIcons name="check-circle" size={20} color="#2196F3" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Aperçu */}
              <View style={styles.previewSection}>
                <MaterialIcons name="info-outline" size={20} color="#757575" />
                <Text style={styles.previewText}>
                  Le rappel sera créé le {getReminderPreview()}
                </Text>
              </View>
            </ScrollView>

            {/* Boutons d'action */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
                disabled={isCreating}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, isCreating && styles.buttonDisabled]}
                onPress={existingEventId ? handleModifyReminder : handleCreateReminder}
                disabled={isCreating || !selectedCalendarId}
              >
                {isCreating ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.confirmButtonText}>
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
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginVertical: 8,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 12,
  },
  reminderInfo: {
    backgroundColor: '#F5F5F5',
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
    color: '#4CAF50',
    marginLeft: 8,
  },
  reminderDetails: {
    fontSize: 13,
    color: '#757575',
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
    color: '#757575',
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
  primaryButton: {
    backgroundColor: '#2196F3',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#E3F2FD',
  },
  secondaryButtonText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: '#FFEBEE',
  },
  dangerButtonText: {
    color: '#F44336',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
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
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
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
    color: '#424242',
    marginBottom: 12,
  },
  calendarOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    marginBottom: 8,
  },
  calendarOptionSelected: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#2196F3',
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
    color: '#212121',
  },
  timingOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    marginBottom: 8,
  },
  timingOptionSelected: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  timingText: {
    fontSize: 14,
    color: '#212121',
  },
  previewSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  previewText: {
    flex: 1,
    fontSize: 13,
    color: '#F57C00',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  cancelButtonText: {
    color: '#757575',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#2196F3',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
