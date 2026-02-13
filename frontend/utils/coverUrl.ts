import API_CONFIG from '@/config/api';

/**
 * Resout une URL de couverture.
 * - URLs externes (http/https) : retournees telles quelles
 * - Chemins locaux (/covers/...) : prefixes avec API_CONFIG.BASE_URL
 */
export function resolveCoverUrl(url?: string): string | undefined {
    if (!url) return undefined;

    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }

    if (url.startsWith('/covers/')) {
        return `${API_CONFIG.BASE_URL}${url}?t=${Date.now()}`;
    }

    return url;
}
