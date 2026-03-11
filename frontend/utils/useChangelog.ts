import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_CONFIG from '@/config/api';

const STORAGE_KEY = '@lastSeenChangelogVersion';

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  description: string;
  type: 'feature' | 'fix' | 'improvement';
}

function isVersionNewer(a: string, b: string): boolean {
  const parse = (v: string) => v.split('.').map(Number);
  const [aMajor, aMinor, aPatch] = parse(a);
  const [bMajor, bMinor, bPatch] = parse(b);
  if (aMajor !== bMajor) return aMajor > bMajor;
  if (aMinor !== bMinor) return aMinor > bMinor;
  return aPatch > bPatch;
}

export function useChangelog() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [hasNew, setHasNew] = useState(false);
  const [latestEntry, setLatestEntry] = useState<ChangelogEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/changelog`);
        if (!response.ok) return;
        const data: ChangelogEntry[] = await response.json();
        if (!data || data.length === 0) return;

        setEntries(data);
        const latest = data[0];
        setLatestEntry(latest);

        const lastSeen = await AsyncStorage.getItem(STORAGE_KEY);
        const isNew = !lastSeen || isVersionNewer(latest.version, lastSeen);
        setHasNew(isNew);
      } catch {
        // Silencieux : ne pas bloquer l'app
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const markAsSeen = useCallback(async () => {
    if (latestEntry) {
      await AsyncStorage.setItem(STORAGE_KEY, latestEntry.version);
      setHasNew(false);
    }
  }, [latestEntry]);

  return { entries, hasNew, latestEntry, markAsSeen, loading };
}
