/**
 * Tests pour le service d'authentification
 */
import { authService } from '../../services/authService';

// Mock fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const mockResponseData = {
        access_token: 'test-token',
        token_type: 'bearer'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
      } as Response);

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded'
          }),
          body: 'username=test%40example.com&password=password123&remember_me=false'
        })
      );
      expect(result).toEqual(mockResponseData);
    });

    it('should handle login failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ detail: 'Invalid credentials' }),
      } as Response);

      await expect(authService.login({
        email: 'wrong@example.com',
        password: 'wrongpassword'
      })).rejects.toThrow('Invalid credentials');
    });
  });

  describe('register', () => {
    it('should register user successfully', async () => {
      const mockResponseData = {
        user: {
          id: 1,
          email: 'test@example.com',
          username: 'testuser',
          is_active: true,
          created_at: '2025-10-28T12:00:00Z'
        },
        token: {
          access_token: 'test-token',
          token_type: 'bearer'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponseData,
      } as Response);

      const result = await authService.register({
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
        confirm_password: 'password123'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/register'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({
            email: 'test@example.com',
            username: 'testuser',
            password: 'password123',
            confirm_password: 'password123'
          })
        })
      );
      expect(result).toEqual(mockResponseData);
    });

    it('should handle registration failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ detail: 'Email already exists' }),
      } as Response);

      await expect(authService.register({
        email: 'existing@example.com',
        username: 'testuser',
        password: 'password123',
        confirm_password: 'password123'
      })).rejects.toThrow('Email already exists');
    });
  });

  describe('getCurrentUser', () => {
    it('should get current user successfully', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        username: 'testuser',
        is_active: true,
        created_at: '2025-10-28T12:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      } as Response);

      const result = await authService.getCurrentUser('test-token');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/me'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      );
      expect(result).toEqual(mockUser);
    });

    it('should handle getCurrentUser failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ detail: 'Unauthorized' }),
      } as Response);

      await expect(authService.getCurrentUser('invalid-token')).rejects.toThrow('Unauthorized');
    });
  });
});