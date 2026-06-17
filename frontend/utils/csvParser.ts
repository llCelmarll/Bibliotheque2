import { BookCreate } from '@/types/scanTypes';

export type MappedCSVRow = Record<string, string>;

export function parseCSVRow(mappedRow: MappedCSVRow): BookCreate {
  const book: BookCreate = {
    title: mappedRow.title || 'Sans titre',
    subtitle: mappedRow.subtitle || undefined,
    isbn: mappedRow.isbn || undefined,
    published_date: mappedRow.published_date || undefined,
    page_count: mappedRow.page_count ? (parseInt(mappedRow.page_count) || undefined) : undefined,
  };

  if (mappedRow.authors) {
    book.authors = mappedRow.authors
      .split(',')
      .map((a: string) => a.trim())
      .filter((a: string) => a.length > 0);
  }

  if (mappedRow.publisher) {
    book.publisher = mappedRow.publisher;
  }

  if (mappedRow.genres) {
    book.genres = mappedRow.genres
      .split(',')
      .map((g: string) => g.trim())
      .filter((g: string) => g.length > 0);
  }

  if (mappedRow.cover_url) {
    book.cover_url = mappedRow.cover_url;
  }

  // Série — formats supportés :
  // "Dune" | "Dune:1" | "Dune:1 ; Fondation:3" (format export)
  // La colonne "tome" reste supportée comme fallback pour rétro-compatibilité
  if (mappedRow.series) {
    const seriesEntries = mappedRow.series.split(';').map((s: string) => s.trim()).filter(Boolean);
    if (seriesEntries.length === 1 && !seriesEntries[0].includes(':') && mappedRow.volume) {
      // Ancien format : colonne serie + colonne tome séparées
      const vol = parseInt(mappedRow.volume);
      book.series = [{ name: seriesEntries[0], volume_number: isNaN(vol) ? undefined : vol }];
    } else {
      // Nouveau format : "NomSerie:tome" ou "NomSerie" (sans tome)
      book.series = seriesEntries.map((entry: string) => {
        const colonIdx = entry.lastIndexOf(':');
        if (colonIdx > 0) {
          const name = entry.slice(0, colonIdx).trim();
          const vol = parseInt(entry.slice(colonIdx + 1).trim());
          return { name, volume_number: isNaN(vol) ? undefined : vol };
        }
        return { name: entry, volume_number: undefined };
      });
    }
  }

  // Support colonne reading_status (prioritaire) et is_read (rétrocompat)
  const rawStatus = mappedRow.reading_status ?? mappedRow.is_read;
  if (rawStatus !== undefined && rawStatus !== '') {
    const val = rawStatus.toLowerCase().trim();
    if (['read', 'lu', 'oui', 'true', '1', 'yes'].includes(val)) book.reading_status = 'read';
    else if (['unread', 'non_lu', 'non lu', 'non', 'false', '0', 'no'].includes(val)) book.reading_status = 'unread';
    else if (['in_progress', 'en_cours', 'en cours', 'encours', 'in progress'].includes(val)) book.reading_status = 'in_progress';
  }

  if (mappedRow.rating) {
    const r = parseInt(mappedRow.rating);
    if (!isNaN(r) && r >= 0 && r <= 5) book.rating = r;
  }

  if (mappedRow.notes) {
    book.notes = mappedRow.notes;
  }

  return book;
}
