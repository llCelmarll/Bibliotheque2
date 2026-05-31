import API_CONFIG from '@/config/api';

export function buildAmazonUrl(isbn?: string | null, title?: string, authors?: string[]): string {
  const tag = API_CONFIG.AMAZON_STORE_ID;
  if (isbn) {
    return `https://www.amazon.fr/s?k=${encodeURIComponent(isbn)}&tag=${tag}`;
  }
  const parts = [title, ...(authors ?? [])].filter(Boolean);
  if (parts.length === 0) return '';
  return `https://www.amazon.fr/s?k=${encodeURIComponent(parts.join(' '))}&tag=${tag}`;
}
