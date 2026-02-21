/**
 * Tests pour userLoanRequestService (prêts inter-membres)
 */
import { UserLoanRequestStatus } from '../../types/userLoanRequest';

// Mock axios avant d'importer le service
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

// Mock setupAuthInterceptor
jest.mock('../../services/api/authInterceptor', () => ({
  setupAuthInterceptor: jest.fn()
}));

import { userLoanRequestService } from '../../services/userLoanRequestService';
import axios from 'axios';

const mockAxios = axios as jest.Mocked<typeof axios>;
const mockAxiosInstance = mockAxios.create() as any;
const mockGet = mockAxiosInstance.get as jest.Mock;
const mockPost = mockAxiosInstance.post as jest.Mock;
const mockPut = mockAxiosInstance.put as jest.Mock;

// Données de test réutilisables
const mockRequest = {
  id: 1,
  requester_id: 2,
  requester_username: 'alice',
  lender_id: 3,
  lender_username: 'bob',
  book_id: 10,
  book: {
    id: 10,
    title: 'Test Book',
    isbn: '9781234567890',
    cover_url: null,
    authors: [],
    genres: [],
    is_lendable: true,
  },
  status: UserLoanRequestStatus.PENDING,
  message: null,
  response_message: null,
  request_date: '2026-01-01T00:00:00',
  response_date: null,
  due_date: null,
  return_date: null,
  created_at: '2026-01-01T00:00:00',
  updated_at: null,
};

describe('userLoanRequestService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // getIncoming
  // -------------------------------------------------------------------------
  describe('getIncoming', () => {
    it('should fetch incoming requests', async () => {
      mockGet.mockResolvedValue({ data: [mockRequest] });

      const result = await userLoanRequestService.getIncoming();

      expect(result).toEqual([mockRequest]);
      expect(mockGet).toHaveBeenCalledWith('/user-loans/incoming');
    });

    it('should propagate API errors', async () => {
      const error = new Error('Network error');
      mockGet.mockRejectedValue(error);

      await expect(userLoanRequestService.getIncoming()).rejects.toThrow('Network error');
    });
  });

  // -------------------------------------------------------------------------
  // getOutgoing
  // -------------------------------------------------------------------------
  describe('getOutgoing', () => {
    it('should fetch outgoing requests', async () => {
      mockGet.mockResolvedValue({ data: [mockRequest] });

      const result = await userLoanRequestService.getOutgoing();

      expect(result).toEqual([mockRequest]);
      expect(mockGet).toHaveBeenCalledWith('/user-loans/outgoing');
    });
  });

  // -------------------------------------------------------------------------
  // getPendingCount
  // -------------------------------------------------------------------------
  describe('getPendingCount', () => {
    it('should return the pending count from response.data.count', async () => {
      mockGet.mockResolvedValue({ data: { count: 3 } });

      const result = await userLoanRequestService.getPendingCount();

      expect(result).toBe(3);
      expect(mockGet).toHaveBeenCalledWith('/user-loans/incoming/count');
    });

    it('should return 0 when no pending requests', async () => {
      mockGet.mockResolvedValue({ data: { count: 0 } });

      const result = await userLoanRequestService.getPendingCount();

      expect(result).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // getById
  // -------------------------------------------------------------------------
  describe('getById', () => {
    it('should fetch a request by id', async () => {
      mockGet.mockResolvedValue({ data: mockRequest });

      const result = await userLoanRequestService.getById(1);

      expect(result).toEqual(mockRequest);
      expect(mockGet).toHaveBeenCalledWith('/user-loans/1');
    });
  });

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------
  describe('create', () => {
    it('should create a request with only book_id', async () => {
      const pendingRequest = { ...mockRequest, status: UserLoanRequestStatus.PENDING };
      mockPost.mockResolvedValue({ data: pendingRequest });

      const result = await userLoanRequestService.create({ book_id: 10 });

      expect(result).toEqual(pendingRequest);
      expect(mockPost).toHaveBeenCalledWith('/user-loans', { book_id: 10 });
    });

    it('should create a request with optional message and due_date', async () => {
      mockPost.mockResolvedValue({ data: mockRequest });

      await userLoanRequestService.create({
        book_id: 10,
        message: 'Serait-il possible ?',
        due_date: new Date('2026-03-01'),
      });

      expect(mockPost).toHaveBeenCalledWith('/user-loans', {
        book_id: 10,
        message: 'Serait-il possible ?',
        due_date: new Date('2026-03-01'),
      });
    });

    it('should propagate 403 error when no library access', async () => {
      const error = { response: { status: 403, data: { detail: 'Accès refusé' } } };
      mockPost.mockRejectedValue(error);

      await expect(userLoanRequestService.create({ book_id: 10 })).rejects.toEqual(error);
    });

    it('should propagate 400 error when book not lendable', async () => {
      const error = { response: { status: 400, data: { detail: 'Livre non disponible' } } };
      mockPost.mockRejectedValue(error);

      await expect(userLoanRequestService.create({ book_id: 10 })).rejects.toEqual(error);
    });
  });

  // -------------------------------------------------------------------------
  // accept
  // -------------------------------------------------------------------------
  describe('accept', () => {
    it('should accept a request without body', async () => {
      const accepted = { ...mockRequest, status: UserLoanRequestStatus.ACCEPTED };
      mockPost.mockResolvedValue({ data: accepted });

      const result = await userLoanRequestService.accept(1);

      expect(result.status).toBe(UserLoanRequestStatus.ACCEPTED);
      expect(mockPost).toHaveBeenCalledWith('/user-loans/1/accept', {});
    });

    it('should accept with response_message and due_date', async () => {
      mockPost.mockResolvedValue({ data: { ...mockRequest, status: 'accepted' } });

      await userLoanRequestService.accept(1, {
        response_message: 'Avec plaisir !',
        due_date: new Date('2026-03-15'),
      });

      expect(mockPost).toHaveBeenCalledWith('/user-loans/1/accept', {
        response_message: 'Avec plaisir !',
        due_date: new Date('2026-03-15'),
      });
    });

    it('should propagate 403 error when requester tries to accept', async () => {
      const error = { response: { status: 403, data: { detail: 'Seul le prêteur...' } } };
      mockPost.mockRejectedValue(error);

      await expect(userLoanRequestService.accept(1)).rejects.toEqual(error);
    });
  });

  // -------------------------------------------------------------------------
  // decline
  // -------------------------------------------------------------------------
  describe('decline', () => {
    it('should decline a request', async () => {
      const declined = { ...mockRequest, status: UserLoanRequestStatus.DECLINED };
      mockPost.mockResolvedValue({ data: declined });

      const result = await userLoanRequestService.decline(1, { response_message: 'Désolé' });

      expect(result.status).toBe(UserLoanRequestStatus.DECLINED);
      expect(mockPost).toHaveBeenCalledWith('/user-loans/1/decline', { response_message: 'Désolé' });
    });

    it('should decline without message', async () => {
      mockPost.mockResolvedValue({ data: { ...mockRequest, status: 'declined' } });

      await userLoanRequestService.decline(1);

      expect(mockPost).toHaveBeenCalledWith('/user-loans/1/decline', {});
    });
  });

  // -------------------------------------------------------------------------
  // cancel
  // -------------------------------------------------------------------------
  describe('cancel', () => {
    it('should cancel a request', async () => {
      const cancelled = { ...mockRequest, status: UserLoanRequestStatus.CANCELLED };
      mockPost.mockResolvedValue({ data: cancelled });

      const result = await userLoanRequestService.cancel(1);

      expect(result.status).toBe(UserLoanRequestStatus.CANCELLED);
      expect(mockPost).toHaveBeenCalledWith('/user-loans/1/cancel');
    });
  });

  // -------------------------------------------------------------------------
  // returnBook
  // -------------------------------------------------------------------------
  describe('returnBook', () => {
    it('should mark a book as returned', async () => {
      const returned = { ...mockRequest, status: UserLoanRequestStatus.RETURNED };
      mockPut.mockResolvedValue({ data: returned });

      const result = await userLoanRequestService.returnBook(1);

      expect(result.status).toBe(UserLoanRequestStatus.RETURNED);
      expect(mockPut).toHaveBeenCalledWith('/user-loans/1/return');
    });

    it('should propagate error when requester tries to return', async () => {
      const error = { response: { status: 403, data: { detail: 'Seul le prêteur...' } } };
      mockPut.mockRejectedValue(error);

      await expect(userLoanRequestService.returnBook(1)).rejects.toEqual(error);
    });
  });

  // -------------------------------------------------------------------------
  // getUserLibrary
  // -------------------------------------------------------------------------
  describe('getUserLibrary', () => {
    it('should fetch library with no params', async () => {
      const mockLibrary = { total: 2, items: [] };
      mockGet.mockResolvedValue({ data: mockLibrary });

      const result = await userLoanRequestService.getUserLibrary(42);

      expect(result).toEqual(mockLibrary);
      expect(mockGet).toHaveBeenCalledWith('/users/42/library', { params: undefined });
    });

    it('should pass search and pagination params', async () => {
      mockGet.mockResolvedValue({ data: { total: 0, items: [] } });

      await userLoanRequestService.getUserLibrary(42, {
        search: 'king',
        skip: 20,
        limit: 20,
        sort_by: 'title',
        sort_order: 'asc',
      });

      expect(mockGet).toHaveBeenCalledWith('/users/42/library', {
        params: {
          search: 'king',
          skip: 20,
          limit: 20,
          sort_by: 'title',
          sort_order: 'asc',
        }
      });
    });

    it('should pass advanced search params', async () => {
      mockGet.mockResolvedValue({ data: { total: 0, items: [] } });

      await userLoanRequestService.getUserLibrary(42, {
        author: 'Tolkien',
        genre: 'Fantasy',
        year_min: 2000,
        page_min: 300,
      });

      expect(mockGet).toHaveBeenCalledWith('/users/42/library', {
        params: {
          author: 'Tolkien',
          genre: 'Fantasy',
          year_min: 2000,
          page_min: 300,
        }
      });
    });

    it('should propagate 403 error when no library access', async () => {
      const error = { response: { status: 403, data: { detail: 'Accès refusé' } } };
      mockGet.mockRejectedValue(error);

      await expect(userLoanRequestService.getUserLibrary(42)).rejects.toEqual(error);
    });
  });

  // -------------------------------------------------------------------------
  // getSharedBook
  // -------------------------------------------------------------------------
  describe('getSharedBook', () => {
    it('should fetch a single shared book', async () => {
      const mockBook = {
        id: 7,
        title: 'Shared Book',
        isbn: '9780000000001',
        current_loan: null,
        authors: [],
        is_lendable: true,
      };
      mockGet.mockResolvedValue({ data: mockBook });

      const result = await userLoanRequestService.getSharedBook(42, 7);

      expect(result).toEqual(mockBook);
      expect(mockGet).toHaveBeenCalledWith('/users/42/library/7');
    });

    it('should return current_loan when book is loaned', async () => {
      const mockBook = {
        id: 7,
        title: 'Loaned Book',
        isbn: '9780000000002',
        current_loan: {
          id: 5,
          status: 'active',
          contact: { id: 1, name: 'Jean Dupont' },
          loan_date: '2026-01-01',
          due_date: '2026-02-01',
        },
        authors: [],
        is_lendable: true,
      };
      mockGet.mockResolvedValue({ data: mockBook });

      const result = await userLoanRequestService.getSharedBook(42, 7);

      expect(result.current_loan).not.toBeNull();
      expect((result as any).current_loan.status).toBe('active');
    });

    it('should propagate 404 when book not lendable or not found', async () => {
      const error = { response: { status: 404, data: { detail: 'Livre introuvable' } } };
      mockGet.mockRejectedValue(error);

      await expect(userLoanRequestService.getSharedBook(42, 999)).rejects.toEqual(error);
    });
  });
});
