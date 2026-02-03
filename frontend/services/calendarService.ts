import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import { calendarPreferencesService } from './calendarPreferences';

/**
 * Options de configuration pour créer un rappel calendrier
 */
export interface CalendarReminderOptions {
  bookTitle: string;
  borrowerName?: string;  // Pour les prêts
  lenderName?: string;    // Pour les emprunts
  dueDate: Date;
  reminderOffsetDays?: number; // Par défaut: 1 jour avant
  reminderHour?: number; // Heure du rappel (0-23, défaut: préférences)
  reminderMinute?: number; // Minute du rappel (0-59, défaut: préférences)
  notes?: string;
  calendarId: string;
}

/**
 * Service de gestion des rappels calendrier pour les retours de livres
 */
class CalendarService {
  /**
   * Demande les permissions d'accès au calendrier
   * @returns {Promise<boolean>} true si les permissions sont accordées, false sinon
   */
  async requestCalendarPermissions(): Promise<boolean> {
    try {
      // Sur web, pas de support calendrier
      if (Platform.OS === 'web') {
        return false;
      }

      const { status } = await Calendar.requestCalendarPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Erreur lors de la demande de permissions calendrier:', error);
      return false;
    }
  }

  /**
   * Vérifie si les permissions sont déjà accordées
   * @returns {Promise<boolean>} true si les permissions sont accordées
   */
  async checkCalendarPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        return false;
      }

      const { status } = await Calendar.getCalendarPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Erreur lors de la vérification des permissions:', error);
      return false;
    }
  }

  /**
   * Récupère la liste des calendriers disponibles sur l'appareil
   * @returns {Promise<Calendar.Calendar[]>} Liste des calendriers
   */
  async getUserCalendars(): Promise<Calendar.Calendar[]> {
    try {
      const hasPermission = await this.checkCalendarPermissions();
      if (!hasPermission) {
        console.warn('Permissions calendrier non accordées');
        return [];
      }

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);

      // Filtrer uniquement les calendriers où on peut écrire
      return calendars.filter(cal => cal.allowsModifications);
    } catch (error) {
      console.error('Erreur lors de la récupération des calendriers:', error);
      return [];
    }
  }

  /**
   * Récupère le calendrier par défaut ou le premier calendrier disponible
   * @returns {Promise<Calendar.Calendar | null>} Calendrier par défaut ou null
   */
  async getDefaultCalendar(): Promise<Calendar.Calendar | null> {
    try {
      const calendars = await this.getUserCalendars();

      if (calendars.length === 0) {
        return null;
      }

      // Chercher le calendrier par défaut
      const defaultCal = calendars.find(cal => cal.isPrimary || cal.isDefault);

      // Sinon, retourner le premier calendrier disponible
      return defaultCal || calendars[0];
    } catch (error) {
      console.error('Erreur lors de la récupération du calendrier par défaut:', error);
      return null;
    }
  }

  /**
   * Calcule la date et l'heure du rappel
   * @param {Date} dueDate - Date d'échéance du retour
   * @param {number} offsetDays - Nombre de jours avant l'échéance (défaut: 1)
   * @param {number} hour - Heure du rappel (0-23, défaut: 9)
   * @param {number} minute - Minute du rappel (0-59, défaut: 0)
   * @returns {Date} Date et heure du rappel
   */
  calculateReminderDate(
    dueDate: Date,
    offsetDays: number = 1,
    hour: number = 9,
    minute: number = 0
  ): Date {
    const reminder = new Date(dueDate);
    reminder.setDate(reminder.getDate() - offsetDays);
    reminder.setHours(hour, minute, 0, 0);
    return reminder;
  }

  /**
   * Crée un événement calendrier pour un rappel de retour de livre
   * @param {CalendarReminderOptions} options - Options de configuration du rappel
   * @returns {Promise<string | null>} ID de l'événement créé ou null en cas d'erreur
   */
  async createBookReturnReminder(options: CalendarReminderOptions): Promise<string | null> {
    try {
      const hasPermission = await this.checkCalendarPermissions();
      if (!hasPermission) {
        console.warn('Permissions calendrier non accordées');
        return null;
      }

      const {
        bookTitle,
        borrowerName,
        lenderName,
        dueDate,
        reminderOffsetDays,
        reminderHour,
        reminderMinute,
        notes,
        calendarId
      } = options;

      // Récupérer les préférences si les valeurs ne sont pas fournies
      const prefs = await calendarPreferencesService.getPreferences();
      const offsetDays = reminderOffsetDays ?? prefs.defaultReminderOffsetDays;
      const hour = reminderHour ?? prefs.defaultReminderHour;
      const minute = reminderMinute ?? prefs.defaultReminderMinute;

      // Calculer la date du rappel
      const reminderDate = this.calculateReminderDate(dueDate, offsetDays, hour, minute);
      const endDate = new Date(reminderDate);
      endDate.setMinutes(endDate.getMinutes() + 15); // Événement de 15 minutes

      // Créer le titre selon le type (prêt ou emprunt)
      let title: string;
      if (borrowerName) {
        title = `Retour prêt: ${bookTitle} - ${borrowerName}`;
      } else if (lenderName) {
        title = `Retour emprunt: ${bookTitle}`;
      } else {
        title = `Retour livre: ${bookTitle}`;
      }

      // Créer les notes de l'événement
      let eventNotes = `Rappel de retour de livre`;
      if (borrowerName) {
        eventNotes += `\nContact: ${borrowerName}`;
      }
      if (lenderName) {
        eventNotes += `\nPrêteur: ${lenderName}`;
      }
      if (notes) {
        eventNotes += `\nNotes: ${notes}`;
      }
      eventNotes += `\n\nDate de retour prévue: ${dueDate.toLocaleDateString('fr-FR')}`;

      // Créer l'événement
      const eventId = await Calendar.createEventAsync(calendarId, {
        title,
        startDate: reminderDate,
        endDate,
        notes: eventNotes,
        alarms: [
          {
            relativeOffset: 0, // Alarme au moment de l'événement
            method: Calendar.AlarmMethod.ALERT
          }
        ],
      });

      console.log('Événement calendrier créé avec succès:', eventId);
      return eventId;
    } catch (error) {
      console.error('Erreur lors de la création de l\'événement calendrier:', error);
      return null;
    }
  }

  /**
   * Met à jour un événement calendrier existant
   * @param {string} eventId - ID de l'événement à mettre à jour
   * @param {CalendarReminderOptions} options - Nouvelles options
   * @returns {Promise<boolean>} true si la mise à jour a réussi
   */
  async updateBookReturnReminder(eventId: string, options: CalendarReminderOptions): Promise<boolean> {
    try {
      // La mise à jour d'un événement est complexe avec expo-calendar
      // Il est plus simple de supprimer et recréer
      const deleted = await this.deleteBookReturnReminder(eventId);
      if (!deleted) {
        console.warn('Impossible de supprimer l\'ancien événement');
        return false;
      }

      const newEventId = await this.createBookReturnReminder(options);
      return newEventId !== null;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'événement:', error);
      return false;
    }
  }

  /**
   * Supprime un événement calendrier
   * @param {string} eventId - ID de l'événement à supprimer
   * @returns {Promise<boolean>} true si la suppression a réussi
   */
  async deleteBookReturnReminder(eventId: string): Promise<boolean> {
    try {
      const hasPermission = await this.checkCalendarPermissions();
      if (!hasPermission) {
        console.warn('Permissions calendrier non accordées');
        return false;
      }

      await Calendar.deleteEventAsync(eventId);
      console.log('Événement calendrier supprimé avec succès:', eventId);
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'événement:', error);
      // Si l'événement n'existe plus, on considère que c'est un succès
      return true;
    }
  }

  /**
   * Vérifie si un événement existe toujours
   * @param {string} eventId - ID de l'événement
   * @returns {Promise<boolean>} true si l'événement existe
   */
  async doesEventExist(eventId: string): Promise<boolean> {
    try {
      const hasPermission = await this.checkCalendarPermissions();
      if (!hasPermission) {
        return false;
      }

      const event = await Calendar.getEventAsync(eventId);
      return event !== null;
    } catch (error) {
      // Si getEventAsync échoue, l'événement n'existe probablement plus
      return false;
    }
  }
}

// Export singleton
export const calendarService = new CalendarService();
