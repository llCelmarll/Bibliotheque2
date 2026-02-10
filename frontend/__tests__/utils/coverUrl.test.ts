/**
 * Tests pour resolveCoverUrl
 */

jest.mock('../../config/api', () => ({
  __esModule: true,
  default: {
    BASE_URL: 'http://localhost:8000',
    ENDPOINTS: { BOOKS: '/books' }
  }
}));

import { resolveCoverUrl } from '../../utils/coverUrl';

describe('resolveCoverUrl', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(1234567890);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns undefined for undefined', () => {
    expect(resolveCoverUrl(undefined)).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(resolveCoverUrl('')).toBeUndefined();
  });

  it('passes through http URL unchanged', () => {
    const url = 'http://example.com/cover.jpg';
    expect(resolveCoverUrl(url)).toBe(url);
  });

  it('passes through https URL unchanged', () => {
    const url = 'https://books.google.com/cover.jpg';
    expect(resolveCoverUrl(url)).toBe(url);
  });

  it('resolves /covers/ path with BASE_URL and cache-buster', () => {
    expect(resolveCoverUrl('/covers/42.jpg')).toBe(
      'http://localhost:8000/covers/42.jpg?t=1234567890'
    );
  });

  it('resolves different book IDs in /covers/ path', () => {
    expect(resolveCoverUrl('/covers/123.jpg')).toBe(
      'http://localhost:8000/covers/123.jpg?t=1234567890'
    );
  });

  it('passes through other paths unchanged', () => {
    expect(resolveCoverUrl('/other/path.jpg')).toBe('/other/path.jpg');
  });
});
