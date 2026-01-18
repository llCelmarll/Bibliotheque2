// services/calendarPreferences.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CalendarPreferences {
  defaultCalendarId?: string;
  defaultReminderOffsetDays: number; // 1, 2, 3, or 7
  defaultReminderHour: number; // 0-23
  defaultReminderMinute: number; // 0-59
}

const PREFERENCES_KEY = '@calendar_preferences';

const DEFAULT_PREFERENCES: CalendarPreferences = {
  defaultCalendarId: undefined,
  defaultReminderOffsetDays: 1,
  defaultReminderHour: 9,
  defaultReminderMinute: 0,
};

class CalendarPreferencesService {
  /**
   * Récupère les préférences de rappel calendrier
   */
  async getPreferences(): Promise<CalendarPreferences> {
    try {
      const stored = await AsyncStorage.getItem(PREFERENCES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_PREFERENCES, ...parsed };
      }
      return DEFAULT_PREFERENCES;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des préférences calendrier:', error);
      return DEFAULT_PREFERENCES;
    }
  }

  /**
   * Sauvegarde les préférences de rappel calendrier
   */
  async savePreferences(preferences: Partial<CalendarPreferences>): Promise<void> {
    try {
      const current = await this.getPreferences();
      const updated = { ...current, ...preferences };
      await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated));
      console.log('✅ Préférences calendrier sauvegardées:', updated);
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde des préférences calendrier:', error);
      throw error;
    }
  }

  /**
   * Réinitialise les préférences aux valeurs par défaut
   */
  async resetPreferences(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PREFERENCES_KEY);
      console.log('✅ Préférences calendrier réinitialisées');
    } catch (error) {
      console.error('❌ Erreur lors de la réinitialisation des préférences calendrier:', error);
      throw error;
    }
  }

  /**
   * Récupère l'offset de rappel par défaut
   */
  async getDefaultReminderOffsetDays(): Promise<number> {
    const prefs = await this.getPreferences();
    return prefs.defaultReminderOffsetDays;
  }

  /**
   * Récupère l'heure de rappel par défaut
   */
  async getDefaultReminderTime(): Promise<{ hour: number; minute: number }> {
    const prefs = await this.getPreferences();
    return {
      hour: prefs.defaultReminderHour,
      minute: prefs.defaultReminderMinute,
    };
  }

  /**
   * Récupère le calendrier par défaut
   */
  async getDefaultCalendarId(): Promise<string | undefined> {
    const prefs = await this.getPreferences();
    return prefs.defaultCalendarId;
  }
}

export const calendarPreferencesService = new CalendarPreferencesService();
