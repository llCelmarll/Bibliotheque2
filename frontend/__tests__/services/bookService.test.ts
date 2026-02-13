/**
 * Tests pour bookService - uploadCover et validateBookData
 */

// Mock axios avant d'importer bookService
jest.mock('axios', () => {
  const mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() }
    }
  };

  return {
    __esModule: true,
    default: {
      create: jest.fn(() => mockAxiosInstance)
    }
  };
});

jest.mock('../../services/api/authInterceptor', () => ({
  setupAuthInterceptor: jest.fn()
}));

import { bookService } from '../../services/bookService';
import axios from 'axios';
import { Platform } from 'react-native';

const mockAxios = axios as jest.Mocked<typeof axios>;
const mockAxiosInstance = mockAxios.create() as any;
const mockPost = mockAxiosInstance.post as jest.Mock;

describe('bookService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadCover', () => {
    it('uploads cover on native with FormData containing uri object', async () => {
      // Force native platform
      Object.defineProperty(Platform, 'OS', { get: () => 'android' });

      mockPost.mockResolvedValue({
        data: { cover_url: '/covers/42.jpg' }
      });

      const result = await bookService.uploadCover('42', 'file:///local/image.jpg');

      expect(mockPost).toHaveBeenCalledWith(
        '/books/42/cover',
        expect.any(FormData),
        expect.objectContaining({
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 30000,
        })
      );
      expect(result).toEqual({ cover_url: '/covers/42.jpg' });
    });

    it('uploads cover on web using fetch blob', async () => {
      Object.defineProperty(Platform, 'OS', { get: () => 'web' });

      const mockBlob = new Blob(['fake-image'], { type: 'image/jpeg' });
      global.fetch = jest.fn().mockResolvedValue({
        blob: jest.fn().mockResolvedValue(mockBlob),
      });

      mockPost.mockResolvedValue({
        data: { cover_url: '/covers/42.jpg' }
      });

      const result = await bookService.uploadCover('42', 'blob:http://localhost/abc');

      expect(global.fetch).toHaveBeenCalledWith('blob:http://localhost/abc');
      expect(mockPost).toHaveBeenCalledWith(
        '/books/42/cover',
        expect.any(FormData),
        expect.objectContaining({
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 30000,
        })
      );
      expect(result).toEqual({ cover_url: '/covers/42.jpg' });
    });

    it('propagates API errors', async () => {
      Object.defineProperty(Platform, 'OS', { get: () => 'android' });

      const error = { response: { status: 400, data: { detail: 'Type non supporté' } } };
      mockPost.mockRejectedValue(error);

      await expect(bookService.uploadCover('42', 'file:///img.jpg')).rejects.toEqual(error);
    });
  });

  describe('validateBookData', () => {
    it('accepts /covers/ local URL as valid', () => {
      const result = bookService.validateBookData({
        title: 'Test Book',
        cover_url: '/covers/1.jpg',
      } as any);

      expect(result.isValid).toBe(true);
    });

    it('accepts https URL as valid', () => {
      const result = bookService.validateBookData({
        title: 'Test Book',
        cover_url: 'https://example.com/cover.jpg',
      } as any);

      expect(result.isValid).toBe(true);
    });

    it('rejects invalid cover URL', () => {
      const result = bookService.validateBookData({
        title: 'Test Book',
        cover_url: 'not-a-url',
      } as any);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("L'URL de couverture doit être valide");
    });
  });
});
