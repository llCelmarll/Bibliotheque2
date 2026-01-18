import { useState, useEffect, useCallback } from 'react';
import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import { calendarService, CalendarReminderOptions } from '@/services/calendarService';

/**
 * Interface de retour du hook useCalendarReminder
 */
export interface UseCalendarReminderReturn {
  hasPermission: boolean;
  isLoading: boolean;
  userCalendars: Calendar.Calendar[];
  defaultCalendar: Calendar.Calendar | null;
  requestPermission: () => Promise<boolean>;
  createReminder: (options: CalendarReminderOptions) => Promise<string | null>;
  deleteReminder: (eventId: string) => Promise<boolean>;
  updateReminder: (eventId: string, options: CalendarReminderOptions) => Promise<boolean>;
  refreshCalendars: () => Promise<void>;
}

/**
 * Hook personnalisé pour gérer les rappels calendrier
 * @returns {UseCalendarReminderReturn} Fonctions et état pour gérer les rappels
 */
export const useCalendarReminder = (): UseCalendarReminderReturn => {
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userCalendars, setUserCalendars] = useState<Calendar.Calendar[]>([]);
  const [defaultCalendar, setDefaultCalendar] = useState<Calendar.Calendar | null>(null);

  /**
   * Vérifie les permissions au montage du composant
   */
  useEffect(() => {
    const checkPermissions = async () => {
      if (Platform.OS === 'web') {
        setHasPermission(false);
        setIsLoading(false);
        return;
      }

      try {
        const granted = await calendarService.checkCalendarPermissions();
        setHasPermission(granted);

        if (granted) {
          await loadCalendars();
        }
      } catch (error) {
        console.error('Erreur lors de la vérification des permissions:', error);
        setHasPermission(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkPermissions();
  }, []);

  /**
   * Charge la liste des calendriers disponibles
   */
  const loadCalendars = useCallback(async () => {
    try {
      const calendars = await calendarService.getUserCalendars();
      setUserCalendars(calendars);

      const defCal = await calendarService.getDefaultCalendar();
      setDefaultCalendar(defCal);
    } catch (error) {
      console.error('Erreur lors du chargement des calendriers:', error);
      setUserCalendars([]);
      setDefaultCalendar(null);
    }
  }, []);

  /**
   * Rafraîchit la liste des calendriers
   */
  const refreshCalendars = useCallback(async () => {
    if (!hasPermission) {
      return;
    }
    await loadCalendars();
  }, [hasPermission, loadCalendars]);

  /**
   * Demande les permissions d'accès au calendrier
   * @returns {Promise<boolean>} true si les permissions sont accordées
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      return false;
    }

    try {
      setIsLoading(true);
      const granted = await calendarService.requestCalendarPermissions();
      setHasPermission(granted);

      if (granted) {
        await loadCalendars();
      }

      return granted;
    } catch (error) {
      console.error('Erreur lors de la demande de permissions:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadCalendars]);

  /**
   * Crée un rappel calendrier
   * @param {CalendarReminderOptions} options - Options du rappel
   * @returns {Promise<string | null>} ID de l'événement créé ou null
   */
  const createReminder = useCallback(async (options: CalendarReminderOptions): Promise<string | null> => {
    if (!hasPermission) {
      console.warn('Permissions non accordées');
      return null;
    }

    try {
      setIsLoading(true);
      const eventId = await calendarService.createBookReturnReminder(options);
      return eventId;
    } catch (error) {
      console.error('Erreur lors de la création du rappel:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [hasPermission]);

  /**
   * Supprime un rappel calendrier
   * @param {string} eventId - ID de l'événement à supprimer
   * @returns {Promise<boolean>} true si la suppression a réussi
   */
  const deleteReminder = useCallback(async (eventId: string): Promise<boolean> => {
    if (!hasPermission) {
      console.warn('Permissions non accordées');
      return false;
    }

    try {
      setIsLoading(true);
      const success = await calendarService.deleteBookReturnReminder(eventId);
      return success;
    } catch (error) {
      console.error('Erreur lors de la suppression du rappel:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [hasPermission]);

  /**
   * Met à jour un rappel calendrier
   * @param {string} eventId - ID de l'événement à mettre à jour
   * @param {CalendarReminderOptions} options - Nouvelles options
   * @returns {Promise<boolean>} true si la mise à jour a réussi
   */
  const updateReminder = useCallback(async (
    eventId: string,
    options: CalendarReminderOptions
  ): Promise<boolean> => {
    if (!hasPermission) {
      console.warn('Permissions non accordées');
      return false;
    }

    try {
      setIsLoading(true);
      const success = await calendarService.updateBookReturnReminder(eventId, options);
      return success;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du rappel:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [hasPermission]);

  return {
    hasPermission,
    isLoading,
    userCalendars,
    defaultCalendar,
    requestPermission,
    createReminder,
    deleteReminder,
    updateReminder,
    refreshCalendars,
  };
};
