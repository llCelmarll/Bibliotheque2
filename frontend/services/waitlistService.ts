import API_CONFIG from '@/config/api';

export interface WaitlistRequest {
  name: string;
  email: string;
  message?: string;
  referred_by?: string;
}

export async function joinWaitlist(data: WaitlistRequest): Promise<void> {
  const res = await fetch(`${API_CONFIG.BASE_URL}/waitlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.detail ?? 'Erreur') as Error & { status: number };
    err.status = res.status;
    throw err;
  }
}
