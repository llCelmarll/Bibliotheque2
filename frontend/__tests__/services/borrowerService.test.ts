/**
 * Tests pour borrowerService
 */
import { BorrowerCreate } from '../../types/borrower';

// Mock axios avant d'importer borrowerService
jest.mock('axios', () => {
  const mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
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

// Mock setupAuthInterceptor to do nothing
jest.mock('../../services/api/authInterceptor', () => ({
  setupAuthInterceptor: jest.fn()
}));

import { borrowerService } from '../../services/borrowerService';
import axios from 'axios';

// Get references to the mocked axios methods
const mockAxios = axios as jest.Mocked<typeof axios>;
const mockAxiosInstance = mockAxios.create() as any;
const mockGet = mockAxiosInstance.get as jest.Mock;
const mockPost = mockAxiosInstance.post as jest.Mock;
const mockPut = mockAxiosInstance.put as jest.Mock;
const mockDelete = mockAxiosInstance.delete as jest.Mock;

describe('borrowerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createBorrower', () => {
    it('should create a borrower successfully', async () => {
      const borrowerData: BorrowerCreate = {
        name: 'Jean Dupont',
        email: 'jean@example.com',
        phone: '0123456789',
      };

      const mockResponse = {
        data: {
          id: 1,
          ...borrowerData,
          created_at: '2025-01-01',
          active_loans_count: 0,
        },
      };

      mockPost.mockResolvedValue(mockResponse);

      const result = await borrowerService.createBorrower(borrowerData);

      expect(result).toEqual(mockResponse.data);
      expect(mockPost).toHaveBeenCalledWith('/borrowers', borrowerData);
    });

    it('should handle duplicate borrower error', async () => {
      const borrowerData: BorrowerCreate = {
        name: 'Jean Dupont',
      };

      const errorResponse = {
        response: {
          status: 409,
          data: { detail: 'Un emprunteur avec ce nom existe déjà' },
        },
      };

      mockPost.mockRejectedValue(errorResponse);

      await expect(borrowerService.createBorrower(borrowerData)).rejects.toEqual(
        errorResponse
      );
    });
  });

  describe('getBorrowers', () => {
    it('should fetch all borrowers', async () => {
      const mockResponse = {
        data: [
          {
            id: 1,
            name: 'Jean Dupont',
            email: 'jean@example.com',
            created_at: '2025-01-01',
            active_loans_count: 2,
          },
          {
            id: 2,
            name: 'Marie Martin',
            email: 'marie@example.com',
            created_at: '2025-01-02',
            active_loans_count: 0,
          },
        ],
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await borrowerService.getAllBorrowers();

      expect(result).toEqual(mockResponse.data);
      expect(mockGet).toHaveBeenCalledWith('/borrowers');
    });

    it('should verify active_loans_count is included', async () => {
      const mockResponse = {
        data: [
          {
            id: 1,
            name: 'Jean Dupont',
            active_loans_count: 3,
          },
        ],
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await borrowerService.getAllBorrowers();

      expect(result[0].active_loans_count).toBe(3);
    });
  });

  describe('getBorrowerById', () => {
    it('should fetch a specific borrower', async () => {
      const borrowerId = 1;

      const mockResponse = {
        data: {
          id: 1,
          name: 'Jean Dupont',
          email: 'jean@example.com',
          phone: '0123456789',
          notes: 'Ami de confiance',
          created_at: '2025-01-01',
          active_loans_count: 2,
        },
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await borrowerService.getBorrowerById(borrowerId);

      expect(result).toEqual(mockResponse.data);
      expect(mockGet).toHaveBeenCalledWith(`/borrowers/${borrowerId}`);
    });

    it('should include active_loans_count in response', async () => {
      const borrowerId = 1;

      const mockResponse = {
        data: {
          id: 1,
          name: 'Test',
          active_loans_count: 5,
        },
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await borrowerService.getBorrowerById(borrowerId);

      expect(result.active_loans_count).toBe(5);
    });

    it('should handle borrower not found', async () => {
      const borrowerId = 999;

      const errorResponse = {
        response: {
          status: 404,
          data: { detail: 'Emprunteur introuvable' },
        },
      };

      mockGet.mockRejectedValue(errorResponse);

      await expect(borrowerService.getBorrowerById(borrowerId)).rejects.toEqual(
        errorResponse
      );
    });
  });

  describe('updateBorrower', () => {
    it('should update a borrower successfully', async () => {
      const borrowerId = 1;
      const updateData = {
        name: 'Jean-Pierre Dupont',
        email: 'jp.dupont@example.com',
      };

      const mockResponse = {
        data: {
          id: 1,
          ...updateData,
          created_at: '2025-01-01',
          active_loans_count: 2,
        },
      };

      mockPut.mockResolvedValue(mockResponse);

      const result = await borrowerService.updateBorrower(borrowerId, updateData);

      expect(result).toEqual(mockResponse.data);
      expect(mockPut).toHaveBeenCalledWith(
        `/borrowers/${borrowerId}`,
        updateData
      );
    });

    it('should update active_loans_count after update', async () => {
      const borrowerId = 1;
      const updateData = { name: 'Updated Name' };

      const mockResponse = {
        data: {
          id: 1,
          name: 'Updated Name',
          active_loans_count: 3,
        },
      };

      mockPut.mockResolvedValue(mockResponse);

      const result = await borrowerService.updateBorrower(borrowerId, updateData);

      expect(result.active_loans_count).toBe(3);
    });
  });

  describe('deleteBorrower', () => {
    it('should delete a borrower successfully', async () => {
      const borrowerId = 1;

      mockDelete.mockResolvedValue({ status: 204 });

      await borrowerService.deleteBorrower(borrowerId);

      expect(mockDelete).toHaveBeenCalledWith(`/borrowers/${borrowerId}`);
    });

    it('should handle error when borrower has active loans', async () => {
      const borrowerId = 1;

      const errorResponse = {
        response: {
          status: 400,
          data: { detail: 'Impossible de supprimer un emprunteur avec des prêts actifs' },
        },
      };

      mockDelete.mockRejectedValue(errorResponse);

      await expect(borrowerService.deleteBorrower(borrowerId)).rejects.toEqual(
        errorResponse
      );
    });
  });

  describe('searchBorrowers', () => {
    it('should search borrowers by query', async () => {
      const query = 'Jean';

      const mockResponse = {
        data: [
          {
            id: 1,
            name: 'Jean Dupont',
            active_loans_count: 1,
          },
          {
            id: 2,
            name: 'Jean-Pierre Martin',
            active_loans_count: 0,
          },
        ],
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await borrowerService.searchBorrowers(query);

      expect(result).toEqual(mockResponse.data);
      expect(mockGet).toHaveBeenCalledWith('/borrowers/search', { params: { query } });
    });

    it('should include active_loans_count in search results', async () => {
      const query = 'Test';

      const mockResponse = {
        data: [
          {
            id: 1,
            name: 'Test User',
            active_loans_count: 4,
          },
        ],
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await borrowerService.searchBorrowers(query);

      expect(result[0].active_loans_count).toBe(4);
    });
  });
});
