import API_CONFIG from '@/config/api';
import { getAccessToken } from '@/services/api/authInterceptor';
import { BookCreate } from '@/types/scanTypes';

export interface ConflictEntry {
  line: number;
  existing_book_id: number;
  title: string;
  missing_fields: Record<string, any>;
}

export interface ConflictResolutionItem {
  existing_book_id: number;
  fields: Record<string, any> | null;
}

export interface ImportJobEvent {
  job_id?: string;
  status?: 'pending' | 'running' | 'paused' | 'cancelled' | 'done' | 'error';
  current?: number;
  total?: number;
  success?: number;
  failed?: number;
  skipped?: number;
  auto_completed?: number;
  current_book?: string;
  errors?: ImportJobError[];
  conflicts?: ConflictEntry[];
  conflicts_count?: number;
  done?: boolean;
  heartbeat?: boolean;
}

export interface ImportJobError {
  line: number;
  title: string;
  isbn: string;
  error: string;
}

export interface ImportJobResult {
  success: number;
  failed: number;
  total: number;
  skipped: number;
  auto_completed: number;
  errors: ImportJobError[];
  cancelled?: boolean;
}

const BASE = API_CONFIG.BASE_URL;

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const importJobService = {

  async startImport(
    books: BookCreate[],
    skipErrors: boolean = true,
    populateCovers: boolean = false,
  ): Promise<{ job_id: string; total: number }> {
    const headers = await authHeaders();
    const res = await fetch(
      `${BASE}/books/import/start?skip_errors=${skipErrors}&populate_covers=${populateCovers}`,
      { method: 'POST', headers, body: JSON.stringify(books) },
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Erreur ${res.status}`);
    }
    return res.json();
  },

  async streamJob(
    jobId: string,
    onEvent: (e: ImportJobEvent) => void,
    signal?: AbortSignal,
  ): Promise<ImportJobResult> {
    const token = await getAccessToken();
    const res = await fetch(`${BASE}/books/import/${jobId}/stream`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      signal,
    });

    if (!res.ok) throw new Error(`Stream error ${res.status}`);

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let lastEvent: ImportJobEvent = {};

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop()!;

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const event: ImportJobEvent = JSON.parse(line.slice(6));
          if (event.heartbeat) continue;
          lastEvent = event;
          onEvent(event);
          if (event.done) {
            return {
              success: event.success ?? 0,
              failed: event.failed ?? 0,
              total: event.total ?? 0,
              skipped: event.skipped ?? 0,
              auto_completed: event.auto_completed ?? 0,
              errors: event.errors ?? [],
              cancelled: event.status === 'cancelled',
            };
          }
        } catch {
          // ligne malformée, on ignore
        }
      }
    }

    // Stream clos sans event "done" (déconnexion) — retourner le dernier état connu
    return {
      success: lastEvent.success ?? 0,
      failed: lastEvent.failed ?? 0,
      total: lastEvent.total ?? 0,
      skipped: lastEvent.skipped ?? 0,
      auto_completed: lastEvent.auto_completed ?? 0,
      errors: lastEvent.errors ?? [],
    };
  },

  async getStatus(jobId: string): Promise<ImportJobEvent> {
    const headers = await authHeaders();
    const res = await fetch(`${BASE}/books/import/${jobId}/status`, { headers });
    if (!res.ok) throw new Error(`Status error ${res.status}`);
    return res.json();
  },

  async getActiveJob(): Promise<ImportJobEvent | null> {
    const headers = await authHeaders();
    const res = await fetch(`${BASE}/books/import/active`, { headers });
    if (!res.ok) return null;
    return res.json();
  },

  async pause(jobId: string): Promise<void> {
    const headers = await authHeaders();
    await fetch(`${BASE}/books/import/${jobId}/pause`, { method: 'POST', headers });
  },

  async resume(jobId: string): Promise<void> {
    const headers = await authHeaders();
    await fetch(`${BASE}/books/import/${jobId}/resume`, { method: 'POST', headers });
  },

  async cancel(jobId: string): Promise<void> {
    const headers = await authHeaders();
    await fetch(`${BASE}/books/import/${jobId}/cancel`, { method: 'POST', headers });
  },

  async resolveConflicts(
    jobId: string,
    resolutions: ConflictResolutionItem[],
  ): Promise<{ applied: number; skipped: number }> {
    const headers = await authHeaders();
    const res = await fetch(`${BASE}/books/import/${jobId}/resolve-conflicts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ resolutions }),
    });
    if (!res.ok) throw new Error(`Resolve error ${res.status}`);
    return res.json();
  },
};
