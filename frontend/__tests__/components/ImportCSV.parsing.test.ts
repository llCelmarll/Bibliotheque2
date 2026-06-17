/**
 * Tests unitaires pour la logique de parsing CSV (utils/csvParser.ts).
 * Couvre les edge cases : séries, reading_status, rating, auteurs, titres vides, champs absents.
 */
import { parseCSVRow } from '../../utils/csvParser';

describe('parseCSVRow', () => {

  // ── Titre ──────────────────────────────────────────────────────────────────

  it('titre présent', () => {
    const result = parseCSVRow({ title: 'Dune' });
    expect(result.title).toBe('Dune');
  });

  it('titre absent → "Sans titre"', () => {
    const result = parseCSVRow({});
    expect(result.title).toBe('Sans titre');
  });

  it('titre vide → "Sans titre"', () => {
    const result = parseCSVRow({ title: '' });
    expect(result.title).toBe('Sans titre');
  });

  // ── Séries ─────────────────────────────────────────────────────────────────

  it('série simple sans tome', () => {
    const result = parseCSVRow({ title: 'T', series: 'Dune' });
    expect(result.series).toEqual([{ name: 'Dune', volume_number: undefined }]);
  });

  it('série simple + colonne tome (ancien format)', () => {
    const result = parseCSVRow({ title: 'T', series: 'Dune', volume: '2' });
    expect(result.series).toEqual([{ name: 'Dune', volume_number: 2 }]);
  });

  it('série avec colon dans la colonne série (nouveau format)', () => {
    const result = parseCSVRow({ title: 'T', series: 'Dune:1' });
    expect(result.series).toEqual([{ name: 'Dune', volume_number: 1 }]);
  });

  it('deux séries séparées par " ; "', () => {
    const result = parseCSVRow({ title: 'T', series: 'Dune:1 ; Fondation:3' });
    expect(result.series).toEqual([
      { name: 'Dune', volume_number: 1 },
      { name: 'Fondation', volume_number: 3 },
    ]);
  });

  it('deux séries sans tome', () => {
    const result = parseCSVRow({ title: 'T', series: 'Dune ; Fondation' });
    expect(result.series).toEqual([
      { name: 'Dune', volume_number: undefined },
      { name: 'Fondation', volume_number: undefined },
    ]);
  });

  it('série avec colon et colonne volume — le colon prend la priorité', () => {
    const result = parseCSVRow({ title: 'T', series: 'Dune:1', volume: '99' });
    expect(result.series).toEqual([{ name: 'Dune', volume_number: 1 }]);
  });

  it('pas de série → series absent du résultat', () => {
    const result = parseCSVRow({ title: 'T' });
    expect(result.series).toBeUndefined();
  });

  it('tome invalide (NaN) → volume_number undefined', () => {
    const result = parseCSVRow({ title: 'T', series: 'Dune', volume: 'abc' });
    expect(result.series).toEqual([{ name: 'Dune', volume_number: undefined }]);
  });

  // ── reading_status (colonne is_read rétrocompat) ───────────────────────────

  it('is_read "oui" → reading_status "read"', () => {
    expect(parseCSVRow({ title: 'T', is_read: 'oui' }).reading_status).toBe('read');
  });

  it('is_read "non" → reading_status "unread"', () => {
    expect(parseCSVRow({ title: 'T', is_read: 'non' }).reading_status).toBe('unread');
  });

  it('is_read "true" → reading_status "read"', () => {
    expect(parseCSVRow({ title: 'T', is_read: 'true' }).reading_status).toBe('read');
  });

  it('is_read "1" → reading_status "read"', () => {
    expect(parseCSVRow({ title: 'T', is_read: '1' }).reading_status).toBe('read');
  });

  it('is_read "yes" → reading_status "read"', () => {
    expect(parseCSVRow({ title: 'T', is_read: 'yes' }).reading_status).toBe('read');
  });

  it('is_read "lu" → reading_status "read"', () => {
    expect(parseCSVRow({ title: 'T', is_read: 'lu' }).reading_status).toBe('read');
  });

  it('is_read "false" → reading_status "unread"', () => {
    expect(parseCSVRow({ title: 'T', is_read: 'false' }).reading_status).toBe('unread');
  });

  it('is_read "0" → reading_status "unread"', () => {
    expect(parseCSVRow({ title: 'T', is_read: '0' }).reading_status).toBe('unread');
  });

  it('is_read "en cours" → reading_status "in_progress"', () => {
    expect(parseCSVRow({ title: 'T', is_read: 'en cours' }).reading_status).toBe('in_progress');
  });

  it('is_read absent → reading_status non défini', () => {
    const result = parseCSVRow({ title: 'T' });
    expect(result.reading_status).toBeUndefined();
  });

  it('is_read "" (vide) → reading_status non défini', () => {
    const result = parseCSVRow({ title: 'T', is_read: '' });
    expect(result.reading_status).toBeUndefined();
  });

  // ── reading_status (colonne directe, prioritaire) ──────────────────────────

  it('reading_status "read" direct → "read"', () => {
    expect(parseCSVRow({ title: 'T', reading_status: 'read' }).reading_status).toBe('read');
  });

  it('reading_status "unread" direct → "unread"', () => {
    expect(parseCSVRow({ title: 'T', reading_status: 'unread' }).reading_status).toBe('unread');
  });

  it('reading_status "in_progress" direct → "in_progress"', () => {
    expect(parseCSVRow({ title: 'T', reading_status: 'in_progress' }).reading_status).toBe('in_progress');
  });

  it('reading_status "en cours" direct → "in_progress"', () => {
    expect(parseCSVRow({ title: 'T', reading_status: 'en cours' }).reading_status).toBe('in_progress');
  });

  it('reading_status "lu" direct → "read"', () => {
    expect(parseCSVRow({ title: 'T', reading_status: 'lu' }).reading_status).toBe('read');
  });

  it('reading_status prioritaire sur is_read', () => {
    // reading_status doit l'emporter sur is_read quand les deux sont présents
    expect(parseCSVRow({ title: 'T', reading_status: 'in_progress', is_read: 'oui' }).reading_status).toBe('in_progress');
  });

  // ── Rating ─────────────────────────────────────────────────────────────────

  it('rating "5" → 5', () => {
    expect(parseCSVRow({ title: 'T', rating: '5' }).rating).toBe(5);
  });

  it('rating "0" → 0', () => {
    expect(parseCSVRow({ title: 'T', rating: '0' }).rating).toBe(0);
  });

  it('rating "6" (hors plage) → non défini', () => {
    expect(parseCSVRow({ title: 'T', rating: '6' }).rating).toBeUndefined();
  });

  it('rating "-1" (hors plage) → non défini', () => {
    expect(parseCSVRow({ title: 'T', rating: '-1' }).rating).toBeUndefined();
  });

  it('rating "abc" → non défini', () => {
    expect(parseCSVRow({ title: 'T', rating: 'abc' }).rating).toBeUndefined();
  });

  it('rating absent → non défini', () => {
    expect(parseCSVRow({ title: 'T' }).rating).toBeUndefined();
  });

  // ── Auteurs ────────────────────────────────────────────────────────────────

  it('un auteur', () => {
    expect(parseCSVRow({ title: 'T', authors: 'Frank Herbert' }).authors).toEqual(['Frank Herbert']);
  });

  it('deux auteurs séparés par virgule', () => {
    expect(parseCSVRow({ title: 'T', authors: 'Terry Pratchett, Neil Gaiman' }).authors)
      .toEqual(['Terry Pratchett', 'Neil Gaiman']);
  });

  it('auteurs avec espaces superflus trimés', () => {
    expect(parseCSVRow({ title: 'T', authors: ' Alice , Bob ' }).authors)
      .toEqual(['Alice', 'Bob']);
  });

  it('auteurs absent → authors non défini', () => {
    expect(parseCSVRow({ title: 'T' }).authors).toBeUndefined();
  });

  // ── Genres ─────────────────────────────────────────────────────────────────

  it('un genre', () => {
    expect(parseCSVRow({ title: 'T', genres: 'Fantasy' }).genres).toEqual(['Fantasy']);
  });

  it('deux genres séparés par virgule', () => {
    expect(parseCSVRow({ title: 'T', genres: 'Fantasy, Humour' }).genres)
      .toEqual(['Fantasy', 'Humour']);
  });

  it('genres absent → genres non défini', () => {
    expect(parseCSVRow({ title: 'T' }).genres).toBeUndefined();
  });

  // ── Champs optionnels ──────────────────────────────────────────────────────

  it('ISBN transmis', () => {
    expect(parseCSVRow({ title: 'T', isbn: '9782266233200' }).isbn).toBe('9782266233200');
  });

  it('éditeur transmis', () => {
    expect(parseCSVRow({ title: 'T', publisher: 'Pocket' }).publisher).toBe('Pocket');
  });

  it('page_count parsé en nombre', () => {
    expect(parseCSVRow({ title: 'T', page_count: '896' }).page_count).toBe(896);
  });

  it('page_count absent → undefined', () => {
    expect(parseCSVRow({ title: 'T' }).page_count).toBeUndefined();
  });

  it('page_count "0" → undefined (valeur invalide)', () => {
    expect(parseCSVRow({ title: 'T', page_count: '0' }).page_count).toBeUndefined();
  });

  it('page_count "beaucoup" (non numérique) → undefined', () => {
    expect(parseCSVRow({ title: 'T', page_count: 'beaucoup' }).page_count).toBeUndefined();
  });

  it('page_count "" (vide) → undefined', () => {
    expect(parseCSVRow({ title: 'T', page_count: '' }).page_count).toBeUndefined();
  });

  it('notes transmises', () => {
    expect(parseCSVRow({ title: 'T', notes: 'Chef-d\'œuvre.' }).notes).toBe('Chef-d\'œuvre.');
  });

  it('cover_url transmise', () => {
    expect(parseCSVRow({ title: 'T', cover_url: 'https://example.com/cover.jpg' }).cover_url)
      .toBe('https://example.com/cover.jpg');
  });

  it('tous les champs optionnels absents → pas de crash', () => {
    const result = parseCSVRow({ title: 'Minimum' });
    expect(result.title).toBe('Minimum');
    expect(result.authors).toBeUndefined();
    expect(result.genres).toBeUndefined();
    expect(result.series).toBeUndefined();
    expect(result.reading_status).toBeUndefined();
    expect(result.rating).toBeUndefined();
    expect(result.notes).toBeUndefined();
  });
});
