/**
 * Tests pour contactService
 */
import { ContactCreate } from '../../types/contact';

// Mock axios avant d'importer contactService
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

import { contactService } from '../../services/contactService';
import axios from 'axios';

// Get references to the mocked axios methods
const mockAxios = axios as jest.Mocked<typeof axios>;
const mockAxiosInstance = mockAxios.create() as any;
const mockGet = mockAxiosInstance.get as jest.Mock;
const mockPost = mockAxiosInstance.post as jest.Mock;
const mockPut = mockAxiosInstance.put as jest.Mock;
const mockDelete = mockAxiosInstance.delete as jest.Mock;

describe('contactService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createContact', () => {
    it('should create a contact successfully', async () => {
      const contactData: ContactCreate = {
        name: 'Jean Dupont',
        email: 'jean@example.com',
        phone: '0123456789',
      };

      const mockResponse = {
        data: {
          id: 1,
          ...contactData,
          created_at: '2025-01-01',
          active_loans_count: 0,
          active_borrows_count: 0,
        },
      };

      mockPost.mockResolvedValue(mockResponse);

      const result = await contactService.createContact(contactData);

      expect(result).toEqual(mockResponse.data);
      expect(mockPost).toHaveBeenCalledWith('/contacts', contactData);
    });

    it('should handle duplicate contact error', async () => {
      const contactData: ContactCreate = {
        name: 'Jean Dupont',
      };

      const errorResponse = {
        response: {
          status: 409,
          data: { detail: 'Un contact avec ce nom existe déjà' },
        },
      };

      mockPost.mockRejectedValue(errorResponse);

      await expect(contactService.createContact(contactData)).rejects.toEqual(
        errorResponse
      );
    });
  });

  describe('getAllContacts', () => {
    it('should fetch all contacts', async () => {
      const mockResponse = {
        data: [
          {
            id: 1,
            name: 'Jean Dupont',
            email: 'jean@example.com',
            created_at: '2025-01-01',
            active_loans_count: 2,
            active_borrows_count: 1,
          },
          {
            id: 2,
            name: 'Marie Martin',
            email: 'marie@example.com',
            created_at: '2025-01-02',
            active_loans_count: 0,
            active_borrows_count: 0,
          },
        ],
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await contactService.getAllContacts();

      expect(result).toEqual(mockResponse.data);
      expect(mockGet).toHaveBeenCalledWith('/contacts');
    });

    it('should verify active_loans_count is included', async () => {
      const mockResponse = {
        data: [
          {
            id: 1,
            name: 'Jean Dupont',
            active_loans_count: 3,
            active_borrows_count: 1,
          },
        ],
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await contactService.getAllContacts();

      expect(result[0].active_loans_count).toBe(3);
    });
  });

  describe('getContactById', () => {
    it('should fetch a specific contact', async () => {
      const contactId = 1;

      const mockResponse = {
        data: {
          id: 1,
          name: 'Jean Dupont',
          email: 'jean@example.com',
          phone: '0123456789',
          notes: 'Ami de confiance',
          created_at: '2025-01-01',
          active_loans_count: 2,
          active_borrows_count: 0,
        },
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await contactService.getContactById(contactId);

      expect(result).toEqual(mockResponse.data);
      expect(mockGet).toHaveBeenCalledWith(`/contacts/${contactId}`);
    });

    it('should include active_loans_count in response', async () => {
      const contactId = 1;

      const mockResponse = {
        data: {
          id: 1,
          name: 'Test',
          active_loans_count: 5,
          active_borrows_count: 2,
        },
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await contactService.getContactById(contactId);

      expect(result.active_loans_count).toBe(5);
    });

    it('should handle contact not found', async () => {
      const contactId = 999;

      const errorResponse = {
        response: {
          status: 404,
          data: { detail: 'Contact introuvable' },
        },
      };

      mockGet.mockRejectedValue(errorResponse);

      await expect(contactService.getContactById(contactId)).rejects.toEqual(
        errorResponse
      );
    });
  });

  describe('updateContact', () => {
    it('should update a contact successfully', async () => {
      const contactId = 1;
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
          active_borrows_count: 0,
        },
      };

      mockPut.mockResolvedValue(mockResponse);

      const result = await contactService.updateContact(contactId, updateData);

      expect(result).toEqual(mockResponse.data);
      expect(mockPut).toHaveBeenCalledWith(
        `/contacts/${contactId}`,
        updateData
      );
    });

    it('should update active_loans_count after update', async () => {
      const contactId = 1;
      const updateData = { name: 'Updated Name' };

      const mockResponse = {
        data: {
          id: 1,
          name: 'Updated Name',
          active_loans_count: 3,
          active_borrows_count: 1,
        },
      };

      mockPut.mockResolvedValue(mockResponse);

      const result = await contactService.updateContact(contactId, updateData);

      expect(result.active_loans_count).toBe(3);
    });
  });

  describe('deleteContact', () => {
    it('should delete a contact successfully', async () => {
      const contactId = 1;

      mockDelete.mockResolvedValue({ status: 204 });

      await contactService.deleteContact(contactId);

      expect(mockDelete).toHaveBeenCalledWith(`/contacts/${contactId}`);
    });

    it('should handle error when contact has active loans', async () => {
      const contactId = 1;

      const errorResponse = {
        response: {
          status: 400,
          data: { detail: 'Impossible de supprimer un contact avec des prêts actifs' },
        },
      };

      mockDelete.mockRejectedValue(errorResponse);

      await expect(contactService.deleteContact(contactId)).rejects.toEqual(
        errorResponse
      );
    });
  });

  describe('searchContacts', () => {
    it('should search contacts by query', async () => {
      const query = 'Jean';

      const mockResponse = {
        data: [
          {
            id: 1,
            name: 'Jean Dupont',
            active_loans_count: 1,
            active_borrows_count: 0,
          },
          {
            id: 2,
            name: 'Jean-Pierre Martin',
            active_loans_count: 0,
            active_borrows_count: 1,
          },
        ],
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await contactService.searchContacts(query);

      expect(result).toEqual(mockResponse.data);
      expect(mockGet).toHaveBeenCalledWith('/contacts/search', { params: { query } });
    });

    it('should include active_loans_count in search results', async () => {
      const query = 'Test';

      const mockResponse = {
        data: [
          {
            id: 1,
            name: 'Test User',
            active_loans_count: 4,
            active_borrows_count: 2,
          },
        ],
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await contactService.searchContacts(query);

      expect(result[0].active_loans_count).toBe(4);
    });
  });
});
